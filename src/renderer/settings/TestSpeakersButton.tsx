import React, { useState, useEffect } from 'react';
// @ts-ignore
import chime from '../../../static/sounds/chime.mp3';
import { ExtendedAudioElement } from '../Voice';
import Button from '@mui/material/Button';
import makeStyles from '@mui/styles/makeStyles';

interface TestSpeakersProps {
	t: (key: string) => string;
	speaker: string;
}

const useStyles = makeStyles(() => ({
	button: {
		width: 'fit-content',
		margin: '5px auto',
	},
}));

const audio = new Audio() as ExtendedAudioElement;
audio.src = chime;

const TestSpeakersButton: React.FC<TestSpeakersProps> = ({ t, speaker }: TestSpeakersProps) => {
	const classes = useStyles();
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		if (speaker.toLowerCase() !== 'default') audio.setSinkId(speaker);
		audio.onended = () => {
			setPlaying(false);
		};
	}, [speaker]);

	const testSpeakers = () => {
		if (playing) {
			audio.pause();
			audio.currentTime = 0;
			setPlaying(false);
		} else {
			audio.play();
			setPlaying(true);
		}
	};

	return (
		<Button variant="contained" color="secondary" size="small" className={classes.button} onClick={testSpeakers}>
			{playing ? t('settings.audio.test_speaker_stop') : t('settings.audio.test_speaker_start')}
		</Button>
	);
};

export default TestSpeakersButton;
