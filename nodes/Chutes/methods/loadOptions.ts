import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getChutesBaseUrl } from '../transport/apiRequest';
import { requestWithChutesCredential } from '../transport/requestWithChutesCredential';

function parseModelsResponse(response: any): any[] {
	if (Array.isArray(response?.data)) {
		return response.data;
	}

	if (Array.isArray(response)) {
		return response;
	}

	return [];
}

function isRecoverableDiscoveryError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const candidate = error as {
		httpCode?: string | number;
		statusCode?: string | number;
		status?: string | number;
		description?: string;
		message?: string;
		response?: {
			status?: string | number;
		};
		error?: {
			detail?: string;
		};
	};

	const statusCode = String(
		candidate.httpCode ??
			candidate.statusCode ??
			candidate.status ??
			candidate.response?.status ??
			'',
	).trim();

	if (statusCode === '401' || statusCode === '403') {
		return true;
	}

	const details = [
		candidate.description,
		candidate.message,
		candidate.error?.detail,
	]
		.filter((value): value is string => Boolean(value))
		.join(' ')
		.toLowerCase();

	return (
		details.includes('does not have any credentials set') ||
		details.includes('missing both an api key and a session token') ||
		details.includes('invalid token') ||
		details.includes('user not found') ||
		details.includes('authorization failed') ||
		details.includes('permission') ||
		details.includes('forbidden') ||
		details.includes('unauthorized')
	);
}

async function requestWithoutAuth(
	context: ILoadOptionsFunctions,
	url: string,
): Promise<any> {
	return await context.helpers.request({
		json: true,
		method: 'GET',
		url,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	});
}

function getDefaultImageModelOption(): INodePropertyOptions[] {
	return [
		{
			name: 'Default (selected by chute)',
			value: '',
			description:
				'The model is determined by the selected chute. Most image chutes do not require a model parameter.',
		},
	];
}

export async function getChutesTextModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let baseUrl = 'https://llm.chutes.ai';
	try {
		const credentials = await this.getCredentials('chutesApi');
		baseUrl = getChutesBaseUrl(credentials, 'textGeneration');
	} catch {
		// First-load option requests can arrive before credentials are attached.
	}

	try {
		let response: any;
		try {
			response = await requestWithChutesCredential(this, {
				method: 'GET',
				url: `${baseUrl}/v1/models`,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (error) {
			if (!isRecoverableDiscoveryError(error)) {
				throw error;
			}

			response = await requestWithoutAuth(this, `${baseUrl}/v1/models`);
		}

		const models = parseModelsResponse(response);
		
		// Filter for text/chat models if type field exists
		const textModels = Array.isArray(models) ? models.filter((model: any) => {
			const type = model.type?.toLowerCase() || '';
			return !type || type.includes('text') || type.includes('chat') || type.includes('llm');
		}) : [];

		return textModels.map((model: any) => ({
			name: `${model.name || model.id} ${model.context_length ? `(${model.context_length} tokens)` : ''}`,
			value: model.id,
			description: model.description || `Cost: ${model.pricing?.input || 'N/A'}`,
		}));
	} catch (error) {
		console.error('Failed to load Chutes.ai text models:', error);
		// Return default options based on Chutes.ai models
		return [
			{ name: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1', description: 'Reasoning model' },
			{ name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', description: 'Fast model' },
			{ name: 'GPT-4', value: 'gpt-4', description: 'Advanced model' },
		];
	}
}

export async function getChutesImageModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let baseUrl = 'https://image.chutes.ai';
	try {
		const credentials = await this.getCredentials('chutesApi');
		baseUrl = getChutesBaseUrl(credentials, 'imageGeneration');
	} catch {
		// First-load option requests can arrive before credentials are attached.
	}

	try {
		const response = await requestWithChutesCredential(this, {
			method: 'GET',
			url: `${baseUrl}/v1/models`,
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const models = parseModelsResponse(response);
		
		// Filter for image generation models if type field exists
		const imageModels = Array.isArray(models) ? models.filter((model: any) => {
			const type = model.type?.toLowerCase() || '';
			return !type || type.includes('image') || type.includes('vision') || type.includes('dalle');
		}) : [];

		return imageModels.map((model: any) => ({
			name: model.name || model.id,
			value: model.id,
			description: model.description || `Cost: ${model.pricing?.generation || 'N/A'}`,
		}));
	} catch (error) {
		if (!isRecoverableDiscoveryError(error)) {
			console.error('Failed to load Chutes.ai image models:', error);
		}
		return getDefaultImageModelOption();
	}
}

/**
 * OPTION A: Dynamically load models from the selected chute
 * This queries the selected chute's /v1/models endpoint
 */
export async function getModelsForSelectedChute(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	// Try to get the selected chute URL from the node parameters
	let chuteUrl: string;
	try {
		chuteUrl = this.getCurrentNodeParameter('chuteUrl') as string;
	} catch (error) {
		// If we can't get the current parameter, return a helpful message
		return [
			{
				name: 'Please select a chute first',
				value: '',
				description: 'The model list will load after you select a chute above',
			},
		];
	}

	// If no chute selected yet, return helpful message
	if (!chuteUrl || chuteUrl === '') {
		return [
			{
				name: 'Please select a chute first',
				value: '',
				description: 'The model list will load after you select a chute above',
			},
		];
	}

	try {
		let response: any;
		try {
			response = await requestWithChutesCredential(this, {
				method: 'GET',
				url: `${chuteUrl}/v1/models`,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (error) {
			if (!isRecoverableDiscoveryError(error)) {
				throw error;
			}

			response = await requestWithoutAuth(this, `${chuteUrl}/v1/models`);
		}

		const models = parseModelsResponse(response);

		if (!Array.isArray(models) || models.length === 0) {
			// Chute has /v1/models but returned no models
			return [
				{
					name: 'Default (chute has fixed model)',
					value: '',
					description: 'This chute uses a fixed model configuration',
				},
			];
		}

		// Return the models for this specific chute
		return models.map((model: any) => ({
			name: `${model.name || model.id}${model.context_length ? ` (${model.context_length} tokens)` : ''}`,
			value: model.id,
			description: model.description || `Cost: ${model.pricing?.input || model.pricing?.generation || 'N/A'}`,
		}));
	} catch (error) {
		console.log(`Chute ${chuteUrl} does not have /v1/models endpoint - using default model`);
		// This chute doesn't have /v1/models - it uses a fixed model
		return [
			{
				name: 'Default (selected by chute)',
				value: '',
				description: 'This chute determines the model automatically. No model parameter needed.',
			},
		];
	}
}
