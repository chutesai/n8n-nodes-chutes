import {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

const DEFAULT_REFRESH_WINDOW_SECONDS = 300;
const FORCE_REFRESH_FLAG = '__n8nForceCredentialRefresh';

function getCredentialTestBaseUrl(): string {
	return (
		process.env.CHUTES_CREDENTIAL_TEST_BASE_URL?.trim() ||
		'={{$credentials.customUrl || ($credentials.environment === "sandbox" ? "https://sandbox-llm.chutes.ai" : "https://llm.chutes.ai")}}'
	);
}

function normalizeGrantedScopes(grantedScopes: unknown): string {
	if (Array.isArray(grantedScopes)) {
		return grantedScopes
			.map((value) => String(value).trim())
			.filter(Boolean)
			.join(' ');
	}

	if (typeof grantedScopes === 'string') {
		return grantedScopes
			.split(/\s+/)
			.map((value) => value.trim())
			.filter(Boolean)
			.join(' ');
	}

	return '';
}

function getRefreshWindowSeconds(): number {
	const parsed = Number.parseInt(
		process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS ??
			`${DEFAULT_REFRESH_WINDOW_SECONDS}`,
		10,
	);
	if (Number.isNaN(parsed) || parsed < 0) {
		return DEFAULT_REFRESH_WINDOW_SECONDS;
	}
	return parsed;
}

function isTokenExpiringSoon(tokenExpiresAt: string): boolean {
	if (!tokenExpiresAt.trim()) {
		return false;
	}
	const expiresAt = Date.parse(tokenExpiresAt);
	if (Number.isNaN(expiresAt)) {
		return false;
	}
	return expiresAt <= Date.now() + getRefreshWindowSeconds() * 1000;
}

export class ChutesApi implements ICredentialType {
	name = 'chutesApi';
	displayName = 'Sign in With Chutes';
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
			displayName: 'Auth Type',
			name: 'authType',
			type: 'hidden',
			default: 'apiKey',
		},
		{
			displayName: 'API Key (Optional)',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			description:
				'Optional API key from your Chutes.ai dashboard. Leave empty to use the Sign in With Chutes connect flow.',
			hint: 'Use either Connect my account (OAuth) or an API key.',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'hidden',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Token Expires At',
			name: 'tokenExpiresAt',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Granted Scopes',
			name: 'grantedScopes',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Chutes Subject',
			name: 'chutesSubject',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Chutes Username',
			name: 'chutesUsername',
			type: 'hidden',
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
			type: 'string',
			default: '',
			required: false,
			description: 'Optional custom Chutes.ai API endpoint URL',
			placeholder: 'https://api.custom.chutes.ai',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization:
					'={{"Bearer " + ($credentials.apiKey || $credentials.sessionToken || $credentials.accessToken)}}',
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

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const apiKey = String(credentials.apiKey ?? '').trim();
		if (apiKey) {
			return {};
		}
		const accessToken = String(credentials.accessToken ?? '').trim();
		if (accessToken) {
			return {};
		}

		const sessionToken = String(credentials.sessionToken ?? '').trim();
		const refreshToken = String(credentials.refreshToken ?? '').trim();
		const tokenExpiresAt = String(credentials.tokenExpiresAt ?? '').trim();
		const forceRefresh =
			credentials[FORCE_REFRESH_FLAG] === true || credentials[FORCE_REFRESH_FLAG] === 'true';

		if (!forceRefresh && sessionToken && !isTokenExpiringSoon(tokenExpiresAt)) {
			return {};
		}

		if (!refreshToken) {
			throw new Error(
				'This Chutes SSO credential has expired or can no longer be refreshed. Sign in with Chutes again.',
			);
		}

		const clientId = process.env.CHUTES_OAUTH_CLIENT_ID?.trim();
		const clientSecret = process.env.CHUTES_OAUTH_CLIENT_SECRET?.trim();
		if (!clientId || !clientSecret) {
			throw new Error('Chutes OAuth client credentials are not configured on the n8n server.');
		}

		const idpBaseUrl = (process.env.CHUTES_IDP_BASE_URL?.trim() || 'https://api.chutes.ai').replace(
			/\/+$/,
			'',
		);

		const httpRequest = this.helpers.httpRequest?.bind(this.helpers);
		if (!httpRequest) {
			throw new Error(
				'Chutes SSO refresh is unavailable because no HTTP request helper is configured.',
			);
		}

		const tokenResponse = (await httpRequest({
			method: 'POST',
			url: `${idpBaseUrl}/idp/token`,
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			json: true,
		})) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string | string[];
		};

		if (!tokenResponse.access_token) {
			throw new Error('Failed to refresh the Chutes SSO token. Sign in with Chutes again.');
		}

		return {
			authType: 'sso',
			sessionToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token || refreshToken,
			tokenExpiresAt:
				typeof tokenResponse.expires_in === 'number'
					? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
					: '',
			grantedScopes: normalizeGrantedScopes(tokenResponse.scope ?? credentials.grantedScopes),
		};
	}
}
