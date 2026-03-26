import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getChutesBaseUrl } from '../nodes/Chutes/transport/apiRequest';
import { requestWithChutesCredential } from '../nodes/Chutes/transport/requestWithChutesCredential';

function parseModelsResponse(response: unknown): any[] {
	if (Array.isArray((response as { data?: unknown[] })?.data)) {
		return (response as { data: unknown[] }).data;
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
	const candidate = error as Record<string, any>;
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

	const details = [candidate.description, candidate.message, candidate.error?.detail]
		.filter((value) => Boolean(value))
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

async function requestWithoutAuth(context: ILoadOptionsFunctions, url: string): Promise<unknown> {
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
		let response: unknown;
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

		const textModels = Array.isArray(models)
			? models.filter((model: any) => {
					const type = model.type?.toLowerCase() || '';
					return !type || type.includes('text') || type.includes('chat') || type.includes('llm');
			  })
			: [];

		return textModels.map((model: any) => ({
			name: `${model.name || model.id} ${
				model.context_length ? `(${model.context_length} tokens)` : ''
			}`,
			value: model.id,
			description: model.description || `Cost: ${model.pricing?.input || 'N/A'}`,
		}));
	} catch (error) {
		console.error('Failed to load Chutes.ai text models:', error);
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

		const imageModels = Array.isArray(models)
			? models.filter((model: any) => {
					const type = model.type?.toLowerCase() || '';
					return (
						!type || type.includes('image') || type.includes('vision') || type.includes('dalle')
					);
			  })
			: [];

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

export async function getModelsForSelectedChute(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let chuteUrl: string;
	try {
		chuteUrl = this.getCurrentNodeParameter('chuteUrl') as string;
	} catch {
		return [
			{
				name: 'Please select a chute first',
				value: '',
				description: 'The model list will load after you select a chute above',
			},
		];
	}

	if (!chuteUrl || chuteUrl.trim() === '') {
		return [
			{
				name: 'Please select a chute first',
				value: '',
				description: 'The model list will load after you select a chute above',
			},
		];
	}

	try {
		let response: unknown;
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
			return [
				{
					name: 'Default (chute has fixed model)',
					value: '',
					description: 'This chute uses a fixed model configuration',
				},
			];
		}

		return models.map((model: any) => ({
			name: `${model.name || model.id}${
				model.context_length ? ` (${model.context_length} tokens)` : ''
			}`,
			value: model.id,
			description:
				model.description || `Cost: ${model.pricing?.input || model.pricing?.generation || 'N/A'}`,
		}));
	} catch {
		console.log(`Chute ${chuteUrl} does not have /v1/models endpoint - using default model`);
		return [
			{
				name: 'Default (selected by chute)',
				value: '',
				description: 'This chute determines the model automatically. No model parameter needed.',
			},
		];
	}
}
