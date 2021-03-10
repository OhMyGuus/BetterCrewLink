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
	gameState: number[];
	innerNetClient: number[];
	allPlayersPtr: number[];
	allPlayers: number[];
	playerCount: number[];
	playerAddrPtr: number;
	exiledPlayerId: number[];
	gameCode: number[];
	hostId: number[];
	clientId: number[];
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
	player: {
		isLocal: number[];
		localX: number[];
		localY: number[];
		remoteX: number[];
		remoteY: number[];
		bufferLength: number;
		offsets: number[];
		inVent: number[];
		clientId: number[];
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
	};
}

export default {
	x64: {
		meetingHud: [0x21d03e0, 0xb8, 0],
		objectCachePtr: [0x10],
		meetingHudState: [0xc0],
		innerNetClient: [0x1c57f54, 0xb8, 0x0],
		gameState: [0xBC],
		gameCode: [0x84],
		hostId: [0x88],
		clientId: [0x8c],
		allPlayersPtr: [0x21d0e60, 0xb8, 0, 0x30],
		allPlayers: [0x10],
		playerCount: [0x18],
		playerAddrPtr: 0x20,
		exiledPlayerId: [0xff, 0x21d03e0, 0xb8, 0, 0xe0, 0x10],
		shipStatus: [0x21d0ce0, 0xb8, 0x0],
		shipStatus_systems: [0xD0],
		shipStatus_map: [0x174],
		shipstatus_allDoors: [0xb0],
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
		lightRadius: [0x78, 0x34],
		palette: [0xffff, 0xb8],
		palette_playercolor: [0xf0],
		palette_shadowColor: [0xf8],

		player: {
			struct: [
				{ type: 'SKIP', skip: 0x10, name: 'unused' },
				{ type: 'UINT', name: 'id' },
				{ type: 'SKIP', skip: 4, name: 'unused' },
				{ type: 'UINT', name: 'name' },
				{ type: 'SKIP', skip: 5, name: 'unused' },
				{ type: 'USHORT', name: 'color' },
				{ type: 'SKIP', skip: 1, name: 'unused' },
				{ type: 'UINT', name: 'hat' },
				{ type: 'UINT', name: 'pet' },
				{ type: 'UINT', name: 'skin' },
				{ type: 'UINT', name: 'disconnected' },
				{ type: 'SKIP', skip: 4, name: 'unused' },
				{ type: 'UINT', name: 'taskPtr' },
				{ type: 'SKIP', skip: 4, name: 'unused' },
				{ type: 'BYTE', name: 'impostor' },
				{ type: 'BYTE', name: 'dead' },
				{ type: 'SKIP', skip: 6, name: 'unused' },
				{ type: 'UINT', name: 'objectPtr' },
				{ type: 'SKIP', skip: 4, name: 'unused' },
			],
			isLocal: [0x78],
			localX: [0x98, 0x6c],
			localY: [0x98, 0x70],
			remoteX: [0x98, 0x58],
			remoteY: [0x98, 0x5c],
			bufferLength: 80,
			offsets: [0, 0],
			inVent: [0x3d],
			clientId: [0x28],
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
				sig: '48 8B 05 ? ? ? ? 48 8B 88 ? ? ? ? 48 8B 01 48 85 C0 0F 84 ? ? ? ? BE ? ? ? ?',
				patternOffset: 3,
				addressOffset: 4,
			},
			shipStatus: {
				sig: '48 8B 05 ? ? ? ? 48 8B 5C 24 ? 48 8B 6C 24 ? 48 8B 74 24 ? 48 8B 88 ? ? ? ? 48 89 39 48 83 C4 20 5F',
				patternOffset: 3,
				addressOffset: 4,
			},
			miniGame: {
				sig: '48 8B 05 ? ? ? ? 4C 8B 80 ? ? ? ? 49 89 38 48 89 5F 20 48 85 DB 75 04 33 C0 EB 35 48 8B 15 ? ? ? ?',
				patternOffset: 3,
				addressOffset: 4,
			},
			palette: {
				sig:
					'48 8B 05 ? ? ? ? 48 8B 80 ? ? ? ? 4C 8D 44 24 ? 0F 28 DF 66 0F 7F 74 24 ? 48 8D 54 24 ? 48 89 74 24 ? 48 8D 4C 24 ? 0F 10 40 40 0F 29 44 24 ? ',
				patternOffset: 3,
				addressOffset: 4,
			},
		},
	},
	x86: {
		meetingHud: [0x1c573a4, 0x5c, 0],
		objectCachePtr: [0x8],
		meetingHudState: [0x84],
		innerNetClient: [0x1c57f54, 0x5c, 0x0],
		gameState: [0x6c],
		gameCode: [0x48],
		hostId: [0x4c],
		clientId: [0x50],
		allPlayersPtr: [0x1c57be8, 0x5c, 0, 0x24],
		allPlayers: [0x08],
		playerCount: [0x0c],
		playerAddrPtr: 0x10,
		exiledPlayerId: [0xff, 0x1c573a4, 0x5c, 0, 0x94, 0x08],
		shipStatus: [0x1c57cac, 0x5c, 0x0],
		shipStatus_systems: [0x8C],
		shipStatus_map: [0xe4],
		shipstatus_allDoors: [0x7c],
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
		palette_playercolor: [0xe8],
		palette_shadowColor: [0xec],
		lightRadius: [0x54, 0x1c],
		player: {
			struct: [
				{ type: 'SKIP', skip: 8, name: 'unused' },
				{ type: 'UINT', name: 'id' },
				{ type: 'UINT', name: 'name' },
				{ type: 'SKIP', skip: 1, name: 'COLORBEFORE' },
				{ type: 'USHORT', name: 'color' },
				{ type: 'SKIP', skip: 1, name: 'unused' },
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
			isLocal: [0x54],
			localX: [0x64, 80],
			localY: [0x64, 84],
			remoteX: [0x64, 60],
			remoteY: [0x64, 64],
			bufferLength: 56,
			offsets: [0, 0],
			inVent: [0x31],
			clientId: [0x1c],
		},
		signatures: {
			innerNetClient: {
				sig: '8B 0D ? ? ? ? 83 C4 08 8B F0 8B 49 5C 8B 11 85 D2 74 15 8B 4D 0C 8B 49 18 8B 01 50 56 52 8B 00 FF D0',
				patternOffset: 2,
				addressOffset: 0,
			},
			meetingHud: {
				sig:
					'A1 ? ? ? ? 56 8B 40 5C 8B 30 A1 ? ? ? ? F6 80 ? ? ? ? ? 74 0F 83 78 74 00 75 09 50 E8 ? ? ? ? 83 C4 04 6A 00 56 E8 ? ? ? ? 83 C4 08 84 C0 0F 85 ? ? ? ? 57 8B 7D 0C 6A 00 57 FF 35 ? ? ? ? E8 ? ? ? ? 8B 0D ? ? ? ? 83 C4 0C 8B F0 F6 81 ? ? ? ? ?',
				patternOffset: 1,
				addressOffset: 0,
			},
			gameData: {
				sig:
					'8B 0D ? ? ? ? 8B F0 83 C4 10 8B 49 5C 8B 01 85 C0 0F 84 ? ? ? ? 6A 00 FF 75 F4 50 E8 ? ? ? ? 83 C4 0C 89 45 E8 85 C0',
				patternOffset: 2,
				addressOffset: 0,
			},
			shipStatus: {
				sig: 'A1 ? ? ? ? 8B 40 5C 8B 00 85 C0 74 5A 8B 80 ? ? ? ? 85 C0 74 50 6A 00 6A 00',
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
				sig: 'A1 ? ? ? ? 83 C4 04 8B 40 5C 0F 10 80 ? ? ? ? EB 11',
				patternOffset: 1,
				addressOffset: 0,
			},
		},
	},
} as IOffsetsStore;

export function TempFixOffsets(offsetsOld: IOffsets): IOffsets {
	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
	offsets!.player.localX[0] = 0x60;
	offsets!.player.localY[0] = 0x60;
	offsets!.player.remoteX[0] = 0x60;
	offsets!.player.remoteY[0] = 0x60;
	offsets!.shipStatus_map[0] = 0xd4;
	offsets!.gameState[0] = 0x64;
	offsets!.gameCode[0] = 0x40;
	offsets!.hostId[0] = 0x44;
	offsets!.clientId[0] = 0x48;
	offsets!.player.struct = offsets!.player.struct.filter((o) => o.name !== 'COLORBEFORE');
	console.log(offsets!.player.struct);
	offsets!.player.struct[4].skip = 2;
	offsets!.palette[0] = 0x1c57fc4;
	offsets!.palette_playercolor[0] = 0xe4;
	offsets!.palette_shadowColor[0] = 0xe8;
	offsets!.shipStatus_systems[0] = 0x84;

	return offsets;
}
