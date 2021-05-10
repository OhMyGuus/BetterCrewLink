import {
	DataType,
	findModule,
	getProcesses,
	ModuleObject,
	openProcess,
	ProcessObject,
	readBuffer,
	readMemory as readMemoryRaw,
	findPattern as findPatternRaw,
	virtualAllocEx,
	writeBuffer,
	writeMemory,
	getProcessPath,
} from 'memoryjs';
import Struct from 'structron';
import { IpcOverlayMessages, IpcRendererMessages } from '../common/ipc-messages';
import { GameState, AmongUsState, Player } from '../common/AmongUsState';
import offsetStore, { IOffsets } from './offsetStore';
import Errors from '../common/Errors';
import { CameraLocation, MapType } from '../common/AmongusMap';
import { GenerateAvatars, numberToColorHex } from './avatarGenerator';
import { RainbowColorId } from '../renderer/cosmetics';
import { TempFixOffsets, TempFixOffsets2 } from './offsetStore';
import { platform } from 'os';
import fs from 'fs';
import path from 'path';
import { AmongusMod, modList } from '../common/PublicLobby';

interface ValueType<T> {
	read(buffer: BufferSource, offset: number): T;
	SIZE: number;
}

interface PlayerReport {
	objectPtr: number;
	id: number;
	name: number;
	color: number;
	hat: number;
	pet: number;
	skin: number;
	disconnected: number;
	impostor: number;
	dead: number;
	taskPtr: number;
}

export default class GameReader {
	sendIPC: Electron.WebContents['send'];
	offsets: IOffsets | undefined;
	PlayerStruct: Struct | undefined;
	initializedWrite = false;
	writtenPingMessage = true;
	menuUpdateTimer = 20;
	lastPlayerPtr = 0;
	shouldReadLobby = false;
	is_64bit = false;
	is_linux = false;
	oldGameState = GameState.UNKNOWN;
	lastState: AmongUsState = {} as AmongUsState;
	amongUs: ProcessObject | null = null;
	gameAssembly: ModuleObject | null = null;
	colorsInitialized = false;
	rainbowColor = -9999;
	gameCode = 'MENU';
	shellcodeAddr = -1;
	currentServer = '';
	disableWriting = false;
	pid = -1;
	loadedMod = modList[0];
	gamePath = '';

	constructor(sendIPC: Electron.WebContents['send']) {
		this.is_linux = platform() === 'linux';
		this.sendIPC = sendIPC;
	}

	checkProcessOpen(): void {
		const processesOpen = getProcesses().filter((p) => p.szExeFile === 'Among Us.exe');
		let error = '';
		const reset = this.amongUs && processesOpen.filter((o) => o.th32ProcessID === this.pid).length === 0;
		if ((!this.amongUs || reset) && processesOpen.length > 0) {
			for (const processOpen of processesOpen) {
				try {
					this.pid = processOpen.th32ProcessID;
					this.amongUs = openProcess(processOpen.th32ProcessID);
					this.gameAssembly = findModule('GameAssembly.dll', this.amongUs.th32ProcessID);
					this.gamePath = getProcessPath(this.amongUs.handle);
					this.loadedMod = this.getInstalledMods(this.gamePath);
					this.initializeoffsets();
					this.sendIPC(IpcRendererMessages.NOTIFY_GAME_OPENED, true);
					break;
				} catch (e) {
					console.log('ERROR:', e);
					if (processOpen && e.toString() === 'Error: unable to find process') {
						error = Errors.OPEN_AS_ADMINISTRATOR;
					}
					this.amongUs = null;
				}
			}
			if (!this.amongUs && error) {
				throw error;
			}
		} else if (this.amongUs && (processesOpen.length === 0 || reset)) {
			this.amongUs = null;
			try {
				this.sendIPC(IpcRendererMessages.NOTIFY_GAME_OPENED, false);
			} catch (e) {
				/*empty*/
			}
		}
		return;
	}

	getInstalledMods(filePath: string): AmongusMod {
		const pathLower = filePath.toLowerCase();
		if (pathLower.includes('epic') || pathLower.includes('?\\volume') || this.is_linux) {
			return modList[0];
		} else {
			let dir = path.dirname(filePath);
			let loadedWinHttp = fs.existsSync(path.join(dir, 'winhttp.dll'));
			if (!loadedWinHttp) {
				return modList[0];
			}
			for (const file of fs.readdirSync(path.join(dir, 'BepInEx\\plugins'))) {
				let mod = modList.find((o) => o.dllStartsWith && file.includes(o.dllStartsWith));
				if (mod) return mod;
			}
			return modList[0];
		}
	}

