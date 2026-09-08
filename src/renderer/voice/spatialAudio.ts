import { AmongUsState, GameState, Player } from '../../common/AmongUsState';
import { ISettings, ILobbySettings } from '../../common/ISettings';
import { AmongUsMaps, CameraLocation } from '../../common/AmongusMap';
import { poseCollide } from '../../common/ColliderMap';

export interface MuffleSetting {
	type: BiquadFilterType;
	frequency: number;
	q: number;
}

export interface VoiceAudioInput {
	state: AmongUsState;
	settings: ISettings;
	activeLobbySettings: ILobbySettings;
	me: Player;
	other: Player;
	maxDistance: number;
	impostorRadioClientId: number;
	/**
	 * True while the round's grace period is still running. Decided by the caller so this stays a
	 * pure function of its input, and so the deadline is read once per frame rather than per peer.
	 */
	inGracePeriod: boolean;
}

/**
 * `null` on an effect field means "leave the node as it is"; `false` means "ensure disconnected".
 */
export interface VoiceAudioResult {
	gain: number;
	panPosition: [number, number] | null;
	panMaxDistance: number | null;
	muffle: MuffleSetting | false | null;
	reverb: boolean | null;
}

function distance(panPos: [number, number]): number {
	return Math.sqrt(panPos[0] * panPos[0] + panPos[1] * panPos[1]);
}

export function calculateVoiceAudio(input: VoiceAudioInput): VoiceAudioResult {
	const { state, settings, activeLobbySettings, me, other, maxDistance, impostorRadioClientId, inGracePeriod } = input;

	const result: VoiceAudioResult = {
		gain: 0,
		panPosition: null,
		panMaxDistance: null,
		muffle: null,
		reverb: null,
	};

	if (other.disconnected || other.isDummy) {
		return result;
	}

	let panPos: [number, number] = [other.x - me.x, other.y - me.y];
	let endGain = 0;
	let wallCheckEnabled = false;
	let skipDistanceCheck = false;
	let muffleEnabled = false;
	const onImpostorRadio =
		activeLobbySettings.impostorRadioEnabled &&
		other.isImpostor &&
		impostorRadioClientId !== -1 &&
		other.clientId === impostorRadioClientId;

	switch (state.gameState) {
		case GameState.MENU:
			return result;

		case GameState.LOBBY:
			endGain = 1;
			break;

		case GameState.TASKS:
			endGain = 1;

			if (activeLobbySettings.meetingGhostOnly) {
				if (activeLobbySettings.ghostsCanTalkIngame && me.isDead && other.isDead) {
					// Ghosts reach each other across the whole map, the way everyone does in a meeting.
					skipDistanceCheck = true;
				} else if (!inGracePeriod) {
					endGain = 0;
				}
				// Nothing here lets the living hear the dead, grace period included: the haunting
				// branch below zeroes that combination for every case that reaches it.
			}
			if (!me.isDead && activeLobbySettings.commsSabotage && state.comsSabotaged && !me.isImpostor) {
				endGain = 0;
			}

			if (
				other.inVent &&
				!(activeLobbySettings.hearImpostorsInVents || (activeLobbySettings.impostersHearImpostersInvent && me.inVent))
			) {
				endGain = 0;
			}
			wallCheckEnabled = activeLobbySettings.wallsBlockAudio && !me.isDead;
			if (onImpostorRadio && me.isImpostor) {
				skipDistanceCheck = true;
				muffleEnabled = true;
				result.muffle = { type: 'highpass', frequency: 1000, q: 10 };
			} else if (onImpostorRadio && !me.isDead && activeLobbySettings.impostorRadioPrivate) {
				endGain = 0;
			}

			if (!me.isDead && other.isDead && me.isImpostor && activeLobbySettings.haunting) {
				result.reverb = true;
				wallCheckEnabled = false;
				endGain = settings.ghostVolumeAsImpostor / 100;
			} else if (other.isDead && !me.isDead) {
				endGain = 0;
			}
			break;

		case GameState.DISCUSSION:
			panPos = [0, 0];
			endGain = 1;
			if (!me.isDead && other.isDead) {
				endGain = 0;
			}
			break;

		case GameState.UNKNOWN:
		default:
			endGain = 0;
			break;
	}

	if (state.lightRadiusChanged) {
		result.panMaxDistance = maxDistance;
	}

	if (!other.isDead || state.gameState !== GameState.TASKS || !me.isImpostor || me.isDead) {
		result.reverb = false;
	}

	if (activeLobbySettings.deadOnly) {
		panPos = [0, 0];
		if (!me.isDead || !other.isDead) {
			endGain = 0;
		}
	}

	let isOnCamera = state.currentCamera !== CameraLocation.NONE;
	if (!skipDistanceCheck && distance(panPos) > maxDistance) {
		if (!activeLobbySettings.hearThroughCameras || state.gameState !== GameState.TASKS) {
			return result;
		}

		if (state.currentCamera !== CameraLocation.NONE && state.currentCamera !== CameraLocation.Skeld) {
			const cameraPos = AmongUsMaps[state.map].cameras[state.currentCamera];
			panPos = [other.x - cameraPos.x, other.y - cameraPos.y];
		} else if (state.currentCamera === CameraLocation.Skeld) {
			let closest = 999;
			let cameraPos = { x: 999, y: 999 };
			for (const camera of Object.values(AmongUsMaps[state.map].cameras)) {
				const cameraDist = Math.sqrt(Math.pow(other.x - camera.x, 2) + Math.pow(other.y - camera.y, 2));
				if (closest > cameraDist) {
					closest = cameraDist;
					cameraPos = camera;
				}
			}
			if (closest !== 999) {
				panPos = [other.x - cameraPos.x, other.y - cameraPos.y];
			}
		}

		if (distance(panPos) > maxDistance) {
			return result;
		}
	} else {
		if (
			!skipDistanceCheck &&
			wallCheckEnabled &&
			poseCollide({ x: me.x, y: me.y }, { x: other.x, y: other.y }, state.map, state.closedDoors)
		) {
			return result;
		}
		isOnCamera = false;
	}

	const inVentMuffle = (me.inVent && !me.isDead) || (other.inVent && !other.isDead);
	if ((inVentMuffle || isOnCamera) && state.gameState === GameState.TASKS) {
		result.muffle = {
			type: 'lowpass',
			frequency: isOnCamera ? 2300 : 2000,
			q: isOnCamera ? -15 : 20,
		};
		if (endGain === 1) endGain = isOnCamera ? 0.8 : 0.5;
	} else if (!muffleEnabled) {
		result.muffle = false;
	}

	if (!settings.enableSpatialAudio || skipDistanceCheck) {
		panPos = [0, 0];
	}

	result.panPosition = panPos;
	result.gain = endGain;
	return result;
}
