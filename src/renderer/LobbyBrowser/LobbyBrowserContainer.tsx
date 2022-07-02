import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, Theme, StyledEngineProvider } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import RefreshSharpIcon from '@mui/icons-material/RefreshSharp';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import IconButton from '@mui/material/IconButton';
import '../css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import '../language/i18n';
import theme from '../theme';
import LobbyBrowser from './LobbyBrowser';
import { withNamespaces } from 'react-i18next';
import { ipcRenderer } from 'electron';


declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}


const useStyles = makeStyles(() => ({
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
}));

const TitleBar = function () {
	const classes = useStyles();
	return (
		<div className={classes.root}>
			<span className={classes.title} style={{ marginLeft: 10 }}>
				LobbyBrowser
			</span>
			<IconButton className={classes.button} size="small" onClick={() => ipcRenderer.send('reload', true)}>
				<RefreshSharpIcon htmlColor="#777" />
			</IconButton>
			<IconButton
				className={[classes.button, classes.minimalizeIcon].join(' ')}
				style={{ right: 20 }}
				size="small"
				onClick={() => ipcRenderer.send('minimize', true)}
			>
				<MinimizeIcon htmlColor="#777" y="100" />
			</IconButton>

			<IconButton
				className={classes.button}
				style={{ right: 0 }}
				size="small"
				onClick={() => {
					window.close();
				}}
			>
				<CloseIcon htmlColor="#777" />
			</IconButton>
		</div>
	);
};

// @ts-ignore
export default function App({ t }): JSX.Element {
	return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <TitleBar />
                <LobbyBrowser t={t}></LobbyBrowser>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(<App2 />, document.getElementById('app'));
