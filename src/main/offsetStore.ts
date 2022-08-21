import Store from 'electron-store';
import fetch from 'node-fetch';
import Errors from '../common/Errors';

export interface IOffsetsLookup {
	patterns: {
		x64: { broadcastVersion: ISignature };
		x86: { broadcastVersion: ISignature };
	};
	versions: {
		[innerNetClientId: string]: {
			version: string;
			file: string;
			offsetsVersion: number;
		};
	};
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
	oldMeetingHud: boolean;
	disableWriting: boolean;
}

interface IOffsetsStore {
	filename: string;
	is_64bit: boolean;
	offsetsVersion: number;
	offsets: IOffsets;
}

const BASE_URL = "https://cdn.jsdelivr.net/gh/OhMyGuus/BetterCrewlink-Offsets@main/"; // "https://raw.githubusercontent.com/OhMyGuus/BetterCrewlink-Offsets/main"

const store = new Store<IOffsetsStore>({name: "offsets"});
const lookupStore = new Store<IOffsetsLookup>({name: "lookup"});

async function fetchOffsetLookupJson(): Promise<IOffsetsLookup> {
	console.log(`Fetching lookup file`);
	return fetch(`${BASE_URL}lookup.json`)
		.then((response) => response.json())
		.then((data) => { return data as IOffsetsLookup })
		.catch((_) => { throw Errors.LOOKUP_FETCH_ERROR })
}

export async function fetchOffsetLookup(): Promise<IOffsetsLookup> {
	try {
		const lookups = await fetchOffsetLookupJson();
		lookupStore.set(lookups);
		return lookups;
	} catch {
		// Check if cache file has never been generated
		if (!lookupStore.get('patterns')) throw Errors.LOOKUP_FETCH_ERROR;
		return lookupStore.store
	}
}

const OFFSETS_URL = `${BASE_URL}offsets`;
async function fetchOffsetsJson(is_64bit: boolean, filename: string): Promise<IOffsets> {
	console.log(`Fetching file: ${filename}`);
	return fetch(`${OFFSETS_URL}/${is_64bit ? 'x64' : 'x86'}/${filename}`)
		.then((response) => response.json())
		.then((data) => { return data as IOffsets })
		.catch((_) => { throw Errors.OFFSETS_FETCH_ERROR })
}

export async function fetchOffsets(is_64bit: boolean, filename: string, offsetsVersion: number): Promise<IOffsets> {
	// offsetsVersion in case we need to update people's cached file
	// >= version to allow testing with local file updates (eg remote vers 2, local vers 3)
	// no need to host local http server
	if (store.get('filename')  == filename && store.get('is_64bit') == is_64bit && store.get('offsetsVersion') >= offsetsVersion) {
		console.log("Loading cached offsets");
		return store.get('IOffsets');
	}
	const offsets = await fetchOffsetsJson(is_64bit, filename);
	store.set('filename', filename);
	store.set('is_64bit', is_64bit);
	store.set('offsetsVersion', offsetsVersion ? offsetsVersion : 0);
	store.set('IOffsets', offsets);
	return offsets;
}