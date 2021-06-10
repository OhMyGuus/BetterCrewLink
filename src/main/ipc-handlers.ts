import { app, dialog, ipcMain, shell } from 'electron';
import { platform } from 'os';
import { enumerateValues, enumerateKeys } from 'registry-js';
import { GamePlatform, PlatformRunType } from '../common/GamePlatform';
import spawn from 'cross-spawn';
import path from 'path';

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
				if (platform.key === GamePlatform.EPIC || platform.key === GamePlatform.STEAM) {
					if (enumerateValues(platform.registryKey, platform.registrySubKey).find(
						(value) => value ? value.name === platform.registryKeyValue : false
					)) {
						platform.available = true;
					}
				} else if (platform.key === GamePlatform.MICROSOFT) {
					// Search for Innersloth.Among Us.... key and grab it
					const key_found = enumerateKeys(platform.registryKey, platform.registrySubKey).find(
						(reg_key) => reg_key.startsWith(platform.registryFindKey as string));
					
					if (key_found) {
						// Grab the specific value for the above key
						const value_found = enumerateValues(platform.registryKey, platform.registrySubKey + '\\' + key_found).find(
							(value) => value ? value.name === platform.registryKeyValue : false
						);
						if (value_found) {
							platform.available = true;
							platform.run = value_found.data as string;
						}
					}
				}
			}
		} else if (platform() === 'linux') {
			// TODO: Platform checking on Linux
		}
		return platforms;
	});

	ipcMain.on(IpcMessages.OPEN_AMONG_US_GAME, (_, platform: GamePlatformInstance) => {

		const error = () => dialog.showErrorBox('Error', 'Could not start the game.');
		
		if (platform.launchType === PlatformRunType.URI) {
			// TODO: Try to add error checking here
			shell.openPath(platform.run);
		} else if (platform.launchType === PlatformRunType.EXE) {
			try {
				const process = spawn(path.join(platform.run, platform.exeFile!));
				process.on('error', error);
			} catch (e) {
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
