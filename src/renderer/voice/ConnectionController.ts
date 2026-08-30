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

const PEER_DEDUPE_WINDOW_MS = 1500;
const ICE_DISCONNECT_TEARDOWN_MS = 12000;
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
	private peerCreatedAt = new Map<string, number>();
	private iceRestartTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
			this.clients = { ...this.clients, [socketId]: client };
			this.emit('socketClients', this.clients);
		});

		socket.on('setClients', (clients: SocketClientMap) => {
			this.clients = clients;
			this.emit('socketClients', this.clients);
		});

		socket.on('join', (peer: string, client: Client) => {
			this.createPeerConnection(peer, true, client);
			this.clients = { ...this.clients, [peer]: client };
			this.emit('socketClients', this.clients);
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

			if (!this.clients[from]) {
				console.warn('Signal from unknown socket, ignoring');
				return;
			}
			if (!Object.prototype.hasOwnProperty.call(data, 'type')) return;

			const existing = this.peers.get(from);
			const connection = existing && data.type !== 'offer' ? existing : this.createPeerConnection(from, false, client);
			void connection.signal(data);
		});

		this.scheduleMobileBeacon();
	}

	stop(): void {
		if (!this.started) return;
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

	joinLobby(lobbyCode: string, playerId: number, clientId: number, isHost: boolean): void {
		if (!this.socket) return;

		if (lobbyCode === 'MENU') {
			this.destroyAllPeers();
			this.clients = {};
			this.emit('socketClients', this.clients);
			this.currentLobby = lobbyCode;
			this.emit('lobbyReset');
			return;
		}

		if (this.currentLobby === lobbyCode) return;

		this.socket.emit('leave');
		this.socket.emit('id', playerId, clientId);
		this.socket.emit('join', lobbyCode, playerId, clientId, isHost);
		this.currentLobby = lobbyCode;
		this.emit('lobbyReset');
	}

	leaveLobby(): void {
		this.socket?.emit('leave');
		this.destroyAllPeers();
		this.currentLobby = 'MENU';
	}

	emitId(playerId: number, clientId: number): void {
		this.socket?.emit('id', playerId, clientId);
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
		for (const peerId of Array.from(this.peers.keys())) {
			this.disconnectPeer(peerId);
		}
	}

	disconnectPeer(peerId: string): void {
		const timer = this.iceRestartTimers.get(peerId);
		if (timer) {
			clearTimeout(timer);
			this.iceRestartTimers.delete(peerId);
		}

		const connection = this.peers.get(peerId);
		if (!connection) return;

		connection.destroy();
		this.peers.delete(peerId);
		this.peerCreatedAt.delete(peerId);
		this.emit('peerClosed', peerId);
	}

	private disconnectExistingClient(client: Client): void {
		if (!client || !client.clientId) return;
		const existingPeerId = this.playerSocketIds[client.clientId];
		if (existingPeerId) this.disconnectPeer(existingPeerId);
	}

	private createPeerConnection(peer: string, initiator: boolean, client: Client): PeerConnection {
		const existing = this.peers.get(peer);
		const lastCreated = this.peerCreatedAt.get(peer) ?? 0;
		if (
			existing &&
			Date.now() - lastCreated < PEER_DEDUPE_WINDOW_MS &&
			existing.connectionState !== 'failed' &&
			existing.connectionState !== 'closed'
		) {
			return existing;
		}

		this.peerCreatedAt.set(peer, Date.now());
		this.disconnectExistingClient(client);

		const config = SettingsStore.store.natFix ? DEFAULT_ICE_CONFIG_TURN : this.iceConfig;
		const connection = new PeerConnection({
			stream: this.stream as MediaStream,
			initiator,
			config,
		});
		this.peers.set(peer, connection);

		connection.on('connect', () => {
			setTimeout(() => {
				if (!this.context.isHost || !connection.writable) return;
				try {
					connection.send(JSON.stringify(this.context.activeLobbySettings));
				} catch (error) {
					console.warn('failed to send lobby settings: ', error);
				}
			}, 1000);
		});

		connection.on('iceStateChange', (iceState: RTCIceConnectionState) => {
			const existingTimer = this.iceRestartTimers.get(peer);
			if (iceState === 'connected' || iceState === 'completed' || iceState === 'failed' || iceState === 'closed') {
				if (existingTimer) {
					clearTimeout(existingTimer);
					this.iceRestartTimers.delete(peer);
				}
				return;
			}

			if (iceState === 'disconnected' && !existingTimer) {
				this.iceRestartTimers.set(
					peer,
					setTimeout(() => {
						this.iceRestartTimers.delete(peer);
						console.warn('ICE stayed disconnected for peer', peer, '- tearing down');
						this.disconnectPeer(peer);
					}, ICE_DISCONNECT_TEARDOWN_MS)
				);
			}
		});

		connection.on('stream', (stream: MediaStream) => {
			this.emit('peerStream', peer, stream);
		});

		connection.on('signal', (data) => {
			this.socket?.emit('signal', { data, to: peer });
		});

		connection.on('data', (data) => {
			try {
				this.emit('peerData', peer, JSON.parse(data) as Record<string, unknown>);
			} catch (error) {
				console.warn('Failed to parse peer data', error);
			}
		});

		connection.on('close', () => this.disconnectPeer(peer));

		connection.on('error', (error) => {
			console.warn('Peer connection error for', peer, ':', error);
		});

		return connection;
	}
}
