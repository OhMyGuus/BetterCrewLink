import { app, ipcMain } from 'electron';
import GameReader from './GameReader';
import { keyboardWatcher } from 'node-keyboard-watcher';
import Store from 'electron-store';
import { ISettings } from '../common/ISettings';
import { IpcHandlerMessages, IpcMessages, IpcRendererMessages, IpcSyncMessages } from '../common/ipc-messages';

const store = new Store<ISettings>();

const currentPlayerConfigMap = store.get('playerConfigMap', {});
const playerConfigMapLength = Object.keys(currentPlayerConfigMap).length;
console.log('CONFIG count: ', playerConfigMapLength);
if (playerConfigMapLength > 50) {
	store.set('playerConfigMap', {});
}

let readingGame = false;
export let gameReader: GameReader;

let pushToTalkShortcut: K | undefined;
let deafenShortcut: K | undefined;
let muteShortcut: K | undefined;
let impostorRadioShortcut: K | undefined;
function resetKeyHooks(): void {
	pushToTalkShortcut = store.get('pushToTalkShortcut', 'V') as K;
	deafenShortcut = store.get('deafenShortcut', 'RControl') as K;
	muteShortcut = store.get('muteShortcut', 'RAlt') as K;
	impostorRadioShortcut = store.get('impostorRadioShortcut', 'F') as K;
	keyboardWatcher.clearKeyHooks();
	addKeyHandler(pushToTalkShortcut);
	addKeyHandler(deafenShortcut);
	addKeyHandler(muteShortcut);
	addKeyHandler(impostorRadioShortcut);
}

ipcMain.on(IpcHandlerMessages.RESET_KEYHOOKS, () => {
	resetKeyHooks();
});

ipcMain.on(IpcHandlerMessages.JOIN_LOBBY, (event, lobbycode, server) => {
	const tryjoin = gameReader?.joinGame(lobbycode, server);
	console.log('JOIN LOBBY:', lobbycode, tryjoin);

	if (!tryjoin) {
		event.reply(IpcHandlerMessages.JOIN_LOBBY_ERROR, lobbycode, server);
	}
});

ipcMain.on(IpcSyncMessages.GET_INITIAL_STATE, (event) => {
	if (!readingGame) {
		console.error('Recieved GET_INITIAL_STATE message before the START_HOOK message was received');
		event.returnValue = null;
		return;
	}
	event.returnValue = gameReader.lastState;
});

ipcMain.handle(IpcMessages.REQUEST_MOD, () => {
	return gameReader.loadedMod.id;
});

ipcMain.handle(IpcHandlerMessages.START_HOOK, async (event) => {
	if (!readingGame) {
		readingGame = true;
		let speaking: number = 0
		resetKeyHooks();

		keyboardWatcher.on('keydown', (keyId: number) => {
			if (keyCodeMatches(pushToTalkShortcut!, keyId)) {
				speaking += 1;
			}
			if (keyCodeMatches(impostorRadioShortcut!, keyId) && gameReader.lastState.players?.find((value) => {return value.clientId === gameReader.lastState.clientId})?.isImpostor) {
				speaking += 1;
				event.sender.send(IpcRendererMessages.IMPOSTOR_RADIO, true);
			}

			// Cover weird cases which shouldn't happen but just in case
			if (speaking > 2) {
				speaking = 2;
			}
			if (speaking) {
				event.sender.send(IpcRendererMessages.PUSH_TO_TALK, true);
			}
		});

		keyboardWatcher.on('keyup', (keyId: number) => {
			if (keyCodeMatches(pushToTalkShortcut!, keyId)) {
				speaking -= 1;
			}
			if (keyCodeMatches(deafenShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.TOGGLE_DEAFEN);
			}
			if (keyCodeMatches(muteShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.TOGGLE_MUTE);
			}
			if (keyCodeMatches(impostorRadioShortcut!, keyId) && gameReader.lastState.players?.find((value) => {return value.clientId === gameReader.lastState.clientId})?.isImpostor) {
				speaking -= 1;
				event.sender.send(IpcRendererMessages.IMPOSTOR_RADIO, false);
			}

			// Cover weird cases which shouldn't happen but just in case
			if (speaking < 0) {
				speaking = 0;
			}
			if (!speaking) {
				event.sender.send(IpcRendererMessages.PUSH_TO_TALK, false);
			}
		});

		keyboardWatcher.start();

		// Read game memory
		gameReader = new GameReader(event.sender.send.bind(event.sender));
		let gotError = false;
		const frame = async () => {
			const err = await gameReader.loop();
			if (err) {
				// readingGame = false;
				gotError = true;
				event.sender.send(IpcRendererMessages.ERROR, err);
				setTimeout(frame, 7500);
			} else {
				if (gotError) {
					event.sender.send(IpcRendererMessages.ERROR, '');
					gotError = false;
				}

				setTimeout(frame, 1000 / 5);
			}
		};
		await frame();
	} else if (gameReader) {
		gameReader.amongUs = null;
		gameReader.checkProcessDelay = 0;
	}
});

ipcMain.on('reload', async (_, lobbybrowser) => {
	if (!lobbybrowser) {
		global.mainWindow?.reload();
	}
	global.lobbyBrowser?.reload();
});

ipcMain.on('minimize', async (_, lobbybrowser) => {
	if (!lobbybrowser) {
		global.mainWindow?.minimize();
	}
	global.lobbyBrowser?.minimize();
});

ipcMain.handle("getlocale", () => {
	return app.getLocale();
});

ipcMain.on('relaunch', async () => {
	app.relaunch();  
	app.exit();
});

const keycodeMap = {
	Space: 0x20,
	Backspace: 0x08,
	Delete: 0x2e,
	Enter: 0x0d,
	Up: 0x26,
	Down: 0x28,
	Left: 0x24,
	Right: 0x27,
	Home: 0x24,
	End: 0x23,
	PageUp: 0x21,
	PageDown: 0x22,
	Escape: 0x1b,
	Control: 0x11,
	LShift: 0xa0,
	RShift: 0xa1,
	RAlt: 0xa5,
	LAlt: 0xa4,
	RControl: 0xa3,
	LControl: 0xa2,
	Shift: 0x10,
	Alt: 0x12,
	F1: 0x70,
	F2: 0x71,
	F3: 0x72,
	F4: 0x73,
	F5: 0x74,
	F6: 0x75,
	F7: 0x76,
	F8: 0x77,
	F9: 0x78,
	F10: 0x79,
	F11: 0x7a,
	F12: 0x7b,
	MouseButton4: 0x05,
	MouseButton5: 0x06,
	Numpad0: 0x60,
	Numpad1: 0x61,
	Numpad2: 0x62,
	Numpad3: 0x63,
	Numpad4: 0x64,
	Numpad5: 0x65,
	Numpad6: 0x66,
	Numpad7: 0x67,
	Numpad8: 0x68,
	Numpad9: 0x69,
	Disabled: -1,
};
type K = keyof typeof keycodeMap;

function keyCodeMatches(key: K, keyId: number): boolean {
	if (keycodeMap[key]) return keycodeMap[key] === keyId;
	else if (key && key.length === 1) return key.charCodeAt(0) === keyId;
	else {
		console.error('Invalid key', key);
		return false;
	}
}

function addKeyHandler(key: K) {
	if (keycodeMap[key] && keycodeMap[key] !== -1) {
		keyboardWatcher.addKeyHook(keycodeMap[key]);
	} else if (key && key.length === 1) {
		keyboardWatcher.addKeyHook(key.charCodeAt(0));
	}
}
