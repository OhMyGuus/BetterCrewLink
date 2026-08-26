import React, { useMemo } from 'react';
import { Player } from '../common/AmongUsState';
import {
	getCosmetic,
	redAlive,
	cosmeticType,
	getHatDementions,
	initializedHats as initializedHats,
	initializeHats,
	HatDementions,
} from './cosmetics';
import Box from '@mui/material/Box';
import MicOff from '@mui/icons-material/MicOff';
import VolumeOff from '@mui/icons-material/VolumeOff';
import WifiOff from '@mui/icons-material/WifiOff';
import LinkOff from '@mui/icons-material/LinkOff';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined'; //@ts-ignore
import RadioSVG from '../../static/radio.svg';
import { Tooltip } from '@mui/material';
import { SocketConfig } from '../common/ISettings';
import Slider from '@mui/material/Slider';
import VolumeUp from '@mui/icons-material/VolumeUp';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import { ModsType } from '../common/Mods';

const useStyles = () => ({
	canvas: {
		position: 'absolute',
		width: '100%',
	},
	icon: {
		background: '#ea3c2a',
		position: 'absolute',
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%)',
		border: '2px solid #690a00',
		borderRadius: '50%',
		padding: '2px',
		zIndex: 10,
	},
	iconNoBackground: {
		position: 'absolute',
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%)',
		borderRadius: '50%',
		padding: '2px',
		zIndex: 10,
	},
	relative: {
		position: 'relative',
	},
	slidecontainer: {
		minWidth: '80px',
	},
	innerTooltip: {
		textAlign: 'center',
	},
});

export interface CanvasProps {
	hat: string;
	skin: string;
	visor: string;
	isAlive: boolean;
	lookLeft: boolean;
	size: number;
	borderColor: string;
	color: number;
	overflow: boolean;
	usingRadio: boolean | undefined;
	onClick?: () => void;
	mod: ModsType;
}

export interface AvatarProps {
	talking: boolean;
	borderColor: string;
	isAlive: boolean;
	player: Player;
	size: number;
	deafened?: boolean;
	muted?: boolean;
	connectionState?: 'disconnected' | 'novoice' | 'connected';
	socketConfig?: SocketConfig;
	showborder?: boolean;
	showHat?: boolean;
	lookLeft?: boolean;
	overflow?: boolean;
	isUsingRadio?: boolean;
	onConfigChange?: () => void;
	mod: ModsType;
}

const Avatar: React.FC<AvatarProps> = function ({
	talking,
	deafened,
	muted,
	borderColor,
	isAlive,
	player,
	size,
	connectionState,
	socketConfig,
	showborder,
	showHat,
	isUsingRadio,
	lookLeft = false,
	overflow = false,
	onConfigChange,
	mod,
}: AvatarProps) {
	const classes = useStyles();
	let icon;
	deafened = deafened === true || socketConfig?.isMuted === true || socketConfig?.volume === 0;
	switch (connectionState) {
		case 'connected':
			if (deafened) {
				icon = <VolumeOff sx={classes.icon} />;
			} else if (muted) {
				icon = <MicOff sx={classes.icon} />;
			}
			break;
		case 'novoice':
			icon = <LinkOff sx={classes.icon} style={{ background: '#e67e22', borderColor: '#694900' }} />;
			break;
		case 'disconnected':
			icon = <WifiOff sx={classes.icon} />;
			break;
	}
	if (player.bugged) {
		icon = <ErrorOutlineOutlined sx={classes.icon} style={{ background: 'red', borderColor: '' }} />;
	}
	const canvas = (
		<Canvas
			color={player.colorId}
			hat={showHat === false ? '' : player.hatId}
			visor={showHat === false ? '' : player.visorId}
			skin={player.skinId}
			isAlive={isAlive}
			lookLeft={lookLeft === true}
			borderColor={talking ? borderColor : showborder === true ? '#ccbdcc86' : 'transparent'}
			size={size}
			overflow={overflow}
			usingRadio={isUsingRadio}
			mod={mod}
		/>
	);

	if (socketConfig) {
		let muteButtonIcon;
		if (socketConfig.isMuted) {
			muteButtonIcon = <VolumeOff color="primary" sx={classes.iconNoBackground}></VolumeOff>;
		} else {
			muteButtonIcon = <VolumeUp color="primary" sx={classes.iconNoBackground}></VolumeUp>;
		}
		return (
			<Tooltip
				title={
					<Box sx={classes.innerTooltip}>
						<b>{player.name}</b>
						<Grid container spacing={0} sx={classes.slidecontainer}>
							<Grid>
							<IconButton
								onClick={() => {
									socketConfig.isMuted = !socketConfig.isMuted;
									if (onConfigChange) {
										onConfigChange();
									}
								}}
								style={{ margin: '1px 1px 0px 0px' }}
								size="large">
								{muteButtonIcon}
							</IconButton>
							</Grid>
							<Grid size="auto">
								<Slider
									size="small"
									value={socketConfig.volume}
									min={0}
									max={2}
									step={0.02}
									onChange={(_, newValue: number | number[]) => {
										socketConfig.volume = newValue as number;
									}}
									valueLabelDisplay={'auto'}
									valueLabelFormat={(value) => Math.floor(value * 100) + '%'}
									onMouseLeave={() => {
										if (onConfigChange) {
											onConfigChange();
										}
									}}
									aria-labelledby="continuous-slider"
								/>
							</Grid>
						</Grid>
					</Box>
				}
				leaveDelay={300}
				arrow
				placement="top"
			>
				<Box sx={classes.relative}>
					{canvas}
					{icon}
				</Box>
			</Tooltip>
		);
	} else {
		return (
			<Box sx={classes.relative}>
				{canvas}
				{icon}
			</Box>
		);
	}
};

