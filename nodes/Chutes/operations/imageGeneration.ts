import { INodeProperties } from 'n8n-workflow';

export const imageGenerationOperations: INodeProperties[] = [
	// Operation selector for Image Generation
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
			},
		},
	options: [
		{
			name: 'Generate',
			value: 'generate',
			description: 'Generate images from text prompts',
			action: 'Generate images',
		},
		{
			name: 'Edit',
			value: 'edit',
			description: 'Edit an existing image with a text prompt',
			action: 'Edit image',
		},
	],
		default: 'generate',
	},

	// Model selection removed - chute selection IS the model selection
	// Each chute URL (e.g., https://chutes-flux-1-dev.chutes.ai) specifies the model
	// Image chutes are always pre-configured for a specific model

	// Prompt for generate operation
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
				operation: ['generate'],
			},
		},
		default: '',
		description: 'Text description of the desired image',
		placeholder: 'A beautiful landscape with mountains and a lake at sunset',
	},

	// Image input for edit operation
	{
		displayName: 'Input Image',
		name: 'image',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
				operation: ['edit'],
			},
		},
		default: '',
		description: 'Image to edit. Can be a URL, base64 data URI, or binary data from previous node.',
		placeholder: 'https://example.com/image.png or data:image/png;base64,...',
		hint: 'Supports: URL, base64 data URI (data:image/png;base64,...), or binary data from previous node',
	},

	// Prompt for edit operation
	{
		displayName: 'Edit Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
				operation: ['edit'],
			},
		},
		default: '',
		description: 'Text description of the changes you want to make to the image',
		placeholder: 'Add a red hat, remove the background, make it brighter',
	},

	// Size
	{
		displayName: 'Size',
		name: 'size',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
				operation: ['generate', 'edit'],
			},
		},
		options: [
			{ name: '256x256', value: '256x256' },
			{ name: '512x512', value: '512x512' },
			{ name: '1024x1024', value: '1024x1024' },
			{ name: '1024x1792', value: '1024x1792' },
			{ name: '1792x1024', value: '1792x1024' },
		],
		default: '1024x1024',
		description: 'Size of the output image',
	},

	// Number of images
	{
		displayName: 'Number of Images',
		name: 'n',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
				operation: ['generate', 'edit'],
			},
		},
		default: 1,
		description: 'Number of images to generate/edit',
		hint: 'Chutes.ai generates one image per API request. If you select more than 1, multiple sequential requests will be made. Each image will be returned as a separate item.',
	},

	// Additional Options for Image Generation
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['imageGeneration'],
			},
		},
		options: [
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: [
					{ name: 'Standard', value: 'standard' },
					{ name: 'HD', value: 'hd' },
				],
				default: 'standard',
				description: 'Quality of the generated image',
			},
			{
				displayName: 'Style',
				name: 'style',
				type: 'options',
				options: [
					{ name: 'Natural', value: 'natural' },
					{ name: 'Vivid', value: 'vivid' },
				],
				default: 'natural',
				description: 'Style preset for generation',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: undefined,
				description: 'Seed for reproducible generation',
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				description: 'What to avoid in the image',
				placeholder: 'blurry, low quality, distorted',
			},
			{
				displayName: 'Guidance Scale',
				name: 'guidanceScale',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 20,
					numberStepSize: 0.5,
				},
				default: 7.5,
				description: 'How closely to follow the prompt (higher = more strict)',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{ name: 'URL', value: 'url' },
					{ name: 'Base64', value: 'b64_json' },
				],
				default: 'url',
				description: 'Format of the returned image',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for image generation (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '300',
				hint: 'Recommended: 300 seconds (5 minutes) for complex images. Leave empty if generation needs more time.',
			},
			{
				displayName: 'Additional Images',
				name: 'additionalImages',
				type: 'fixedCollection',
				placeholder: 'Add Image',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'Additional images for multi-image editing (e.g., composition tasks like "place person A next to object B"). Some models support 2-3 images. Only used for Edit operation. Leave image source empty to auto-use binary data from merged input items.',
				options: [
					{
						displayName: 'Images',
						name: 'images',
						values: [
							{
								displayName: 'Image Source',
								name: 'source',
								type: 'string',
								default: '',
								description: 'Binary property name (e.g., "background", "person"), URL, or leave empty to use binary.data from the next input item in sequence',
								placeholder: 'e.g., background or https://example.com/image.png',
								hint: 'Leave empty to auto-use binary data from merged input items (e.g., item 1 uses binary.data from input item 1)',
							},
						],
					},
				],
			},
		],
	},
];

