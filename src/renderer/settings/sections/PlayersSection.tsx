import React from 'react';
import { TFunction } from 'i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { AmongUsState, Player } from '../../../common/AmongUsState';
import { ISettings, SocketConfig } from '../../../common/ISettings';
import { DEFAULT_PLAYERCOLORS, RainbowColorId } from '../../../common/playerColors';
import { setSetting } from '../SettingsStore';
import { SettingsSection, SliderRow } from '../SettingsControls';

const DEFAULT_CONFIG: SocketConfig = { volume: 1, isMuted: false };

export interface PlayersSectionProps {
	t: TFunction;
	gameState: AmongUsState;
	playerColors: string[][];
	settings: ISettings;
}

const RAINBOW_SWATCH = 'linear-gradient(135deg,#ff0000,#ff8c00,#ffee00,#00c853,#00b0ff,#7c4dff)';

const PlayerSwatch: React.FC<{ player: Player; playerColors: string[][] }> = function ({ player, playerColors }) {
	const rainbow = player.colorId === RainbowColorId;
	const [fill, shadow] = playerColors[player.colorId] ?? DEFAULT_PLAYERCOLORS[player.colorId] ?? ['#8394bf', '#5c6b8a'];
	return (
		<Box
			component="span"
			sx={{
				display: 'inline-block',
				width: 10,
				height: 10,
				borderRadius: '50%',
				background: rainbow ? RAINBOW_SWATCH : fill,
				border: `1px solid ${rainbow ? '#5c6b8a' : shadow}`,
				mr: 1,
				verticalAlign: 'middle',
			}}
		/>
	);
};

interface MuteButtonProps {
	muted: boolean;
	disabled?: boolean;
	title: string;
	onClick: () => void;
}

const MuteButton: React.FC<MuteButtonProps> = function ({ muted, disabled, title, onClick }) {
	return (
		<Tooltip title={title} placement="top" arrow>
			<span>
				<IconButton
					size="small"
					disabled={disabled}
					onClick={onClick}
					aria-label={title}
					aria-pressed={muted}
					sx={{
						width: 30,
						height: 30,
						borderRadius: '50%',
						color: muted ? 'error.main' : 'text.secondary',
						backgroundColor: muted ? 'rgba(244,67,54,0.14)' : 'rgba(255,255,255,0.06)',
						transition: 'background-color .15s ease, color .15s ease',
						'&:hover': {
							backgroundColor: muted ? 'rgba(244,67,54,0.24)' : 'rgba(255,255,255,0.14)',
						},
					}}
				>
					{muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
				</IconButton>
			</span>
		</Tooltip>
	);
};

const PlayersSection: React.FC<PlayersSectionProps> = function ({ t, gameState, playerColors, settings }) {
	const others = (gameState?.players ?? []).filter((player) => !player.isLocal && !player.isDummy);

	if (others.length === 0) {
		return <Alert severity="info">{t('settings.players.empty')}</Alert>;
	}

	const configFor = (player: Player): SocketConfig => settings.playerConfigMap?.[player.nameHash] ?? DEFAULT_CONFIG;

	const updateConfig = (player: Player, partial: Partial<SocketConfig>) => {
		setSetting(`playerConfigMap.${player.nameHash}`, { ...configFor(player), ...partial });
	};

	return (
		<SettingsSection title={t('settings.players.title')}>
			{others.map((player) => {
				const config = configFor(player);
				return (
					<SliderRow
						key={player.nameHash}
						label={player.name}
						description={player.disconnected ? t('settings.players.disconnected') : undefined}
						disabled={player.disconnected}
						icon={<PlayerSwatch player={player} playerColors={playerColors} />}
						value={config.volume}
						min={0}
						max={2}
						step={0.02}
						format={(value) => (config.isMuted ? t('settings.players.muted') : `${Math.floor(value * 100)}%`)}
						leading={
							<MuteButton
								muted={config.isMuted}
								disabled={player.disconnected}
								title={config.isMuted ? t('settings.players.unmute') : t('settings.players.mute')}
								onClick={() => updateConfig(player, { isMuted: !config.isMuted })}
							/>
						}
						sliderDisabled={config.isMuted}
						onChange={(volume) => updateConfig(player, { volume })}
					/>
				);
			})}
		</SettingsSection>
	);
};

export default PlayersSection;