interface UseCanvasStylesParams {
	isAlive: boolean;
	dementions: {
		hat: HatDementions;
		visor: HatDementions;
		skin: HatDementions;
	};
	lookLeft: boolean;
	size: number;
	borderColor: string;
	paddingLeft: number;
}
const useCanvasStyles = (props: UseCanvasStylesParams) => ({
	base: {
		width: '105%',
		position: 'absolute',
		top: '22%',
		left: props.paddingLeft,
		zIndex: 2,
	},
	hat: {
		pointerEvents: 'none',
		width: props.dementions.hat.width,
		position: 'absolute',
		top: `calc(22% + ${props.dementions.hat.top})`,
		left: `calc(${props.dementions.hat.left} + ${Math.max(2, props.size / 40) / 2 + props.paddingLeft}px)`,
		zIndex: 4,
		display: props.isAlive ? 'block' : 'none',
	},
	skin: {
		pointerEvents: 'none',
		width: props.dementions.skin.width,
		position: 'absolute',
		top: `calc(22% + ${props.dementions.skin.top})`,
		left: `calc(${props.dementions.skin.left} + ${Math.max(2, props.size / 40) / 2 + props.paddingLeft}px)`,
		zIndex: 3,
		display: props.isAlive ? 'block' : 'none',
	},
	visor: {
		pointerEvents: 'none',
		width: props.dementions.visor.width,
		position: 'absolute',
		top: `calc(22% + ${props.dementions.visor.top})`,
		left: `calc(${props.dementions.visor.left} + ${Math.max(2, props.size / 40) / 2 + props.paddingLeft}px)`,
		zIndex: 3,
		display: props.isAlive ? 'block' : 'none',
	},
	avatar: {
		// overflow: 'hidden',
		borderRadius: '50%',
		position: 'relative',
		borderStyle: 'solid',
		transition: 'border-color .2s ease-out',
		borderColor: props.borderColor,
		borderWidth: Math.max(2, props.size / 40),
		transform: props.lookLeft ? 'scaleX(-1)' : 'scaleX(1)',
		width: '100%',
		paddingBottom: '100%',
		cursor: 'pointer',
	},
	radio: {
		position: 'absolute',
		left: '70%',
		top: '80%',
		width: '30px',
		transform: 'translate(-50%, -50%)',
		fill: 'white',
		padding: '2px',
		zIndex: 12,
	},
});

function Canvas({
	hat,
	skin,
	visor,
	isAlive,
	lookLeft,
	size,
	borderColor,
	color,
	overflow,
	usingRadio,
	onClick,
	mod,
}: CanvasProps) {
	const hatImg = useMemo(() => {
		if (!initializedHats) {
			initializeHats();
		}
		return {
			base: getCosmetic(color, isAlive, cosmeticType.base),
			hat_front: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, hat, mod),
			hat_back: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat_back, hat, mod),
			skin: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, skin, mod),
			visor: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, visor, mod),
			dementions: {
				hat: getHatDementions(hat, mod),
				visor: getHatDementions(visor, mod),
				skin: getHatDementions(skin, mod),
			},
		};
	}, [color, hat, skin, visor, initializedHats, isAlive]);

	const classes = useCanvasStyles({
		isAlive,
		dementions: hatImg.dementions,
		lookLeft,
		size,
		borderColor,
		paddingLeft: -7,
	});
	//@ts-ignore
	const onerror = (e: any) => {
		e.target.style.display = 'none';
	};

	//@ts-ignore
	const onload = (e: any) => {
		e.target.style.display = '';
	};

	const hatElement = (
		<>
			<Box component="img" src={hatImg.hat_front} sx={classes.hat} onError={onerror} onLoad={onload} />
			<Box component="img" src={hatImg.visor} sx={classes.visor} onError={onerror} onLoad={onload} />

			<Box component="img" src={hatImg.hat_back} sx={classes.hat} style={{ zIndex: 1 }} onError={onerror} onLoad={onload} />
		</>
	);

	return (
		<>
			<Box sx={classes.avatar} onClick={onClick}>
				<Box
					sx={classes.avatar}
					style={{
						overflow: 'hidden',
						position: 'absolute',
						top: Math.max(2, size / 40) * -1,
						left: Math.max(2, size / 40) * -1,
						transform: 'unset',
					}}
				>
					<Box
						component="img"
						src={hatImg.base}
						sx={classes.base}
						//@ts-ignore
						onError={(e: any) => {
							e.target.onError = null;
							e.target.src = redAlive;
						}}
					/>

					<Box component="img" src={hatImg.skin} sx={classes.skin} onError={onerror} onLoad={onload} />
					{overflow && hatElement}
				</Box>
				{!overflow && hatElement}
				{usingRadio && <Box component="img" src={RadioSVG} sx={classes.radio} />}
			</Box>
		</>
	);
}

export default Avatar;
