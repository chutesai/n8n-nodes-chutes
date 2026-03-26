import {
	IExecuteFunctions,
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	IWebhookFunctions,
	NodeApiError,
} from 'n8n-workflow';

const grantedScopeCache = new Map<string, string[]>();

function toTrimmedString(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}
	return String(value).trim();
}

export function parseGrantedScopes(grantedScopes: unknown): string[] {
	if (Array.isArray(grantedScopes)) {
		return grantedScopes.map((value) => String(value).trim()).filter(Boolean);
	}

	if (typeof grantedScopes === 'string') {
		return grantedScopes
			.split(/\s+/)
			.map((value) => value.trim())
			.filter(Boolean);
	}

	return [];
}

async function introspectGrantedScopes(sessionToken: string): Promise<string[]> {
	/* istanbul ignore next */
	if (!sessionToken) {
		return [];
	}

	const cachedScopes = grantedScopeCache.get(sessionToken);
	if (cachedScopes) {
		return cachedScopes;
	}

	const clientId = toTrimmedString(process.env.CHUTES_OAUTH_CLIENT_ID);
	const clientSecret = toTrimmedString(process.env.CHUTES_OAUTH_CLIENT_SECRET);
	if (!clientId || !clientSecret) {
		return [];
	}

	const configuredIdpBaseUrl = toTrimmedString(process.env.CHUTES_IDP_BASE_URL);
	const idpBaseUrl = (configuredIdpBaseUrl || 'https://api.chutes.ai').replace(/\/+$/, '');

	const response = await fetch(`${idpBaseUrl}/idp/token/introspect`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		body: new URLSearchParams({
			token: sessionToken,
		}),
	});

	if (!response.ok) {
		return [];
	}

	const data = (await response.json()) as { scope?: string | string[] };
	const scopes = parseGrantedScopes(data.scope);
	grantedScopeCache.set(sessionToken, scopes);
	return scopes;
}

async function ensureChutesInvokeScope(credentials: IDataObject): Promise<void> {
	if (toTrimmedString(credentials.apiKey)) {
		return;
	}

	if (toTrimmedString(credentials.authType) !== 'sso') {
		return;
	}

	let grantedScopes = parseGrantedScopes(credentials.grantedScopes);
	const sessionToken = toTrimmedString(credentials.sessionToken);

	if (grantedScopes.length === 0) {
		grantedScopes = await introspectGrantedScopes(sessionToken);
	}

	if (grantedScopes.length === 0) {
		return;
	}

	if (
		grantedScopes.includes('admin') ||
		grantedScopes.includes('invoke') ||
		grantedScopes.includes('chutes:invoke')
	) {
		return;
	}

	const grantedList = grantedScopes.join(' ');
	throw new Error(
		`This Chutes SSO credential cannot invoke models because it was granted only: ${grantedList}. Continue with Chutes again, and if you already approved this app once, revoke the existing n8n authorization in your Chutes account settings before retrying so the credential is reauthorized with chutes:invoke.`,
	);
}

/**
 * Resource types map to chute subdomains
 */
export type ChuteResourceType =
	| 'textGeneration'
	| 'imageGeneration'
	| 'videoGeneration'
	| 'audioGeneration'
	| 'textToSpeech'
	| 'speechToText'
	| 'inference'
	| 'embeddings'
	| 'musicGeneration'
	| 'contentModeration';

/**
 * Get the appropriate Chutes.ai base URL for a given resource type
 *
 * @param credentials - Chutes.ai credentials
 * @param resourceType - Type of resource (textGeneration, imageGeneration, etc.)
 * @param customChuteUrl - Custom chute URL selected by user in node parameter
 * @returns Base URL for the specific chute
 */
export function getChutesBaseUrl(
	credentials: IDataObject,
	resourceType?: ChuteResourceType,
	customChuteUrl?: string,
): string {
	// Priority 1: Custom chute URL from node parameter (user selected from dropdown)
	if (customChuteUrl) {
		return customChuteUrl;
	}

	// Priority 2: Custom URL from credentials (for advanced users)
	if (credentials.customUrl) {
		return credentials.customUrl as string;
	}

	// Priority 3: Map resource types to standard chute subdomains
	const chuteSubdomains: Record<ChuteResourceType, string> = {
		textGeneration: 'llm',
		imageGeneration: 'image',
		videoGeneration: 'video',
		audioGeneration: 'audio',
		textToSpeech: 'audio', // TTS uses audio chute
		speechToText: 'stt', // STT uses speech-to-text chute
		inference: 'llm', // Custom inference uses LLM chute
		embeddings: 'llm', // Embeddings likely on LLM chute
		musicGeneration: 'audio', // Music generation uses audio chute
		contentModeration: 'llm', // Content moderation likely on LLM chute
	};

	// Default to LLM chute if no resource type specified
	const subdomain = resourceType ? chuteSubdomains[resourceType] : 'llm';

	// Sandbox environment uses different subdomain pattern
	if (credentials.environment === 'sandbox') {
		return `https://sandbox-${subdomain}.chutes.ai`;
	}

	return `https://${subdomain}.chutes.ai`;
}

export async function chutesApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
	resourceType?: ChuteResourceType,
	customChuteUrl?: string,
): Promise<any> {
	const credentials = await this.getCredentials('chutesApi');
	await ensureChutesInvokeScope(credentials);
	const baseUrl = getChutesBaseUrl(credentials, resourceType, customChuteUrl);

	const options: IRequestOptions = {
		method,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': 'n8n-ChutesAI/0.0.9',
			'X-Chutes-Source': 'n8n-integration',
			...headers,
		},
		url: `${baseUrl}${endpoint}`,
		qs,
		body,
		json: true,
		encoding: 'utf8', // Explicitly set encoding to prevent BOM issues
		...option,
	};

	// Remove body for GET requests
	if (method === 'GET' && options.body !== undefined) {
		delete options.body;
	}

	try {
		const response = await this.helpers.requestWithAuthentication.call(this, 'chutesApi', options);

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any, {
			message: `Chutes.ai API error: ${(error as any).message}`,
			description: `Error from Chutes.ai: ${
				(error as any).description || 'Check your API key and parameters'
			}`,
		});
	}
}

export async function chutesApiRequestWithRetry(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
	resourceType?: ChuteResourceType,
	customChuteUrl?: string,
): Promise<any> {
	const maxRetries = 3;
	const baseDelay = 1000;
	const getStatusCode = (error: { httpCode?: number | string }): number | undefined => {
		if (typeof error.httpCode === 'number') {
			return error.httpCode;
		}
		if (typeof error.httpCode === 'string' && error.httpCode.trim()) {
			const parsedStatusCode = Number.parseInt(error.httpCode, 10);
			return Number.isNaN(parsedStatusCode) ? undefined : parsedStatusCode;
		}
		return undefined;
	};

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await chutesApiRequest.call(
				this,
				method,
				endpoint,
				body,
				qs,
				headers,
				option,
				resourceType,
				customChuteUrl,
			);

			// Check Chutes.ai rate limit headers if available
			if (response.headers) {
				const remaining = response.headers['x-ratelimit-remaining'];
				if (remaining && parseInt(remaining) < 10) {
					console.warn(`Low Chutes.ai rate limit: ${remaining} requests remaining`);
				}
			}

			return response;
		} catch (error: any) {
			if (getStatusCode(error) === 429 && attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			throw error;
		}
	}
}
