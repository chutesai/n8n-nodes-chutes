/**
 * OpenAPI Discovery Module
 * 
 * Dynamically discovers chute capabilities by fetching and parsing OpenAPI schemas.
 * This allows the video generation node to work with ANY chute without hardcoding.
 */

import { IDataObject } from 'n8n-workflow';

// Cache schema responses (1 hour TTL)
const schemaCache = new Map<string, { schema: IDataObject; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export interface ChuteEndpoint {
	path: string;
	method: string;
	parameters: Array<{
		name: string;
		required: boolean;
		type: string;
	}>;
}

export interface ChuteCapabilities {
	endpoints: ChuteEndpoint[];
	supportsTextToVideo: boolean;
	supportsImageToVideo: boolean;
	supportsImageEdit: boolean;
	textToVideoPath?: string;
	imageToVideoPath?: string;
	imageEditPath?: string;
	supportsVideoToVideo: boolean;
	supportsKeyframeInterp: boolean;
	videoToVideoPath?: string;
	keyframeInterpPath?: string;
}

/**
 * Discover capabilities of a chute by fetching and parsing its OpenAPI schema
 */
export async function discoverChuteCapabilities(
	chuteBaseUrl: string,
	apiKey: string,
): Promise<ChuteCapabilities> {
	let schema: IDataObject | undefined;

	// Check cache first
	const cached = schemaCache.get(chuteBaseUrl);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		schema = cached.schema;
	} else {
		// Fetch schema from chute
		console.log(`[OpenAPI] Fetching schema from: ${chuteBaseUrl}/openapi.json`);
		try {
			const response = await fetch(`${chuteBaseUrl}/openapi.json`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			console.log(`[OpenAPI] Fetch response status: ${response.status}`);
			if (response.ok) {
				schema = (await response.json()) as IDataObject;
				schemaCache.set(chuteBaseUrl, { schema, timestamp: Date.now() });
				console.log(`[OpenAPI] Successfully parsed schema with paths:`, schema.paths ? Object.keys(schema.paths as IDataObject) : 'NO PATHS');
			} else {
				console.warn(`Failed to fetch OpenAPI schema from ${chuteBaseUrl}: ${response.status}`);
			}
		} catch (error) {
			console.warn(`Error fetching OpenAPI schema from ${chuteBaseUrl}: ${(error as Error).message}`);
		}
	}

	// Initialize capabilities
	const capabilities: ChuteCapabilities = {
		endpoints: [],
		supportsTextToVideo: false,
		supportsImageToVideo: false,
		supportsImageEdit: false,
		supportsVideoToVideo: false,
		supportsKeyframeInterp: false,
	};

	// Parse schema if available
	if (schema && schema.paths) {
		const paths = schema.paths as IDataObject;
		const pathKeys = Object.keys(paths);
		console.log(`[OpenAPI] Found ${pathKeys.length} paths in schema:`, pathKeys);

		// Check for broken/placeholder schemas
		const hasBrokenSchema = pathKeys.some(p => p.includes('{path}') || p === '{path}' || p.startsWith('{'));
		if (hasBrokenSchema) {
			console.warn(`[OpenAPI] Detected broken/placeholder schema with path: ${pathKeys.join(', ')} - will use fallback`);
			// Don't process this broken schema, fall through to fallback logic
		} else {
			for (const path in paths) {
				const pathItem = paths[path] as IDataObject;
				console.log(`[OpenAPI] Processing path: ${path}`);

			for (const method in pathItem) {
				if (!['post', 'put'].includes(method.toLowerCase())) {
					continue;
				}

				const operation = pathItem[method] as IDataObject;
				const parameters: Array<{ name: string; required: boolean; type: string }> = [];

				// Extract parameters from requestBody
				if (operation.requestBody) {
					const requestBody = operation.requestBody as IDataObject;
					const content = requestBody.content as IDataObject;

					if (content && content['application/json']) {
						const jsonContent = content['application/json'] as IDataObject;
						const schemaObj = jsonContent.schema as IDataObject;

						if (schemaObj && schemaObj.properties) {
							const properties = schemaObj.properties as IDataObject;
							const required = (schemaObj.required || []) as string[];

							for (const paramName in properties) {
								const paramSchema = properties[paramName] as IDataObject;
								
								// Special case: Unwrap "input_args" object to get nested parameters
								// Chutes.ai format: { input_args: { prompt: ..., image_b64s: [...], ... } }
								if (paramName === 'input_args' && paramSchema.type === 'object' && paramSchema.properties) {
									const nestedProps = paramSchema.properties as IDataObject;
									const nestedRequired = (paramSchema.required || []) as string[];
									console.log(`[OpenAPI] Unwrapping input_args, found nested params:`, Object.keys(nestedProps));
									
									for (const nestedName in nestedProps) {
										const nestedSchema = nestedProps[nestedName] as IDataObject;
										parameters.push({
											name: nestedName,
											required: nestedRequired.includes(nestedName),
											type: (nestedSchema.type as string) || 'string',
										});
									}
								} else {
									// Regular top-level parameter
									parameters.push({
										name: paramName,
										required: required.includes(paramName),
										type: (paramSchema.type as string) || 'string',
									});
								}
							}
						}
					}
				}

				capabilities.endpoints.push({
					path,
					method: method.toUpperCase(),
					parameters,
				});

				// Detect capabilities based on path and parameters
				const hasPrompt = parameters.some((p) => p.name === 'prompt' || p.name === 'text');
				const hasImage = parameters.some(
					(p) => p.name === 'image' || p.name === 'image_b64' || p.name === 'image_url',
				);

				console.log(`[OpenAPI] Path ${path}: hasPrompt=${hasPrompt}, hasImage=${hasImage}, params=${parameters.map(p => p.name).join(', ')}`);

				if (path === '/text2video' || (hasPrompt && !hasImage)) {
					console.log(`[OpenAPI] Detected TEXT-TO-VIDEO support at ${path}`);
					capabilities.supportsTextToVideo = true;
					capabilities.textToVideoPath = path;
				}

				if (path === '/image2video' || (hasPrompt && hasImage)) {
					console.log(`[OpenAPI] Detected IMAGE-TO-VIDEO support at ${path}`);
					capabilities.supportsImageToVideo = true;
					capabilities.imageToVideoPath = path;
				}

				// Detect image editing support
			// Check for explicit edit endpoints or /generate with image_b64s array (Qwen pattern)
			const hasImageArray = parameters.some((p) => p.name === 'image_b64s' && p.type === 'array');
			if (path === '/edit' || path === '/v1/images/edits' ||
				(path.includes('edit') && hasPrompt && hasImage) ||
				(path === '/generate' && hasPrompt && hasImageArray)) {
				console.log(`[OpenAPI] Detected IMAGE-EDIT support at ${path}`);
				capabilities.supportsImageEdit = true;
				capabilities.imageEditPath = path;
			}
			}
		}
		}
	}

	// Fallback: assume common endpoints if no schema or empty OR if schema doesn't have inference endpoints
	// Check if we have any inference endpoints (video/image generation)
	const hasInferenceEndpoints = capabilities.endpoints.some(e => 
		e.path === '/generate' || 
		e.path === '/text2video' || 
		e.path === '/image2video' ||
		e.path === '/edit' ||
		e.path.startsWith('/v1/')
	);
	
	if (capabilities.endpoints.length === 0 || !hasInferenceEndpoints) {
		console.log(`[OpenAPI] No inference endpoints found, adding fallback endpoints`);
		capabilities.endpoints.push(
			{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'image', required: false, type: 'string' },
					{ name: 'image_b64', required: false, type: 'string' },
					{ name: 'image_url', required: false, type: 'string' },
					{ name: 'video_b64', required: false, type: 'string' },
					{ name: 'video_url', required: false, type: 'string' },
					{ name: 'image_b64s', required: false, type: 'array' },
					{ name: 'width', required: false, type: 'integer' },
					{ name: 'height', required: false, type: 'integer' },
					{ name: 'num_frames', required: false, type: 'integer' },
					{ name: 'frame_rate', required: false, type: 'integer' },
					{ name: 'negative_prompt', required: false, type: 'string' },
					{ name: 'num_inference_steps', required: false, type: 'integer' },
					{ name: 'cfg_guidance_scale', required: false, type: 'number' },
					{ name: 'true_cfg_scale', required: false, type: 'number' },
					{ name: 'seed', required: false, type: 'integer' },
					{ name: 'distilled', required: false, type: 'boolean' },
				],
			},
			{
				path: '/text2video',
				method: 'POST',
				parameters: [{ name: 'prompt', required: true, type: 'string' }],
			},
			{
				path: '/image2video',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'image_b64', required: true, type: 'string' },
				],
			},
		);
		
		// Mark image edit support since we added /generate with image_b64s
		capabilities.supportsImageEdit = true;
		capabilities.imageEditPath = '/generate';
	}
	
	// ALWAYS assume support if we couldn't determine for certain
	// Better to let the API return 404 than block the user
	if (!capabilities.supportsTextToVideo && !capabilities.supportsImageToVideo) {
		capabilities.supportsTextToVideo = true;
		capabilities.supportsImageToVideo = true;
	}
	
	// Set default paths if not detected
	// Modern chutes use /generate for both T2V and I2V
	// Older chutes use specific /text2video and /image2video endpoints
	if (!capabilities.textToVideoPath) {
		capabilities.textToVideoPath = '/generate';
	}
	if (!capabilities.imageToVideoPath) {
		// Default to /generate for I2V (Wan-2.2-I2V pattern)
		capabilities.imageToVideoPath = '/generate';
	}
	if (!capabilities.imageEditPath) {
		// Default to /edit for image editing
		capabilities.imageEditPath = '/edit';
	}

	return capabilities;
}

