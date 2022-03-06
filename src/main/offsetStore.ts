export interface IOffsetsStore {
	x64: IOffsets;
	x86: IOffsets;
}

interface ISignature {
	sig: string;
	addressOffset: number;
	patternOffset: number;
}

export interface IOffsets {
	meetingHud: number[];
	objectCachePtr: number[];
	meetingHudState: number[];
	allPlayersPtr: number[];
	allPlayers: number[];
	playerCount: number[];
	playerAddrPtr: number;
	shipStatus: number[];
	lightRadius: number[];
	shipStatus_systems: number[];
	shipStatus_map: number[];
	shipstatus_allDoors: number[];
	door_doorId: number;
	door_isOpen: number;
	deconDoorUpperOpen: number[];
	deconDoorLowerOpen: number[];
	hqHudSystemType_CompletedConsoles: number[];
	HudOverrideSystemType_isActive: number[];
	miniGame: number[];
	planetSurveillanceMinigame_currentCamera: number[];
	planetSurveillanceMinigame_camarasCount: number[];
	surveillanceMinigame_FilteredRoomsCount: number[];
	palette: number[];
	palette_shadowColor: number[];
	palette_playercolor: number[];
	playerControl_GameOptions: number[];
	gameOptions_MapId: number[];
	gameOptions_MaxPLayers: number[];
	connectFunc: number;
	fixedUpdateFunc: number;
	showModStampFunc: number;
	modLateUpdateFunc: number;
	pingMessageString: number;
	serverManager_currentServer: number[];
	innerNetClient: {
		base: number[];
		networkAddress: number;
		networkPort: number;
		onlineScene: number;
		mainMenuScene: number;
		gameMode: number;
		gameId: number;
		hostId: number;
		clientId: number;
		gameState: number;
	};
	player: {
		isLocal: number[];
		localX: number[];
		localY: number[];
		remoteX: number[];
		remoteY: number[];
		roleTeam: number[];
		nameText?: number[];
		currentOutfit: number[];
		outfit: {
			colorId: number[];
			playerName: number[];
			hatId: number[];
			skinId: number[];
			visorId: number[];
		};
		bufferLength: number;
		offsets: number[];
		inVent: number[];
		clientId: number[];
		isDummy: number[]; // used for muting
		struct: {
			type:
			| 'INT'
			| 'INT_BE'
			| 'UINT'
			| 'UINT_BE'
			| 'SHORT'
			| 'SHORT_BE'
			| 'USHORT'
			| 'USHORT_BE'
			| 'FLOAT'
			| 'CHAR'
			| 'BYTE'
			| 'SKIP';
			skip?: number;
			name: string;
		}[];
	};
	signatures: {
		innerNetClient: ISignature;
		meetingHud: ISignature;
		gameData: ISignature;
		shipStatus: ISignature;
		miniGame: ISignature;
		palette: ISignature;
		playerControl: ISignature;
		connectFunc: ISignature;
		fixedUpdateFunc: ISignature;
		pingMessageString: ISignature;
		serverManager: ISignature;
		showModStamp: ISignature;
		modLateUpdate: ISignature;
	};
}

