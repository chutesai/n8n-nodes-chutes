import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';

import { textGenerationOperations } from './operations/textGeneration';
import { imageGenerationOperations } from './operations/imageGeneration';
import { videoGenerationOperations } from './operations/videoGeneration';
import { textToSpeechOperations } from './operations/textToSpeech';
import { speechToTextOperations } from './operations/speechToText';
import { musicGenerationOperations } from './operations/musicGeneration';
import { embeddingsOperations } from './operations/embeddings';
import { contentModerationOperations } from './operations/contentModeration';
import { inferenceOperations } from './operations/inference';
import { chutesApiRequestWithRetry } from './transport/apiRequest';
import * as loadOptions from './methods/loadOptions';
import * as loadChutes from './methods/loadChutes';

export class Chutes implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chutes',
		name: 'chutes',
		icon: 'file:chutes.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Chutes.ai for AI text generation, image generation, and inference',
		defaults: {
			name: 'Chutes',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'chutesApi',
				required: true,
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'LLM (Text Generation)',
						value: 'textGeneration',
						description: 'Generate text using large language models',
					},
					{
						name: 'Image Generation',
						value: 'imageGeneration',
						description: 'Generate images from text prompts',
					},
					{
						name: 'Video Generation',
						value: 'videoGeneration',
						description: 'Generate videos from text descriptions',
					},
					{
						name: 'Text-to-Speech',
						value: 'textToSpeech',
						description: 'Convert text to natural speech audio',
					},
					{
						name: 'Speech-to-Text',
						value: 'speechToText',
						description: 'Transcribe audio to text',
					},
					{
						name: 'Music Generation',
						value: 'musicGeneration',
						description: 'Generate music from text prompts',
					},
					{
						name: 'Embeddings',
						value: 'embeddings',
						description: 'Generate text embeddings for semantic search',
					},
					{
						name: 'Content Moderation',
						value: 'contentModeration',
						description: 'Analyze content for moderation',
					},
					{
						name: 'Custom Inference',
						value: 'inference',
						description: 'Run custom model inference',
					},
				],
				default: 'textGeneration',
			},

	// Chute selector for Text Generation
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['textGeneration'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getLLMChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://llm.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-deepseek-ai-deepseek-v3-2.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Image Generation
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getImageChutes',
				loadOptionsDependsOn: ['resource', 'operation'], // Reload when operation changes for smart sorting
			},
			default: 'https://image.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-flux-1-dev.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Video Generation
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getVideoChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://video.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-wan2-1-14b.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Text-to-Speech
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['textToSpeech'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getTTSChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://tts.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-kokoro.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Speech-to-Text
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['speechToText'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getSTTChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://stt.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-whisper-large-v3.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Music Generation
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['musicGeneration'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getMusicChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://music.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-diffrhythm.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Embeddings
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['embeddings'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getEmbeddingChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://embeddings.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-qwen-qwen3-embedding-0-6b.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},

	// Chute selector for Content Moderation
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['contentModeration'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getModerationChutes',
				loadOptionsDependsOn: ['resource'],
			},
		default: 'https://moderation.chutes.ai',
		description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
		placeholder: 'https://chutes-nsfw-classifier.chutes.ai',
		hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
	},

	// Chute selector for Inference
	{
		displayName: 'Chute',
		name: 'chuteUrl',
		type: 'options',
		noDataExpression: false,
		required: false,
		displayOptions: {
			show: {
				resource: ['inference'],
			},
		},
			typeOptions: {
				loadOptionsMethod: 'getChutes',
				loadOptionsDependsOn: ['resource'],
			},
			default: 'https://llm.chutes.ai',
			description: 'Select a specific chute to use for custom inference.',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>',
		},

			// Operations
			...textGenerationOperations,
			...imageGenerationOperations,
			...videoGenerationOperations,
			...textToSpeechOperations,
			...speechToTextOperations,
			...musicGenerationOperations,
			...embeddingsOperations,
			...contentModerationOperations,
			...inferenceOperations,
		],
	};

	methods = {
		loadOptions: {
			// Model loading methods
			getChutesTextModels: loadOptions.getChutesTextModels,
			getChutesImageModels: loadOptions.getChutesImageModels,
			getModelsForSelectedChute: loadOptions.getModelsForSelectedChute, // OPTION A: Dynamic model loading
			// Chute loading methods
			getChutes: loadChutes.getChutes,
			getLLMChutes: loadChutes.getLLMChutes,
			getImageChutes: loadChutes.getImageChutes,
			getVideoChutes: loadChutes.getVideoChutes,
			getTTSChutes: loadChutes.getTTSChutes,
			getSTTChutes: loadChutes.getSTTChutes,
			getMusicChutes: loadChutes.getMusicChutes,
			getEmbeddingChutes: loadChutes.getEmbeddingChutes,
			getModerationChutes: loadChutes.getModerationChutes,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				let responseData: any;

			if (resource === 'textGeneration') {
				responseData = await handleTextGeneration.call(this, i);
			} else if (resource === 'imageGeneration') {
				responseData = await handleImageGeneration.call(this, i);
		} else if (resource === 'videoGeneration') {
			responseData = await handleVideoGeneration.call(this, i);
		} else if (resource === 'textToSpeech') {
			responseData = await handleTextToSpeech.call(this, i);
		} else if (resource === 'speechToText') {
			responseData = await handleSpeechToText.call(this, i);
		} else if (resource === 'inference') {
			responseData = await handleInference.call(this, i);
		} else if (resource === 'musicGeneration') {
			responseData = await handleMusicGeneration.call(this, i);
		} else if (resource === 'embeddings') {
			responseData = await handleEmbeddings.call(this, i);
		} else if (resource === 'contentModeration') {
			responseData = await handleContentModeration.call(this, i);
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`Resource "${resource}" not implemented in Chutes.ai`,
				{ itemIndex: i },
			);
		}

		// Handle different response types from Chutes.ai
		if (Array.isArray(responseData)) {
			// Multiple items - could be binary images or JSON objects
			for (const item of responseData) {
				if (item && typeof item === 'object' && 'binaryData' in item) {
					// Binary image data from multi-image generation
					const binaryBuffer = item.binaryData as Buffer;
					const imageNumber = (item as any).imageNumber;
					returnData.push({
						json: { 
							source: 'chutes.ai',
							...(imageNumber && { imageNumber })
						},
						binary: {
							data: await this.helpers.prepareBinaryData(
								binaryBuffer,
								item.fileName as string,
								item.mimeType as string
							),
						},
						pairedItem: { item: i },
					});
				} else {
					// Regular JSON item
					returnData.push({
						json: { ...item, source: 'chutes.ai' },
						pairedItem: { item: i },
					});
				}
			}
		} else if (responseData && typeof responseData === 'object' && 'binaryData' in responseData) {
				// Binary image data from image generation
				const binaryBuffer = responseData.binaryData as Buffer;
				returnData.push({
					json: { source: 'chutes.ai' },
					binary: {
						data: await this.helpers.prepareBinaryData(
							binaryBuffer,
							responseData.fileName as string,
							responseData.mimeType as string
						),
					},
					pairedItem: { item: i },
				});
			} else if (typeof responseData === 'string') {
				// String response (e.g., image URL, raw text)
				// Wrap in object to prevent character-by-character splitting
				returnData.push({
					json: { 
						data: responseData,
						source: 'chutes.ai' 
					},
					pairedItem: { item: i },
				});
			} else if (typeof responseData === 'object' && responseData !== null) {
				// Object response
				returnData.push({
					json: { ...responseData, source: 'chutes.ai' },
					pairedItem: { item: i },
				});
			} else {
				// Primitive types (number, boolean, etc.)
				returnData.push({
					json: { 
						value: responseData,
						source: 'chutes.ai' 
					},
					pairedItem: { item: i },
				});
			}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
							source: 'chutes.ai',
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

/**
 * Helper function to wrap API requests with optional timeout
 * @param promise The promise to wrap (typically an API request)
 * @param timeoutSeconds Timeout in seconds (undefined = no timeout)
 * @param context The execution context for error reporting
 * @param itemIndex The current item index
 * @param resource The resource name for error messages
 * @returns The promise result or throws timeout error
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutSeconds: number | undefined,
	context: IExecuteFunctions,
	itemIndex: number,
	resource: string,
): Promise<T> {
	// No timeout specified - return promise as-is
	if (timeoutSeconds === undefined || timeoutSeconds === null || timeoutSeconds <= 0) {
		return promise;
	}

	// Create timeout promise with proper cleanup
	const timeoutMs = timeoutSeconds * 1000;
	let timeoutHandle: ReturnType<typeof setTimeout>;
	
	const timeoutPromise = new Promise<T>((_, reject) => {
		timeoutHandle = setTimeout(() => {
			reject(
				new NodeOperationError(
					context.getNode(),
					`Request timeout: ${resource} operation exceeded ${timeoutSeconds} seconds. The service may be hanging. Try increasing the timeout or check service status.`,
					{
						itemIndex,
						description: `The request was aborted after ${timeoutSeconds} seconds. You can increase the timeout in Additional Options, or leave it empty for no timeout.`,
					},
				),
			);
		}, timeoutMs);
		
		// Call .unref() so the timer doesn't keep the process alive
		// This allows Node.js/Jest to exit cleanly if the promise resolves first
		timeoutHandle.unref();
	});

	// Race between the actual request and the timeout
	// Clear the timeout if the promise completes first (extra cleanup)
	return Promise.race([
		promise.then((result) => {
			clearTimeout(timeoutHandle);
			return result;
		}).catch((error) => {
			clearTimeout(timeoutHandle);
			throw error;
		}),
		timeoutPromise,
	]);
}

	async function handleTextGeneration(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
		const operation = this.getNodeParameter('operation', itemIndex) as string;
		// Model parameter removed - chute URL already specifies the model
		const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://llm.chutes.ai') as string;
		const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	let body: IDataObject = {
		...additionalOptions,
	};

	// Model is determined by the chute URL, not a separate parameter

	// Set reasonable default for max_tokens if not specified
	// This prevents the API from stopping after just 16 tokens
	if (!body.max_tokens && !body.maxTokens) {
		body.max_tokens = 1000; // Default to 1000 tokens for complete responses
	}

	// Explicitly disable streaming (n8n doesn't support SSE streaming yet)
	// This ensures we get the complete response, not just the first chunk
	body.stream = false;

	// Handle stop sequences
		if (additionalOptions.stopSequences) {
			const stopStr = additionalOptions.stopSequences as string;
			body.stop = stopStr.split(',').map((s) => s.trim());
			delete body.stopSequences;
		}

		// Handle response format
		if (additionalOptions.responseFormat) {
			body.response_format = { type: additionalOptions.responseFormat };
			delete body.responseFormat;
		}

		// Rename parameters to match API
		if (additionalOptions.maxTokens) {
			body.max_tokens = additionalOptions.maxTokens;
			delete body.maxTokens;
		}
		if (additionalOptions.topP) {
			body.top_p = additionalOptions.topP;
			delete body.topP;
		}
		if (additionalOptions.frequencyPenalty) {
			body.frequency_penalty = additionalOptions.frequencyPenalty;
			delete body.frequencyPenalty;
		}
		if (additionalOptions.presencePenalty) {
			body.presence_penalty = additionalOptions.presencePenalty;
			delete body.presencePenalty;
		}

	// Both 'complete' and 'chat' operations now use /v1/chat/completions
	// This is modern best practice and avoids truncation issues with /v1/completions
	if (operation === 'complete') {
		// For simple completions, wrap the prompt as a user message
		const prompt = this.getNodeParameter('prompt', itemIndex) as string;
		body.messages = [
			{ role: 'user', content: prompt },
		];
	} else if (operation === 'chat') {
		// For chat, use the full messages array
		const messagesData = this.getNodeParameter('messages', itemIndex, {}) as IDataObject;
		const messages = (messagesData.messageValues as IDataObject[]) || [];
		body.messages = messages;
	} else {
		throw new NodeOperationError(
			this.getNode(),
			`Operation "${operation}" not supported for text generation`,
			{ itemIndex },
		);
	}

	// Use chat completions endpoint for all text generation
	const timeout = additionalOptions.timeout as number | undefined;
	const response = await withTimeout(
		chutesApiRequestWithRetry.call(
			this,
			'POST',
			'/v1/chat/completions',
			body,
			{},
			{},
			{},
			'textGeneration', // Routes to llm.chutes.ai or custom chute
			chuteUrl, // Custom chute URL
		),
		timeout,
		this,
		itemIndex,
		'Text generation',
	);
	
	return response;
}

async function handleImageGeneration(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject | { binaryData: Buffer; mimeType: string; fileName: string } | Array<{ binaryData: Buffer; mimeType: string; fileName: string; imageNumber: number }>> {
		const operation = this.getNodeParameter('operation', itemIndex) as string;
		// Model parameter removed - chute URL already specifies the model
		const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://image.chutes.ai') as string;
		const prompt = this.getNodeParameter('prompt', itemIndex) as string;
		const size = this.getNodeParameter('size', itemIndex) as string;
		const n = this.getNodeParameter('n', itemIndex, 1) as number;
		const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

		// Parse size into width and height
		const [width, height] = size.split('x').map(s => parseInt(s.trim()));

		// Get seed from additional options (will be undefined if not set, defaulting to random)
		const baseSeed = additionalOptions.seed as number | undefined;

		if (operation === 'generate') {
			// If n > 1, make sequential requests (API doesn't support batch generation)
			if (n && n > 1) {
				const images: Array<{ binaryData: Buffer; mimeType: string; fileName: string; imageNumber: number }> = [];
				
				for (let i = 0; i < n; i++) {
					// Build request body for each image
					const body: IDataObject = {
						prompt,
					};

					// Add optional parameters
					if (width && height) {
						body.width = width;
						body.height = height;
					}

					// Add additional options with proper snake_case conversion
					if (additionalOptions.negativePrompt) {
						body.negative_prompt = additionalOptions.negativePrompt;
					}
					if (additionalOptions.guidanceScale) {
						body.guidance_scale = additionalOptions.guidanceScale;
					}
					if (additionalOptions.responseFormat) {
						body.response_format = additionalOptions.responseFormat;
					}
					if (additionalOptions.quality) {
						body.quality = additionalOptions.quality;
					}
					if (additionalOptions.style) {
						body.style = additionalOptions.style;
					}

					// Handle seed: if specified, increment by 1 for each image; otherwise let API use random
					if (baseSeed !== undefined) {
						body.seed = baseSeed + i;
					}

					// Make API request for single image
					const timeout = additionalOptions.timeout as number | undefined;
					const response = await withTimeout(
						chutesApiRequestWithRetry.call(
							this,
							'POST',
							'/generate',
							body,
							{},
							{},
							{
								// Request binary response for image data
								encoding: null,
								json: false,
							},
							'imageGeneration',
							chuteUrl,
						),
						timeout,
						this,
						itemIndex,
						`Image generation (${i + 1}/${n})`,
					);

					// Check if response is binary (Buffer)
					if (Buffer.isBuffer(response)) {
						images.push({
							binaryData: response,
							mimeType: 'image/png',
							fileName: `generated-image-${i + 1}-${Date.now()}.png`,
							imageNumber: i + 1,
						});
					}
				}

				// Return all images as an array
				return images;
			} else {
				// Single image generation (n = 1)
				const body: IDataObject = {
					prompt,
				};

				// Add optional parameters
				if (width && height) {
					body.width = width;
					body.height = height;
				}

				// Add additional options with proper snake_case conversion
				if (additionalOptions.negativePrompt) {
					body.negative_prompt = additionalOptions.negativePrompt;
				}
				if (additionalOptions.guidanceScale) {
					body.guidance_scale = additionalOptions.guidanceScale;
				}
				if (additionalOptions.responseFormat) {
					body.response_format = additionalOptions.responseFormat;
				}
				if (baseSeed !== undefined) {
					body.seed = baseSeed;
				}
				if (additionalOptions.quality) {
					body.quality = additionalOptions.quality;
				}
				if (additionalOptions.style) {
					body.style = additionalOptions.style;
				}

				// Request binary data for single image
				const timeout = additionalOptions.timeout as number | undefined;
				const response = await withTimeout(
					chutesApiRequestWithRetry.call(
						this,
						'POST',
						'/generate',
						body,
						{},
						{},
						{
							// Request binary response for image data
							encoding: null,
							json: false,
						},
						'imageGeneration',
						chuteUrl,
					),
					timeout,
					this,
					itemIndex,
					'Image generation',
				);
				
				// Check if response is binary (Buffer) or JSON
				if (Buffer.isBuffer(response)) {
					// Binary image data - return with metadata
					return {
						binaryData: response,
						mimeType: 'image/png',
						fileName: `generated-image-${Date.now()}.png`,
					};
				}
				
				// Otherwise return as JSON (e.g., if responseFormat was 'url')
				return response;
		}
	} 
	
	else if (operation === 'edit') {
		// Image editing operation
		const imageParam = this.getNodeParameter('image', itemIndex, '') as string;
		
		let imageBase64: string = '';
		
		// PRIORITY 1: Try to get image from binary data first (from previous node)
		const binaryData = this.getInputData()[itemIndex].binary;
		if (binaryData && binaryData.data) {
			// Image is coming from binary data in the workflow
			try {
				const imageBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, 'data');
				imageBase64 = imageBuffer.toString('base64');
			} catch (error) {
				console.warn('Failed to get binary image data:', error);
				// Continue to try other methods
			}
		}
		
		// PRIORITY 2: If no binary data, check the image parameter
		if (!imageBase64 && imageParam) {
			if (imageParam.startsWith('http://') || imageParam.startsWith('https://')) {
				// Image is a URL - download it and convert to base64
				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: imageParam,
						encoding: null, // Get binary data
					});
					const imageBuffer = Buffer.from(response);
					imageBase64 = imageBuffer.toString('base64');
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to download image from URL: ${(error as Error).message}`,
						{ itemIndex },
					);
				}
			} else if (imageParam.startsWith('data:')) {
				// Data URL format (data:image/png;base64,...)
				const matches = imageParam.match(/^data:([^;]+);base64,(.+)$/);
				if (matches) {
					imageBase64 = matches[2];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid data URL format. Expected: data:image/TYPE;base64,BASE64_DATA',
						{ itemIndex },
					);
				}
			} else {
				// Assume it's already base64 encoded image
				imageBase64 = imageParam;
			}
		}

		// Validate we have image data
		if (!imageBase64) {
			throw new NodeOperationError(
				this.getNode(),
				'No image data found. Please connect a node with binary image data (HTTP Request, Read Binary File, etc.) or provide an image URL in the Input Image field.',
				{ itemIndex },
			);
		}

		// Get API credentials for OpenAPI discovery
		const credentials = await this.getCredentials('chutesApi');
		const apiKey = credentials.apiKey as string;

		// Dynamically discover chute capabilities via OpenAPI schema
		const { discoverChuteCapabilities, buildRequestBody } = await import('./transport/openApiDiscovery');
		console.log(`[ImageEdit] Discovering capabilities for: ${chuteUrl}`);
		const capabilities = await discoverChuteCapabilities(chuteUrl, apiKey);
		console.log(`[ImageEdit] Discovered endpoints:`, capabilities.endpoints.map(e => e.path));
		console.log(`[ImageEdit] Supports Edit: ${capabilities.supportsImageEdit}, Path: ${capabilities.imageEditPath}`);

		// Prepare base user inputs for dynamic endpoint discovery
		const baseUserInputs: IDataObject = {
			prompt,
			image: imageBase64,
		};

		// Add optional parameters to base inputs
		if (width && height) {
			baseUserInputs.width = width;
			baseUserInputs.height = height;
		}

		// Add additional options with proper snake_case conversion
		if (additionalOptions.negativePrompt) {
			baseUserInputs.negative_prompt = additionalOptions.negativePrompt;
		}
		if (additionalOptions.guidanceScale) {
			baseUserInputs.guidance_scale = additionalOptions.guidanceScale;
		}
		if (additionalOptions.responseFormat) {
			baseUserInputs.response_format = additionalOptions.responseFormat;
		}
		if (additionalOptions.quality) {
			baseUserInputs.quality = additionalOptions.quality;
		}
		if (additionalOptions.style) {
			baseUserInputs.style = additionalOptions.style;
		}

		// Discover the correct endpoint for this chute
		const requestConfig = buildRequestBody('edit', capabilities, baseUserInputs);
		if (!requestConfig) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not find suitable endpoint for image editing',
				{ itemIndex },
			);
		}

		console.log(`[ImageEdit] Using endpoint: ${requestConfig.endpoint}`);
		console.log(`[ImageEdit] Request body keys:`, Object.keys(requestConfig.body));

		// Log full body for debugging (excluding image data to keep logs manageable)
		const bodyForLogging = { ...requestConfig.body };
		if (bodyForLogging.image) {
			bodyForLogging.image = `[base64 data, ${String(bodyForLogging.image).length} chars]`;
		}
		if (bodyForLogging.image_b64) {
			bodyForLogging.image_b64 = `[base64 data, ${String(bodyForLogging.image_b64).length} chars]`;
		}
		if (bodyForLogging.image_b64s && Array.isArray(bodyForLogging.image_b64s)) {
			const totalChars = bodyForLogging.image_b64s.reduce((sum, img) => sum + (img?.length || 0), 0);
			bodyForLogging.image_b64s = `[array of ${bodyForLogging.image_b64s.length} base64 images, total ${totalChars} chars]`;
		}
		if (bodyForLogging.image_url) {
			bodyForLogging.image_url = `[image URL, ${String(bodyForLogging.image_url).length} chars]`;
		}
		console.log(`[ImageEdit] Full request body:`, JSON.stringify(bodyForLogging, null, 2));

		// If n > 1, make sequential requests
		if (n && n > 1) {
			const images: Array<{ binaryData: Buffer; mimeType: string; fileName: string; imageNumber: number }> = [];
			
			for (let i = 0; i < n; i++) {
				// Copy base user inputs for this iteration
				const iterationInputs: IDataObject = { ...baseUserInputs };

				// Handle seed: if specified, increment by 1 for each image
				if (baseSeed !== undefined) {
					iterationInputs.seed = baseSeed + i;
				}

				// Build request body dynamically for this iteration
				const iterationConfig = buildRequestBody('edit', capabilities, iterationInputs, chuteUrl);
				if (!iterationConfig) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not build request for image editing',
						{ itemIndex },
					);
				}

				// Make API request for single image edit with dynamic endpoint
				const timeout = additionalOptions.timeout as number | undefined;
				const response = await withTimeout(
					chutesApiRequestWithRetry.call(
						this,
						'POST',
						iterationConfig.endpoint, // ← Dynamic endpoint discovery!
						iterationConfig.body,      // ← Dynamic parameter mapping!
						{},
						{},
						{
							// Request binary response for image data
							encoding: null,
							json: false,
						},
						'imageGeneration',
						chuteUrl,
					),
					timeout,
					this,
					itemIndex,
					`Image edit (${i + 1}/${n})`,
				);

				// Check if response is binary (Buffer)
				if (Buffer.isBuffer(response)) {
					images.push({
						binaryData: response,
						mimeType: 'image/png',
						fileName: `edited-image-${i + 1}-${Date.now()}.png`,
						imageNumber: i + 1,
					});
				}
			}

			// Return all edited images as an array
			return images;
		} else {
			// Single image edit (n = 1)
			// Copy base user inputs for single edit
			const singleEditInputs: IDataObject = { ...baseUserInputs };

			// Add seed if specified
			if (baseSeed !== undefined) {
				singleEditInputs.seed = baseSeed;
			}

			// Request binary data for single image edit with dynamic endpoint
			const timeout = additionalOptions.timeout as number | undefined;
			const response = await withTimeout(
				chutesApiRequestWithRetry.call(
					this,
					'POST',
					requestConfig.endpoint, // ← Dynamic endpoint discovery!
					requestConfig.body,      // ← Dynamic parameter mapping!
					{},
					{},
					{
						// Request binary response for image data
						encoding: null,
						json: false,
					},
					'imageGeneration',
					chuteUrl,
				),
				timeout,
				this,
				itemIndex,
				'Image edit',
			);
			
			// Check if response is binary (Buffer) or JSON
			if (Buffer.isBuffer(response)) {
				// Binary image data - return with metadata
				return {
					binaryData: response,
					mimeType: 'image/png',
					fileName: `edited-image-${Date.now()}.png`,
				};
			}
			
			// Otherwise return as JSON (e.g., if responseFormat was 'url')
			return response;
		}
	}
	
	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for image generation`,
		{ itemIndex },
	);
}

async function handleTextToSpeech(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject | { binaryData: Buffer; mimeType: string; fileName: string }> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://audio.chutes.ai') as string;
	const text = this.getNodeParameter('text', itemIndex) as string;
	const voice = this.getNodeParameter('voice', itemIndex, '') as string;
	const customVoice = this.getNodeParameter('customVoice', itemIndex, '') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	if (operation === 'generate') {
		// Build request body for text-to-speech
		const body: IDataObject = {
			text: text, // TTS chutes expect 'text' field, not 'input'
		};

		// Add voice if specified
		// Use customVoice if voice is 'custom', otherwise use voice value
		// Ignore separator values (visual group headers in dropdown) - use default voice if separator selected
		const voiceValue = voice === 'custom' ? customVoice : voice;
		if (voiceValue && voiceValue !== '' && !voiceValue.startsWith('_separator_')) {
			body.voice = voiceValue; // API parameter is 'voice' (confirmed from playground)
		}
		// Note: If voiceValue is empty or a separator, no 'voice' field is added, so API uses default voice

		// Add optional parameters
		if (additionalOptions.speed !== undefined) {
			body.speed = additionalOptions.speed;
		}

		// Request binary audio data
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				'/speak', // Text-to-speech chutes use /speak endpoint
				body,
				{},
				{},
				{
					// Request binary response for audio data
					encoding: null,
					json: false,
				},
				'textToSpeech', // Routes to audio.chutes.ai
				chuteUrl, // Custom chute URL
			),
			timeout,
			this,
			itemIndex,
			'Text-to-speech',
		);

		// Check if response is binary (Buffer) or JSON
		if (Buffer.isBuffer(response)) {
			// Binary audio data - return with metadata
			return {
				binaryData: response,
				mimeType: 'audio/mpeg', // Most TTS returns MP3, but could be wav/ogg
				fileName: `generated-speech-${Date.now()}.mp3`,
			};
		}

		// Otherwise return as JSON (e.g., if API returns URL)
		return response;
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for text-to-speech`,
		{ itemIndex },
	);
}

async function handleSpeechToText(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, '') as string;
	const audioParam = this.getNodeParameter('audio', itemIndex, '') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	if (operation === 'transcribe') {
		// Speech-to-text chutes use /transcribe endpoint (discovered via source code inspection)
		// API expects JSON with 'audio_b64' field containing base64-encoded audio
		
		let audioBase64: string = '';
		let audioSource: string = '';
		
		// PRIORITY 1: Try to get audio from binary data first (from previous node)
		const binaryData = this.getInputData()[itemIndex].binary;
		if (binaryData && binaryData.data) {
			// Audio is coming from binary data in the workflow (e.g., HTTP Request, Read Binary File)
			try {
				const audioBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, 'data');
				audioBase64 = audioBuffer.toString('base64');
				audioSource = `binary data (${binaryData.data.mimeType || 'audio'}, ${audioBuffer.length} bytes)`;
			} catch (error) {
				console.warn('Failed to get binary audio data:', error);
				// Continue to try other methods
			}
		}
		
		// PRIORITY 2: If no binary data, check the audio parameter
		if (!audioBase64 && audioParam) {
			if (audioParam.startsWith('http://') || audioParam.startsWith('https://')) {
				// Audio is a URL - download it and convert to base64
				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: audioParam,
						encoding: null, // Get binary data
					});
					const audioBuffer = Buffer.from(response);
					audioBase64 = audioBuffer.toString('base64');
					audioSource = `downloaded URL (${audioBuffer.length} bytes)`;
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to download audio from URL: ${(error as Error).message}`,
						{ itemIndex },
					);
				}
			} else if (audioParam.startsWith('data:')) {
				// Data URL format (data:audio/mp3;base64,...)
				const matches = audioParam.match(/^data:([^;]+);base64,(.+)$/);
				if (matches) {
					audioBase64 = matches[2];
					audioSource = `data URL (${matches[1]})`;
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid data URL format. Expected: data:audio/TYPE;base64,BASE64_DATA',
						{ itemIndex },
					);
				}
			} else {
				// Assume it's already base64 encoded audio
				audioBase64 = audioParam;
				audioSource = 'base64 string';
			}
		}

		// Validate we have audio data
		if (!audioBase64) {
			throw new NodeOperationError(
				this.getNode(),
				'No audio data found. Please connect a node with binary audio data (HTTP Request, Read Binary File, etc.) or provide an audio URL in the Audio field.',
				{ itemIndex },
			);
		}

		// Build request body - API expects 'audio_b64' field (not 'audio')
		const body: IDataObject = {
			audio_b64: audioBase64,
		};

		// Add optional language parameter for translation
		if (additionalOptions.language) {
			body.language = additionalOptions.language;
		}

		// Make API request to speech-to-text endpoint
		const credentials = await this.getCredentials('chutesApi');
		const requestUrl = `${chuteUrl}/transcribe`;
		const timeout = additionalOptions.timeout as number | undefined;
		
		try {
			const response = await withTimeout(
				this.helpers.request({
					method: 'POST',
					url: requestUrl,
					body,
					headers: {
						'Authorization': `Bearer ${credentials.apiKey}`,
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
					json: true,
				}),
				timeout,
				this,
				itemIndex,
				'Speech-to-text',
			);

			// Response is an array of chunks with timestamps
			// Format: [{ start: 0, end: 1.5, text: "..." }, ...]
			
			// Combine all chunks into a single continuous text
			const chunks = Array.isArray(response) ? response : [];
			const fullText = chunks
				.map((chunk: any) => chunk.text || '')
				.join('')
				.trim();
			
			// Build response based on includeChunks option
			const includeChunks = additionalOptions.includeChunks as boolean || false;
			const result: IDataObject = {
				text: fullText,
				duration: chunks.length > 0 ? chunks[chunks.length - 1].end : 0,
				chunkCount: chunks.length,
				audioSource: audioSource, // Show where the audio came from (for transparency/debugging)
			};
			
			// Only include chunks array if user explicitly requests it
			if (includeChunks) {
				result.chunks = chunks;
			}
			
			return result;
		} catch (error: any) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to transcribe audio: ${error.message}`,
				{ itemIndex },
			);
		}
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for speech-to-text`,
		{ itemIndex },
	);
}

async function handleInference(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
		const operation = this.getNodeParameter('operation', itemIndex) as string;
		const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://llm.chutes.ai') as string;
		const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

		if (operation === 'predict') {
			const modelId = this.getNodeParameter('modelId', itemIndex) as string;
			const input = this.getNodeParameter('input', itemIndex) as string;

			const body: IDataObject = {
				input: JSON.parse(input),
				...additionalOptions,
			};

			// Rename parameters
			if (additionalOptions.outputFormat) {
				body.output_format = additionalOptions.outputFormat;
				delete body.outputFormat;
			}
			if (additionalOptions.webhookUrl) {
				body.webhook_url = additionalOptions.webhookUrl;
				delete body.webhookUrl;
			}

			const timeout = additionalOptions.timeout as number | undefined;
			const response = await withTimeout(
				chutesApiRequestWithRetry.call(
					this,
					'POST',
					`/v1/inference/${modelId}/predict`,
					body,
					{},
					{},
					{},
					'inference', // Routes to llm.chutes.ai
					chuteUrl, // Custom chute URL
				),
				timeout,
				this,
				itemIndex,
				'Inference predict',
			);
			return response;
		} else if (operation === 'batch') {
			const modelId = this.getNodeParameter('modelId', itemIndex) as string;
			const batchInputs = this.getNodeParameter('batchInputs', itemIndex) as string;

			const body: IDataObject = {
				inputs: JSON.parse(batchInputs),
				...additionalOptions,
			};

			const timeout = additionalOptions.timeout as number | undefined;
			const response = await withTimeout(
				chutesApiRequestWithRetry.call(
					this,
					'POST',
					`/v1/inference/${modelId}/batch`,
					body,
					{},
					{},
					{},
					'inference', // Routes to llm.chutes.ai
					chuteUrl, // Custom chute URL
				),
				timeout,
				this,
				itemIndex,
				'Inference batch',
			);
			return response;
		} else if (operation === 'status') {
			const jobId = this.getNodeParameter('jobId', itemIndex) as string;
			const timeout = additionalOptions.timeout as number | undefined;
			const response = await withTimeout(
				chutesApiRequestWithRetry.call(
					this,
					'GET',
					`/v1/inference/jobs/${jobId}`,
					{},
					{},
					{},
					{},
					'inference', // Routes to llm.chutes.ai
					chuteUrl, // Custom chute URL
				),
				timeout,
				this,
				itemIndex,
				'Inference status',
			);
			return response;
		}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for inference`,
		{ itemIndex },
	);
}

/**
 * Handle Music Generation
 * Generates music from text prompts using music generation chutes
 */
async function handleMusicGeneration(this: IExecuteFunctions, itemIndex: number): Promise<{ binaryData: Buffer; mimeType: string; fileName: string }> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://music.chutes.ai') as string;
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const lyrics = this.getNodeParameter('lyrics', itemIndex, '') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	if (operation === 'generate') {
		// Build request body for music generation
		// DiffRhythm API expects: { style_prompt, lyrics?, audio_b64? }
		const body: IDataObject = {
			style_prompt: prompt, // Correct field name for DiffRhythm API
		};

		// Add lyrics if specified (optional)
		if (lyrics) {
			body.lyrics = lyrics;
		}
		
		// Add reference audio if specified (optional)
		if (additionalOptions.audio_b64) {
			body.audio_b64 = additionalOptions.audio_b64;
		}

		// Add optional quality and duration parameters (v1.2.0+ chute)
		if (additionalOptions.music_duration !== undefined) {
			body.music_duration = additionalOptions.music_duration;
		}
		if (additionalOptions.cfg_strength !== undefined) {
			body.cfg_strength = additionalOptions.cfg_strength;
		}
		if (additionalOptions.steps !== undefined) {
			body.steps = additionalOptions.steps;
		}
		if (additionalOptions.seed !== undefined) {
			body.seed = additionalOptions.seed;
		}
		
		// ALWAYS disable chunked processing to avoid audio artifacts (buzzing)
		// Chunked VAE decoding introduces discontinuities at chunk boundaries
		body.chunked = false;
		
		// Use WAV format to avoid MP3 compression artifacts
		body.file_type = "wav";

		// Request binary audio data
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				'/generate', // Music chutes use /generate endpoint (same as image)
				body,
				{},
				{},
				{
					// Request binary response for audio data
					encoding: null,
					json: false,
				},
				'musicGeneration',
				chuteUrl,
			),
			timeout,
			this,
			itemIndex,
			'Music generation',
		);

		// Check if response is binary (Buffer)
		if (Buffer.isBuffer(response)) {
			// Binary audio data - return with metadata
			return {
				binaryData: response,
				mimeType: 'audio/wav', // WAV format for better quality (no compression artifacts)
				fileName: `generated-music-${Date.now()}.wav`,
			};
		}

		// Otherwise return as JSON (e.g., if API returns URL)
		return response as any;
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for music generation`,
		{ itemIndex },
	);
}

/**
 * Handle Embeddings
 * Generates text embeddings for semantic search
 */
async function handleEmbeddings(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://embeddings.chutes.ai') as string;
	const text = this.getNodeParameter('text', itemIndex) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	if (operation === 'generate') {
		// Build request body for embeddings
		// API expects: { input: string | string[], model: null } for chute URLs
		const body: IDataObject = {
			input: text,
			model: null, // Chutes API requirement for chute URLs
		};

		// Add encoding format if specified
		if (additionalOptions.encodingFormat) {
			body.encoding_format = additionalOptions.encodingFormat;
		}

		// Make API request to embeddings endpoint
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				'/v1/embeddings', // Embeddings use OpenAI-compatible endpoint
				body,
				{},
				{},
				{},
				'embeddings',
				chuteUrl,
			),
			timeout,
			this,
			itemIndex,
			'Embeddings generation',
		);

		// Response format: { data: [{ embedding: [...], index: 0 }], usage: { prompt_tokens: X } }
		// Extract the embedding vector and usage info
		return response;
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for embeddings`,
		{ itemIndex },
	);
}

