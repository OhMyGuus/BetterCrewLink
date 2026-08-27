import electronUpdater from 'electron-updater';
import { app, BrowserWindow, ipcMain, session, net, protocol } from 'electron';
import windowStateKeeper from 'electron-window-state';
import { platform } from 'os';
import { join as joinPath } from 'path';
import { pathToFileURL } from 'url';
import './hook';
import overlayWindowModule from 'electron-overlay-window';
const { overlayWindow } = overlayWindowModule;
import { initializeIpcHandlers, initializeIpcListeners } from './ipc-handlers';
import { initSettingsIpc } from './settingsStore';
import { IpcRendererMessages, IpcHandlerMessages } from '../common/ipc-messages';
import type { ProgressInfo, UpdateInfo } from 'builder-util-runtime';
import Store from 'electron-store';
import { ISettings } from '../common/ISettings';
import devtoolsInstaller from 'electron-devtools-installer';
// Node's ESM/CJS interop resolves the default import to the whole CJS module object here.
const { default: installExtension, REACT_DEVELOPER_TOOLS } =
	devtoolsInstaller as unknown as typeof import('electron-devtools-installer');
import { gameReader } from './hook';
import { GenerateHat } from './avatarGenerator';
import minimist from 'minimist';
const args = minimist(process.argv);
const isDevelopment = !app.isPackaged;
const devTools = (isDevelopment || args.dev === 1) && true;
const { autoUpdater } = electronUpdater;
const appVersion: string = isDevelopment ? 'DEV' : autoUpdater.currentVersion.version;

app.userAgentFallback = `BetterCrewLink/${appVersion} (win32)`;

declare global {
	namespace NodeJS {
		interface Global {
			mainWindow: BrowserWindow | null;
			overlay: BrowserWindow | null;
			lobbyBrowser: BrowserWindow | null;
		}
	}
}

