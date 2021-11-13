// @ts-ignore
import redAliveimg from '../../static/images/avatar/placeholder.png'; // @ts-ignore
import { ModsType } from '../common/Mods';
export const redAlive = redAliveimg;

export enum cosmeticType {
	base,
	hat,
	hat_back,
}
interface hatData {
	image: string;
	back_image: string;
	top: string | undefined;
	width: string | undefined;
	left: string | undefined;
	multi_color: boolean | undefined;
}
let hatCollection: {
	[mod: string]: {
		defaultWidth: string;
		defaultTop: string;
		defaultLeft: string;
		hats: {
			[id: string]: hatData;
		};
	};
} = {};

let requestingHats = false;
export var initializedHats = false;

export function initializeHats() {
	if (initializedHats || requestingHats) {
		return;
	}
	requestingHats = true;
	fetch(`${HAT_COLLECTION_URL}/hats.json`)
		.then((response) => response.json())
		.then((data) => {
			hatCollection = data;
			initializedHats = true;
		});
	return undefined;
}

const HAT_COLLECTION_URL = 'https://raw.githubusercontent.com/OhMyGuus/BetterCrewlink-Hats/master';
function getModHat(color: number, id = '', mod: ModsType, back = false) {
	if (!initializedHats) {
		return '';
	}
	const hatBase = getHat(id, mod);
	const hat = back ? hatBase?.back_image : hatBase?.image;
	const multiColor = hatBase?.multi_color;
	if (hat) {
		if (!multiColor) return `${HAT_COLLECTION_URL}/${mod}/${hat}`;
		else return `generate:///${HAT_COLLECTION_URL}/${mod}/${hat}?color=${color}`;
	}
	return undefined;
}

export interface HatDementions {
	top: string;
	left: string;
	width: string;
}

function getHat(id: string, modType: ModsType): hatData | undefined {
	if (!initializedHats) {
		return undefined;
	}
	for (const mod of ['NONE', modType]) {
		const modHatList = hatCollection[mod];
		const hat = modHatList?.hats[id];
		if (hat) {
			hat.top = hat?.top ?? modHatList?.defaultTop;
			hat.width = hat?.width ?? modHatList?.defaultWidth;
			hat.left = hat?.left ?? modHatList?.defaultLeft;
			return hat;
		}
	}
	return undefined;
}

export function getHatDementions(id: string, mod: ModsType): HatDementions {
	const hat = getHat(id, mod);
	return {
		top: hat?.top ?? '0',
		width: hat?.width ?? '0',
		left: hat?.left ?? '0',
	};
}

export const RainbowColorId = -99234;
export function getCosmetic(
	color: number,
	isAlive: boolean,
	type: cosmeticType,
	id = '',
	mod: ModsType = 'NONE'
): string {
	if (type === cosmeticType.base) {
		return `static:///generated/${isAlive ? `player` : `ghost`}/${color}.png`;
	} else {
		const modHat = getModHat(color, id, mod, type === cosmeticType.hat_back);
		if (modHat) return modHat;
	}
	return '';
}
