import io, { Socket } from 'socket.io-client';
import { Client, GameState, SocketClientMap, numberStringMap } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { GameInfo } from '../../common/GameInfo';
import { PublicLobby } from '../../common/PublicLobby';
import PeerConnection, { SignalData } from '../lib/PeerConnection';
import { TypedEmitter } from '../lib/TypedEmitter';
import { validateClientPeerConfig } from '../lib/validateClientPeerConfig';
import SettingsStore from '../settings/SettingsStore';
import { ClientPeerConfig, DEFAULT_ICE_CONFIG, DEFAULT_ICE_CONFIG_TURN } from './types';

const ICE_DISCONNECT_TIMEOUT_MS = 12000;
const PEER_CONNECT_TIMEOUT_MS = 30000;
const PEER_RETRY_DELAY_MS = 1000;
const MAX_PEER_RETRY_DELAY_MS = 15000;
const MOBILE_BEACON_INTERVAL_MS = 5000;

interface SocketError {
	message?: string;
}

interface MobilePlayerInfo {
	mobilePlayerInfo: {
		code: string;
		askingForHost: boolean;
	};
}

export interface ConnectionContext {
	isHost: boolean;
	lobbyCode: string;
	gameState: GameState;
	parsedHostId: number;
	activeLobbySettings: ILobbySettings;
}

interface ConnectionControllerEvents extends Record<string, unknown[]> {
	connected: [];
	disconnected: [];
	error: [string];
	serverHost: [number];
	socketClients: [SocketClientMap];
	peerStream: [peerId: string, stream: MediaStream];
	peerClosed: [peerId: string];
	peerData: [peerId: string, data: Record<string, unknown>];
	vad: [clientId: number, activity: boolean];
	mobileDetected: [];
	lobbyReset: [];
}

export class ConnectionController extends TypedEmitter<ConnectionControllerEvents> {
	private socket?: Socket;
	private stream?: MediaStream;
	private started = false;
	private currentLobby = '';
	private iceConfig: RTCConfiguration = DEFAULT_ICE_CONFIG;

	private peers = new Map<string, PeerConnection>();
	private peerConnectionIds = new Map<string, string>();
	private peerOffers = new Map<string, string>();
	private iceDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerConnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerRetryAttempts = new Map<string, number>();
	private clients: SocketClientMap = {};
	private mobileBeaconTimer?: ReturnType<typeof setTimeout>;
	private mobileRunning = false;

	private context: ConnectionContext = {
		isHost: false,
		lobbyCode: 'MENU',
		gameState: GameState.UNKNOWN,
		parsedHostId: 0,
		activeLobbySettings: {} as ILobbySettings,
	};

	get socketClients(): SocketClientMap {
		return this.clients;
	}

	get playerSocketIds(): numberStringMap {
		const map: numberStringMap = {};
		for (const socketId of Object.keys(this.clients)) {
			map[this.clients[socketId].clientId] = socketId;
		}
		return map;
	}

	get isMobileRunning(): boolean {
		return this.mobileRunning;
	}

	setMobileRunning(running: boolean): void {
		this.mobileRunning = running;
	}

	setContext(context: Partial<ConnectionContext>): void {
		this.context = { ...this.context, ...context };
	}

