import { INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

export const CHUTES_API_CREDENTIAL = 'chutesApi';
export const CHUTES_OAUTH2_CREDENTIAL = 'chutesOAuth2Api';

export function isOAuthClientConfigured(): boolean {
	const clientId = process.env.CHUTES_OAUTH_CLIENT_ID?.trim();
	const clientSecret = process.env.CHUTES_OAUTH_CLIENT_SECRET?.trim();
	return Boolean(clientId && clientSecret);
}

export function getChutesAuthenticationProperty(): INodeProperties[] {
	if (!isOAuthClientConfigured()) {
		return [];
	}

	return [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Sign in With Chutes',
					value: 'oAuth2',
				},
			],
			default: 'apiKey',
			description: 'How to authenticate with Chutes.ai',
		},
	];
}

export function getChutesCredentials(): INodeCredentialDescription[] {
	if (!isOAuthClientConfigured()) {
		return [
			{
				name: CHUTES_API_CREDENTIAL,
				required: true,
			},
		];
	}

	return [
		{
			name: CHUTES_API_CREDENTIAL,
			required: true,
			displayOptions: {
				show: { authentication: ['apiKey'] },
			},
		},
		{
			name: CHUTES_OAUTH2_CREDENTIAL,
			required: true,
			displayOptions: {
				show: { authentication: ['oAuth2'] },
			},
		},
	];
}

export function resolveCredentialType(context: {
	getNodeParameter: (...args: any[]) => any;
}): string {
	try {
		const auth = context.getNodeParameter('authentication', 0) as string;
		if (auth === 'oAuth2') {
			return CHUTES_OAUTH2_CREDENTIAL;
		}
	} catch {
		// parameter doesn't exist (OAuth not configured) — fall through
	}
	return CHUTES_API_CREDENTIAL;
}