	checkProcessDelay = 0;
	loop(): string | null {
		if (this.checkProcessDelay-- <= 0) {
			this.checkProcessDelay = 30;
			try {
				this.checkProcessOpen();
			} catch (e) {
				return `Error with chcecking the process, ${e.toString()}`;
			}
		}
		if (
			this.PlayerStruct &&
			this.offsets &&
			this.amongUs !== null &&
			this.gameAssembly !== null &&
			this.offsets !== undefined
		) {
			this.loadColors();

			let state = GameState.UNKNOWN;
			const meetingHud = this.readMemory<number>('pointer', this.gameAssembly.modBaseAddr, this.offsets.meetingHud);
			const meetingHud_cachePtr =
				meetingHud === 0 ? 0 : this.readMemory<number>('pointer', meetingHud, this.offsets.objectCachePtr);
			const meetingHudState =
				meetingHud_cachePtr === 0 ? 4 : this.readMemory('int', meetingHud, this.offsets.meetingHudState, 4);

			const innerNetClient = this.readMemory<number>(
				'ptr',
				this.gameAssembly.modBaseAddr,
				this.offsets.innerNetClient.base
			);

			const gameState = this.readMemory<number>('int', innerNetClient, this.offsets.innerNetClient.gameState);

			switch (gameState) {
				case 0:
					state = GameState.MENU;
					break;
				case 1:
				case 3:
					state = GameState.LOBBY;
					break;
				default:
					if (meetingHudState < 4) state = GameState.DISCUSSION;
					else state = GameState.TASKS;
					break;
			}
			// const DEBUG = true;
			const lobbyCodeInt =
				state === GameState.MENU
					? -1
					: this.readMemory<number>('int32', innerNetClient, this.offsets.innerNetClient.gameId);
			this.gameCode =
				state === GameState.MENU
					? ''
					: lobbyCodeInt === this.lastState.lobbyCodeInt
					? this.gameCode
					: this.IntToGameCode(lobbyCodeInt);

			// if (DEBUG) {
			// 	this.gameCode = 'oof';
			// }

			const allPlayersPtr = this.readMemory<number>('ptr', this.gameAssembly.modBaseAddr, this.offsets.allPlayersPtr);
			const allPlayers = this.readMemory<number>('ptr', allPlayersPtr, this.offsets.allPlayers);

			const playerCount = this.readMemory<number>('int' as const, allPlayersPtr, this.offsets.playerCount);
			let playerAddrPtr = allPlayers + this.offsets.playerAddrPtr;
			const players = [];

			const hostId = this.readMemory<number>('uint32', innerNetClient, this.offsets.innerNetClient.hostId);
			const clientId = this.readMemory<number>('uint32', innerNetClient, this.offsets.innerNetClient.clientId);

			let lightRadius = 1;
			let comsSabotaged = false;
			let currentCamera = CameraLocation.NONE;
			let map = MapType.UNKNOWN;
			let maxPlayers = 10;
			const closedDoors: number[] = [];
			let localPlayer = undefined;
			if (
				this.currentServer === '' ||
				(this.oldGameState != state &&
					(this.oldGameState === GameState.MENU || this.oldGameState === GameState.UNKNOWN))
			) {
				this.readCurrentServer();
			}

			if (this.gameCode && playerCount) {
				for (let i = 0; i < Math.min(playerCount, 40); i++) {
					const { address, last } = this.offsetAddress(playerAddrPtr, this.offsets.player.offsets);
					if (address === 0) continue;
					const playerData = readBuffer(this.amongUs.handle, address + last, this.offsets.player.bufferLength);
					const player = this.parsePlayer(address + last, playerData, clientId);
					playerAddrPtr += this.is_64bit ? 8 : 4;
					if (!player || state === GameState.MENU) {
						continue;
					}

					if (player.isLocal) {
						localPlayer = player;
					}

					players.push(player);
				}
				if (localPlayer) {
					this.fixPingMessage();
					lightRadius = this.readMemory<number>('float', localPlayer.objectPtr, this.offsets.lightRadius, -1);
				}
				const gameOptionsPtr = this.readMemory<number>(
					'ptr',
					this.gameAssembly.modBaseAddr,
					this.offsets.playerControl_GameOptions
				);
				maxPlayers = this.readMemory<number>('byte', gameOptionsPtr, this.offsets.gameOptions_MaxPLayers);
				if (state === GameState.TASKS) {
					const shipPtr = this.readMemory<number>('ptr', this.gameAssembly.modBaseAddr, this.offsets.shipStatus);

					const systemsPtr = this.readMemory<number>('ptr', shipPtr, this.offsets.shipStatus_systems);

					map = this.readMemory<number>('byte', gameOptionsPtr, this.offsets.gameOptions_MapId);

					if (systemsPtr !== 0 && state === GameState.TASKS) {
						this.readDictionary(systemsPtr, 47, (k, v) => {
							const key = this.readMemory<number>('int32', k);
							if (key === 14) {
								const value = this.readMemory<number>('ptr', v);
								switch (map) {
									case MapType.AIRSHIP:
									case MapType.POLUS:
									case MapType.THE_SKELD: {
										comsSabotaged =
											this.readMemory<number>('uint32', value, this.offsets!.HudOverrideSystemType_isActive) === 1;
										break;
									}
									case MapType.MIRA_HQ: {
										comsSabotaged =
											this.readMemory<number>('uint32', value, this.offsets!.hqHudSystemType_CompletedConsoles) < 2;
									}
								}
							} else if (key === 18 && map === MapType.MIRA_HQ) {
								//SystemTypes Decontamination
								const value = this.readMemory<number>('ptr', v);
								const lowerDoorOpen = this.readMemory<number>('int', value, this.offsets!.deconDoorLowerOpen);
								const upperDoorOpen = this.readMemory<number>('int', value, this.offsets!.deconDoorUpperOpen);
								if (!lowerDoorOpen) {
									closedDoors.push(0);
								}
								if (!upperDoorOpen) {
									closedDoors.push(1);
								}
							}
						});
					}
					const minigamePtr = this.readMemory<number>('ptr', this.gameAssembly.modBaseAddr, this.offsets!.miniGame);
					const minigameCachePtr = this.readMemory<number>('ptr', minigamePtr, this.offsets!.objectCachePtr);
					if (minigameCachePtr && minigameCachePtr !== 0 && localPlayer) {
						if (map === MapType.POLUS || map === MapType.AIRSHIP) {
							const currentCameraId = this.readMemory<number>(
								'uint32',
								minigamePtr,
								this.offsets!.planetSurveillanceMinigame_currentCamera
							);
							const camarasCount = this.readMemory<number>(
								'uint32',
								minigamePtr,
								this.offsets!.planetSurveillanceMinigame_camarasCount
							);

							if (currentCameraId >= 0 && currentCameraId <= 5 && camarasCount === 6) {
								currentCamera = currentCameraId as CameraLocation;
							}
						} else if (map === MapType.THE_SKELD) {
							const roomCount = this.readMemory<number>(
								'uint32',
								minigamePtr,
								this.offsets!.surveillanceMinigame_FilteredRoomsCount
							);
							if (roomCount === 4) {
								const dist = Math.sqrt(Math.pow(localPlayer.x - -12.9364, 2) + Math.pow(localPlayer.y - -2.7928, 2));
								if (dist < 0.6) {
									currentCamera = CameraLocation.Skeld;
								}
							}
						}
					}
					if (map !== MapType.MIRA_HQ) {
						const allDoors = this.readMemory<number>('ptr', shipPtr, this.offsets.shipstatus_allDoors);
						const doorCount = Math.min(this.readMemory<number>('int', allDoors, this.offsets.playerCount), 16);
						for (let doorNr = 0; doorNr < doorCount; doorNr++) {
							const door = this.readMemory<number>(
								'ptr',
								allDoors + this.offsets.playerAddrPtr + doorNr * (this.is_64bit ? 0x8 : 0x4)
							);
							const doorOpen = this.readMemory<number>('int', door + this.offsets.door_isOpen) === 1;
							//	const doorId = this.readMemory<number>('int', door + this.offsets.door_doorId);
							//console.log(doorId);
							if (!doorOpen) {
								closedDoors.push(doorNr);
							}
						}
					}
				}
				//	console.log('doorcount: ', doorCount, doorsOpen);
			}

			// if (this.oldGameState === GameState.DISCUSSION && state === GameState.TASKS) {
			// 	if (impostors === 0 || impostors >= crewmates) {
			// 		this.exileCausesEnd = true;
			// 		state = GameState.LOBBY;
			// 	}
			// }

			if (
				this.oldGameState === GameState.MENU &&
				state === GameState.LOBBY &&
				this.menuUpdateTimer > 0 &&
				(this.lastPlayerPtr === allPlayers || players.length === 1 || !players.find((p) => p.isLocal))
			) {
				state = GameState.MENU;
				this.menuUpdateTimer--;
			} else {
				this.menuUpdateTimer = 20;
			}
			this.lastPlayerPtr = allPlayers;
			const lobbyCode = state !== GameState.MENU ? this.gameCode || 'MENU' : 'MENU';
			const newState: AmongUsState = {
				lobbyCode: lobbyCode,
				lobbyCodeInt,
				players,
				gameState: lobbyCode === 'MENU' ? GameState.MENU : state,
				oldGameState: this.oldGameState,
				isHost: (hostId && clientId && hostId === clientId) as boolean,
				hostId: hostId,
				clientId: clientId,
				comsSabotaged,
				currentCamera,
				lightRadius,
				lightRadiusChanged: lightRadius != this.lastState?.lightRadius,
				map,
				mod: this.loadedMod.id,
				closedDoors,
				currentServer: this.currentServer,
				maxPlayers,
			};
			//	const stateHasChanged = !equal(this.lastState, newState);
			//	if (stateHasChanged) {
			try {
				this.sendIPC(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, newState);
			} catch (e) {
				process.exit(0);
			}
			//	}
			this.lastState = newState;
			this.oldGameState = state;
		}
		return null;
	}