	start(serverUrl: string, stream: MediaStream): void {
		if (this.started) return;
		this.started = true;
		this.stream = stream;

		const socket = io(serverUrl, { transports: ['websocket'] });
		this.socket = socket;

		socket.on('error', (error: SocketError) => {
			if (error.message) this.emit('error', error.message);
			console.error('socketIO error:', error);
			this.currentLobby = 'MENU';
		});

		socket.on('connect', () => this.emit('connected'));

		socket.on('disconnect', () => {
			this.currentLobby = 'MENU';
			this.destroyAllPeers();
			this.setClients({});
			this.emit('disconnected');
		});

		socket.on('setHost', (hostId: number) => this.emit('serverHost', hostId));

		socket.on('clientPeerConfig', (clientPeerConfig: ClientPeerConfig) => {
			if (!validateClientPeerConfig(clientPeerConfig)) {
				const errorsFormatted = (validateClientPeerConfig.errors ?? [])
					.map((error) => error.instancePath + ' ' + error.message)
					.join('\n');
				alert(
					`Server sent a malformed peer config. Default config will be used. See errors below:\n${errorsFormatted}`
				);
				return;
			}

			if (
				clientPeerConfig.forceRelayOnly &&
				!clientPeerConfig.iceServers.some((server) => server.urls.toString().includes('turn:'))
			) {
				alert('Server has forced relay mode enabled but provides no relay servers. Default config will be used.');
				return;
			}

			this.iceConfig = {
				iceTransportPolicy: clientPeerConfig.forceRelayOnly ? 'relay' : 'all',
				iceServers: clientPeerConfig.iceServers,
			};
		});

		socket.on('VAD', (data: { activity: boolean; client: Client; socketId: string }) => {
			this.emit('vad', data.client.clientId, data.activity);
		});

		socket.on('setClient', (socketId: string, client: Client) => {
			this.setClients({ ...this.clients, [socketId]: client });
		});

		socket.on('setClients', (clients: SocketClientMap) => {
			this.setClients(clients);
		});

		socket.on('join', (peer: string, client: Client) => {
			this.setClients({ ...this.clients, [peer]: client });
			if (!this.canReconnectPeer(peer) || this.peers.has(peer) || this.peerRetryTimers.has(peer)) return;
			this.createPeerConnection(peer, true, client);
		});

		socket.on('signal', ({ data, from, client }: { data: SignalData; from: string; client: Client }) => {
			if (Object.prototype.hasOwnProperty.call(data, 'mobilePlayerInfo')) {
				const mobileData = data as unknown as MobilePlayerInfo;
				if (mobileData.mobilePlayerInfo.code === this.context.lobbyCode && this.context.gameState !== GameState.MENU) {
					this.mobileRunning = true;
					this.emit('mobileDetected');
				}
				return;
			}

			if (!this.canReconnectPeer(from)) {
				console.warn('Signal from unknown socket, ignoring');
				return;
			}
			if (!Object.prototype.hasOwnProperty.call(data, 'type')) return;

			const existing = this.peers.get(from);
			if (data.type === 'offer') {
				if (this.peerOffers.get(from) === data.sdp && this.peerConnectionIds.get(from) === data.connectionId) return;
				// Both endpoints may retry at once. Keep exactly one of the competing offers.
				if (
					existing?.initiator &&
					(existing.connectionState === 'new' || existing.connectionState === 'connecting') &&
					socket.id! < from
				) {
					return;
				}
				const connection = this.createPeerConnection(from, false, client, data.connectionId);
				this.peerOffers.set(from, data.sdp);
				void connection.signal(data);
			} else if (existing) {
				// Older clients omit the ID; updated clients echo it for the entire handshake.
				if (data.connectionId !== undefined && data.connectionId !== this.peerConnectionIds.get(from)) return;
				if (data.type === 'answer' && !existing.initiator) return;
				void existing.signal(data);
			}
		});

		this.scheduleMobileBeacon();
	}

	stop(): void {
		if (!this.started) {
			this.removeAllListeners();
			return;
		}
		this.started = false;

		if (this.mobileBeaconTimer) {
			clearTimeout(this.mobileBeaconTimer);
			this.mobileBeaconTimer = undefined;
		}
		this.mobileRunning = false;

		this.socket?.emit('leave');
		this.destroyAllPeers();
		this.socket?.close();
		this.socket = undefined;
		this.stream = undefined;
		this.clients = {};
		this.currentLobby = '';
		this.removeAllListeners();
	}

	private scheduleMobileBeacon(): void {
		this.notifyMobilePlayers();
		this.mobileBeaconTimer = setTimeout(() => this.scheduleMobileBeacon(), MOBILE_BEACON_INTERVAL_MS);
	}

	private notifyMobilePlayers(): void {
		if (!this.started) return;
		const { gameState, lobbyCode, isHost } = this.context;
		if (!SettingsStore.store.mobileHost) return;
		if (gameState === GameState.MENU || gameState === GameState.UNKNOWN) return;

		this.socket?.emit('signal', {
			to: lobbyCode + '_mobile',
			data: { mobileHostInfo: { isHostingMobile: true, isGameHost: isHost } },
		});
	}

