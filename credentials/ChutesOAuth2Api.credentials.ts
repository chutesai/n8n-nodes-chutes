import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ChutesOAuth2Api implements ICredentialType {
	name = 'chutesOAuth2Api';
	displayName = 'Chutes OAuth2 API';
	documentationUrl = 'https://docs.chutes.ai/api';
	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{(($env.CHUTES_IDP_BASE_URL || "https://api.chutes.ai").replace(/\\/+$/, "")) + "/idp/authorize"}}',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{(($env.CHUTES_IDP_BASE_URL || "https://api.chutes.ai").replace(/\\/+$/, "")) + "/idp/token"}}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'chutes:invoke',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Production',
					value: 'production',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
			],
			default: 'production',
			description: 'Chutes.ai API environment to use',
		},
		{
			displayName: 'Custom API URL',
			name: 'customUrl',
			type: 'string',
			default: '',
			required: false,
			description: 'Optional custom Chutes.ai API endpoint URL',
			placeholder: 'https://api.custom.chutes.ai',
		},
	];
}
