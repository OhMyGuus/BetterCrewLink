import { GameState } from './AmongUsState';
export type MODS = "NONE" | "TOWN_OF_IMPOSTORS" | "TOWN_OF_US" | "THE_OTHER_ROLES" | "EXTRA_ROLES" | "OTHER";
export interface AmongusMod {
	id: MODS;
	label: string;
	dllStartsWith?: string
}


export const modList: AmongusMod[] = [
	// recieve this later from git?
	{
		id: 'NONE',
		label: 'None',
	},
	{
		id: 'TOWN_OF_US',
		label: 'Town of Us',
		dllStartsWith: 'TownOfUs'
	},
	{
		id: 'TOWN_OF_IMPOSTORS',
		label: 'Town of Impostors',
		dllStartsWith: 'TownOfImpostors'

	},
	{
		id: 'THE_OTHER_ROLES',
		label: 'The Other Roles',
		dllStartsWith: 'TheOtherRoles'
	},
	{
		id: 'EXTRA_ROLES',
		label: 'Extra Roles',
		dllStartsWith: 'ExtraRoles'
	},
	{
		id: 'OTHER',
		label: 'Other',
	},
];

export interface PublicLobby {
	id: number;
	title: string;
	host: string;
	current_players: number;
	max_players: number;
	language: string;
	mods: string;
	isPublic: boolean;
	server: string;
	gameState: GameState;
	stateTime: number;
}

export interface PublicLobbyMap {
	[id: number]: PublicLobby;
}