	joinLobby(
		lobbyCode: string,
		playerId: number,
		clientId: number,
		isHost: boolean,
		friendCode = '',
		playerUid = '',
		playerIdentifier = ''
	): void {
		if (!this.socket) return;

		if (lobbyCode === 'MENU') {
			this.leaveLobby();
			this.emit('lobbyReset');
			return;
		}

		if (this.currentLobby === lobbyCode) return;

		this.destroyAllPeers();
		this.setClients({});
		this.socket.emit('leave');
		this.socket.emit('id', playerId, clientId, friendCode, playerUid, playerIdentifier);
		this.socket.emit('join', lobbyCode, playerId, clientId, isHost);
		this.currentLobby = lobbyCode;
		this.emit('lobbyReset');
	}

	leaveLobby(): void {
		this.currentLobby = 'MENU';
		this.socket?.emit('leave');
		this.destroyAllPeers();
		this.setClients({});
	}

	emitId(playerId: number, clientId: number, friendCode = '', playerUid = '', playerIdentifier = ''): void {
		this.socket?.emit('id', playerId, clientId, friendCode, playerUid, playerIdentifier);
	}

	emitSetHost(lobbyCode: string, clientId: number): void {
		this.socket?.emit('setHost', lobbyCode, clientId);
	}

	emitVad(talking: boolean): void {
		this.socket?.emit('VAD', talking);
	}

	publishLobby(lobbyCode: string, lobby: Omit<PublicLobby, 'stateTime'>): void {
		this.socket?.emit('lobby', lobbyCode, lobby);
	}

	sendGameInfo(gameInfo: GameInfo): void {
		this.socket?.emit('gameinfo', gameInfo);
	}

	signalTo(target: string, data: unknown): void {
		this.socket?.emit('signal', { to: target, data });
	}

	replaceOutboundTrack(track: MediaStreamTrack): void {
		this.stream = new MediaStream([track]);
		for (const peer of this.peers.values()) {
			peer.replaceAudioTrack(track);
		}
	}

	broadcast(payload: string): void {
		for (const peer of this.peers.values()) {
			if (!peer.writable) continue;
			try {
				peer.send(payload);
			} catch (error) {
				console.warn('Failed to send to peer:', error);
			}
		}
	}

	sendToPeers(peerIds: string[], payload: string): void {
		for (const peerId of peerIds) {
			const peer = this.peers.get(peerId);
			if (peer?.writable) peer.send(payload);
		}
	}

	getClient(peerId: string): Client | undefined {
		return this.clients[peerId];
	}

	destroyAllPeers(): void {
		for (const peerId of new Set([...this.peers.keys(), ...this.peerRetryTimers.keys()])) {
			this.disconnectPeer(peerId);
		}
	}

	disconnectPeer(peerId: string): void {
		this.destroyPeer(peerId);
		this.peerRetryAttempts.delete(peerId);
	}

	private clearPeerTimer(timers: Map<string, ReturnType<typeof setTimeout>>, peerId: string): void {
		const timer = timers.get(peerId);
		if (timer !== undefined) clearTimeout(timer);
		timers.delete(peerId);
	}

	private destroyPeer(peerId: string): void {
		this.clearPeerTimer(this.iceDisconnectTimers, peerId);
		this.clearPeerTimer(this.peerConnectTimers, peerId);
		this.clearPeerTimer(this.peerRetryTimers, peerId);
		this.peerConnectionIds.delete(peerId);
		this.peerOffers.delete(peerId);

		const connection = this.peers.get(peerId);
		if (!connection) return;

		// Remove ownership before close callbacks can run.
		this.peers.delete(peerId);
		connection.destroy();
		this.emit('peerClosed', peerId);
	}

	private setClients(clients: SocketClientMap): void {
		this.clients = clients;
		for (const peerId of new Set([...this.peers.keys(), ...this.peerRetryTimers.keys()])) {
			if (!clients[peerId]) this.disconnectPeer(peerId);
		}
		this.emit('socketClients', this.clients);
	}

	private canReconnectPeer(peerId: string): boolean {
		return Boolean(
			this.started &&
			this.stream &&
			this.socket?.connected &&
			this.socket.id !== peerId &&
			this.currentLobby &&
			this.currentLobby !== 'MENU' &&
			this.clients[peerId]
		);
	}

