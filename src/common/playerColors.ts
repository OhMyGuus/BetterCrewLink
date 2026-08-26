export const DEFAULT_PLAYERCOLORS = [
	['#C51111', '#7A0838'],
	['#132ED1', '#09158E'],
	['#117F2D', '#0A4D2E'],
	['#ED54BA', '#AB2BAD'],
	['#EF7D0D', '#B33E15'],
	['#F5F557', '#C38823'],
	['#3F474E', '#1E1F26'],
	['#FFFFFF', '#8394BF'],
	['#6B2FBB', '#3B177C'],
	['#71491E', '#5E2615'],
	['#38FEDC', '#24A8BE'],
	['#50EF39', '#15A742'],
];

export function numberToColorHex(colour: number): string {
	return (
		'#' +
		(colour & 0x00ffffff)
			.toString(16)
			.padStart(6, '0')
			.match(/.{1,2}/g)
			?.reverse()
			.join('')
	);
}
