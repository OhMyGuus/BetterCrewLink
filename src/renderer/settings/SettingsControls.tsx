import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export const SettingsSection: React.FC<{ title?: string; children: ReactNode }> = function ({ title, children }) {
	return (
		<Box component="section" sx={{ mb: 3 }}>
			{title && (
				<Typography
					variant="overline"
					sx={{ display: 'block', px: 0.5, mb: 0.75, color: 'text.secondary', letterSpacing: 1.2 }}
				>
					{title}
				</Typography>
			)}
			<Paper
				variant="outlined"
				sx={{
					borderColor: 'rgba(255,255,255,0.08)',
					backgroundColor: 'rgba(255,255,255,0.03)',
					borderRadius: 2,
					overflow: 'hidden',
					'& > *:not(:last-child)': { borderBottom: '1px solid rgba(255,255,255,0.06)' },
				}}
			>
				{children}
			</Paper>
		</Box>
	);
};

export interface SettingRowProps {
	label: string;
	description?: string;
	disabled?: boolean;
	disabledReason?: string;
	control: ReactNode;
	controlWidth?: number | string;
	stack?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = function ({
	label,
	description,
	disabled,
	disabledReason,
	control,
	controlWidth = 300,
	stack,
}) {
	const row = (
		<Box
			sx={{
				display: 'flex',
				flexDirection: stack ? 'column' : 'row',
				alignItems: stack ? 'stretch' : 'center',
				gap: stack ? 1 : 2,
				px: 2,
				py: 1.25,
				opacity: disabled ? 0.45 : 1,
			}}
		>
			<Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
				<Typography variant="body2" sx={{ fontWeight: 600 }}>
					{label}
				</Typography>
				{description && (
					<Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
						{description}
					</Typography>
				)}
			</Box>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-end',
					gap: 1,
					minWidth: 0,
					width: stack ? '100%' : controlWidth,
					maxWidth: stack ? '100%' : '60%',
				}}
			>
				{control}
			</Box>
		</Box>
	);

	if (disabled && disabledReason) {
		return (
			<Tooltip placement="top" arrow title={disabledReason}>
				<Box>{row}</Box>
			</Tooltip>
		);
	}
	return row;
};

export interface SwitchRowProps extends Omit<SettingRowProps, 'control'> {
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export const SwitchRow: React.FC<SwitchRowProps> = function ({ checked, onChange, ...rest }) {
	return (
		<SettingRow
			{...rest}
			controlWidth="auto"
			control={
				<Switch
					size="small"
					disabled={rest.disabled}
					checked={checked}
					onChange={(_, value) => onChange(value)}
					slotProps={{ input: { 'aria-label': rest.label } }}
				/>
			}
		/>
	);
};

export interface SliderRowProps extends Omit<SettingRowProps, 'control'> {
	value: number;
	min?: number;
	max?: number;
	step?: number;
	format?: (value: number) => string;
	onChange: (value: number) => void;
	color?: 'primary' | 'secondary';
	toggle?: { checked: boolean; onChange: (checked: boolean) => void };
}

export const SliderRow: React.FC<SliderRowProps> = function ({
	value,
	min = 0,
	max = 100,
	step = 1,
	format,
	onChange,
	color = 'primary',
	toggle,
	...rest
}) {
	const sliderDisabled = rest.disabled || (toggle ? !toggle.checked : false);
	const [localValue, setLocalValue] = useState(value);
	const dragging = useRef(false);
	useEffect(() => {
		if (!dragging.current) setLocalValue(value);
	}, [value]);

	return (
		<SettingRow
			{...rest}
			control={
				<>
					{toggle && (
						<Switch
							size="small"
							disabled={rest.disabled}
							checked={toggle.checked}
							onChange={(_, checked) => toggle.onChange(checked)}
							slotProps={{ input: { 'aria-label': rest.label } }}
						/>
					)}
					<Slider
						size="small"
						color={color}
						disabled={sliderDisabled}
						value={localValue}
						min={min}
						max={max}
						step={step}
						onChange={(_, newValue) => {
							dragging.current = true;
							setLocalValue(newValue as number);
							onChange(newValue as number);
						}}
						onChangeCommitted={(_, newValue) => {
							dragging.current = false;
							onChange(newValue as number);
						}}
						aria-label={rest.label}
					/>
					<Typography
						variant="caption"
						sx={{ width: 46, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
					>
						{format ? format(localValue) : localValue}
					</Typography>
				</>
			}
		/>
	);
};

export interface SelectRowProps extends Omit<SettingRowProps, 'control'> {
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
	onOpen?: () => void;
}

export const SelectRow: React.FC<SelectRowProps> = function ({ value, options, onChange, onOpen, ...rest }) {
	return (
		<SettingRow
			{...rest}
			control={
				<TextField
					select
					fullWidth
					size="small"
					variant="outlined"
					color="secondary"
					disabled={rest.disabled}
					value={value}
					slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
					onChange={(ev) => onChange(ev.target.value)}
					onClick={onOpen}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</TextField>
			}
		/>
	);
};

interface ConfirmState {
	open: boolean;
	title?: string;
	description?: string;
	onConfirm?: () => void;
}

export interface ConfirmApi {
	confirm: (title: string, description: string, onConfirm: () => void, needsConfirmation?: boolean) => void;
	dialog: ReactNode;
}

export function useConfirmDialog(t: (key: string) => string): ConfirmApi {
	const [state, setState] = useState<ConfirmState>({ open: false });

	const confirm = useCallback((title: string, description: string, onConfirm: () => void, needsConfirmation = true) => {
		if (!needsConfirmation) {
			onConfirm();
			return;
		}
		setState({ open: true, title, description, onConfirm });
	}, []);

	const close = (confirmed: boolean) => {
		if (confirmed) state.onConfirm?.();
		setState({ open: false });
	};

	const dialog = (
		<Dialog open={state.open} onClose={() => close(false)}>
			<DialogTitle>{state.title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{state.description}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close(true)} color="primary">
					{t('buttons.confirm')}
				</Button>
				<Button onClick={() => close(false)} color="primary" autoFocus>
					{t('buttons.cancel')}
				</Button>
			</DialogActions>
		</Dialog>
	);

	return { confirm, dialog };
}
