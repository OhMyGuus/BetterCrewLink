import Store from 'electron-store';
import { GamePlatform } from '../../common/GamePlatform';
import { ILobbySettings, ISettings, SocketConfig } from '../../common/ISettings';

export enum pushToTalkOptions {
	VOICE,
	PUSH_TO_TALK,
	PUSH_TO_MUTE,
}

export const SettingsStore = new Store<ISettings>({
	migrations: {
		'2.0.6': (store) => {
			if (
				store.get('serverURL') === 'http://bettercrewl.ink' ||
				store.get('serverURL') === 'https://bettercrewlink.app' ||
				store.get('serverURL') === 'http://bettercrewlink.app' ||
				store.get('serverURL') === 'https://bettercrewlink.app/' ||
				store.get('serverURL') === 'http://bettercrewlink.app/' ||
				store.get('serverURL') === 'https://bettercrewl.ink:6523' ||
				store.get('serverURL') === 'http://bettercrewl.ink:6523' ||
				store.get('serverURL') === 'https://crewlink.guus.info' ||
				store.get('serverURL') === 'http://crewlink.guus.info' ||
				store.get('serverURL') === 'https://crewlink.guus.ninja' ||
				store.get('serverURL') === 'http://crewlink.guus.ninja' ||
				store.get('serverURL') === 'https://github.com/OhMyGuus/BetterCrewLink' ||
				store.get('serverURL') === 'https://mirror.bettercrewl.ink' ||
				store.get('serverURL') === 'https://mirror.bettercrewl.ink/' ||
				store.get('serverURL') === 'https://www.curseforge.com/among-us/all-mods/bettercrewlink-proximity-chat' ||
				store.get('serverURL') === 'https://matadorprobr.itch.io/bettercrewlink' ||
				store.get('serverURL') === 'https://gamebanana.com/tools/7079' ||
				store.get('serverURL') === 'https://web.bettercrewl.ink' ||
				store.get('serverURL') === 'https://obs.bettercrewlink.app' ||
				store.get('serverURL') === 'https://discord.gg/qDqTzvj4SH'
			) {
				store.set('serverURL', 'https://bettercrewl.ink');
			}
		},
		'2.0.7': (store) => {
			if (
				store.get('serverURL') === 'http://bettercrewl.ink' ||
				store.get('serverURL') === 'https://bettercrewlink.app' ||
				store.get('serverURL') === 'http://bettercrewlink.app' ||
				store.get('serverURL') === 'https://bettercrewlink.app/' ||
				store.get('serverURL') === 'http://bettercrewlink.app/' ||
				store.get('serverURL') === 'https://bettercrewl.ink:6523' ||
				store.get('serverURL') === 'http://bettercrewl.ink:6523' ||
				store.get('serverURL') === 'https://crewlink.guus.info' ||
				store.get('serverURL') === 'http://crewlink.guus.info' ||
				store.get('serverURL') === 'https://crewlink.guus.ninja' ||
				store.get('serverURL') === 'http://crewlink.guus.ninja' ||
				store.get('serverURL') === 'https://github.com/OhMyGuus/BetterCrewLink' ||
				store.get('serverURL') === 'https://mirror.bettercrewl.ink' ||
				store.get('serverURL') === 'https://mirror.bettercrewl.ink/' ||
				store.get('serverURL') === 'https://www.curseforge.com/among-us/all-mods/bettercrewlink-proximity-chat' ||
				store.get('serverURL') === 'https://matadorprobr.itch.io/bettercrewlink' ||
				store.get('serverURL') === 'https://gamebanana.com/tools/7079' ||
				store.get('serverURL') === 'https://web.bettercrewl.ink' ||
				store.get('serverURL') === 'https://obs.bettercrewlink.app' ||
				store.get('serverURL') === 'https://discord.gg/qDqTzvj4SH'
			) {
				store.set('serverURL', 'https://bettercrewl.ink');
			}
		},
		'2.1.4': (store) => {
			store.set('playerConfigMap', {});
		},
		'2.2.0': (store) => {
			store.set('mobileHost', true);
		},
		'2.2.5': (store) => {
			const pushToTalkValue = store.get('pushToTalk');
			if (typeof pushToTalkValue === 'boolean') {
				store.set('pushToTalkMode', pushToTalkValue ? pushToTalkOptions.PUSH_TO_TALK : pushToTalkOptions.VOICE);
			}
			// @ts-ignore
			store.delete('pushToTalk');
		},
		'2.3.6': (store) => {
			if ((store.get('serverURL') as string).includes('//crewl.ink')) store.set('serverURL', 'https://bettercrewl.ink');
		},
		'2.4.0': (store) => {
			const currentSensitivity = store.get('micSensitivity') as number;
			if (currentSensitivity >= 0.3) {
				store.set('micSensitivity', 0.15);
				store.set('micSensitivityEnabled', false);
			}
		},
	},
	schema: {
		alwaysOnTop: {
			type: 'boolean',
			default: false,
		},
		language: {
			type: 'string',
			default: 'unkown',
		},
		microphone: {
			type: 'string',
			default: 'Default',
		},
		speaker: {
			type: 'string',
			default: 'Default',
		},
		pushToTalkMode: {
			type: 'number',
			default: pushToTalkOptions.VOICE,
		},
		serverURL: {
			type: 'string',
			default: 'https://bettercrewl.ink',
			format: 'uri',
		},
		pushToTalkShortcut: {
			type: 'string',
			default: 'V',
		},
		deafenShortcut: {
			type: 'string',
			default: 'RControl',
		},
		impostorRadioShortcut: {
			type: 'string',
			default: 'F',
		},
		muteShortcut: {
			type: 'string',
			default: 'RAlt',
		},
		hideCode: {
			type: 'boolean',
			default: false,
		},
		compactOverlay: {
			type: 'boolean',
			default: false,
		},
		overlayPosition: {
			type: 'string',
			default: 'right',
		},
		meetingOverlay: {
			type: 'boolean',
			default: true,
		},
		enableOverlay: {
			type: 'boolean',
			default: true,
		},
		ghostVolume: {
			type: 'number',
			default: 100,
		},
		masterVolume: {
			type: 'number',
			default: 100,
		},
		microphoneGain: {
			type: 'number',
			default: 100,
		},
		microphoneGainEnabled: {
			type: 'boolean',
			default: false,
		},
		micSensitivity: {
			type: 'number',
			default: 0.15,
		},
		micSensitivityEnabled: {
			type: 'boolean',
			default: false,
		},
		natFix: {
			type: 'boolean',
			default: false,
		},
		mobileHost: {
			type: 'boolean',
			default: true,
		},
		vadEnabled: {
			type: 'boolean',
			default: true,
		},
		hardware_acceleration: {
			type: 'boolean',
			default: true,
		},
		enableSpatialAudio: {
			type: 'boolean',
			default: true,
		},
		obsSecret: {
			type: 'string',
			default: undefined,
		},

		obsOverlay: {
			type: 'boolean',
			default: false,
		},
		echoCancellation: {
			type: 'boolean',
			default: true,
		},
		noiseSuppression: {
			type: 'boolean',
			default: true,
		},
		oldSampleDebug: {
			type: 'boolean',
			default: false,
		},
		playerConfigMap: {
			type: 'object',
			default: {},
			additionalProperties: {
				type: 'object',
				properties: {
					volume: {
						type: 'number',
						default: 1,
					},
					isMuted: {
						type: 'boolean',
						default: false,
					},
				},
			},
		},
		localLobbySettings: {
			type: 'object',
			properties: {
				maxDistance: {
					type: 'number',
					default: 5.32,
				},
				haunting: {
					type: 'boolean',
					default: false,
				},
				commsSabotage: {
					type: 'boolean',
					default: false,
				},
				hearImpostorsInVents: {
					type: 'boolean',
					default: false,
				},
				impostersHearImpostersInvent: {
					type: 'boolean',
					default: false,
				},
				impostorRadioEnabled: {
					type: 'boolean',
					default: false,
				},
				deadOnly: {
					type: 'boolean',
					default: false,
				},
				meetingGhostOnly: {
					type: 'boolean',
					default: false,
				},
				visionHearing: {
					type: 'boolean',
					default: false,
				},
				hearThroughCameras: {
					type: 'boolean',
					default: false,
				},
				wallsBlockAudio: {
					type: 'boolean',
					default: false,
				},
				publicLobby_on: {
					type: 'boolean',
					default: false,
				},
				publicLobby_title: {
					type: 'string',
					default: '',
				},
				publicLobby_language: {
					type: 'string',
					default: 'en',
				},
				publicLobby_mods: {
					type: 'string',
					default: 'NONE',
				},
			},
			default: {
				maxDistance: 5.32,
				haunting: false,
				commsSabotage: false,
				hearImpostorsInVents: false,
				hearThroughCameras: false,
				wallsBlockAudio: false,
				deadOnly: false,
				meetingGhostOnly: false,
				visionHearing: false,
				publicLobby_on: false,
				publicLobby_title: '',
				publicLobby_language: 'en',
				publicLobby_mods: 'NONE',
			},
		},
		launchPlatform: {
			type: 'string',
			default: GamePlatform.STEAM,
		},
		customPlatforms: {
			type: 'object',
			default: {},
			additionalProperties: {
				type: 'object',
				properties: {
					default: {
						type: 'boolean',
						default: false,
					},
					key: {
						type: 'string',
						default: '',
					},
					launchType: {
						type: 'string',
						default: 'EXE',
					},
					runPath: {
						type: 'string',
						default: '',
					},
					execute: {
						type: 'array',
						default: [''],
						items: {
							type: 'string',
							default: '',
						},
					},
					translateKey: {
						type: 'string',
						default: '',
					},
				},
			},
		},
	},
});

// This is fricken weird but also great
type ISettingOrSocketConfig<K extends keyof ISettings | `playerConfigMap.${number}`> = K extends keyof ISettings ? ISettings[K] : SocketConfig;

// If our setting is a keyof ISettings, value is the appropriate type. If setting is `playerConfigMap.1234` then value is a socket config
export const setSetting = <K extends (keyof ISettings | `playerConfigMap.${number}`)>(setting: K, value: ISettingOrSocketConfig<K>) => {
	SettingsStore.set(setting, value);
};

export const setLobbySetting = <K extends keyof ILobbySettings>(setting: K, value: ILobbySettings[K]) => {
	SettingsStore.set(`localLobbySettings.${setting}`, value);
};

export default SettingsStore;