import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getChutesBaseUrl } from '../transport/apiRequest';

export async function getChutesTextModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('chutesApi');
	const baseUrl = getChutesBaseUrl(credentials, 'textGeneration'); // Routes to llm.chutes.ai

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `${baseUrl}/v1/models`,
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
				'Content-Type': 'application/json',
			},
			json: true,
		});

		// Parse response - might be { data: [...] } or just [...]
		const models = response.data || response;
		
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
	const credentials = await this.getCredentials('chutesApi');
	const baseUrl = getChutesBaseUrl(credentials, 'imageGeneration'); // Routes to image.chutes.ai

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `${baseUrl}/v1/models`,
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
				'Content-Type': 'application/json',
			},
			json: true,
		});

		// Parse response - might be { data: [...] } or just [...]
		const models = response.data || response;
		
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
		console.error('Failed to load Chutes.ai image models:', error);
		// Image chutes often don't have /v1/models endpoint
		// Return message indicating model is selected via chute
		return [
			{ 
				name: 'Default (selected by chute)', 
				value: '', 
				description: 'The model is determined by the selected chute. Most image chutes do not require a model parameter.' 
			},
		];
	}
}

/**
 * OPTION A: Dynamically load models from the selected chute
 * This queries the selected chute's /v1/models endpoint
 */
export async function getModelsForSelectedChute(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('chutesApi');
	
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
		// Query the selected chute's /v1/models endpoint
		const response = await this.helpers.request({
			method: 'GET',
			url: `${chuteUrl}/v1/models`,
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
				'Content-Type': 'application/json',
			},
			json: true,
		});

		// Parse response
		const models = response.data || response;

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

