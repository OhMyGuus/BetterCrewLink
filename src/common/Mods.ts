export type ModsType =
	| 'NONE'
	| 'TOWN_OF_US'
	| 'THE_OTHER_ROLES'
	| 'THE_OTHER_ROLES_GM'
	| 'TOWN_OF_IMPOSTORS'
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
		id: 'THE_OTHER_ROLES_GM',
		label: 'The Other Roles: GM Edition',
		dllStartsWith: 'TheOtherRolesGM',
	},
	{
		id: 'TOWN_OF_IMPOSTORS',
		label: 'Town of Impostors',
		dllStartsWith: 'TownOfImpostors',
	},
	{
		id: 'OTHER',
		label: 'Other',
	},
];
