/**
 * Test fixtures and sample data
 * All test fixtures are in /tests directory
 */

import { INodeExecutionData } from 'n8n-workflow';

/**
 * Sample input data for testing workflows
 */
export const sampleInputData: INodeExecutionData[] = [
	{
		json: {
			prompt: 'Write a haiku about coding',
			temperature: 0.8,
		},
	},
];

/**
 * Sample chat messages for testing
 */
export const sampleChatMessages = {
	messageValues: [
		{
			role: 'system',
			content: 'You are a helpful assistant.',
		},
		{
			role: 'user',
			content: 'Explain quantum computing in simple terms.',
		},
	],
};

/**
 * Sample text generation parameters
 */
export const sampleTextGenerationParams = {
	resource: 'textGeneration',
	operation: 'complete',
	model: 'gpt-3.5-turbo',
	prompt: 'Write a story about AI',
	additionalOptions: {
		temperature: 0.7,
		maxTokens: 500,
		topP: 0.9,
		frequencyPenalty: 0.5,
		presencePenalty: 0.2,
		stopSequences: 'END, STOP',
		responseFormat: 'text',
		stream: false,
		seed: 42,
	},
};

/**
 * Sample image generation parameters
 */
export const sampleImageGenerationParams = {
	resource: 'imageGeneration',
	operation: 'generate',
	model: 'dall-e-3',
	prompt: 'A futuristic city with flying cars',
	size: '1024x1024',
	n: 2,
	additionalOptions: {
		quality: 'hd',
		style: 'vivid',
		seed: 12345,
		negativePrompt: 'blurry, low quality',
		guidanceScale: 8,
		responseFormat: 'url',
	},
};

/**
 * Sample inference parameters
 */
export const sampleInferenceParams = {
	resource: 'inference',
	operation: 'predict',
	modelId: 'model_abc123',
	input: '{"text": "Analyze this sentiment"}',
	additionalOptions: {
		timeout: 120,
		webhookUrl: 'https://example.com/webhook',
		priority: 'high',
		outputFormat: 'json',
	},
};

/**
 * Mock text completion API response
 * NOTE: Now uses chat completion format since we use /v1/chat/completions for all text generation
 */
export const mockTextCompletionResponse = {
	id: 'chatcmpl-complete-123',
	object: 'chat.completion',
	created: 1234567890,
	model: 'gpt-3.5-turbo',
	choices: [
		{
			index: 0,
			message: {
				role: 'assistant',
				content: 'This is a generated text completion.',
			},
			finish_reason: 'stop',
		},
	],
	usage: {
		prompt_tokens: 10,
		completion_tokens: 20,
		total_tokens: 30,
	},
	source: 'chutes.ai',
};

/**
 * Mock chat completion API response
 */
export const mockChatCompletionResponse = {
	id: 'chatcmpl-123',
	object: 'chat.completion',
	created: 1234567890,
	model: 'gpt-4',
	choices: [
		{
			index: 0,
			message: {
				role: 'assistant',
				content: 'This is a chat response.',
			},
			finish_reason: 'stop',
		},
	],
	usage: {
		prompt_tokens: 15,
		completion_tokens: 25,
		total_tokens: 40,
	},
	source: 'chutes.ai',
};

/**
 * Mock image generation API response
 */
export const mockImageGenerationResponse = {
	created: 1234567890,
	data: [
		{
			url: 'https://cdn.chutes.ai/generated-image-1.png',
		},
		{
			url: 'https://cdn.chutes.ai/generated-image-2.png',
		},
	],
};

/**
 * Mock API response for text models
 */
export const mockTextModelsResponse = {
	data: [
		{
			id: 'gpt-3.5-turbo',
			name: 'GPT-3.5 Turbo',
			type: 'chat',
			context_length: 4096,
			description: 'Fast and efficient chat model',
			pricing: { input: '$0.0015/1K tokens' },
		},
		{
			id: 'gpt-4',
			name: 'GPT-4',
			type: 'chat',
			context_length: 8192,
			description: 'Advanced reasoning model',
			pricing: { input: '$0.03/1K tokens' },
		},
	],
};

/**
 * Mock API response for image models
 */
export const mockImageModelsResponse = {
	data: [
		{
			id: 'dall-e-3',
			name: 'DALL-E 3',
			type: 'image',
			description: 'High quality image generation',
			pricing: { generation: '$0.04/image' },
		},
		{
			id: 'stable-diffusion-xl',
			name: 'Stable Diffusion XL',
			type: 'image',
			description: 'Open source image generation',
			pricing: { generation: '$0.02/image' },
		},
	],
};

/**
 * Expected API request body for text completion
 * NOTE: Now uses messages format since we use /v1/chat/completions for all text generation
 */
export const expectedTextCompletionBody = {
	model: 'gpt-3.5-turbo',
	messages: [
		{ role: 'user', content: 'Write a story about AI' },
	],
	temperature: 0.7,
	max_tokens: 500,
	top_p: 0.9,
	frequency_penalty: 0.5,
	presence_penalty: 0.2,
	stop: ['END', 'STOP'],
	response_format: { type: 'text' },
	stream: false,
	seed: 42,
};

/**
 * Expected API request body for chat completion
 */
export const expectedChatCompletionBody = {
	model: 'gpt-4',
	messages: [
		{ role: 'system', content: 'You are a helpful assistant.' },
		{ role: 'user', content: 'Explain quantum computing in simple terms.' },
	],
	temperature: 0.7,
	max_tokens: 1000,
};

/**
 * Expected API request body for image generation
 */
export const expectedImageGenerationBody = {
	model: 'dall-e-3',
	prompt: 'A futuristic city with flying cars',
	size: '1024x1024',
	n: 2,
	quality: 'hd',
	style: 'vivid',
	seed: 12345,
	negative_prompt: 'blurry, low quality',
	guidance_scale: 8,
	response_format: 'url',
};

/**
 * Error responses for testing error handling
 */
export const errorResponses = {
	rateLimitError: {
		statusCode: 429,
		message: 'Rate limit exceeded',
		headers: {
			'x-ratelimit-remaining': '0',
			'x-ratelimit-reset': '1234567890',
		},
	},
	authError: {
		statusCode: 401,
		message: 'Invalid API key',
	},
	notFoundError: {
		statusCode: 404,
		message: 'Model not found',
	},
	serverError: {
		statusCode: 500,
		message: 'Internal server error',
	},
};

