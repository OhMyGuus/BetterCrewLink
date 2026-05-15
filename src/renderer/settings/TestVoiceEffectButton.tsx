import React, { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import makeStyles from '@mui/styles/makeStyles';
import { ExtendedAudioElement } from '../Voice';

interface TestVoiceEffectButtonProps {
	t: (key: string) => string;
	speaker: string;
}

const useStyles = makeStyles(() => ({
	button: {
		width: 'fit-content',
		margin: '5px auto',
	},
}));

const TestVoiceEffectButton: React.FC<TestVoiceEffectButtonProps> = ({ t, speaker }: TestVoiceEffectButtonProps) => {
	const classes = useStyles();
	const [playing, setPlaying] = useState(false);
	const cleanupRef = useRef<(() => void) | undefined>();

	const stopTest = () => {
		cleanupRef.current?.();
		cleanupRef.current = undefined;
		setPlaying(false);
	};

	useEffect(() => stopTest, []);

	const testVoiceEffect = async () => {
		if (playing) {
			stopTest();
			return;
		}

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				autoGainControl: false,
				echoCancellation: false,
				noiseSuppression: false,
			},
		});
		const context = new AudioContext();
		const source = context.createMediaStreamSource(stream);
		const filter = context.createBiquadFilter();
		const gain = context.createGain();
		const destination = context.createMediaStreamDestination();
		const audio = document.createElement('audio') as ExtendedAudioElement;

		filter.type = 'bandpass';
		filter.frequency.value = 950;
		filter.Q.value = 4.5;
		gain.gain.value = 0.9;

		source.connect(filter);
		filter.connect(gain);
		gain.connect(destination);

		audio.autoplay = true;
		audio.srcObject = destination.stream;
		document.body.appendChild(audio);
		if (speaker.toLowerCase() !== 'default') await audio.setSinkId(speaker);
		await audio.play();

		cleanupRef.current = () => {
			audio.pause();
			audio.remove();
			stream.getTracks().forEach((track) => track.stop());
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
			context.close();
		};
		setPlaying(true);
	};

	return (
		<Button variant="contained" color="secondary" size="small" className={classes.button} onClick={testVoiceEffect}>
			{playing ? t('settings.audio.test_voice_effect_stop') : t('settings.audio.test_voice_effect_start')}
		</Button>
	);
};

export default TestVoiceEffectButton;
