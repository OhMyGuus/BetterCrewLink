import { GameState,  ClientBoolMap } from './AmongUsState';

export interface OverlayState {
	gameState: GameState;
	players: overlayPlayer[];
}

export interface overlayPlayer {
	id: number;
	clientId: number;
	inVent: boolean;
	isDead: boolean;
	name: string;
	colorId: number;
	hatId: number;
	petId: number;
	skinId: number;
	disconnected: boolean;
	isLocal: boolean;
	bugged: boolean;
	connected: boolean;
}

export interface ObsVoiceState {
	overlayState: OverlayState;
	otherTalking: ClientBoolMap;
	otherDead: ClientBoolMap;
	localTalking: boolean;
	localIsAlive: boolean;
}