	initializeoffsets(): void {
		console.log('INITIALIZEOFFSETS???');
		this.is_64bit = this.isX64Version();
		this.shellcodeAddr = -1;
		this.offsets = this.is_64bit ? offsetStore.x64 : offsetStore.x86;
		this.initializedWrite = false;
		const innerNetClient = this.findPattern(
			this.offsets.signatures.innerNetClient.sig,
			this.offsets.signatures.innerNetClient.patternOffset,
			this.offsets.signatures.innerNetClient.addressOffset
		);
		const meetingHud = this.findPattern(
			this.offsets.signatures.meetingHud.sig,
			this.offsets.signatures.meetingHud.patternOffset,
			this.offsets.signatures.meetingHud.addressOffset
		);
		const gameData = this.findPattern(
			this.offsets.signatures.gameData.sig,
			this.offsets.signatures.gameData.patternOffset,
			this.offsets.signatures.gameData.addressOffset
		);
		const shipStatus = this.findPattern(
			this.offsets.signatures.shipStatus.sig,
			this.offsets.signatures.shipStatus.patternOffset,
			this.offsets.signatures.shipStatus.addressOffset
		);
		const miniGame = this.findPattern(
			this.offsets.signatures.miniGame.sig,
			this.offsets.signatures.miniGame.patternOffset,
			this.offsets.signatures.miniGame.addressOffset
		);

		const palette = this.findPattern(
			this.offsets.signatures.palette.sig,
			this.offsets.signatures.palette.patternOffset,
			this.offsets.signatures.palette.addressOffset
		);

		const playerControl = this.findPattern(
			this.offsets.signatures.playerControl.sig,
			this.offsets.signatures.playerControl.patternOffset,
			this.offsets.signatures.playerControl.addressOffset
		);
		this.offsets.playerControl_GameOptions[0] = playerControl;
		this.offsets.palette[0] = palette;
		this.offsets.meetingHud[0] = meetingHud;
		this.offsets.allPlayersPtr[0] = gameData;
		this.offsets.innerNetClient.base[0] = innerNetClient;
		this.offsets.shipStatus[0] = shipStatus;
		this.offsets.miniGame[0] = miniGame;
		if (!this.is_64bit) {
			this.offsets.connectFunc = this.findPattern(
				this.offsets.signatures.connectFunc.sig,
				this.offsets.signatures.connectFunc.patternOffset,
				this.offsets.signatures.connectFunc.addressOffset,
				true
			);
			this.offsets.fixedUpdateFunc = this.findPattern(
				this.offsets.signatures.fixedUpdateFunc.sig,
				this.offsets.signatures.fixedUpdateFunc.patternOffset,
				this.offsets.signatures.fixedUpdateFunc.addressOffset,
				false,
				true
			);
		}
		this.offsets.serverManager_currentServer[0] = this.findPattern(
			this.offsets.signatures.serverManager.sig,
			this.offsets.signatures.serverManager.patternOffset,
			this.offsets.signatures.serverManager.addressOffset
		);

		this.colorsInitialized = false;
		console.log('serverManager_currentServer', this.offsets.serverManager_currentServer[0].toString(16));
		if (innerNetClient === 0x2c6c278) {
			// temp fix for older game until I added more sigs.. //
			this.disableWriting = true;
			this.offsets = TempFixOffsets(this.offsets);
		}
		if (innerNetClient === 0x1c57f54) {
			this.disableWriting = true;
			// temp fix for older game until I added more sigs.. // 12/9
			this.offsets = TempFixOffsets2(this.offsets);
		}
		this.PlayerStruct = new Struct();
		for (const member of this.offsets.player.struct) {
			if (member.type === 'SKIP' && member.skip) {
				this.PlayerStruct = this.PlayerStruct.addMember(Struct.TYPES.SKIP(member.skip), member.name);
			} else {
				this.PlayerStruct = this.PlayerStruct.addMember<unknown>(
					Struct.TYPES[member.type] as ValueType<unknown>,
					member.name
				);
			}
		}
		this.initializeWrites();
	}

