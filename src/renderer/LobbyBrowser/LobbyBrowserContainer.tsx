import React from 'react';
import ReactDOM from 'react-dom';
import { remote } from 'electron';
import { ThemeProvider } from '@material-ui/core/styles';
import RefreshSharpIcon from '@material-ui/icons/RefreshSharp';
import CloseIcon from '@material-ui/icons/Close';
import MinimizeIcon from '@material-ui/icons/Minimize';
import IconButton from '@material-ui/core/IconButton';
import makeStyles from '@material-ui/core/styles/makeStyles';
import '../css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import '../language/i18n';
import theme from '../theme';
import LobbyBrowser from './LobbyBrowser';
import { withNamespaces } from 'react-i18next';

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
		lineHeight: `${theme.spacing(3)}px`,
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
			<IconButton className={classes.button} size="small" onClick={() => remote.getCurrentWindow().reload()}>
				<RefreshSharpIcon htmlColor="#777" />
			</IconButton>
			<IconButton
				className={[classes.button, classes.minimalizeIcon].join(' ')}
				style={{ right: 20 }}
				size="small"
				onClick={() => remote.getCurrentWindow().minimize()}
			>
				<MinimizeIcon htmlColor="#777" y="100" />
			</IconButton>

			<IconButton
				className={classes.button}
				style={{ right: 0 }}
				size="small"
				onClick={() => {
					remote.getCurrentWindow().hide();
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
		<ThemeProvider theme={theme}>
			<TitleBar />
			<LobbyBrowser t={t}></LobbyBrowser>
		</ThemeProvider>
	);
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(<App2 />, document.getElementById('app'));
