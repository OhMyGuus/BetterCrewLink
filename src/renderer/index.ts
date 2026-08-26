// Node globals required at runtime by browser-bundled deps (simple-peer -> randombytes/readable-stream)
if (typeof globalThis.global === 'undefined') globalThis.global = globalThis;
if (typeof globalThis.process === 'undefined') {
	globalThis.process = {
		env: {},
		nextTick: (fn: (...args: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => fn(...args)),
	} as unknown as NodeJS.Process;
}

if (typeof window !== 'undefined' && window.location) {
	const query = new URLSearchParams(window.location.search.substring(1));

	console.log('HEY');
	const view = query.get('view') || 'app';
	if (view === 'app') {
		import('./App');
	} else if (view === 'lobbies') {
		import('./LobbyBrowser/LobbyBrowserContainer');
	} else {
		import('./Overlay');
	}
}