protocol.registerSchemesAsPrivileged([
	{ scheme: 'static', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
	{ scheme: 'generate', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
	{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// global reference to mainWindow (necessary to prevent window from being garbage collected)
global.mainWindow = null;
global.overlay = null;
const store = new Store<ISettings>();
app.commandLine.appendSwitch('disable-pinch');

if (platform() === 'linux' || !store.get('hardware_acceleration', true)) {
	app.disableHardwareAcceleration();
}

if (platform() === 'linux') {
	app.commandLine.appendSwitch('disable-gpu-sandbox');
}

const rendererUrl = process.env['ELECTRON_RENDERER_URL'];

function loadView(window: BrowserWindow, view: 'app' | 'lobbies' | 'overlay'): void {
	if (isDevelopment && rendererUrl) {
		window.loadURL(`${rendererUrl}?version=DEV&view=${view}`);
	} else {
		window.loadFile(joinPath(import.meta.dirname, '../renderer/index.html'), {
			query: { version: appVersion, view },
		});
	}
}

function preload(): string {
	return joinPath(import.meta.dirname, '../preload/index.mjs');
}

function createMainWindow() {
	const mainWindowState = windowStateKeeper({});

	const window = new BrowserWindow({
		title: 'BetterCrewLink',
		width: 250,
		height: 350,
		maxWidth: 250,
		minWidth: 250,
		maxHeight: 350,
		minHeight: 350,
		x: mainWindowState.x,
		y: mainWindowState.y,
		resizable: false,
		frame: false,
		fullscreenable: false,
		maximizable: false,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			preload: preload(),
		},
	});
	mainWindowState.manage(window);

	if (devTools) {
		//Force devtools into detached mode otherwise they are unusable
		window.on('ready-to-show', () => {
			window.webContents.openDevTools({
				mode: 'detach',
			});
		});
	}


	loadView(window, 'app');

	window.on('closed', () => {
		try {
			const mainWindow = global.mainWindow;
			const overlay = global.overlay;
			global.mainWindow = null;
			global.overlay = null;
			overlay?.close();
			mainWindow?.destroy();
			overlay?.destroy();
		} catch {
			/* empty */
		}
	});

	window.webContents.on('devtools-opened', () => {
		window.focus();
		setImmediate(() => {
			window.focus();
		});
	});
	console.log('Opened app version: ', appVersion);
	return window;
}

function createLobbyBrowser() {
	const window = new BrowserWindow({
		title: 'BetterCrewLink Browser',
		width: 900,
		height: 500,
		minWidth: 250,
		minHeight: 350,
		resizable: true,
		frame: false,
		fullscreenable: false,
		closable: true,
		maximizable: false,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			preload: preload(),
		},
	});

	window.on('closed', () => {
		global.lobbyBrowser = null;
	});
	loadView(window, 'lobbies');
	console.log('Opened app version: ', appVersion);
	return window;
}

function createOverlay() {
	const overlay = new BrowserWindow({
		title: 'BetterCrewLink Overlay',
		width: 400,
		height: 300,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			preload: preload(),
		},
		fullscreenable: true,
		skipTaskbar: true,
		frame: false,
		show: false,
		transparent: true,
		resizable: true,
		focusable: false,

		//	...overlayWindow.WINDOW_OPTS,
	});

	if (devTools) {
		overlay.webContents.openDevTools({
			mode: 'detach',
		});
	}

	loadView(overlay, 'overlay');
	overlay.setIgnoreMouseEvents(true);
	overlayWindow.attachTo(overlay, 'Among Us');
	overlay.setBackgroundColor('#00000000');
	return overlay;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
} else {
	autoUpdater.autoDownload = false;
	autoUpdater.checkForUpdates().catch(() => {
		/* swallow unhandled rejection; 'error' event reports it */
	});
	autoUpdater.on('update-available', (info: UpdateInfo) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'available',
				info: info,
			});
		} catch {
			/* Empty block */
		}
	});
	autoUpdater.on('error', (err: Error) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'error',
				error: err.message,
			});
		} catch {
			/*empty*/
		}
	});
	autoUpdater.on('download-progress', (progress: ProgressInfo) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'downloading',
				progress,
			});
		} catch {
			/*empty*/
		}
	});
	autoUpdater.on('update-downloaded', () => {
		autoUpdater.quitAndInstall();
	});

	// quit application when all windows are closed
	app.on('window-all-closed', () => {
		// on macOS it is common for applications to stay open until the user explicitly quits
		try {
			const mainWindow = global.mainWindow;
			const overlay = global.overlay;
			global.mainWindow = null;
			global.overlay = null;
			overlay?.close();
			mainWindow?.destroy();
			overlay?.destroy();
		} catch {
			/* empty */
		}
		app.quit();
	});

	app.on('activate', () => {
		console.log('ACTIVATE???');
		// on macOS it is common to re-create a window even after all windows have been closed
		if (global.mainWindow === null) {
			global.mainWindow = createMainWindow();
		}

		session.fromPartition('default').setPermissionRequestHandler((webContents, permission, callback) => {
			const allowedPermissions = ['audioCapture']; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest
			console.log('permission requested ', permission);
			if (allowedPermissions.includes(permission)) {
				callback(true); // Approve permission request
			} else {
				console.error(
					`The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
				);

				callback(false); // Deny
			}
		});
	});

	// create main BrowserWindow when electron is ready
	app.whenReady().then(() => {
		protocol.handle('static', (request) => {
			const url = new URL(request.url);
			const filePath = app.getPath('userData') + '/static/' + decodeURIComponent(url.host + url.pathname);
			return net.fetch(pathToFileURL(filePath).toString());
		});

		protocol.handle('generate', async (request) => {
			const requestUrl = new URL(request.url);
			const imagePath = new URL(requestUrl.searchParams.get('url')!);
			const filePath = await GenerateHat(imagePath, gameReader.playercolors, Number(requestUrl.searchParams.get('color')));
			return net.fetch(pathToFileURL(filePath).toString());
		});

		protocol.handle('app', (request) => {
			const { pathname } = new URL(request.url);
			const filePath = joinPath(import.meta.dirname, '../renderer', decodeURIComponent(pathname));
			return net.fetch(pathToFileURL(filePath).toString());
		});

		initializeIpcListeners();
		initializeIpcHandlers();
		initSettingsIpc();
		global.mainWindow = createMainWindow();

		if (isDevelopment)
			installExtension(REACT_DEVELOPER_TOOLS)
				.then((name: unknown) => console.log(`Added Extension:  ${name}`))
				.catch((err: string) => console.log('An error occurred: ', err));
	});

	app.on('second-instance', () => {
		// Someone tried to run a second instance, we should focus our window.
		if (global.mainWindow) {
			if (global.mainWindow.isMinimized()) global.mainWindow.restore();
			global.mainWindow.focus();
		}
	});

	ipcMain.on('update-app', () => {
		autoUpdater.downloadUpdate();
	});

	ipcMain.on(IpcHandlerMessages.OPEN_LOBBYBROWSER, () => {
		if (!global.lobbyBrowser) {
			global.lobbyBrowser = createLobbyBrowser();
		} else {
			global.lobbyBrowser.show();
			global.lobbyBrowser.moveTop();
		}
	});

	ipcMain.on('enableOverlay', async (_event, enable) => {
		setTimeout(() => {
			try {
				if (enable) {
					if (!global.overlay) {
						global.overlay = createOverlay();
					}
					overlayWindow.show();
				} else {
					overlayWindow.hide();
					if (global.overlay?.closable) {
						overlayWindow.stop();
						global.overlay?.close();
						global.overlay = null;
					}
				}
			} catch {
				global.overlay?.hide();
				global.overlay?.close();
			}
		}, 1000);
	});

	ipcMain.on('setAlwaysOnTop', async (_event, enable) => {
		console.log('SETALWAYSONTOP?');
		if (global.mainWindow) {
			console.log('SETALWAYSONTOP?1');
			global.mainWindow.setAlwaysOnTop(enable, 'screen-saver');
		}
	});
}
