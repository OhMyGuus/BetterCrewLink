export type SignalData = (
	| { type: 'offer'; sdp: string }
	| { type: 'answer'; sdp: string }
	| { type: 'candidate'; candidate: RTCIceCandidateInit }
) & { connectionId?: string };

interface PeerConnectionEvents {
	connect: [];
	stream: [MediaStream];
	signal: [SignalData];
	data: [string];
	close: [];
	error: [Error];
	iceStateChange: [RTCIceConnectionState, RTCIceGatheringState];
}

type Listener<E extends keyof PeerConnectionEvents> = (...args: PeerConnectionEvents[E]) => void;

export interface PeerConnectionOptions {
	initiator: boolean;
	stream: MediaStream;
	config: RTCConfiguration;
}

export default class PeerConnection {
	readonly initiator: boolean;
	private pc: RTCPeerConnection;
	private dataChannel: RTCDataChannel | null = null;
	private destroyed = false;
	private remoteDescriptionSet = false;
	private pendingCandidates: RTCIceCandidateInit[] = [];
	private localDescriptionEmitted = false;
	private pendingLocalCandidates: RTCIceCandidateInit[] = [];
	private signalQueue: Promise<void> = Promise.resolve();
	private listeners: { [E in keyof PeerConnectionEvents]?: Listener<E>[] } = {};

	constructor({ initiator, stream, config }: PeerConnectionOptions) {
		this.initiator = initiator;
		this.pc = new RTCPeerConnection(config);

		stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));

		this.pc.onicecandidate = (event) => {
			if (this.destroyed || !event.candidate) return;
			const candidate = event.candidate.toJSON();
			if (this.localDescriptionEmitted) this.emit('signal', { type: 'candidate', candidate });
			else this.pendingLocalCandidates.push(candidate);
		};

		this.pc.ontrack = (event) => {
			const [remoteStream] = event.streams;
			if (remoteStream) this.emit('stream', remoteStream);
		};

		this.pc.oniceconnectionstatechange = () => {
			this.emit('iceStateChange', this.pc.iceConnectionState, this.pc.iceGatheringState);
		};

		this.pc.onconnectionstatechange = () => {
			if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
				this.emit('close');
			}
		};

		if (initiator) {
			const channel = this.pc.createDataChannel('data');
			this.setupDataChannel(channel);
			this.signalQueue = this.createOffer().catch((err) => {
				this.emit('error', err instanceof Error ? err : new Error(String(err)));
			});
		} else {
			this.pc.ondatachannel = (event) => this.setupDataChannel(event.channel);
		}
	}

	private setupDataChannel(channel: RTCDataChannel): void {
		if (this.destroyed) return;
		this.dataChannel = channel;
		channel.onopen = () => this.emit('connect');
		channel.onmessage = (event) => this.emit('data', event.data);
		channel.onclose = () => this.emit('close');
		channel.onerror = () => this.emit('error', new Error('Data channel error'));
	}

	get writable(): boolean {
		return !this.destroyed && this.dataChannel?.readyState === 'open';
	}

	get connectionState(): RTCPeerConnectionState {
		return this.pc.connectionState;
	}

	on<E extends keyof PeerConnectionEvents>(event: E, listener: Listener<E>): void {
		if (this.destroyed) return;
		(this.listeners[event] ??= []).push(listener);
	}

	private emit<E extends keyof PeerConnectionEvents>(event: E, ...args: PeerConnectionEvents[E]): void {
		for (const listener of this.listeners[event] ?? []) {
			if (this.destroyed) return;
			listener(...args);
		}
	}

	private async createOffer(): Promise<void> {
		const offer = await this.pc.createOffer();
		if (this.destroyed) return;
		await this.pc.setLocalDescription(offer);
		if (this.destroyed) return;
		this.emitLocalDescription('offer');
	}

	private emitLocalDescription(type: 'offer' | 'answer'): void {
		const sdp = this.pc.localDescription?.sdp;
		if (this.destroyed || !sdp) return;
		// A candidate can arrive before setLocalDescription resolves. Send the SDP first
		// so the receiver can associate every candidate with this negotiation.
		this.emit('signal', { type, sdp });
		if (this.destroyed) return;
		this.localDescriptionEmitted = true;
		for (const candidate of this.pendingLocalCandidates.splice(0)) {
			this.emit('signal', { type: 'candidate', candidate });
		}
	}

	signal(data: SignalData): Promise<void> {
		this.signalQueue = this.signalQueue
			.then(() => this.processSignal(data))
			.catch((err) => {
				this.emit('error', err instanceof Error ? err : new Error(String(err)));
			});
		return this.signalQueue;
	}

	private async processSignal(data: SignalData): Promise<void> {
		if (this.destroyed) return;
		if (data.type === 'offer' || data.type === 'answer') {
			await this.pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
			if (this.destroyed) return;
			this.remoteDescriptionSet = true;
			while (this.pendingCandidates.length) {
				await this.pc.addIceCandidate(this.pendingCandidates.shift()!);
				if (this.destroyed) return;
			}
			if (data.type === 'offer') {
				this.localDescriptionEmitted = false;
				const answer = await this.pc.createAnswer();
				if (this.destroyed) return;
				await this.pc.setLocalDescription(answer);
				if (this.destroyed) return;
				this.emitLocalDescription('answer');
			}
		} else if (data.type === 'candidate') {
			if (this.remoteDescriptionSet) {
				await this.pc.addIceCandidate(data.candidate);
			} else {
				this.pendingCandidates.push(data.candidate);
			}
		}
	}

	replaceAudioTrack(track: MediaStreamTrack): void {
		if (this.destroyed) return;
		const sender = this.pc.getSenders().find((candidate) => candidate.track?.kind === 'audio');
		sender?.replaceTrack(track).catch((error) => {
			if (!this.destroyed) console.warn('Failed to replace outgoing audio track:', error);
		});
	}

	send(data: string): void {
		if (this.writable) {
			this.dataChannel!.send(data);
		}
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.listeners = {};
		this.pendingCandidates = [];
		this.pendingLocalCandidates = [];
		this.pc.onicecandidate = null;
		this.pc.ontrack = null;
		this.pc.oniceconnectionstatechange = null;
		this.pc.onconnectionstatechange = null;
		this.pc.ondatachannel = null;
		if (this.dataChannel) {
			this.dataChannel.onopen = null;
			this.dataChannel.onmessage = null;
			this.dataChannel.onclose = null;
			this.dataChannel.onerror = null;
		}
		try {
			this.dataChannel?.close();
		} catch {
			/* empty */
		}
		try {
			this.pc.close();
		} catch {
			/* empty */
		}
		this.dataChannel = null;
	}
}
