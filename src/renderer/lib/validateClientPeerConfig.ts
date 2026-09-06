import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
	allErrors: true,
	strict: false,
});
addFormats(ajv);

export const validateClientPeerConfig = ajv.compile({
	type: 'object',
	properties: {
		forceRelayOnly: {
			type: 'boolean',
		},
		iceServers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					urls: {
						type: ['string', 'array'],
						format: 'uri',
						items: {
							type: 'string',
							format: 'uri',
						},
					},
					username: {
						type: 'string',
					},
					credential: {
						type: 'string',
					},
				},
				required: ['urls'],
			},
		},
	},
	required: ['forceRelayOnly', 'iceServers'],
});