/**
 * Handle Content Moderation
 * Analyzes content for moderation (text or images)
 * Supports both nsfw-classifier and hate-speech-detector chutes
 */
async function handleContentModeration(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://chutes-nsfw-classifier.chutes.ai') as string;
	const content = this.getNodeParameter('content', itemIndex, '') as string;
	const imageParam = this.getNodeParameter('image', itemIndex, '') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	if (operation === 'analyze') {
		// Detect chute type by URL
		const isHateSpeechDetector = chuteUrl.includes('hate-speech-detector');
		
		// SPECIAL CASE: hate-speech-detector uses different API
		if (isHateSpeechDetector) {
			// hate-speech-detector only supports text, not images
			if (!content) {
				throw new NodeOperationError(
					this.getNode(),
					'Text content is required for hate-speech-detector (image moderation not supported by this chute)',
					{ itemIndex },
				);
			}
			
			console.log(`[ContentModeration] Using hate-speech-detector format: /predict with {texts: [...]}`);
			
			// hate-speech-detector expects batch format: {texts: ["..."]}
			const timeout = additionalOptions.timeout as number | undefined;
			const response = await withTimeout(
				chutesApiRequestWithRetry.call(
					this,
					'POST',
					'/predict',  // Different endpoint!
					{ texts: [content] },  // Batch format (array)!
					{},
					{},
					{},
					'contentModeration',
					chuteUrl,
				),
				timeout,
				this,
				itemIndex,
				'Content moderation (hate speech)',
			);
			
			// Response is array: [{label: "...", score: ...}]
			// Return first item for single-text input
			if (Array.isArray(response) && response.length > 0) {
				return response[0];
			}
			
			return response;
		}
		
		// DEFAULT: nsfw-classifier or compatible chutes
		// Uses /text or /image endpoints with flat parameters
		let endpoint = '';
		const body: IDataObject = {};

		// Priority 1: Try binary data first (for image moderation)
		const binaryData = this.getInputData()[itemIndex].binary;
		if (binaryData && binaryData.data) {
			try {
				const imageBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, 'data');
				const imageBase64 = imageBuffer.toString('base64');
				// Use /image endpoint with image_b64 parameter (flat, raw base64)
				endpoint = '/image';
				body.image_b64 = imageBase64;
			} catch (error) {
				console.warn('Failed to get binary image data:', error);
			}
		}

		// Priority 2: If no binary data, check image parameter
		if (!endpoint && imageParam) {
			if (imageParam.startsWith('http://') || imageParam.startsWith('https://')) {
				// Download image from URL
				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: imageParam,
						encoding: null,
					});
					const imageBuffer = Buffer.from(response);
					const imageBase64 = imageBuffer.toString('base64');
					// Use /image endpoint with image_b64 parameter (flat, raw base64)
					endpoint = '/image';
					body.image_b64 = imageBase64;
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to download image: ${(error as Error).message}`,
						{ itemIndex },
					);
				}
			} else if (imageParam.startsWith('data:')) {
				// Data URL format - extract base64 part
				const matches = imageParam.match(/^data:[^;]+;base64,(.+)$/);
				if (matches) {
					endpoint = '/image';
					body.image_b64 = matches[1];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid data URL format',
						{ itemIndex },
					);
				}
			} else {
				// Assume it's already base64
				endpoint = '/image';
				body.image_b64 = imageParam;
			}
		}

		// Priority 3: If no image, use text content
		if (!endpoint) {
			if (content) {
				// Use /text endpoint with text parameter (flat)
				endpoint = '/text';
				body.text = content;
			} else {
				throw new NodeOperationError(
					this.getNode(),
					'Either content (text) or image must be provided for moderation',
					{ itemIndex },
				);
			}
		}

		console.log(`[ContentModeration] Using nsfw-classifier format: ${endpoint}, body keys: ${Object.keys(body).join(', ')}`);

		// Make API request with correct endpoint
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				endpoint, // /image or /text based on content type
				body,
				{},
				{},
				{},
				'contentModeration',
				chuteUrl,
			),
			timeout,
			this,
			itemIndex,
			'Content moderation',
		);

		return response;
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for content moderation`,
		{ itemIndex },
	);
}

