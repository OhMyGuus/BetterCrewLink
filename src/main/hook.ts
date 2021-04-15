import { ipcMain } from 'electron';
import GameReader from './GameReader';
// import iohook from 'iohook';
import { keyboardWatcher } from 'node-keyboard-watcher';
import Store from 'electron-store';
import { ISettings } from '../common/ISettings';
import { IpcHandlerMessages, IpcRendererMessages, IpcSyncMessages } from '../common/ipc-messages';
// import { GenerateAvatars } from './avatarGenerator';

const store = new Store<ISettings>();

const currentPlayerConfigMap = store.get('playerConfigMap', {});
const playerConfigMapLength = Object.keys(currentPlayerConfigMap).length;
console.log('CONFIG count: ', playerConfigMapLength);
if (playerConfigMapLength > 50) {
	store.set('playerConfigMap', {});
}

let readingGame = false;
let gameReader: GameReader;

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

ipcMain.on(IpcSyncMessages.GET_INITIAL_STATE, (event) => {
	if (!readingGame) {
		console.error('Recieved GET_INITIAL_STATE message before the START_HOOK message was received');
		event.returnValue = null;
		return;
	}
	event.returnValue = gameReader.lastState;
});

ipcMain.handle(IpcHandlerMessages.START_HOOK, async (event) => {
	if (!readingGame) {
		readingGame = true;
		resetKeyHooks();

		keyboardWatcher.on('keydown', (keyId: number) => {
			if (keyCodeMatches(pushToTalkShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.PUSH_TO_TALK, true);
			}
			if (keyCodeMatches(impostorRadioShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.IMPOSTOR_RADIO, true);
			}
		});

		keyboardWatcher.on('keyup', (keyId: number) => {
			if (keyCodeMatches(pushToTalkShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.PUSH_TO_TALK, false);
			}
			if (keyCodeMatches(deafenShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.TOGGLE_DEAFEN);
			}
			if (keyCodeMatches(muteShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.TOGGLE_MUTE);
			}
			if (keyCodeMatches(impostorRadioShortcut!, keyId)) {
				event.sender.send(IpcRendererMessages.IMPOSTOR_RADIO, false);
			}
		});

		keyboardWatcher.start();

		// Read game memory
		gameReader = new GameReader(event.sender.send.bind(event.sender));
		let gotError = false;
		const frame = () => {
			const err = gameReader.loop();
			if (err) {
				// readingGame = false;
				gotError = true;
				event.sender.send(IpcRendererMessages.ERROR, err);
				setTimeout(frame, 5000);
			} else {
				if (gotError) {
					event.sender.send(IpcRendererMessages.ERROR, '');
					gotError = false;
				}

				setTimeout(frame, 1000 / 5);
			}
		};
		frame();
	} else if (gameReader) {
		gameReader.amongUs = null;
	}
});

ipcMain.on('reload', async () => {
	global.mainWindow?.reload();
	//	global.overlay?.reload();
});

// GenerateAvatars().then(() => console.log("done generate")).catch((e) => console.error(e));

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