	initializeWrites(): void {
		if (this.is_64bit || !this.offsets || !this.amongUs || !this.gameAssembly || this.disableWriting || this.is_linux) {
			//not supported atm
			return;
		}
		// Shellcode to join games when u press join..
		const shellCodeAddr = virtualAllocEx(this.amongUs.handle, null, 0x60, 0x00001000 | 0x00002000, 0x40);
		const compareAddr = shellCodeAddr + 0x30;

		const compareAddr1 = (compareAddr & 0xff000000) >> 24;
		const compareAddr2 = (compareAddr & 0x00ff0000) >> 16;
		const compareAddr3 = (compareAddr & 0x0000ff00) >> 8;
		const compareAddr4 = compareAddr & 0x000000ff;

		//(DESTINATION_RVA - CURRENT_RVA (E9) - 5)
		const connectFunc = this.gameAssembly.modBaseAddr + this.offsets.connectFunc;
		const relativeConnectJMP = connectFunc - (shellCodeAddr + 0x18) - 0x4;

		const fixedUpdateFunc = this.gameAssembly!.modBaseAddr + this.offsets.fixedUpdateFunc;
		const relativefixedJMP = fixedUpdateFunc + 0x5 - (shellCodeAddr + 0x22) - 0x4;

		const relativeShellJMP = shellCodeAddr - (fixedUpdateFunc + 0x1) - 0x4;

		const shellcode = [
			0x80, // cmp byte ptr [ShellcodeAddr + 0x30], 0x0,
			0x3d,
			compareAddr4, // 0x0
			compareAddr3, // 0x0
			compareAddr2, // 0xA3
			compareAddr1, // 0x0
			0x00,
			0x74, // je 0x13
			0x13,
			0xc6, // mov byte ptr [ShellcodeAddr + 0x30], 0x00
			0x05,
			compareAddr4, // 0x0
			compareAddr3, // 0x0
			compareAddr2, // 0xA3
			compareAddr1, // 0x0
			0x00, // write 0x0
			0xc7, // mov [ebp - 0x4], 0x1
			0x45,
			0xfc,
			0x01,
			0x00,
			0x00,
			0x00,
			0xe9, // jmp innerNet.InnerNetClient.Connect
			relativeConnectJMP & 0x000000ff,
			(relativeConnectJMP & 0x0000ff00) >> 8,
			(relativeConnectJMP & 0x00ff0000) >> 16,
			(relativeConnectJMP & 0xff000000) >> 24,
			0x55, // original 5 bytes && (je 0x13 endpoint)
			0x8b,
			0xec,
			0x6a,
			0xff,
			0xe9, // jmp innerNet.InnerNetClient.FixedUpdate + 0x5
			relativefixedJMP & 0x000000ff,
			(relativefixedJMP & 0x0000ff00) >> 8,
			(relativefixedJMP & 0x00ff0000) >> 16,
			(relativefixedJMP & 0xff000000) >> 24,
		];

		const shellcodeJMP = [
			// jmp ShellcodeRelativeAddress
			0xe9,
			relativeShellJMP & 0x000000ff,
			(relativeShellJMP & 0x0000ff00) >> 8,
			(relativeShellJMP & 0x00ff0000) >> 16,
			(relativeShellJMP & 0xff000000) >> 24,
		];

		//MMOnline
		this.writeString(shellCodeAddr + 0x70, 'OnlineGame');
		this.writeString(shellCodeAddr + 0x95, 'MMOnline');

		this.writeString(
			shellCodeAddr + 0xd5,
			'Ping: {0}ms\n<color=#BA68C8>BetterCrewLink</color>\n<size=60%><color=#BA68C8>https://bettercrewlink.app</color></size>'
		);

		writeBuffer(this.amongUs!.handle, shellCodeAddr, Buffer.from(shellcode));
		writeBuffer(this.amongUs!.handle, fixedUpdateFunc, Buffer.from(shellcodeJMP));
		this.shellcodeAddr = shellCodeAddr;
		this.writtenPingMessage = false;
		this.initializedWrite = true;
	}

