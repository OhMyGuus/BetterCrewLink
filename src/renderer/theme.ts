import { createTheme } from '@mui/material';
import { red, purple, grey } from '@mui/material/colors';

declare module "@mui/material/Button" {
	interface ButtonPropsColorOverrides {
		grey: true;
	}
}

declare module "@mui/material" {
	interface Color {
		main: string;
		dark: string;
	}
}


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
		grey: {
			main: grey[300],
			dark: grey[400]
		},
		mode: 'dark',
	},
	components: {
		MuiPaper: {
			styleOverrides: { root: { backgroundImage: 'unset' } },
		},
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
