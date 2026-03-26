import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

function getIdpBaseUrl(): string {
	return (process.env.CHUTES_IDP_BASE_URL?.trim() || 'https://api.chutes.ai').replace(/\/+$/, '');
}

function getCredentialTestBaseUrl(): string {
	return (
		process.env.CHUTES_CREDENTIAL_TEST_BASE_URL?.trim() ||
		'={{$credentials.customUrl || ($credentials.environment === "sandbox" ? "https://sandbox-llm.chutes.ai" : "https://llm.chutes.ai")}}'
	);
}

export class ChutesOAuth2Api implements ICredentialType {
	name = 'chutesOAuth2Api';
	displayName = 'Sign in With Chutes';
	documentationUrl = 'https://chutes.ai/docs';
	icon: any = 'file:../nodes/Chutes/chutes.png';
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
			default: `${getIdpBaseUrl()}/idp/authorize`,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: `${getIdpBaseUrl()}/idp/token`,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'hidden',
			default: '={{$env.CHUTES_OAUTH_CLIENT_ID || ""}}',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'hidden',
			typeOptions: {
				password: true,
			},
			default: '={{$env.CHUTES_OAUTH_CLIENT_SECRET || ""}}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid profile chutes:invoke',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: "Click the 'Connect my account' button below to Sign in With Chutes.",
			name: 'oauthConnectHelp',
			type: 'notice',
			default: '',
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
			type: 'hidden',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + ($credentials.accessToken)}}',
				'X-Chutes-Client': 'n8n-integration',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: getCredentialTestBaseUrl(),
			url: '/v1/models',
			method: 'GET',
		},
	};
}