	writeString(address: number, text: string): void {
		const innerNetClient = this.readMemory<number>(
			'ptr',
			this.gameAssembly!.modBaseAddr,
			this.offsets!.innerNetClient.base
		);
		const stringBase = this.readMemory<number>('int', innerNetClient, [0x80, 0x0]); // mainMenuScene just a random string where we can base our string off

		const connectionString = [
			stringBase & 0x000000ff,
			(stringBase & 0x0000ff00) >> 8,
			(stringBase & 0x00ff0000) >> 16,
			(stringBase & 0xff000000) >> 24,
			0x00,
			0x00,
			0x00,
			0x00,
			text.length, // length
			0x00,
			0x00,
			0x00,
		];
		for (let index = 0; index < text.length; index++) {
			connectionString.push(text.charCodeAt(index));
			connectionString.push(0x0);
		}
		writeBuffer(this.amongUs!.handle, address, Buffer.from(connectionString));
	}
	skipPingMessage = 25;
	fixPingMessage() {
		if (
			!this.offsets ||
			!this.gameAssembly ||
			!this.initializedWrite ||
			this.writtenPingMessage ||
			this.skipPingMessage-- > 0
		) {
			return;
		}
		this.skipPingMessage = 25;
		this.writtenPingMessage = true;
		for (let index = 0; index < 3; index++) {
			const stringOffset = this.findPattern(
				this.offsets.signatures.pingMessageString.sig,
				this.offsets.signatures.pingMessageString.patternOffset,
				this.offsets.signatures.pingMessageString.addressOffset,
				false,
				false,
				index
			);
			const stringPtr = this.readMemory<number>('int', this.gameAssembly.modBaseAddr, stringOffset);
			const pingstring = this.readString(stringPtr);
			if (pingstring.includes('Ping') || pingstring.includes('<color=#BA68C8')) {
				writeMemory(
					this.amongUs!.handle,
					this.gameAssembly!.modBaseAddr + stringOffset,
					this.shellcodeAddr + 0xd5,
					'int32'
				);
				break;
			}
		}
	}

