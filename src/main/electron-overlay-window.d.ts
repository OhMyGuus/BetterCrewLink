declare module 'electron-overlay-window' {
	export const WINDOW_OPTS: Record<string, unknown>;
	export const overlayWindow: {
		attachTo(window: unknown, target: string): void;
		detach(): void;
		show(): void;
		hide(): void;
		stop(): void;
	};
}
