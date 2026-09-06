// Smoke test: verifies the externalized CommonJS dependencies load under
// Node's ESM loader the same way the packaged main process imports them
// (default import + destructure). Catches CJS/ESM interop regressions — e.g.
// "Named export 'X' not found" — at build time instead of at runtime.
const checks = [
	['memoryjs', ['findModule', 'getProcesses', 'openProcess', 'readBuffer', 'readMemory', 'findPattern', 'virtualAllocEx', 'writeBuffer', 'writeMemory', 'getProcessPath']],
	['electron-overlay-window', ['overlayWindow']],
	['node-keyboard-watcher', ['keyboardWatcher']],
	['registry-js', ['enumerateValues', 'enumerateKeys', 'HKEY']],
	['vdf-parser', ['parse']],
	['electron-devtools-installer', ['default', 'installExtension', 'REACT_DEVELOPER_TOOLS']],
];

let failed = false;
for (const [name, keys] of checks) {
	try {
		const mod = await import(name);
		const exported = mod.default ?? mod;
		const missing = keys.filter((k) => !(k in exported));
		if (missing.length > 0) {
			console.error(`FAIL ${name}: missing export(s): ${missing.join(', ')}`);
			failed = true;
		} else {
			console.log(`ok ${name}`);
		}
	} catch (err) {
		console.error(`FAIL ${name}: ${err.message}`);
		failed = true;
	}
}

if (failed) {
	process.exit(1);
}
console.log('ESM interop check passed');
