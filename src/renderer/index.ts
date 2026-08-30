// Node globals required at runtime by browser-bundled deps
if (typeof globalThis.global === 'undefined') globalThis.global = globalThis;
if (typeof globalThis.process === 'undefined') {
	globalThis.process = {
		env: {},
		nextTick: (fn: (...args: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => fn(...args)),
	} as unknown as NodeJS.Process;
}

if (typeof window !== 'undefined' && window.location) {
	const query = new URLSearchParams(window.location.search.substring(1));

	const view = query.get('view') || 'app';
	if (view === 'app') {
		import('./views/App');
	} else if (view === 'lobbies') {
		import('./views/LobbyBrowser/LobbyBrowserContainer');
	} else if (view === 'settings') {
		import('./views/SettingsWindow');
	} else {
		import('./views/Overlay');
	}
}
