import { GameState } from './AmongUsState';

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