	joinGame(code: string, server: string): boolean {
		if (!this.amongUs || !this.initializedWrite || server.length > 15 || !this.offsets || this.is_64bit) {
			return false;
		}
		const innerNetClient = this.readMemory<number>(
			'ptr',
			this.gameAssembly!.modBaseAddr,
			this.offsets!.innerNetClient.base
		);

		this.writeString(this.shellcodeAddr + 0x40, server);
		writeMemory(
			this.amongUs.handle,
			innerNetClient + this.offsets.innerNetClient.networkAddress,
			this.shellcodeAddr + 0x40,
			'int32'
		);
		writeMemory(
			this.amongUs.handle,
			innerNetClient + this.offsets.innerNetClient.onlineScene,
			this.shellcodeAddr + 0x70,
			'int32'
		);
		writeMemory(
			this.amongUs.handle,
			innerNetClient + this.offsets.innerNetClient.mainMenuScene,
			this.shellcodeAddr + 0x95,
			'int32'
		);
		writeMemory(this.amongUs.handle, innerNetClient + this.offsets.innerNetClient.networkPort, 22023, 'int32');
		writeMemory(this.amongUs.handle, innerNetClient + this.offsets.innerNetClient.gameMode, 1, 'int32');
		writeMemory(
			this.amongUs.handle,
			innerNetClient + this.offsets.innerNetClient.gameId,
			this.gameCodeToInt(code),
			'int32'
		);
		writeMemory(this.amongUs.handle, this.shellcodeAddr + 0x30, 1, 'int32'); // call connect function
		return true;
	}

