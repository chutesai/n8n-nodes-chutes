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
			{
				name: 'Video to Video',
				value: 'video2video',
				description: 'Transform video using LoRA adapters (style transfer, effects)',
				action: 'Transform video with LoRA',
			},
			{
				name: 'Keyframe Interpolation',
				value: 'keyframe',
				description: 'Generate video by interpolating between keyframe images',
				action: 'Interpolate between keyframes',
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

	// Video input (for video2video only)
	{
		displayName: 'Input Video',
		name: 'video',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
				operation: ['video2video'],
			},
		},
		default: '',
		description: 'Input video for transformation. Can be a URL, data URL, base64 string, or use binary data from previous node.',
		placeholder: 'https://example.com/video.mp4 or leave empty to use binary data',
		hint: 'Connect a node with binary video data (HTTP Request, Read Binary File, etc.) or provide a video URL',
	},

	// Keyframe images (for keyframe operation)
	{
		displayName: 'Keyframe Images',
		name: 'keyframeImages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['videoGeneration'],
				operation: ['keyframe'],
			},
		},
		default: {},
		description: 'Keyframe images to interpolate between',
		options: [
			{
				name: 'images',
				displayName: 'Image',
				values: [
					{
						displayName: 'Image',
						name: 'image',
						type: 'string',
						default: '',
						description: 'Image URL, base64 string, or binary data',
						placeholder: 'https://example.com/image.jpg',
					},
					{
						displayName: 'Frame Index',
						name: 'frameIndex',
						type: 'number',
						default: 0,
						description: 'Frame position for this keyframe (0 = first frame)',
						placeholder: '0',
					},
					{
						displayName: 'Strength',
						name: 'strength',
						type: 'number',
						default: 1.0,
						description: 'Influence strength of this keyframe (0.0 to 1.0)',
						placeholder: '1.0',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
					},
				],
			},
		],
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
				displayName: 'Guidance Scale',
				name: 'guidance_scale',
				type: 'number',
				default: 3.0,
				description: 'Classifier-free guidance scale (higher = more adherence to prompt)',
				placeholder: '3.0',
				typeOptions: {
					minValue: 0,
					maxValue: 20,
					numberPrecision: 1,
				},
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
				displayName: 'Image Strength',
				name: 'image_strength',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['videoGeneration'],
						operation: ['image2video'],
					},
				},
				default: 1.0,
				description: 'How much the input image influences the output (0.0 to 1.0). Higher = more faithful to input image.',
				placeholder: '1.0',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'Image Frame Index',
				name: 'image_frame_index',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['videoGeneration'],
						operation: ['image2video'],
					},
				},
				default: 0,
				description: 'Frame position for the input image in the output video (0 = first frame)',
				placeholder: '0',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				default: '',
				description: 'What to avoid in the generated video',
				placeholder: 'blurry, low quality, distorted',
			},
			{
				displayName: 'Pipeline Type',
				name: 'pipeline',
				type: 'options',
				options: [
					{
						name: 'Auto (Recommended)',
						value: '',
						description: 'Automatically select best pipeline',
					},
					{
						name: 'Two Stage (Best Quality)',
						value: 'two_stage',
						description: 'Highest quality, slower generation',
					},
					{
						name: 'Distilled (Fastest)',
						value: 'distilled',
						description: 'Fastest generation, good quality',
					},
					{
						name: 'IC-LoRA (Video-to-Video)',
						value: 'ic_lora',
						description: 'For video transformation with LoRA',
					},
					{
						name: 'Keyframe Interpolation',
						value: 'keyframe_interp',
						description: 'For interpolating between keyframes',
					},
				],
				default: '',
				description: 'LTX-2 pipeline type to use',
			},
			{
				displayName: 'Enhance Prompt',
				name: 'enhancePrompt',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically enhance the prompt with LTX-2',
			},
			{
				displayName: 'LoRA Adapters',
				name: 'loras',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'LoRA adapters for style transfer and effects (LTX-2)',
				options: [
					{
						name: 'loraItems',
						displayName: 'LoRA',
						values: [
							{
								displayName: 'LoRA Name',
								name: 'name',
								type: 'options',
								options: [
									{
										name: 'Canny Control',
										value: 'canny-control',
										description: 'Edge detection control',
									},
									{
										name: 'Depth Control',
										value: 'depth-control',
										description: 'Depth map control',
									},
									{
										name: 'Pose Control',
										value: 'pose-control',
										description: 'Human pose control',
									},
									{
										name: 'Detailer',
										value: 'detailer',
										description: 'Enhance fine details',
									},
									{
										name: 'Camera Dolly In',
										value: 'camera-dolly-in',
										description: 'Camera moves forward',
									},
									{
										name: 'Camera Dolly Out',
										value: 'camera-dolly-out',
										description: 'Camera moves backward',
									},
									{
										name: 'Camera Dolly Left',
										value: 'camera-dolly-left',
										description: 'Camera moves left',
									},
									{
										name: 'Camera Dolly Right',
										value: 'camera-dolly-right',
										description: 'Camera moves right',
									},
									{
										name: 'Camera Jib Up',
										value: 'camera-jib-up',
										description: 'Camera moves up',
									},
									{
										name: 'Camera Jib Down',
										value: 'camera-jib-down',
										description: 'Camera moves down',
									},
									{
										name: 'Camera Static',
										value: 'camera-static',
										description: 'Static camera, no movement',
									},
								],
								default: 'canny-control',
								description: 'LoRA adapter to apply',
							},
							{
								displayName: 'Strength',
								name: 'strength',
								type: 'number',
								default: 1.0,
								description: 'LoRA influence strength (0.0 to 2.0)',
								typeOptions: {
									minValue: 0,
									maxValue: 2,
									numberPrecision: 2,
								},
							},
						],
					},
				],
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

