declare module 'node-keyboard-watcher' {
	import { EventEmitter } from 'events';
	export const keyboardWatcher: EventEmitter & {
		start(): void;
		stop(): void;
		addKeyHook(keyCode: number): void;
		removeKeyHook(keyCode: number): void;
		clearKeyHooks(): void;
	};
}
