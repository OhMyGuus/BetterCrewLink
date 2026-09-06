export type EventMap = Record<string, unknown[]>;

type Listener<A extends unknown[]> = (...args: A) => void;

export class TypedEmitter<E extends EventMap> {
	private listeners: { [K in keyof E]?: Listener<E[K]>[] } = {};

	on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
		(this.listeners[event] ??= []).push(listener);
		return () => this.off(event, listener);
	}

	off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
		const bucket = this.listeners[event];
		if (!bucket) return;
		const index = bucket.indexOf(listener);
		if (index !== -1) bucket.splice(index, 1);
	}

	protected emit<K extends keyof E>(event: K, ...args: E[K]): void {
		const bucket = this.listeners[event];
		if (!bucket) return;
		for (const listener of bucket.slice()) {
			listener(...args);
		}
	}

	protected removeAllListeners(): void {
		this.listeners = {};
	}
}
