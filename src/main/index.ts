'use strict'; // eslint-disable-line

import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import windowStateKeeper from 'electron-window-state';
import { platform } from 'os';
import { join as joinPath } from 'path';
import { format as formatUrl } from 'url';
import './hook';
import { overlayWindow } from 'electron-overlay-window';
import { initializeIpcHandlers, initializeIpcListeners } from './ipc-handlers';
import { IpcRendererMessages, IpcHandlerMessages } from '../common/ipc-messages';
import { ProgressInfo, UpdateInfo } from 'builder-util-runtime';
import { protocol } from 'electron';
import Store from 'electron-store';
import { ISettings } from '../common/ISettings';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { gameReader } from './hook';
import { GenerateHat } from './avatarGenerator';
const args = require('minimist')(process.argv); // eslint-disable-line
const isDevelopment = process.env.NODE_ENV !== 'production';
const devTools = (isDevelopment || args.dev === 1) && true;

declare global {
	namespace NodeJS {
		// eslint-disable-line
		interface Global {
			mainWindow: BrowserWindow | null;
			overlay: BrowserWindow | null;
			lobbyBrowser: BrowserWindow | null;
		}
	}
}
// global reference to mainWindow (necessary to prevent window from being garbage collected)
global.mainWindow = null;
global.overlay = null;
const store = new Store<ISettings>();
app.commandLine.appendSwitch('disable-pinch');

if (platform() === 'linux' || !store.get('hardware_acceleration', true)) {
	app.disableHardwareAcceleration();

}

if(platform() === 'linux'){
	app.commandLine.appendSwitch('disable-gpu-sandbox');
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
			nodeIntegration: true,
			contextIsolation: false
		},
	});
	mainWindowState.manage(window);

	if (devTools) {
		//Force devtools into detached mode otherwise they are unusable
		window.on('ready-to-show', () => {
			window.webContents.openDevTools({
				mode: 'detach',
			});
		})
	}

	let crewlinkVersion: string;
	if (isDevelopment) {
		crewlinkVersion = '0.0.0';
		window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?version=DEV&view=app`);
	} else {
		crewlinkVersion = autoUpdater.currentVersion.version;
		window.loadURL(
			formatUrl({
				pathname: joinPath(__dirname, 'index.html'),
				protocol: 'file',
				query: {
					version: autoUpdater.currentVersion.version,
					view: 'app',
				},
				slashes: true,
			})
		);
	}
	//window.webContents.userAgent = `CrewLink/${crewlinkVersion} (${process.platform})`;
	window.webContents.userAgent = `BetterCrewLink/3.0.1 (win32)`;

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
	console.log('Opened app version: ', crewlinkVersion);
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
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	window.on('closed', () => {
		global.lobbyBrowser = null;
	});
	// if (devTools) {
	// 	// Force devtools into detached mode otherwise they are unusable
	// 	window.webContents.openDevTools({
	// 		mode: 'detach',
	// 	});
	// }
	let crewlinkVersion: string;
	if (isDevelopment) {
		crewlinkVersion = '0.0.0';
		window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?version=DEV&view=lobbies`);
	} else {
		crewlinkVersion = autoUpdater.currentVersion.version;
		window.loadURL(
			formatUrl({
				pathname: joinPath(__dirname, 'index.html'),
				protocol: 'file',
				query: {
					version: autoUpdater.currentVersion.version,
					view: 'lobbies',
				},
				slashes: true,
			})
		);
	}
	window.webContents.userAgent = `BetterCrewLink/3.0.1 (win32)`;
	console.log('Opened app version: ', crewlinkVersion);
	return window;
}

function createOverlay() {
	const overlay = new BrowserWindow({
		title: 'BetterCrewLink Overlay',
		width: 400,
		height: 300,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
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

	if (isDevelopment) {
		overlay.loadURL(
			`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?version=${autoUpdater.currentVersion.version}&view=overlay`
		);
	} else {
		overlay.loadURL(
			formatUrl({
				pathname: joinPath(__dirname, 'index.html'),
				protocol: 'file',
				query: {
					version: autoUpdater.currentVersion.version,
					view: 'overlay',
				},
				slashes: true,
			})
		);
	}
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
	autoUpdater.checkForUpdates();
	autoUpdater.on('update-available', (info: UpdateInfo) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'available',
				info: info,
			});
		} catch (e) {
			/* Empty block */
		}
	});
	autoUpdater.on('error', (err: string) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'error',
				error: err,
			});
		} catch (e) {
			/*empty*/
		}
	});
	autoUpdater.on('download-progress', (progress: ProgressInfo) => {
		try {
			global.mainWindow?.webContents.send(IpcRendererMessages.AUTO_UPDATER_STATE, {
				state: 'downloading',
				progress,
			});
		} catch (e) {
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
		console.log("ACTIVATE???")
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
		protocol.registerFileProtocol('static', (request, callback) => {
			const pathname = app.getPath('userData') + '/static/' + request.url.replace('static:///', '');
			callback(pathname);
		});

		protocol.registerFileProtocol('generate', async (request, callback) => {
			const url = new URL(request.url.replace('generate:///', ''));
			const path = await GenerateHat(url, gameReader.playercolors, Number(url.searchParams.get('color')), '');
			callback(path);
		});

		initializeIpcListeners();
		initializeIpcHandlers();
		global.mainWindow = createMainWindow();

		if (isDevelopment)
			installExtension(REACT_DEVELOPER_TOOLS)
				.then((name: string) => console.log(`Added Extension:  ${name}`))
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
		setTimeout(
			() => {

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
				} catch (exception) {
					global.overlay?.hide();
					global.overlay?.close();
				}
			},
			1000
		)
	});

	ipcMain.on('setAlwaysOnTop', async (_event, enable) => {
		console.log("SETALWAYSONTOP?")
		if (global.mainWindow) {
			console.log("SETALWAYSONTOP?1")
			global.mainWindow.setAlwaysOnTop(enable, 'screen-saver');
		}
	});


}
