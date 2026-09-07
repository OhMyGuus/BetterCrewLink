import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { ISettings } from '../../common/ISettings';
import { ExtendedAudioElement, LegacyAudioConstraints, VadNode } from '../voice/types';
import VAD from '../lib/vad';

interface TestMicProps {
	t: (key: string) => string;
	settings: ISettings;
}

const useStyles = () => {
	const theme = useTheme();
	return {
		root: {
			display: 'flex',
			width: '100%',
			alignItems: 'center',
			minHeight: theme.spacing(3),
		},
		bar: {
			height: 8,
			width: '100%',
			borderRadius: 4,
		},
		inner: {
			transition: 'transform .05s linear',
		},
		row: {
			width: '100%',
			alignItems: 'stretch',
		},
		monitorButton: {
			alignSelf: 'flex-end',
			whiteSpace: 'nowrap' as const,
		},
	};
};

const sinkIdFor = (speaker: string) => (speaker && speaker.toLowerCase() !== 'default' ? speaker : '');

const TestMicrophoneButton: React.FC<TestMicProps> = function ({ t, settings }: TestMicProps) {
	const classes = useStyles();
	const [error, setError] = useState<boolean>(false);
	const [rms, setRms] = useState<number>(0);
	const [ready, setReady] = useState<boolean>(false);
	const [monitoring, setMonitoring] = useState<boolean>(false);

	const settingsRef = useRef<ISettings>(settings);
	const speakerRef = useRef<string>(settings.speaker);
	const ctxRef = useRef<AudioContext | null>(null);
	const outputNodeRef = useRef<AudioNode | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const audioListenerRef = useRef<VadNode | null>(null);
	const monitorElementRef = useRef<ExtendedAudioElement | null>(null);
	const monitorTeardownRef = useRef<(() => void) | null>(null);

	const { microphone, speaker, noiseSuppression, autoGainControl, oldSampleDebug } = settings;
	const { microphoneGain, microphoneGainEnabled, micSensitivity, micSensitivityEnabled } = settings;

	useEffect(() => {
		settingsRef.current = settings;
	});

	useEffect(() => {
		if (!monitoring || !ready) return;
		const ctx = ctxRef.current;
		const outputNode = outputNodeRef.current;
		if (!ctx || !outputNode) return;

		const dest = ctx.createMediaStreamDestination();
		outputNode.connect(dest);

		const element = new Audio() as ExtendedAudioElement;
		element.srcObject = dest.stream;
		element.autoplay = true;
		element.setSinkId(sinkIdFor(speakerRef.current)).catch(() => {});
		void element.play().catch(() => setMonitoring(false));
		monitorElementRef.current = element;

		const teardown = () => {
			monitorTeardownRef.current = null;
			monitorElementRef.current = null;
			element.pause();
			element.srcObject = null;
			try {
				outputNode.disconnect(dest);
			} catch {
				/* empty */
			}
			dest.disconnect();
		};
		monitorTeardownRef.current = teardown;
		return teardown;
	}, [monitoring, ready]);

	useEffect(() => {
		speakerRef.current = speaker;
		monitorElementRef.current?.setSinkId(sinkIdFor(speaker)).catch(() => {});
	}, [speaker]);

	useEffect(() => {
		setError(false);
		setRms(0);
		setReady(false);

		const ctx = new AudioContext();
		ctxRef.current = ctx;
		const processor = ctx.createScriptProcessor(2048, 1, 1);
		processor.connect(ctx.destination);

		const minUpdateRate = 50;
		let lastRefreshTime = 0;
		let stream: MediaStream | undefined;
		let gainNode: GainNode | undefined;
		let audioListener: VadNode | undefined;

		const handleProcess = (event: AudioProcessingEvent) => {
			if (event.timeStamp - lastRefreshTime < minUpdateRate) {
				return;
			}

			lastRefreshTime = event.timeStamp;

			const input = event.inputBuffer.getChannelData(0);
			const total = input.reduce((acc, val) => acc + Math.abs(val), 0);
			const rms = Math.min(0.5, Math.sqrt(total / input.length));
			setRms(rms);
		};

		const audio_options: LegacyAudioConstraints = {
			deviceId: microphone && microphone.toLowerCase() !== 'default' ? { exact: microphone } : undefined,
			autoGainControl,
			channelCount: 2,
			echoCancellation: false,
			latency: 0,
			noiseSuppression,
			googNoiseSuppression: noiseSuppression,
			googEchoCancellation: false,
			googTypingNoiseDetection: noiseSuppression,
			sampleRate: oldSampleDebug ? 48000 : undefined,
		};

		let cancelled = false;
		navigator.mediaDevices
			.getUserMedia({
				audio: audio_options,
				video: false,
			})
			.then((s) => {
				if (cancelled) {
					s.getTracks().forEach((track) => track.stop());
					return;
				}
				stream = s;
				const source = ctx.createMediaStreamSource(s);

				let outputNode: AudioNode = source;
				if ((microphoneGainEnabled || micSensitivityEnabled) && !autoGainControl) {
					const current = settingsRef.current;
					const gain = ctx.createGain();
					source.connect(gain);
					gain.gain.value = current.microphoneGainEnabled ? current.microphoneGain / 100 : 1;
					gainNode = gain;
					outputNode = gain;
				}
				outputNode.connect(processor);
				processor.addEventListener('audioprocess', handleProcess);
				outputNodeRef.current = outputNode;
				gainNodeRef.current = gainNode ?? null;

				audioListener = VAD(ctx, source, undefined, {
					onVoiceStart: () => {
						const current = settingsRef.current;
						if (gainNode && current.micSensitivityEnabled && !current.autoGainControl) {
							gainNode.gain.value = current.microphoneGainEnabled ? current.microphoneGain / 100 : 1;
						}
					},
					onVoiceStop: () => {
						const current = settingsRef.current;
						if (gainNode && current.micSensitivityEnabled && !current.autoGainControl) {
							gainNode.gain.value = 0;
						}
					},
					noiseCaptureDuration: 0,
					stereo: false,
				}) as VadNode;
				audioListener.options.minNoiseLevel =
					micSensitivityEnabled && !autoGainControl ? settingsRef.current.micSensitivity : 0.15;
				audioListener.options.maxNoiseLevel = 1;
				audioListener.init();
				audioListenerRef.current = audioListener;

				setReady(true);
			})
			.catch(() => setError(true));

		return () => {
			cancelled = true;
			monitorTeardownRef.current?.();
			ctxRef.current = null;
			outputNodeRef.current = null;
			gainNodeRef.current = null;
			audioListenerRef.current = null;
			processor.removeEventListener('audioprocess', handleProcess);
			audioListener?.destroy();
			gainNode?.disconnect();
			stream?.getTracks().forEach((track) => track.stop());
			ctx.close();
		};
	}, [microphone, noiseSuppression, autoGainControl, oldSampleDebug, microphoneGainEnabled, micSensitivityEnabled]);

	useEffect(() => {
		const gainNode = gainNodeRef.current;
		if (!gainNode || autoGainControl) return;
		if (!microphoneGainEnabled && !micSensitivityEnabled) return;

		if (!micSensitivityEnabled) {
			gainNode.gain.value = microphoneGainEnabled ? microphoneGain / 100 : 1;
		}

		const audioListener = audioListenerRef.current;
		if (audioListener) {
			audioListener.options.minNoiseLevel = micSensitivityEnabled ? micSensitivity : 0.15;
			audioListener.init();
		}
	}, [ready, autoGainControl, microphoneGain, microphoneGainEnabled, micSensitivity, micSensitivityEnabled]);

	if (error) {
		return <Typography color="error">Could not connect to microphone</Typography>;
	} else {
		return (
			<Stack direction="column" sx={classes.row} spacing={1}>
				<Box sx={classes.root}>
					<LinearProgress
						sx={{
							...classes.bar,
							'& .MuiLinearProgress-bar': classes.inner,
						}}
						color="secondary"
						variant="determinate"
						value={rms * 2 * 100}
					/>
				</Box>
				<Button
					variant="contained"
					color="secondary"
					size="small"
					disabled={!ready}
					sx={classes.monitorButton}
					onClick={() => setMonitoring((prev) => !prev)}
				>
					{monitoring ? t('settings.audio.test_microphone_stop') : t('settings.audio.test_microphone_start')}
				</Button>
			</Stack>
		);
	}
};

export default TestMicrophoneButton;
