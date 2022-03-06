import { GameState, ClientBoolMap } from './AmongUsState';

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
	hatId: string;
	skinId: string;
	visorId: string;
	petId: number;
	disconnected: boolean;
	isLocal: boolean;
	bugged: boolean;
	connected: boolean;
	realColor: string[]
	shiftedColor: number;
}

export interface ObsVoiceState {
	overlayState: OverlayState;
	otherTalking: ClientBoolMap;
	otherDead: ClientBoolMap;
	localTalking: boolean;
	localIsAlive: boolean;
	mod: string;
	oldMeetingHud: boolean;
}
