import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

interface TestMicProps {
	microphone: string;
}

// Legacy Chrome-only getUserMedia constraints, not part of the standard MediaTrackConstraints lib types.
interface LegacyAudioConstraints extends MediaTrackConstraints {
	googEchoCancellation?: boolean;
	googAutoGainControl2?: boolean;
	googNoiseSuppression?: boolean;
	googHighpassFilter?: boolean;
	googTypingNoiseDetection?: boolean;
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
	};
};

const TestMicrophoneButton: React.FC<TestMicProps> = function ({ microphone }: TestMicProps) {
	const classes = useStyles();
	const [error, setError] = useState<boolean>(false);
	const [rms, setRms] = useState<number>(0);

	useEffect(() => {
		setError(false);

		const ctx = new AudioContext();
		const processor = ctx.createScriptProcessor(2048, 1, 1);
		processor.connect(ctx.destination);

		const minUpdateRate = 50;
		let lastRefreshTime = 0;
		let stream: MediaStream | undefined;

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

		const audio_options: LegacyAudioConstraints = {
			deviceId: microphone ?? 'default',
			autoGainControl: false,
			echoCancellation: false,
			noiseSuppression: false,
			googEchoCancellation: false,
			googAutoGainControl2: false,
			googNoiseSuppression: false,
			googHighpassFilter: false,
			googTypingNoiseDetection: false,
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
				const src = ctx.createMediaStreamSource(s);
				src.connect(processor);
				processor.addEventListener('audioprocess', handleProcess);
			})
			.catch(() => setError(true));

		return () => {
			cancelled = true;
			processor.removeEventListener('audioprocess', handleProcess);
			stream?.getTracks().forEach((track) => track.stop());
			ctx.close();
		};
	}, [microphone]);

	if (error) {
		return <Typography color="error">Could not connect to microphone</Typography>;
	} else {
		return (
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
		);
	}
};

export default TestMicrophoneButton;
