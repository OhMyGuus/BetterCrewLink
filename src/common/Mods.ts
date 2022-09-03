export type ModsType =
	| 'NONE'
	| 'TOWN_OF_US'
	| 'TOWN_OF_HOSTS'
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
		label: 'Town of Us: Reactivated',
		dllStartsWith: 'TownOfUs',
	},
	{
		id: 'THE_OTHER_ROLES',
		label: 'The Other Roles',
		dllStartsWith: 'TheOtherRoles',
	},
	{
		id: 'TOWN_OF_HOSTS',
		label: 'Town of Hosts',
		dllStartsWith: 'TownOfHost',
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
