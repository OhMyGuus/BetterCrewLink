import { createTheme } from '@mui/material';
import { red, purple } from '@mui/material/colors';

// Create a theme instance.
const theme = createTheme({
	palette: {
		primary: {
			main: purple[300],
		},
		secondary: red,
		background: {
			default: '#27232a',
			paper: '#272727',
		},
		mode: 'dark',
	},
	components: {
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					fontSize: 15,
				}
			},

		},
	}
});

export default theme;
