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
};
var modHats: {
	[mod: string]: {
		defaultWidth: string;
		defaultTop: string;
		defaultLeft: string;
		hats: {
			[id: string]: hatData;
		};
	};
} = {};

var requestingModHats = false;
const MODHATS_BASE = 'https://raw.githubusercontent.com/OhMyGuus/BetterCrewlink-ModHats/master';
function getModHat(color: number, id: number | string = -1, mod: ModsType, back: boolean = false) {
	if (!requestingModHats) {
		requestingModHats = true;
		fetch(`${MODHATS_BASE}/hats.json`)
			.then((response) => response.json())
			.then((data) => (modHats = data));
		return undefined;
	}
	const hatBase = getHat(id, mod);
	const hat = back ? hatBase?.back_image : hatBase?.image;
	const multiColor = hatBase?.multi_color;
	if (hat) {
		if (!multiColor)
			return `${MODHATS_BASE}/${mod}/${hat}`
		else
			return `generate:///${MODHATS_BASE}/${mod}/${hat}?color=${color}`
	}
	return undefined
}

export interface HatDementions {
	top: string;
	left: string;
	width: string;
}

function getHat(id: number | string, modType: ModsType) : hatData | undefined{
	for (var mod in ["OFFICAL", modType]) {
		const modHatList = modHats[mod];
		let hat = modHatList?.hats[id];
		if (hat) {
			hat.top = hat?.top || modHatList?.defaultTop
			hat.width = hat?.left || modHatList?.defaultWidth
			hat.left = hat?.left || modHatList?.defaultLeft
			return hat;
		};
	}
	return undefined;
}

export function getHatDementions(id: number | string, mod: ModsType): HatDementions {
	const hat = getHat(id, mod)
	return {
		top: hat?.top || "0",
		width: hat?.width || "0",
		left: hat?.left || "0",
	};
}

export const RainbowColorId = -99234;
export function getCosmetic(
	color: number,
	isAlive: boolean,
	type: cosmeticType,
	id: number | string = -1,
	mod: ModsType = 'NONE'
): string {
	if (type === cosmeticType.base) {
		return `static:///generated/${(isAlive ? `player` : `ghost`)}/${color}.png`;
	} else {
		let modHat = getModHat(color, id, mod, type === cosmeticType.hat_back);
		if (modHat) return modHat;
	}
	return "";
}
