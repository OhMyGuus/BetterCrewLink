import Color from 'color';
import jimp from 'jimp';

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

// @ts-ignore
import playerBase from '../../static/generate/player.png'; // @ts-ignore
import balloonBase from '../../static/generate/balloon.png'; // @ts-ignore
import kidBase from '../../static/generate/kid.png'; // @ts-ignore
import ghostBase from '../../static/generate/ghost.png'; // @ts-ignore
import { app } from 'electron';

export function numberToColorHex(colour: number) {
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

async function colorImage(playerColors: string[][], image: string, imagename: string) {
	const img = await jimp.read(Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64')); //`${app.getAppPath()}/../test/${imagename}.png`
	const originalData = new Uint8Array(img.bitmap.data);
	for (let colorId = 0; colorId < playerColors.length; colorId++) {
		img.bitmap.data = new Uint8Array(originalData) as Buffer;
		const shadow = playerColors[colorId][1];
		const color = playerColors[colorId][0];
		for (let i = 0, l = img.bitmap.data.length; i < l; i += 4) {
			const data = img.bitmap.data;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			//   let alpha = data[i + 3];
			if ((r !== 0 || g !== 0 || b !== 0) && (r !== 255 || g !== 255 || b !== 255)) {
				const pixelColor = Color('#000000')
					.mix(Color(shadow), b / 255)
					.mix(Color(color), r / 255)
					.mix(Color('#9acad5'), g / 255);
				data[i] = pixelColor.red();
				data[i + 1] = pixelColor.green();
				data[i + 2] = pixelColor.blue();
			}
		}
		await img.write(`${app.getAppPath()}\\..\\generated\\${imagename}\\${colorId}.png`);
	}
}

export async function GenerateAvatars(colors: string[][]) {
	await colorImage(colors, ghostBase, 'ghost');
	await colorImage(colors, playerBase, 'player');
	await colorImage(colors, kidBase, '90');
	await colorImage(colors, balloonBase, '77');
}


