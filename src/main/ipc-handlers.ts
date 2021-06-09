import { app, dialog, ipcMain, shell } from 'electron';
import { platform } from 'os';
import { HKEY, enumerateValues } from 'registry-js';
import { GamePlatform } from '../common/GamePlatform';

import { IpcMessages, IpcOverlayMessages } from '../common/ipc-messages';
import { GamePlatformInstance, GamePlatformMap } from '../common/ISettings';

// Listeners are fire and forget, they do not have "responses" or return values
export const initializeIpcListeners = (): void => {
	ipcMain.on(IpcMessages.SHOW_ERROR_DIALOG, (e, opts: { title: string; content: string }) => {
		if (typeof opts === 'object' && opts && typeof opts.title === 'string' && typeof opts.content === 'string') {
			dialog.showErrorBox(opts.title, opts.content);
		}
	});

	ipcMain.handle(IpcMessages.REQUEST_PLATFORMS_AVAILABLE, (_, platforms: GamePlatformMap) => {
		if (platform() === 'win32') {
			for (const key in platforms) {
				const platform = platforms[key];
				if (enumerateValues(HKEY.HKEY_CLASSES_ROOT, platform.registryKey).find(
					(v) => v.name === 'URL Protocol'
				)) {
					platform.available = true;
				}
			}
		} else if (platform() === 'linux') {
			// TODO: Platform checking on Linux
		}
		return platforms;
	});

	ipcMain.on(IpcMessages.OPEN_AMONG_US_GAME, (_, platform: GamePlatformInstance) => {

		const error = () => dialog.showErrorBox('Error', 'Could not start the game.');
		
		if (platform.key === GamePlatform.STEAM || platform.key === GamePlatform.EPIC) {
			if (platform.available) {
				// TODO: Try to add error checking here
				shell.openPath(platform.shellPath);
			} else {
				error();
			}
		}
	});

	ipcMain.on(IpcMessages.RESTART_CREWLINK, () => {
		app.relaunch();
		app.quit();
	});

	ipcMain.on(IpcMessages.SEND_TO_OVERLAY, (_, event: IpcOverlayMessages, ...args: unknown[]) => {
		try {
			if (global.overlay) global.overlay.webContents.send(event, ...args);
		} catch (e) {
			/*empty*/
		}
	});

	ipcMain.on(IpcMessages.SEND_TO_MAINWINDOW, (_, event: IpcOverlayMessages, ...args: unknown[]) => {
		console.log('SEND TO MAINWINDOW CALLLED');
		try {
			if (global.mainWindow) global.mainWindow.webContents.send(event, ...args);
		} catch (e) {
			/*empty*/
		}
	});

	ipcMain.on(IpcMessages.QUIT_CREWLINK, () => {
		try {
			const mainWindow = global.mainWindow;
			const overlay = global.overlay;
			global.mainWindow = null;
			global.overlay = null;
			mainWindow?.close();
			overlay?.close();
			mainWindow?.destroy();
			overlay?.destroy();
		} catch {
			/* empty */
		}
		app.quit();
	});
};

// Handlers are async cross-process instructions, they should have a return value
// or the caller should be "await"'ing them.  If neither of these are the case
// consider making it a "listener" instead for performance and readability
export const initializeIpcHandlers = (): void => {
	// TODO: Put handlers here
};
