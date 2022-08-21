import Color from 'color';
import jimp from 'jimp';
import fs from 'fs';

// @ts-ignore
import playerBase from '../../static/images/generate/player.png'; // @ts-ignore
import ghostBase from '../../static/images/generate/ghost.png'; // @ts-ignore
import { app } from 'electron';

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

function pathToHash(input: string): number {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

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


async function colorImages(playerColors: string[][], image: string, imagename: string): Promise<void> {
	const img = await jimp.read(Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64')); //`${app.getAppPath()}/../test/${imagename}.png`
	const originalData = new Uint8Array(img.bitmap.data);
	for (let colorId = 0; colorId < playerColors.length; colorId++) {
		const color = playerColors[colorId][0];
		const shadow = playerColors[colorId][1];
		await colorImage(
			img,
			originalData,
			color,
			shadow,
			`${app.getPath('userData')}/static/generated/${imagename}/${colorId}.png`
		);
	}
}

function rgb2hsv(r: number, g: number, b: number) {
	let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
	let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
	return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}

function isBetween(h: number, h1: number, maxdiffrence: number) {
	return 180 - Math.abs(Math.abs(h - h1) - 180) < maxdiffrence;
}

async function colorImage(img: jimp, originalData: Uint8Array, color: string, shadow: string, savepath: string, returnImg = false) {
	img.bitmap.data = new Uint8Array(originalData) as Buffer;
	for (let i = 0, l = img.bitmap.data.length; i < l; i += 4) {
		const data = img.bitmap.data;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		//   let alpha = data[i + 3];
		const h = rgb2hsv(r, g, b);

		if ((h[1] > 0.4) && (isBetween(h[0], 240, 30) || isBetween(h[0], 0, 100) || isBetween(h[0], 120, 40))) { //  )

			const pixelColor = Color('#000000')
				.mix(Color(shadow), b / 255)
				.mix(Color(color), r / 255)
				.mix(Color('#9acad5'), g / 255);
			data[i] = pixelColor.red();
			data[i + 1] = pixelColor.green();
			data[i + 2] = pixelColor.blue();
		}
	}
	var savepathTemp = `${savepath}.${Math.floor(Math.random() * 101)}`;
	await img.writeAsync(savepathTemp);
	try{
	await fs.promises.rename(savepathTemp, savepath);
	}
	catch(ex){
		await fs.promises.unlink(savepathTemp);
	}
}

export async function GenerateAvatars(colors: string[][]): Promise<void> {
	console.log('Generating avatars..', `${app.getPath('userData')}/static/generated/`);
	try {
		await colorImages(colors, ghostBase, 'ghost');
		await colorImages(colors, playerBase, 'player');
	} catch (exception) {
		console.log('error while generating the avatars..', exception);
	}
}

export async function GenerateHat(imagePath: URL, colors: string[][], colorId: number, path: string) {
	try {
		const img = await jimp.read(imagePath.href);
		const originalData = new Uint8Array(img.bitmap.data);
		const color = colors[colorId][0];
		const shadow = colors[colorId][1];

		const temp = `${app.getPath('userData')}/static/generated/hats/${pathToHash(
			imagePath + '/' + color + '/' + shadow
		)}.png`;
		if (!fs.existsSync(temp) || Date.now() - (await fs.promises.stat(temp)).mtimeMs > 300000) {
			await colorImage(img, originalData, color, shadow, temp);
		}
		return temp;

	} catch (exception) {
		console.log('error while generating the avatars..', exception);
		return '';
	}
}