	loadColors(): void {
		if (this.colorsInitialized) {
			return;
		}
		console.log('Initializecolors');
		const palletePtr = this.readMemory<number>('ptr', this.gameAssembly!.modBaseAddr, this.offsets!.palette);
		const PlayerColorsPtr = this.readMemory<number>('ptr', palletePtr, this.offsets!.palette_playercolor);
		const ShadowColorsPtr = this.readMemory<number>('ptr', palletePtr, this.offsets!.palette_shadowColor);

		const colorLength = this.readMemory<number>('int', ShadowColorsPtr, this.offsets!.playerCount);
		if (!colorLength || colorLength <= 0 || colorLength > 30) {
			return;
		}
		this.rainbowColor = -9999;
		this.colorsInitialized = colorLength > 0;
		const playercolors = [];
		for (let i = 0; i < colorLength; i++) {
			const playerColor = this.readMemory<number>('uint32', PlayerColorsPtr, [this.offsets!.playerAddrPtr + i * 0x4]);
			const shadowColor = this.readMemory<number>('uint32', ShadowColorsPtr, [this.offsets!.playerAddrPtr + i * 0x4]);
			if (playerColor === 4278190080) {
				this.rainbowColor = i;
			}
			//4278190080
			playercolors[i] = [numberToColorHex(playerColor), numberToColorHex(shadowColor)];
		}
		try {
			this.sendIPC(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playercolors);
			GenerateAvatars(playercolors)
				.then(() => console.log('done generate'))
				.catch((e) => console.error(e));
		} catch (e) {
			/* Empty block */
		}
	}

	isX64Version(): boolean {
		if (!this.amongUs || !this.gameAssembly) return false;

		const optionalHeader_offset = readMemoryRaw<number>(
			this.amongUs.handle,
			this.gameAssembly.modBaseAddr + 0x3c,
			'uint32'
		);
		const optionalHeader_magic = readMemoryRaw<number>(
			this.amongUs.handle,
			this.gameAssembly.modBaseAddr + optionalHeader_offset + 0x18,
			'short'
		);
		//	console.log(optionalHeader_magic, 'optionalHeader_magic');
		return optionalHeader_magic === 0x20b;
	}

	readCurrentServer(): void {
		const currentServer = this.readMemory<number>(
			'ptr',
			this.gameAssembly!.modBaseAddr,
			this.offsets!.serverManager_currentServer
		);
		this.currentServer = this.readString(currentServer);
	}

	readMemory<T>(dataType: DataType, address: number, offsets?: number[] | number, defaultParam?: T): T {
		if (!this.amongUs) return defaultParam as T;
		if (address === 0) return defaultParam as T;
		dataType = dataType == 'pointer' || dataType == 'ptr' ? (this.is_64bit ? 'uint64' : 'uint32') : dataType;
		if (typeof offsets === 'number') {
			offsets = [offsets];
		}
		const { address: addr, last } = this.offsetAddress(address, offsets || []);
		if (addr === 0) return defaultParam as T;
		return readMemoryRaw<T>(this.amongUs.handle, addr + last, dataType);
	}

	offsetAddress(address: number, offsets: number[]): { address: number; last: number } {
		if (!this.amongUs) throw 'Among Us not open? Weird error';
		address = this.is_64bit ? address : address;
		for (let i = 0; i < offsets.length - 1; i++) {
			address = readMemoryRaw<number>(this.amongUs.handle, address + offsets[i], this.is_64bit ? 'uint64' : 'uint32');

			if (address == 0) break;
		}
		const last = offsets.length > 0 ? offsets[offsets.length - 1] : 0;
		return { address, last };
	}

	readString(address: number): string {
		try {
			if (address === 0 || !this.amongUs) {
				return '';
			}
			const length = Math.max(
				0,
				Math.min(readMemoryRaw<number>(this.amongUs.handle, address + (this.is_64bit ? 0x10 : 0x8), 'int'), 15)
			);
			const buffer = readBuffer(this.amongUs.handle, address + (this.is_64bit ? 0x14 : 0xc), length << 1);
			if (buffer) {
				return buffer.toString('utf16le').replace(/\0/g, '');
			} else {
				return '';
			}
		} catch (e) {
			return '';
		}
	}

	readDictionary(
		address: number,
		maxLen: number,
		callback: (keyPtr: number, valPtr: number, index: number) => void
	): void {
		const entries = this.readMemory<number>('ptr', address + (this.is_64bit ? 0x18 : 0xc));
		let len = this.readMemory<number>('uint32', entries + (this.is_64bit ? 0x18 : 0xc));
		len = len > maxLen ? maxLen : len;
		for (let i = 0; i < len; i++) {
			const offset = entries + ((this.is_64bit ? 0x20 : 0x10) + i * (this.is_64bit ? 0x18 : 0x10));
			callback(offset, offset + (this.is_64bit ? 0x10 : 0xc), i);
		}
	}

