export enum MapType {
	THE_SKELD,
	MIRA_HQ,
	POLUS,
	THE_SKELD_APRIL,
	AIRSHIP,
	UNKNOWN,
}

export interface Vector2 {
	x: number;
	y: number;
}

export enum CameraLocation {
	East, //ENGINE ROOM
	Central, // VAULT
	Northeast, // RECORDS
	South, // SECURITY
	SouthWest, // CARGO BAY
	NorthWest, // MEETING ROOM
	Skeld,
	NONE,
}

export interface CamerasMap {
	[cameraLoc: number]: Vector2;
}

interface AmongUsMap {
	cameras: CamerasMap;
}

const defaultMap: AmongUsMap = {
	cameras: {},
};
export const AmongUsMaps: { [key in MapType]: AmongUsMap } = {
	[MapType.THE_SKELD]: {
		cameras: {
			[0]: { x: 13.2417, y: -4.348 },
			[1]: { x: 0.6216, y: -6.5642 },
			[2]: { x: -7.1503, y: 1.6709 },
			[3]: { x: -17.8098, y: -4.8983 },
		},
	},

	
	[MapType.POLUS]: {
		cameras: {
			[CameraLocation.East]: { x: 29, y: -15.7 },
			[CameraLocation.Central]: { x: 15.4, y: -15.4 },
			[CameraLocation.Northeast]: { x: 24.4, y: -8.5 },
			[CameraLocation.South]: { x: 17, y: -20.6 },
			[CameraLocation.SouthWest]: { x: 4.7, y: -22.73 },
			[CameraLocation.NorthWest]: { x: 11.6, y: -8.2 },
		},
	},
	[MapType.THE_SKELD_APRIL]: defaultMap,
	[MapType.MIRA_HQ]: defaultMap,
	[MapType.AIRSHIP]: {
		cameras: {

		[CameraLocation.East]: { x: -8.2872, y: 0.0527 }, //ENGINE ROOM
		[CameraLocation.Central]: { x: -4.0477, y: 9.1447},// VAULT
		[CameraLocation.Northeast]: { x: 23.5616, y: 9.8882 },// RECORDS
		[CameraLocation.South]: { x: 4.881, y: -11.1688 }, // SECURITY
		[CameraLocation.SouthWest]: { x: 30.3702, y: -0.874 },// CARGO BAY
		[CameraLocation.NorthWest]: { x: 3.3018, y: 16.2631 },// MEETING ROOM
		}
	},
	[MapType.UNKNOWN]: defaultMap,
};


// East: 29, -15.7
// Central: 15.4, -15.4
// Northeast: 24.4, -8.5
// South: 17, -20.6
// Southwest: 4.7, -22.73
// Northwest: 11.6, -8.2