/**
 * Build request body dynamically based on discovered capabilities and user inputs
 */
export function buildRequestBody(
	operation: string,
	capabilities: ChuteCapabilities,
	userInputs: IDataObject,
): { endpoint: string; body: IDataObject } | null {
	let targetEndpoint: ChuteEndpoint | undefined;

	// Find appropriate endpoint based on operation
	if (operation === 'text2video') {
		if (capabilities.textToVideoPath) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === capabilities.textToVideoPath);
		}
		// Fallback to /generate if no specific text2video path
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find(
				(e) =>
					e.path === '/generate' &&
					e.parameters.some((p) => p.name === 'prompt' || p.name === 'text') &&
					!e.parameters.some((p) => p.name === 'image' || p.name === 'image_b64'),
			);
		}
		// Last resort: just use /generate
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === '/generate');
		}
	} else if (operation === 'image2video') {
		if (capabilities.imageToVideoPath) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === capabilities.imageToVideoPath);
		}
		// Fallback to /generate if no specific image2video path
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find(
				(e) =>
					e.path === '/generate' &&
					e.parameters.some((p) => p.name === 'image' || p.name === 'image_b64'),
			);
		}
		// Last resort: just use /generate
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === '/generate');
		}
	} else if (operation === 'edit' || operation === 'image_edit') {
		if (capabilities.imageEditPath) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === capabilities.imageEditPath);
		}
		// Fallback to common edit endpoints
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find((e) => 
				e.path === '/edit' || e.path === '/v1/images/edits'
			);
		}
		// Last resort: try /generate with image parameter
		if (!targetEndpoint) {
			targetEndpoint = capabilities.endpoints.find((e) => e.path === '/generate');
		}
	}

	// If still no endpoint found, use fallback
	// Modern chutes (like Wan-2.2-I2V) use /generate for I2V
	// Older chutes (like Wan2.1) use /text2video and /image2video
	// Image editing chutes typically use /edit or /v1/images/edits
	if (!targetEndpoint) {
		let fallbackPath = '/generate';
		if (operation === 'text2video') {
			fallbackPath = '/text2video';
		} else if (operation === 'edit' || operation === 'image_edit') {
			fallbackPath = '/edit';
		}
		console.log(`[OpenAPI] Using final fallback endpoint: ${fallbackPath} for operation: ${operation}`);
		// All Chutes.ai public APIs use flat parameters (proven by working direct API tests)
		return {
			endpoint: fallbackPath,
			body: { ...userInputs },  // Flat parameters, no wrapping
		};
	}

	// Build request body by mapping user inputs to discovered parameter names
	const requestBody: IDataObject = {};
	const endpointParams = new Map(targetEndpoint.parameters.map((p) => [p.name, p]));

	const modifiedInputs: IDataObject = { ...userInputs };
	
	// LTX-2: Convert resolution string to separate width/height integers
	// Format: "1280*720" -> { width: 1280, height: 720 }
	if (modifiedInputs.resolution && typeof modifiedInputs.resolution === 'string') {
		const hasWidthParam = endpointParams.has('width');
		const hasHeightParam = endpointParams.has('height');
		const hasResolutionParam = endpointParams.has('resolution');
		
		// Only convert if endpoint expects width/height but not resolution
		if ((hasWidthParam || hasHeightParam) && !hasResolutionParam) {
			const parts = String(modifiedInputs.resolution).split('*');
			if (parts.length === 2) {
				let width = parseInt(parts[0], 10);
				let height = parseInt(parts[1], 10);
				
				// LTX-2 requires dimensions divisible by 64
				// Round to nearest multiple of 64 when converting resolution to width/height
				// (Only applies when endpoint uses width/height params instead of resolution)
				width = Math.round(width / 64) * 64;
				height = Math.round(height / 64) * 64;
				console.log(`[OpenAPI] Rounded dimensions to multiples of 64: ${parts[0]}x${parts[1]} -> ${width}x${height}`);
				
				modifiedInputs.width = width;
				modifiedInputs.height = height;
				delete modifiedInputs.resolution;
				console.log(`[OpenAPI] Converted resolution "${userInputs.resolution}" to width=${width}, height=${height}`);
			}
		}
	}
	
	// Convert width/height to size format if endpoint expects "size" parameter
	// This is common for OpenAI-compatible endpoints like /v1/images/edits
	if (modifiedInputs.width && modifiedInputs.height) {
		// Check if endpoint expects "size" parameter
		if (endpointParams.has('size')) {
			// Convert to "WIDTHxHEIGHT" format (e.g., "1024x1024")
			modifiedInputs.size = `${modifiedInputs.width}x${modifiedInputs.height}`;
			console.log(`[OpenAPI] Converted width=${modifiedInputs.width}, height=${modifiedInputs.height} to size="${modifiedInputs.size}"`);
			
			// Remove width/height if endpoint doesn't expect them
			if (!endpointParams.has('width')) {
				delete modifiedInputs.width;
			}
			if (!endpointParams.has('height')) {
				delete modifiedInputs.height;
			}
		}
	}
	// Special handling: Convert singular image to image_b64s array ONLY for image edit operations
	// (e.g., Qwen Image Edit expects array of 1-3 images, but video wants singular 'image')
	const isImageEditOp = (operation === 'edit' || operation === 'image_edit');
	if (isImageEditOp && modifiedInputs.image && !modifiedInputs.image_b64s && endpointParams.has('image_b64s')) {
		modifiedInputs.image_b64s = [modifiedInputs.image];
		delete modifiedInputs.image;
		console.log(`[OpenAPI] Converted singular image to image_b64s array for image edit`);
	}

	// Map common parameter aliases
	const parameterMappings: Record<string, string[]> = {
		prompt: ['prompt', 'text', 'description'],
		image: ['image', 'image_b64', 'image_url', 'input_image'],
		image_b64s: ['image_b64s'], // ← NO ALIASES! Prevent reverting to 'image'
		resolution: ['resolution', 'size', 'dimensions'],
		steps: ['steps', 'num_inference_steps', 'sampling_steps'],
		fps: ['fps', 'frame_rate', 'frames_per_second'],
		frames: ['frames', 'num_frames', 'frame_num'],
		seed: ['seed', 'random_seed'],
		n: ['n', 'num_images', 'num_outputs'], // Number of images/outputs
		response_format: ['response_format', 'format', 'output_format'], // Response format (url, b64_json, etc.)
		guidance_scale: ['cfg_guidance_scale', 'guidance_scale', 'true_cfg_scale', 'cfg_scale'], // LTX-2 uses cfg_guidance_scale
		negative_prompt: ['negative_prompt', 'neg_prompt'], // Negative prompt aliases
	};

	for (const userKey in modifiedInputs) {
		let mapped = false;

		// Try direct mapping first
		if (endpointParams.has(userKey)) {
			requestBody[userKey] = modifiedInputs[userKey];
			mapped = true;
		} else {
			// Try alias mapping
			const aliases = parameterMappings[userKey];
			if (aliases) {
				for (const alias of aliases) {
					if (endpointParams.has(alias)) {
						requestBody[alias] = modifiedInputs[userKey];
						mapped = true;
						break;
					}
				}
			}
		}

		// If no mapping found, decide whether to include based on endpoint type
		if (!mapped) {
			// For OpenAI-compatible endpoints (strict schema), skip unmapped parameters
			// For custom Chutes endpoints (permissive), include them (best effort)
			const isOpenAICompatible = targetEndpoint.path.startsWith('/v1/');
			
			if (!isOpenAICompatible) {
				// Custom Chutes endpoint - include anyway (best effort)
				requestBody[userKey] = modifiedInputs[userKey];
			} else {
				// OpenAI-compatible endpoint - only include explicitly mapped parameters
				console.log(`[OpenAPI] Skipping unmapped parameter '${userKey}' for strict OpenAI endpoint ${targetEndpoint.path}`);
			}
		}
	}

	// ALL Chutes.ai public APIs use flat parameters
	// The Python internal schemas may show input_args wrapping, but the PUBLIC HTTP API
	// expects flat parameters directly (proven by working direct API tests)
	console.log(`[OpenAPI] Endpoint: ${targetEndpoint.path}, Body keys: ${Object.keys(requestBody).join(', ')}`);

	return {
		endpoint: targetEndpoint.path,
		body: requestBody,  // Flat parameters, no wrapping
	};
}

/**
 * Clear the schema cache (useful for testing or forcing refresh)
 */
export function clearSchemaCache(chuteBaseUrl?: string): void {
	if (chuteBaseUrl) {
		schemaCache.delete(chuteBaseUrl);
	} else {
		schemaCache.clear();
	}
}