export default {
	x64: {
		meetingHud: [0x21d03e0, 0xb8, 0],
		objectCachePtr: [0x10],
		meetingHudState: [0xc0],
		allPlayersPtr: [0x21d0e60, 0xb8, 0, 0x30],
		allPlayers: [0x10],
		playerCount: [0x18],
		playerAddrPtr: 0x20,
		shipStatus: [0x21d0ce0, 0xb8, 0x0],
		shipStatus_systems: [0xd8],
		shipStatus_map: [0x17c],
		shipstatus_allDoors: [0xc8],
		door_doorId: 0x1c,
		door_isOpen: 0x20,
		deconDoorUpperOpen: [0x18, 0x18],
		deconDoorLowerOpen: [0x20, 0x18],

		hqHudSystemType_CompletedConsoles: [0x18, 0x20], // OAMJKPNKGBM
		HudOverrideSystemType_isActive: [0x10],
		miniGame: [0x1c57cac, 0xb8, 0x0],
		planetSurveillanceMinigame_currentCamera: [0xd0],
		planetSurveillanceMinigame_camarasCount: [0xa8, 0x18],
		surveillanceMinigame_FilteredRoomsCount: [0x78, 0x18],
		lightRadius: [0x88, 0x34],
		palette: [0xffff, 0xb8],
		palette_playercolor: [0x198],
		palette_shadowColor: [0x1a0],
		playerControl_GameOptions: [0xffff, 0xb8, 0x8],
		gameOptions_MapId: [0x18],
		gameOptions_MaxPLayers: [0x10],
		serverManager_currentServer: [0xffff, 0xb8, 0x10, 0x20, 0x28],
		connectFunc: 0xfff,
		showModStampFunc: 0xfff,
		modLateUpdateFunc: 0xff,

		fixedUpdateFunc: 0xfff,
		pingMessageString: 0xfff,

		innerNetClient: {
			base: [0x1c57f54, 0xb8, 0x0],
			networkAddress: 0x68,
			gameMode: 0x84,
			gameId: 0x88,
			hostId: 0x8c,
			clientId: 0x90,
			gameState: 0xd4,
			onlineScene: 0xf0,
			mainMenuScene: 0xf8,
		},
		player: {
			struct: [
				{ type: 'SKIP', skip: 0x10, name: 'unused' },
				{ type: 'UINT', name: 'id' }, // 0x10
				{ type: 'SKIP', skip: 4, name: 'unused1' }, // 0x14
				{ type: 'UINT', name: 'outfitsPtr' }, // 0x18
				{ type: 'SKIP', skip: 4, name: 'unused2' }, //
				{ type: 'UINT', name: 'playerLevel' }, // 0x20
				{ type: 'UINT', name: 'disconnected' }, // 0x24
				{ type: 'UINT', name: 'rolePtr' }, // 0x28
				{ type: 'SKIP', skip: 4, name: 'unused' }, //
				{ type: 'UINT', name: 'taskPtr' }, //0x30
				{ type: 'SKIP', skip: 4, name: 'unused' }, //
				{ type: 'UINT', name: 'dead' }, // 0x38
				{ type: 'SKIP', skip: 4, name: 'unused' },
				{ type: 'UINT', name: 'objectPtr' }, //0x40
			],
			isDummy: [0x111],
			isLocal: [0x88],
			localX: [0xa0, 0x6c],
			localY: [0xa0, 0x70],
			remoteX: [0xa0, 0x58],
			remoteY: [0xa0, 0x5c],
			bufferLength: 80,
			offsets: [0, 0],
			inVent: [0x44],
			clientId: [0x28],
			currentOutfit: [0x40],
			roleTeam: [0x48],
			nameText: [0x78, 0xD8],
			outfit: {
				colorId: [0x14],
				hatId: [0x18],
				skinId: [0x28],
				visorId: [0x30],
				playerName: [0x40],
			},
		},
		signatures: {
			innerNetClient: {
				sig: '48 8B 05 ? ? ? ? 48 8B 88 ? ? ? ? 48 8B 09 48 85 C9 0F 84 ? ? ? ? 8B 81 ? ? ? ? ',
				patternOffset: 3,
				addressOffset: 4,
			},
			meetingHud: {
				sig: '48 8B 05 ? ? ? ? 48 8B 88 ? ? ? ? 74 72 48 8B 39 48 8B 0D ? ? ? ? F6 81 ? ? ? ? ?',
				patternOffset: 3,
				addressOffset: 4,
			},
			gameData: {
				sig: '48 8B 0D ? ? ? ? B2 01 88 15 ? ? ? ? 4C 8B 43 30 4D 85 C0',
				patternOffset: 3,
				addressOffset: 4,
			},
			shipStatus: {
				sig: '48 8B 05 ? ? ? ? 48 8B 5C 24 ? 48 8B 6C 24 ? 48 8B 74 24 ? 48 8B 88 ? ? ? ? 48 89 39 48 83 C4 20 5F',
				patternOffset: 3,
				addressOffset: 4,
			},
			miniGame: {
				sig: '48 8B 05 ? ? ? ? 48 89 7C 24 ? 48 8B 90 ? ? ? ? 48 C7 02 ? ? ? ? 48 8B 4B 60',
				patternOffset: 3,
				addressOffset: 4,
			},
			palette: {
				sig: '48 8B 05 ? ? ? ? 48 8B 80 ? ? ? ? 0F 10 40 30 EB 2C',
				patternOffset: 3,
				addressOffset: 4,
			},
			playerControl: {
				sig: '48 8B 05 ? ? ? ? 48 8B 88 ? ? ? ? 48 8B 01 48 8B CF 48 89 47 20 48 8B 07 48 8B 90 ? ? ? ? FF 90 ? ? ? ?',
				patternOffset: 3,
				addressOffset: 4,
			},
			showModStamp: {},
			connectFunc: {},
			fixedUpdateFunc: {},
			pingMessageString: {},
			modLateUpdate: {},
			serverManager: {
				sig:
					'48 8B 05 ? ? ? ? F6 80 ? ? ? ? ? 74 18 44 39 A8 ? ? ? ? 75 0F 48 8B C8 E8 ? ? ? ? 48 8B 05 ? ? ? ? 48 85 DB 0F 84 ? ? ? ? ',
				patternOffset: 3,
				addressOffset: 4,
			},
		},
	},
	x86: {
		meetingHud: [0x1c573a4, 0x5c, 0],
		objectCachePtr: [0x8],
		meetingHudState: [0x84],
		allPlayersPtr: [0x1c57be8, 0x5c, 0, 0x24],
		allPlayers: [0x08],
		playerCount: [0xc],
		playerAddrPtr: 0x10,
		shipStatus: [0x1c57cac, 0x5c, 0x0],
		shipStatus_systems: [0x90],
		shipStatus_map: [0xe8],
		shipstatus_allDoors: [0x88],
		door_doorId: 0x10,
		door_isOpen: 0x14,
		deconDoorUpperOpen: [0xc, 0xc],
		deconDoorLowerOpen: [0x10, 0xc],
		hqHudSystemType_CompletedConsoles: [0xc, 0x10],
		HudOverrideSystemType_isActive: [0x8],
		miniGame: [0x1c57cac, 0x5c, 0x0],
		planetSurveillanceMinigame_currentCamera: [0x6c],
		planetSurveillanceMinigame_camarasCount: [0x58, 0x0c],
		surveillanceMinigame_FilteredRoomsCount: [0x40, 0x0c],
		palette: [0xffff, 0x5c],
		palette_playercolor: [0x194],
		palette_shadowColor: [0x198],
		lightRadius: [0x60, 0x1c],
		playerControl_GameOptions: [0xffff, 0x5c, 0x4],
		gameOptions_MapId: [0x10],
		gameOptions_MaxPLayers: [0x8],
		serverManager_currentServer: [0xffff, 0x5c, 0x8, 0x10, 0x14],
		innerNetClient: {
			base: [0x1c57f54, 0x5c, 0x0],
			networkAddress: 0x38,
			networkPort: 0x3C,
			gameMode: 0x4C,
			gameId: 0x50,
			hostId: 0x54,
			clientId: 0x58,
			gameState: 0x7C,
			onlineScene: 0x8c,
			mainMenuScene: 0x90,
		},
		player: {
			struct: [
				{ type: 'SKIP', skip: 8, name: 'unused' },
				{ type: 'UINT', name: 'id' },
				{ type: 'UINT', name: 'outfitsPtr' },
				{ type: 'UINT', name: 'playerLevel' },
				{ type: 'UINT', name: 'disconnected' },
				{ type: 'UINT', name: 'rolePtr' },
				{ type: 'UINT', name: 'taskPtr' },
				{ type: 'BYTE', name: 'dead' },
				{ type: 'SKIP', skip: 3, name: 'unused2' },
				{ type: 'UINT', name: 'objectPtr' },
			],
			isDummy: [0xa9],
			isLocal: [0x60],
			localX: [0x6c, 80],
			localY: [0x6c, 84],
			remoteX: [0x6c, 60],
			remoteY: [0x6c, 64],
			bufferLength: 56,
			offsets: [0, 0],
			inVent: [0x38],
			clientId: [0x1c],
			currentOutfit: [0x34],
			roleTeam: [0x3C],
			nameText: [0x58, 0x80],
			outfit: {
				colorId: [0x0c],
				hatId: [0x10],
				skinId: [0x18],
				visorId: [0x1c],
				playerName: [0x24],
			},
		},
		connectFunc: 0xfff,
		showModStampFunc: 0xfff,
		modLateUpdateFunc: 0xff,
		fixedUpdateFunc: 0xfff,
		pingMessageString: 0xfff,
		signatures: {
			innerNetClient: {
				sig: '8B 0D ? ? ? ? 83 C4 08 8B F0 8B 49 5C 8B 11 85 D2 74 15 8B 4D 0C 8B 49 18 8B 01 50 56 52 8B 00 FF D0',
				patternOffset: 2,
				addressOffset: 0,
			},
			meetingHud: {
				sig:
					'A1 ? ? ? ? 56 8B 40 5C 8B 30 A1 ? ? ? ? F6 80 ? ? ? ? ? 74 0F 83 78 74 00 75 09 50 E8 ? ? ? ? 83 C4 04 6A 00 56 E8 ? ? ? ? 83 C4 08 84 C0 0F 85 ? ? ? ? 57',
				patternOffset: 1,
				addressOffset: 0,
			},
			gameData: {
				sig: 'A1 ? ? ? ? 83 C4 04 8B 40 5C 8B 00 85 C0 0F 84 ? ? ? ? 6A 00 FF', //'8B 0D ? ? ? ? 8B F0 83 C4 10 8B 49 5C 8B 01',
				patternOffset: 1,
				addressOffset: 0,
			},
			shipStatus: {
				sig: 'A1 ? ? ? ? FF 35 ? ? ? ? 8B 40 5C FF 30 E8 ? ? ? ? 8B F0 83 C4 08 A1 ? ? ? ? F6 80 ? ? ? ? ?',
				patternOffset: 1,
				addressOffset: 0,
			},
			miniGame: {
				sig:
					'A1 ? ? ? ? 8B 40 5C 8B 08 85 C9 0F 84 ? ? ? ? 8B 01 FF B0 ? ? ? ? 8B 80 ? ? ? ? 51 FF D0 83 C4 08 A1 ? ? ? ? 8B 40 5C',
				patternOffset: 1,
				addressOffset: 0,
			},
			palette: {
				sig: 'A1 ? ? ? ? 7C 26 F6 80 BB 00 00 ? ?',
				patternOffset: 1,
				addressOffset: 0,
			},
			playerControl: {
				sig: '8B 0D ? ? ? ? 83 C4 04 8B 41 5C 8B 00 85 C0 74 2B',
				patternOffset: 2,
				addressOffset: 0,
			},
			connectFunc: {
				//0x1c2d390
				sig: 'E8 ? ? ? ? A1 ? ? ? ? 83 C4 0C 8B 40 5C 8B 00 85 C0 0F 84 ? ? ? ? 6A 00 50 E8 ? ? ? ? 89',
				patternOffset: 1,
				addressOffset: 4,
			},
			fixedUpdateFunc: {
				sig: '75 ? 8B 46 ? 85 C0 74 0B 6A 00 50 E8 ? ? ? ? 83 C4 08 83 7E ? 00',
				patternOffset: 0,
				addressOffset: -5,
			},
			pingMessageString: {
				sig:
					'E8 ? ? ? ? 6A 00 50 FF 35 ? ? ? ? E8 ? ? ? ? 83 C4 1C 8B C8 85 F6 74 1A 8B 06 FF B0 ? ? ? ? 8B',
				patternOffset: 0xA,
				addressOffset: 0,
			},
			serverManager: {
				sig: 'A1 ? ? ? ? 89 55 E0 F6 80 ? ? ? ? ? 74 14 83 78 74 00 75 0E 50 E8 ? ? ? ? A1 ? ? ? ? ',
				patternOffset: 1,
				addressOffset: 0,
			},
			showModStamp: {
				sig: '55 8B EC 8B 45 08 8B 40 10 85 C0 74 0F 6A 00 6A 01 50 E8 ? ? ? ? 83 C4 0C 5D C3 E9 ? ? ? ?',
				patternOffset: 0,
				addressOffset: -5,
			},
			modLateUpdate: {
				sig: '53 8B DC 83 EC 08 83 E4 F0 83 C4 04 55 8B 6B 04 89 6C 24 04 8B EC 83 EC 28 80 3D',
				patternOffset: 0,
				addressOffset: 0,
			},
		},
	},
} as IOffsetsStore;