	findPattern(
		signature: string,
		patternOffset = 0x1,
		addressOffset = 0x0,
		relative = false,
		getLocation = false,
		skip = 0
	): number {
		if (!this.amongUs || !this.gameAssembly) return 0x0;
		const signatureTypes = 0x0 | 0x2;
		const instruction_location = findPatternRaw(
			this.amongUs.handle,
			'GameAssembly.dll',
			signature,
			signatureTypes,
			patternOffset,
			0x0,
			skip
		);
		if (getLocation) {
			return instruction_location + addressOffset;
		}
		const offsetAddr = this.readMemory<number>('int', this.gameAssembly.modBaseAddr, [instruction_location]);

		return this.is_64bit || relative
			? offsetAddr + instruction_location + addressOffset
			: offsetAddr - this.gameAssembly.modBaseAddr;
	}

	IntToGameCode(input: number): string {
		if (!input || input === 0 || input > -1000) return '';

		const V2 = 'QWXRTYLPESDFGHUJKZOCVBINMA';
		const a = input & 0x3ff;
		const b = (input >> 10) & 0xfffff;
		return [
			V2[Math.floor(a % 26)],
			V2[Math.floor(a / 26)],
			V2[Math.floor(b % 26)],
			V2[Math.floor((b / 26) % 26)],
			V2[Math.floor((b / 676) % 26)],
			V2[Math.floor((b / 17576) % 26)],
		].join('');
	}

	gameCodeToInt(code: string): number {
		const V2Map = [25, 21, 19, 10, 8, 11, 12, 13, 22, 15, 16, 6, 24, 23, 18, 7, 0, 3, 9, 4, 14, 20, 1, 2, 5, 17];
		const a = V2Map[code.charCodeAt(0) - 65];
		const b = V2Map[code.charCodeAt(1) - 65];
		const c = V2Map[code.charCodeAt(2) - 65];
		const d = V2Map[code.charCodeAt(3) - 65];
		const e = V2Map[code.charCodeAt(4) - 65];
		const f = V2Map[code.charCodeAt(5) - 65];
		const one = (a + 26 * b) & 0x3ff;
		const two = c + 26 * (d + 26 * (e + 26 * f));
		return one | ((two << 10) & 0x3ffffc00) | 0x80000000;
	}
	hashCode(s: string): number {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
		return h;
	}

	parsePlayer(ptr: number, buffer: Buffer, LocalclientId = -1): Player | undefined {
		if (!this.PlayerStruct || !this.offsets) return undefined;

		const { data } = this.PlayerStruct.report<PlayerReport>(buffer, 0, {});

		if (this.is_64bit) {
			data.objectPtr = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('objectPtr')]);
			data.name = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('name')]);
		}
		const clientId = this.readMemory<number>('uint32', data.objectPtr, this.offsets.player.clientId);
		const isLocal = clientId === LocalclientId && data.disconnected === 0;

		const positionOffsets = isLocal
			? [this.offsets.player.localX, this.offsets.player.localY]
			: [this.offsets.player.remoteX, this.offsets.player.remoteY];

		let x = this.readMemory<number>('float', data.objectPtr, positionOffsets[0]);
		let y = this.readMemory<number>('float', data.objectPtr, positionOffsets[1]);
		const isDummy = this.readMemory<boolean>('boolean', data.objectPtr, this.offsets.player.isDummy);
		if (isDummy) {
			console.log('ISDUMMY!!!!@!@!');
		}
		let bugged = false;
		if (x === undefined || y === undefined || data.disconnected != 0 || data.color > 40) {
			x = 9999;
			y = 9999;
			bugged = true;
		}

		const x_round = parseFloat(x?.toFixed(4));
		const y_round = parseFloat(y?.toFixed(4));

		// if (isLocal) {
		// 	console.log('Current position: ', { x_low: x_round, y_low: y_round });
		// }
		const name = this.readString(data.name);
		const nameHash = this.hashCode(name);
		const colorId = data.color === this.rainbowColor ? RainbowColorId : data.color;
		return {
			ptr,
			id: data.id,
			clientId: clientId,
			name,
			nameHash,
			colorId,
			hatId: data.hat,
			petId: data.pet,
			skinId: data.skin,
			disconnected: data.disconnected != 0,
			isImpostor: data.impostor == 1,
			isDead: data.dead == 1,
			taskPtr: data.taskPtr,
			objectPtr: data.objectPtr,
			bugged,
			inVent: this.readMemory<number>('byte', data.objectPtr, this.offsets.player.inVent) > 0,
			isLocal,
			isDummy,
			x: x_round || x || 999,
			y: y_round || y || 999,
		};
	}
}
