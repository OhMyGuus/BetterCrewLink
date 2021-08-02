import { app, dialog, ipcMain, shell } from 'electron';
import { platform, homedir } from 'os';
import { enumerateValues, enumerateKeys } from 'registry-js';
import { parse } from 'vdf-parser';
import { DefaultWindowsGamePlatforms, DefaultLinuxGamePlatforms, GamePlatform, PlatformRunType } from '../common/GamePlatform';
import spawn from 'cross-spawn';
import path from 'path';
import { readFileSync } from 'fs';

import { IpcMessages, IpcOverlayMessages } from '../common/ipc-messages';

// Listeners are fire and forget, they do not have "responses" or return values
export const initializeIpcListeners = (): void => {
	ipcMain.on(IpcMessages.SHOW_ERROR_DIALOG, (e, opts: { title: string; content: string }) => {
		if (typeof opts === 'object' && opts && typeof opts.title === 'string' && typeof opts.content === 'string') {
			dialog.showErrorBox(opts.title, opts.content);
		}
	});

	ipcMain.on(IpcMessages.OPEN_AMONG_US_GAME, (_, platformKey: GamePlatform) => {
		const desktop_platform = platform();
		const error = () => dialog.showErrorBox('Error', 'Could not start the game.');
		if (desktop_platform === 'win32') {
			const game_platform = DefaultWindowsGamePlatforms[platformKey];
			if (game_platform.launchType === PlatformRunType.URI) {
				// Just open the URI if we can to launch the game
				// TODO: Try to add error checking here
				shell.openPath(game_platform.run);
			} else if (game_platform.launchType === PlatformRunType.EXE) {
				try {
					const process = spawn(path.join(game_platform.run, game_platform.exeFile!));
					process.on('error', error);
				} catch (e) {
					error();
				}
			}
		} else if (desktop_platform === 'linux') {
			const game_platform = DefaultLinuxGamePlatforms[platformKey];
			try {
				const exec = game_platform.run.split(" ");
				const command = exec[0];
				exec.shift();
				const process = spawn(command,exec);
				process.on('error', error);
			} catch (e) {
				error();
			}
		} else {
			error()
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
	ipcMain.handle(IpcMessages.REQUEST_PLATFORMS_AVAILABLE, () => {
		const desktop_platform = platform();

		// Assume all platforms are false unless proven otherwise
		if (desktop_platform === 'win32') {
			for (const key in DefaultWindowsGamePlatforms) {
				const game_platform = DefaultWindowsGamePlatforms[key];
				if (game_platform.key === GamePlatform.EPIC || game_platform.key === GamePlatform.STEAM) {
					// Search registry for the URL Protocol
					if (enumerateValues(game_platform.registryKey!!, game_platform.registrySubKey!!).find(
						(value) => value ? value.name === game_platform.registryKeyValue : false
					)) {
						game_platform.available = true;
					}
				} else if (game_platform.key === GamePlatform.MICROSOFT) {
					// Search for 'Innersloth.Among Us....' key and grab it
					const key_found = enumerateKeys(game_platform.registryKey!!, game_platform.registrySubKey).find(
						(reg_key) => reg_key.startsWith(game_platform.registryFindKey as string));
					if (key_found) {
						// Grab the game path from the above key
						const value_found = enumerateValues(game_platform.registryKey!!, game_platform.registrySubKey + '\\' + key_found).find(
							(value) => (value ? value.name === game_platform.registryKeyValue : false)
						);
						if (value_found) {
							game_platform.available = true;
							game_platform.run = value_found.data as string;
						}
					}
				}
			}
			return DefaultWindowsGamePlatforms;
		} else if (desktop_platform === 'linux') {
			for (const key in DefaultLinuxGamePlatforms) {
				const game_platform = DefaultLinuxGamePlatforms[key];
				if (game_platform.key === GamePlatform.STEAM) {
					// TODO: Check and support other types of steam installations; Flatpak
					try {
						const buff = readFileSync(homedir() + '/.steam/registry.vdf');
						const steamVdf = parse(buff.toString()) as {Registry:{HKCU:{Software:{Valve:{Steam:{Apps:object}}}}}};
						//tries to find Among Us's Steam Id in the .vdf-file
						if ("945360" in steamVdf["Registry"]["HKCU"]["Software"]["Valve"]["Steam"]["Apps"]) {
							game_platform.available = true;
						}
					} catch(e) {
						/* empty */
					}
				}
			}
			return DefaultLinuxGamePlatforms;
		} else {
			return DefaultWindowsGamePlatforms;
		}
	});
};