export function TempFixOffsets(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.innerNetClient.gameState = 0x6c;
	offsets.innerNetClient.gameId = 0x48;
	offsets.innerNetClient.hostId = 0x4c;
	offsets.innerNetClient.clientId = 0x50;
	offsets.player.struct[3].skip = 1;
	offsets.player.struct[4].type = 'USHORT';
	offsets.player.struct.splice(5, 0, { type: 'SKIP', skip: 1, name: 'unused' });
	return offsets;
}

export function TempFixOffsets2(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.player.localX[0] = 0x60;
	offsets.player.localY[0] = 0x60;
	offsets.player.remoteX[0] = 0x60;
	offsets.player.remoteY[0] = 0x60;
	offsets.shipStatus_map[0] = 0xd4;
	offsets.innerNetClient.gameState = 0x64;
	offsets.innerNetClient.gameId = 0x40;
	offsets.innerNetClient.hostId = 0x44;
	offsets.innerNetClient.clientId = 0x48;
	offsets.player.struct = offsets.player.struct.filter((o) => o.name !== 'COLORBEFORE');
	offsets.player.struct[4].skip = 2;
	offsets.palette[0] = 0x1c57fc4;
	offsets.palette_playercolor[0] = 0xe4;
	offsets.palette_shadowColor[0] = 0xe8;
	offsets.shipStatus_systems[0] = 0x84;

	return offsets;
}

