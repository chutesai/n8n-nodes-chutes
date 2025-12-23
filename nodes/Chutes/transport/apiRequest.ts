import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

/**
 * Resource types map to chute subdomains
 */
export type ChuteResourceType = 'textGeneration' | 'imageGeneration' | 'videoGeneration' | 'audioGeneration' | 'textToSpeech' | 'speechToText' | 'inference' | 'embeddings' | 'musicGeneration' | 'contentModeration';

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
	const baseUrl = getChutesBaseUrl(credentials, resourceType, customChuteUrl);

	const options: IRequestOptions = {
		method,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
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
		const response = await this.helpers.requestWithAuthentication.call(
			this,
			'chutesApi',
			options,
		);

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any, {
			message: `Chutes.ai API error: ${(error as any).message}`,
			description: `Error from Chutes.ai: ${(error as any).description || 'Check your API key and parameters'}`,
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
			if (error.statusCode === 429 && attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			throw error;
		}
	}
}