async function handleVideoGeneration(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject | { binaryData: Buffer; mimeType: string; fileName: string }> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex, 'https://video.chutes.ai') as string;
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	// Get API credentials for OpenAPI discovery
	const credentials = await this.getCredentials('chutesApi');
	const apiKey = credentials.apiKey as string;

	// Dynamically discover chute capabilities via OpenAPI schema
	const { discoverChuteCapabilities, buildRequestBody } = await import('./transport/openApiDiscovery');
	console.log(`[VideoGen] Discovering capabilities for: ${chuteUrl}`);
	const capabilities = await discoverChuteCapabilities(chuteUrl, apiKey);
	console.log(`[VideoGen] Discovered endpoints:`, capabilities.endpoints.map(e => e.path));
	console.log(`[VideoGen] Supports T2V: ${capabilities.supportsTextToVideo}, I2V: ${capabilities.supportsImageToVideo}`);

	// Prepare user inputs
	const userInputs: IDataObject = {
		prompt,
	};

	// Add common optional parameters
	if (additionalOptions.resolution) {
		userInputs.resolution = additionalOptions.resolution;
	}
	if (additionalOptions.steps) {
		userInputs.steps = additionalOptions.steps;
	}
	if (additionalOptions.seed !== undefined) {
		userInputs.seed = additionalOptions.seed;
	}

	// ✅ Calculate frames from duration and fps
	const duration = additionalOptions.duration !== undefined 
		? Number(additionalOptions.duration) 
		: 5; // Default 5 seconds
	
	const fps = additionalOptions.fps !== undefined 
		? Number(additionalOptions.fps) 
		: 24; // Default 24 fps
	
	let frames = Math.round(duration * fps); // Calculate frames
	
	// LTX-2 requires frames to follow formula: num_frames = 8n + 1
	// Valid values: 9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105, 113, 121, etc.
	if (chuteUrl.toLowerCase().includes('ltx')) {
		const n = Math.round((frames - 1) / 8);
		const roundedFrames = Math.max(9, 8 * n + 1); // Ensure minimum of 9 frames
		if (roundedFrames !== frames) {
			console.log(`[VideoGen] LTX-2 detected: Rounding frames ${frames} -> ${roundedFrames} (8×${n}+1)`);
			frames = roundedFrames;
		}
	}
	
	userInputs.frames = frames;
	userInputs.fps = fps;

	console.log(`[VideoGen] Duration: ${duration}s, FPS: ${fps}, Calculated Frames: ${frames}`);

	if (operation === 'text2video') {
		// Text-to-video generation
		// (frames and fps already calculated above)

		// Dynamically build request with discovered endpoint and parameters
		// Note: We attempt the operation even if detection is uncertain
		// The API will return proper error if operation is truly unsupported
		const requestConfig = buildRequestBody('text2video', capabilities, userInputs, chuteUrl);
		if (!requestConfig) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not find suitable endpoint for text-to-video generation',
				{ itemIndex },
			);
		}

		console.log(`[VideoGen T2V] Using endpoint: ${requestConfig.endpoint}`);
		console.log(`[VideoGen T2V] Request body keys:`, Object.keys(requestConfig.body));

		// Make API call with discovered endpoint
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				requestConfig.endpoint,
				requestConfig.body,
				{},
				{},
				{
					// Request binary response for video data
					encoding: null,
					json: false,
				},
				'videoGeneration',
				chuteUrl,
			),
			timeout,
			this,
			itemIndex,
			'Video generation (text-to-video)',
		);

		// Check if response is binary (Buffer)
		if (Buffer.isBuffer(response)) {
			// Binary video data - return with metadata
			return {
				binaryData: response,
				mimeType: 'video/mp4',
				fileName: `generated-video-${Date.now()}.mp4`,
			};
		}

		// Otherwise return as JSON (e.g., if API returns URL)
		return response;

	} else if (operation === 'image2video') {
		// Image-to-video generation
		const imageParam = this.getNodeParameter('image', itemIndex, '') as string;
		
		let imageBase64: string = '';
		
		// PRIORITY 1: Try to get image from binary data first (from previous node)
		const binaryData = this.getInputData()[itemIndex].binary;
		if (binaryData && binaryData.data) {
			// Image is coming from binary data in the workflow (e.g., HTTP Request, Read Binary File)
			try {
				const imageBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, 'data');
				imageBase64 = imageBuffer.toString('base64');
			} catch (error) {
				console.warn('Failed to get binary image data:', error);
				// Continue to try other methods
			}
		}
		
		// PRIORITY 2: If no binary data, check the image parameter
		if (!imageBase64 && imageParam) {
			if (imageParam.startsWith('http://') || imageParam.startsWith('https://')) {
				// Image is a URL - download it and convert to base64
				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: imageParam,
						encoding: null, // Get binary data
					});
					const imageBuffer = Buffer.from(response);
					imageBase64 = imageBuffer.toString('base64');
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to download image from URL: ${(error as Error).message}`,
						{ itemIndex },
					);
				}
			} else if (imageParam.startsWith('data:')) {
				// Data URL format (data:image/png;base64,...)
				const matches = imageParam.match(/^data:([^;]+);base64,(.+)$/);
				if (matches) {
					imageBase64 = matches[2];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid data URL format. Expected: data:image/TYPE;base64,BASE64_DATA',
						{ itemIndex },
					);
				}
			} else {
				// Assume it's already base64 encoded image
				imageBase64 = imageParam;
			}
		}

		// Validate we have image data
		if (!imageBase64) {
			throw new NodeOperationError(
				this.getNode(),
				'No image data found. Please connect a node with binary image data (HTTP Request, Read Binary File, etc.) or provide an image URL in the Input Image field.',
				{ itemIndex },
			);
		}

		// Add image to user inputs (will be mapped to correct parameter name)
		userInputs.image = imageBase64;

		// Dynamically build request with discovered endpoint and parameters
		// Note: We attempt the operation even if detection is uncertain
		// The API will return proper error if operation is truly unsupported
		const requestConfig = buildRequestBody('image2video', capabilities, userInputs, chuteUrl);
		if (!requestConfig) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not find suitable endpoint for image-to-video generation',
				{ itemIndex },
			);
		}

		console.log(`[VideoGen I2V] Using endpoint: ${requestConfig.endpoint}`);
		console.log(`[VideoGen I2V] Request body keys:`, Object.keys(requestConfig.body));

		// Make API call with discovered endpoint
		const timeout = additionalOptions.timeout as number | undefined;
		const response = await withTimeout(
			chutesApiRequestWithRetry.call(
				this,
				'POST',
				requestConfig.endpoint,
				requestConfig.body,
				{},
				{},
				{
					// Request binary response for video data
					encoding: null,
					json: false,
				},
				'videoGeneration',
				chuteUrl,
			),
			timeout,
			this,
			itemIndex,
			'Video generation (image-to-video)',
		);

		// Check if response is binary (Buffer)
		if (Buffer.isBuffer(response)) {
			// Binary video data - return with metadata
			return {
				binaryData: response,
				mimeType: 'video/mp4',
				fileName: `animated-video-${Date.now()}.mp4`,
			};
		}

		// Otherwise return as JSON (e.g., if API returns URL)
		return response;
	}

	throw new NodeOperationError(
		this.getNode(),
		`Operation "${operation}" not supported for video generation`,
		{ itemIndex },
	);
}
