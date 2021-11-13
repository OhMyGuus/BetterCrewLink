import { ModsType } from "../common/Mods";

export enum cosmeticType {
	base,
	hat,
	hat_back,
	skin,
}

var modHats: {
	[mod: string]: {
		defaultWidth: string;
		defaultTop: string;
		defaultLeft: string;
		hats: {
			[id: number | string]: {
				image: string;
				back_image: string;
				top: string | undefined;
				width: string | undefined;
				left: string | undefined;
				multi_color: boolean | undefined;
			};
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
	const hat = back ? modHats[mod]?.hats[id]?.back_image : modHats[mod]?.hats[id]?.image;
	const multiColor = modHats[mod]?.hats[id]?.multi_color;
	if(hat){
		if(!multiColor)
		return  `${MODHATS_BASE}/${mod}/${hat}`
		else
		return `generate:///${MODHATS_BASE}/${mod}/${hat}?color=${color}`
	}
	return	undefined
}

export interface HatDementions {
	top: string;
	left: string;
	width: string;
}

export function getHatDementions(id: number | string, mod: ModsType): HatDementions {
		const modHatList = modHats[mod];
		let hat = modHats[mod]?.hats[id];
		return {
			top: hat?.top || modHatList?.defaultTop || "0",
			width: hat?.width || modHatList?.defaultWidth || "0",
			left: hat?.left || modHatList?.defaultLeft || "0",
		};

}

export const RainbowColorId = -99234;
export function getCosmetic(
	color: number,
	isAlive: boolean,
	type: cosmeticType,
	id: number | string = -1,
	mod: ModsType = 'NONE'
): string 
{
	if (type === cosmeticType.base) {
		return `static:///generated/${(isAlive ? `player` : `ghost`)}/${color}.png`;
	} else {
			let modHat = getModHat(color, id, mod, type === cosmeticType.hat_back);
			if (modHat) return modHat;
	}
	return "";
}