	private retryPeer(peerId: string, connection: PeerConnection, reason: string): void {
		if (this.peers.get(peerId) !== connection) return;
		this.destroyPeer(peerId);
		if (!this.canReconnectPeer(peerId)) {
			this.peerRetryAttempts.delete(peerId);
			return;
		}

		const attempt = this.peerRetryAttempts.get(peerId) ?? 0;
		const delay = Math.min(PEER_RETRY_DELAY_MS * 2 ** Math.min(attempt, 4), MAX_PEER_RETRY_DELAY_MS);
		this.peerRetryAttempts.set(peerId, attempt + 1);
		console.warn('Reconnecting peer', peerId, 'in', delay, 'ms:', reason);
		this.peerRetryTimers.set(
			peerId,
			setTimeout(() => {
				this.peerRetryTimers.delete(peerId);
				if (!this.canReconnectPeer(peerId) || this.peers.has(peerId)) return;
				this.createPeerConnection(peerId, true, this.clients[peerId]);
			}, delay)
		);
	}

	private createPeerConnection(
		peer: string,
		initiator: boolean,
		client: Client,
		connectionId: string | undefined = initiator ? crypto.randomUUID() : undefined
	): PeerConnection {
		this.destroyPeer(peer);
		// A player refreshing gets a new socket ID. Retire the old socket's retries too.
		const clients = { ...this.clients };
		for (const [otherPeer, otherClient] of Object.entries(this.clients)) {
			if (otherPeer !== peer && otherClient.clientId === client.clientId) delete clients[otherPeer];
		}
		this.setClients(clients);

		const config = SettingsStore.store.natFix ? DEFAULT_ICE_CONFIG_TURN : this.iceConfig;
		const connection = new PeerConnection({
			stream: this.stream as MediaStream,
			initiator,
			config,
		});
		this.peers.set(peer, connection);
		if (connectionId !== undefined) this.peerConnectionIds.set(peer, connectionId);
		this.peerConnectTimers.set(
			peer,
			setTimeout(() => this.retryPeer(peer, connection, 'connection timed out'), PEER_CONNECT_TIMEOUT_MS)
		);

		connection.on('connect', () => {
			if (this.peers.get(peer) !== connection) return;
			this.clearPeerTimer(this.peerConnectTimers, peer);
			this.clearPeerTimer(this.iceDisconnectTimers, peer);
			this.peerRetryAttempts.delete(peer);
			setTimeout(() => {
				if (this.peers.get(peer) !== connection || !this.context.isHost || !connection.writable) return;
				try {
					connection.send(JSON.stringify(this.context.activeLobbySettings));
				} catch (error) {
					console.warn('failed to send lobby settings: ', error);
				}
			}, 1000);
		});

		connection.on('iceStateChange', (iceState: RTCIceConnectionState) => {
			if (this.peers.get(peer) !== connection) return;
			if (iceState === 'failed' || iceState === 'closed') {
				this.retryPeer(peer, connection, `ICE ${iceState}`);
				return;
			}
			if (iceState === 'connected' || iceState === 'completed') {
				this.clearPeerTimer(this.iceDisconnectTimers, peer);
				return;
			}

			if (iceState === 'disconnected' && !this.iceDisconnectTimers.has(peer)) {
				this.iceDisconnectTimers.set(
					peer,
					setTimeout(() => this.retryPeer(peer, connection, 'ICE stayed disconnected'), ICE_DISCONNECT_TIMEOUT_MS)
				);
			}
		});

		connection.on('stream', (stream: MediaStream) => {
			if (this.peers.get(peer) !== connection) return;
			this.emit('peerStream', peer, stream);
		});

		connection.on('signal', (data) => {
			if (this.peers.get(peer) !== connection || !this.socket?.connected) return;
			this.socket.emit('signal', { data: { ...data, connectionId }, to: peer });
		});

		connection.on('data', (data) => {
			if (this.peers.get(peer) !== connection) return;
			try {
				this.emit('peerData', peer, JSON.parse(data) as Record<string, unknown>);
			} catch (error) {
				console.warn('Failed to parse peer data', error);
			}
		});

		connection.on('close', () => this.retryPeer(peer, connection, 'connection closed'));

		connection.on('error', (error) => {
			this.retryPeer(peer, connection, error.message);
		});

		return connection;
	}
}
