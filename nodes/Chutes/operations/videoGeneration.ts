import { INodeProperties } from 'n8n-workflow';

export const videoGenerationOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
			},
		},
		options: [
			{
				name: 'Text to Video',
				value: 'text2video',
				description: 'Generate video from text prompt',
				action: 'Generate video from text',
			},
			{
				name: 'Image to Video',
				value: 'image2video',
				description: 'Animate an image into a video',
				action: 'Animate image to video',
			},
		],
		default: 'text2video',
	},

	// Prompt (for both operations)
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
				resource: ['videoGeneration'],
			},
		},
		default: '',
		description: 'Text description of the desired video or animation',
		placeholder: 'A serene ocean sunset with waves crashing',
	},

	// Image input (for image2video only)
	{
		displayName: 'Input Image',
		name: 'image',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
				operation: ['image2video'],
			},
		},
		default: '',
		description: 'Input image for animation. Can be a URL, data URL, base64 string, or use binary data from previous node.',
		placeholder: 'https://example.com/image.jpg or leave empty to use binary data',
		hint: 'Connect a node with binary image data (HTTP Request, Read Binary File, etc.) or provide an image URL',
	},

	// Additional Options
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
			},
		},
		options: [
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'string',
				default: '1280*720',
				description: 'Video resolution in format "width*height" (e.g., "1280*720", "1920*1080")',
				placeholder: '1280*720',
			},
			{
				displayName: 'Steps',
				name: 'steps',
				type: 'number',
				default: 25,
				description: 'Number of denoising steps (higher = better quality but slower)',
			},
			{
				displayName: 'Duration (seconds)',
				name: 'duration',
				type: 'number',
				default: 5,
				description: 'Video duration in seconds. Will be converted to frames based on FPS (duration × fps = frames)',
				placeholder: '5',
				hint: 'Example: 5 seconds at 24 fps = 120 frames',
			},
			{
				displayName: 'FPS (Frames Per Second)',
				name: 'fps',
				type: 'number',
				default: 24,
				description: 'Frame rate for the output video. Higher values create smoother motion but require more processing.',
				placeholder: '24',
				hint: 'Common values: 24 (cinematic), 30 (standard), 60 (smooth)',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: undefined,
				description: 'Random seed for reproducible results. Leave empty for random.',
				placeholder: '12345',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for video generation (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '600',
				hint: 'Recommended: 600 seconds (10 minutes) for video generation. Leave empty if generation needs more time.',
			},
		],
	},
];

