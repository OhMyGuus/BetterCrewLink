import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import RefreshSharpIcon from '@mui/icons-material/RefreshSharp';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import IconButton from '@mui/material/IconButton';
import '../../css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import '../../language/i18n';
import theme from '../../lib/theme';
import LobbyBrowser from './LobbyBrowser';
import { withTranslation, WithTranslation } from 'react-i18next';
import { ipcRenderer } from '../../lib/electron-bridge';

const useStyles = () => ({
	root: {
		position: 'absolute',
		width: '100vw',
		height: theme.spacing(3),
		backgroundColor: '#1d1a23',
		top: 0,
		WebkitAppRegion: 'drag',
	},
	title: {
		width: '100%',
		textAlign: 'center',
		display: 'block',
		height: theme.spacing(3),
		lineHeight: theme.spacing(3),
		color: theme.palette.primary.main,
	},
	button: {
		WebkitAppRegion: 'no-drag',
		marginLeft: 'auto',
		padding: 0,
		position: 'absolute',
		top: 0,
	},
	minimalizeIcon: {
		'& svg': {
			paddingBottom: '7px',
			marginTop: '-8px',
		},
	},
});

const TitleBar = function () {
	const classes = useStyles();
	return (
		<Box sx={classes.root}>
			<Box component="span" sx={classes.title} style={{ marginLeft: 10 }}>
				LobbyBrowser
			</Box>
			<IconButton sx={classes.button} size="small" onClick={() => ipcRenderer.send('reload', true)}>
				<RefreshSharpIcon htmlColor="#777" />
			</IconButton>
			<IconButton
				sx={[classes.button, classes.minimalizeIcon]}
				style={{ right: 20 }}
				size="small"
				onClick={() => ipcRenderer.send('minimize', true)}
			>
				<MinimizeIcon htmlColor="#777" y="100" />
			</IconButton>

			<IconButton
				sx={classes.button}
				style={{ right: 0 }}
				size="small"
				onClick={() => {
					window.close();
				}}
			>
				<CloseIcon htmlColor="#777" />
			</IconButton>
		</Box>
	);
};

export default function App({ t }: WithTranslation): React.JSX.Element {
	return (
		<StyledEngineProvider injectFirst>
			<ThemeProvider theme={theme}>
				<TitleBar />
				<LobbyBrowser t={t}></LobbyBrowser>
			</ThemeProvider>
		</StyledEngineProvider>
	);
}
const App2 = withTranslation()(App);
createRoot(document.getElementById('app')!).render(<App2 />);
