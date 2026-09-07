import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { ISettings } from '../../common/ISettings';
import { ExtendedAudioElement } from '../voice/types';
import VAD, { VADOptions } from '../lib/vad';

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

interface VadNode {
	destroy: () => void;
	options: VADOptions;
	init: () => void;
}

const TestMicrophoneButton: React.FC<TestMicProps> = function ({ t, settings }: TestMicProps) {
	const classes = useStyles();
	const [error, setError] = useState<boolean>(false);
	const [rms, setRms] = useState<number>(0);
	const [ready, setReady] = useState<boolean>(false);
	const [monitoring, setMonitoring] = useState<boolean>(false);

	const ctxRef = useRef<AudioContext | null>(null);
	const outputNodeRef = useRef<AudioNode | null>(null);
	const monitorDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
	const monitorElementRef = useRef<ExtendedAudioElement | null>(null);

	const { microphone, speaker, noiseSuppression, autoGainControl, oldSampleDebug } = settings;
	const { microphoneGain, microphoneGainEnabled, micSensitivity, micSensitivityEnabled } = settings;

	// Disconnects the monitor graph without changing the user's monitoring intent.
	const disconnectMonitorNodes = () => {
		const dest = monitorDestRef.current;
		if (dest) {
			try {
				outputNodeRef.current?.disconnect(dest);
			} catch {
				/* already disconnected, or context closed */
			}
			try {
				dest.disconnect();
			} catch {
				/* already disconnected */
			}
			monitorDestRef.current = null;
		}
		const element = monitorElementRef.current;
		if (element) {
			element.pause();
			element.srcObject = null;
			monitorElementRef.current = null;
		}
	};

	const connectMonitorNodes = () => {
		if (monitorDestRef.current) return;
		const ctx = ctxRef.current;
		const outputNode = outputNodeRef.current;
		if (!ctx || !outputNode) return;

		const dest = ctx.createMediaStreamDestination();
		outputNode.connect(dest);

		const element = new Audio() as ExtendedAudioElement;
		element.srcObject = dest.stream;
		element.autoplay = true;
		const sinkId = speaker && speaker.toLowerCase() !== 'default' ? speaker : '';
		element.setSinkId(sinkId).catch(() => {
			/* fall back to default output */
		});
		void element.play().catch(() => {
			/* playback blocked; user can retry */
		});

		monitorDestRef.current = dest;
		monitorElementRef.current = element;
	};

	const toggleMonitoring = () => {
		setMonitoring((prev) => !prev);
	};

	// Reconnects/disconnects monitoring when the toggle or mic stream readiness changes.
	useEffect(() => {
		if (monitoring && ready) {
			connectMonitorNodes();
		}
		return () => {
			disconnectMonitorNodes();
		};
	}, [monitoring, ready]);

	// Keep monitor playback on the currently selected speaker.
	useEffect(() => {
		const element = monitorElementRef.current;
		if (!element) return;
		const sinkId = speaker && speaker.toLowerCase() !== 'default' ? speaker : '';
		element.setSinkId(sinkId).catch(() => {
			/* fall back to default output */
		});
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
			// limit update frequency
			if (event.timeStamp - lastRefreshTime < minUpdateRate) {
				return;
			}

			// update last refresh time
			lastRefreshTime = event.timeStamp;

			const input = event.inputBuffer.getChannelData(0);
			const total = input.reduce((acc, val) => acc + Math.abs(val), 0);
			const rms = Math.min(0.5, Math.sqrt(total / input.length));
			setRms(rms);
		};

		// Mirrors AudioController.createInputChain; echo cancellation forced off (would cancel monitor playback).
		const audio_options = {
			deviceId: microphone && microphone.toLowerCase() !== 'default' ? { exact: microphone } : undefined,
			autoGainControl,
			channelCount: 2,
			echoCancellation: false,
			latency: 0,
			noiseSuppression, // @ts-ignore-line
			googNoiseSuppression: noiseSuppression, // @ts-ignore-line
			googEchoCancellation: false, // @ts-ignore-line
			googTypingNoiseDetection: noiseSuppression, // @ts-ignore-line
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
					const gain = ctx.createGain();
					source.connect(gain);
					gain.gain.value = microphoneGainEnabled ? microphoneGain / 100 : 1;
					gainNode = gain;
					outputNode = gain;
				}
				outputNode.connect(processor);
				processor.addEventListener('audioprocess', handleProcess);
				outputNodeRef.current = outputNode;
				setReady(true);

				audioListener = VAD(ctx, source, undefined, {
					onVoiceStart: () => {
						if (gainNode && micSensitivityEnabled && !autoGainControl) {
							gainNode.gain.value = microphoneGainEnabled ? microphoneGain / 100 : 1;
						}
					},
					onVoiceStop: () => {
						if (gainNode && micSensitivityEnabled && !autoGainControl) {
							gainNode.gain.value = 0;
						}
					},
					noiseCaptureDuration: 0,
					stereo: false,
				}) as VadNode;
				audioListener.options.minNoiseLevel = micSensitivityEnabled && !autoGainControl ? micSensitivity : 0.15;
				audioListener.options.maxNoiseLevel = 1;
				audioListener.init();
			})
			.catch(() => setError(true));

		return () => {
			cancelled = true;
			disconnectMonitorNodes();
			ctxRef.current = null;
			outputNodeRef.current = null;
			processor.removeEventListener('audioprocess', handleProcess);
			audioListener?.destroy();
			gainNode?.disconnect();
			stream?.getTracks().forEach((track) => track.stop());
			ctx.close();
		};
	}, [
		microphone,
		noiseSuppression,
		autoGainControl,
		oldSampleDebug,
		microphoneGain,
		microphoneGainEnabled,
		micSensitivity,
		micSensitivityEnabled,
	]);

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
					onClick={toggleMonitoring}
				>
					{monitoring ? t('settings.audio.test_microphone_stop') : t('settings.audio.test_microphone_start')}
				</Button>
			</Stack>
		);
	}
};

export default TestMicrophoneButton;
