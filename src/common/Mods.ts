export type ModsType =
	| 'NONE'
	| 'TOWN_OF_US'
	| 'THE_OTHER_ROLES'
	| 'LAS_MONJAS'
	| 'OTHER';

export interface AmongusMod {
	id: ModsType;
	label: string;
	dllStartsWith?: string;
}

export const modList: AmongusMod[] = [
	// recieve this later from git?
	{
		id: 'NONE',
		label: 'None',
	},
	{
		id: 'TOWN_OF_US',
		label: 'Town of Us',
		dllStartsWith: 'TownOfUs',
	},
	{
		id: 'THE_OTHER_ROLES',
		label: 'The Other Roles',
		dllStartsWith: 'TheOtherRoles',
	},
	{
		id: 'LAS_MONJAS',
		label: 'Las Monjas',
		dllStartsWith: 'LasMonjas',
	},
	{
		id: 'OTHER',
		label: 'Other',
	},
];
