export type SignalData =
	| { type: 'offer'; sdp: string }
	| { type: 'answer'; sdp: string }
	| { type: 'candidate'; candidate: RTCIceCandidateInit };

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
	private listeners: { [E in keyof PeerConnectionEvents]?: Listener<E>[] } = {};

	constructor({ initiator, stream, config }: PeerConnectionOptions) {
		this.initiator = initiator;
		this.pc = new RTCPeerConnection(config);

		stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));

		this.pc.onicecandidate = (event) => {
			if (event.candidate) {
				this.emit('signal', { type: 'candidate', candidate: event.candidate.toJSON() });
			}
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
			this.pc
				.createOffer()
				.then((offer) => this.pc.setLocalDescription(offer))
				.then(() => {
					const desc = this.pc.localDescription;
					if (desc?.sdp) this.emit('signal', { type: 'offer', sdp: desc.sdp });
				})
				.catch((err: Error) => this.emit('error', err));
		} else {
			this.pc.ondatachannel = (event) => this.setupDataChannel(event.channel);
		}
	}

	private setupDataChannel(channel: RTCDataChannel): void {
		this.dataChannel = channel;
		channel.onopen = () => this.emit('connect');
		channel.onmessage = (event) => this.emit('data', event.data);
		channel.onclose = () => this.emit('close');
		channel.onerror = () => this.emit('error', new Error('Data channel error'));
	}

	get writable(): boolean {
		return this.dataChannel?.readyState === 'open';
	}

	get connectionState(): RTCPeerConnectionState {
		return this.pc.connectionState;
	}

	on<E extends keyof PeerConnectionEvents>(event: E, listener: Listener<E>): void {
		(this.listeners[event] ??= []).push(listener);
	}

	private emit<E extends keyof PeerConnectionEvents>(event: E, ...args: PeerConnectionEvents[E]): void {
		this.listeners[event]?.forEach((listener) => listener(...args));
	}

	async signal(data: SignalData): Promise<void> {
		if (this.destroyed) return;
		try {
			if (data.type === 'offer' || data.type === 'answer') {
				await this.pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
				this.remoteDescriptionSet = true;
				if (this.pendingCandidates.length) {
					await Promise.all(this.pendingCandidates.map((candidate) => this.pc.addIceCandidate(candidate)));
					this.pendingCandidates = [];
				}
				if (data.type === 'offer') {
					const answer = await this.pc.createAnswer();
					await this.pc.setLocalDescription(answer);
					if (this.pc.localDescription?.sdp) {
						this.emit('signal', { type: 'answer', sdp: this.pc.localDescription.sdp });
					}
				}
			} else if (data.type === 'candidate') {
				if (this.remoteDescriptionSet) {
					await this.pc.addIceCandidate(data.candidate);
				} else {
					this.pendingCandidates.push(data.candidate);
				}
			}
		} catch (err) {
			this.emit('error', err instanceof Error ? err : new Error(String(err)));
		}
	}

	replaceAudioTrack(track: MediaStreamTrack): void {
		if (this.destroyed) return;
		const sender = this.pc.getSenders().find((candidate) => candidate.track?.kind === 'audio');
		sender?.replaceTrack(track).catch((error) => {
			console.warn('Failed to replace outgoing audio track:', error);
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
		this.listeners = {};
	}
}