export function TempFixOffsets3(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.player.localX[0] = 0x64;
	offsets.player.localY[0] = 0x64;
	offsets.player.remoteX[0] = 0x64;
	offsets.player.remoteY[0] = 0x64;
	offsets.palette_playercolor[0] = 0xe8;
	offsets.palette_shadowColor[0] = 0xec;

	offsets.signatures.gameData.patternOffset = 2;
	offsets.signatures.gameData.sig = '8B 0D ? ? ? ? 8B F0 83 C4 10 8B 49 5C 8B 01';

	return offsets;
}

export function TempFixOffsets4(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.innerNetClient.gameState = 0x70;
	offsets.innerNetClient.onlineScene = 0x7c;
	offsets.innerNetClient.mainMenuScene = 0x80;

	return offsets;
}

export function TempFixOffsets5(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.player = {
		struct: [
			{ type: 'SKIP', skip: 8, name: 'unused' },
			{ type: 'UINT', name: 'id' },
			{ type: 'UINT', name: 'name' },
			{ type: 'SKIP', skip: 4, name: 'COLORBEFORE' },
			{ type: 'UINT', name: 'color' },
			{ type: 'UINT', name: 'hat' },
			{ type: 'UINT', name: 'pet' },
			{ type: 'UINT', name: 'skin' },
			{ type: 'UINT', name: 'disconnected' },
			{ type: 'UINT', name: 'taskPtr' },
			{ type: 'BYTE', name: 'impostor' },
			{ type: 'BYTE', name: 'dead' },
			{ type: 'SKIP', skip: 2, name: 'unused' },
			{ type: 'UINT', name: 'objectPtr' },
		],
		isDummy: [0x89],
		isLocal: [0x54],
		localX: [0x60, 80],
		localY: [0x60, 84],
		remoteX: [0x60, 60],
		remoteY: [0x60, 64],
		bufferLength: 56,
		offsets: [0, 0],
		inVent: [0x31],
		clientId: [0x1c],
		roleTeam: [0xff],
		currentOutfit: [0xff],

		outfit: {
			colorId: [0xff],
			hatId: [0xff],
			skinId: [0xff],
			visorId: [0xff],
			playerName: [0xff],
		},
	};
	//	offsets.palette[0] = 0x1ba85a4;
	offsets.palette_shadowColor = [0xf8];
	offsets.palette_playercolor = [0xf4];
	offsets.innerNetClient.gameMode = 0x48;
	offsets.innerNetClient.gameId = 0x4C;
	offsets.innerNetClient.hostId = 0x50;
	offsets.innerNetClient.clientId = 0x54;
	offsets.innerNetClient.gameState = 0x74;
	offsets.innerNetClient.onlineScene = 0x80;
	offsets.innerNetClient.mainMenuScene = 0x84;
	offsets.shipStatus_systems = [0x8c];
	offsets.shipstatus_allDoors = [0x84];
	offsets.shipStatus_map = [0xe4];
	offsets.lightRadius = [0x54, 0x1c];
	
	return offsets;
}


export function TempFixOffsets6(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets.innerNetClient.gameMode = 0x48;
	offsets.innerNetClient.gameId = 0x4C;
	offsets.innerNetClient.hostId = 0x50;
	offsets.innerNetClient.clientId = 0x54;
	offsets.innerNetClient.gameState = 0x78;
	offsets.innerNetClient.onlineScene = 0x88;
	offsets.innerNetClient.mainMenuScene = 0x8C;

	return offsets;
}