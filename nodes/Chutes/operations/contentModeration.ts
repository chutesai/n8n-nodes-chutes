import { INodeProperties } from 'n8n-workflow';

export const contentModerationOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contentModeration'],
			},
		},
		options: [
			{
				name: 'Analyze',
				value: 'analyze',
				description: 'Analyze content for moderation',
				action: 'Analyze content',
			},
		],
		default: 'analyze',
	},

	// Content Input (text)
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['contentModeration'],
			},
		},
		default: '',
		description: 'Text content to analyze for moderation. Provide either Content (text) OR Image, not both.',
		placeholder: 'Text content to moderate',
	},

	// Image Input
	{
		displayName: 'Image',
		name: 'image',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				resource: ['contentModeration'],
			},
		},
		default: '',
		description: 'Image to analyze for moderation. Can be a URL, base64 data URI, or binary data from previous node. Provide either Content (text) OR Image, not both.',
		placeholder: 'https://example.com/image.jpg or leave empty to use binary data',
		hint: 'Supports: URL, base64 data URI (data:image/png;base64,...), or binary data from previous node',
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
				resource: ['contentModeration'],
			},
		},
		options: [
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'string',
				default: '',
				description: 'Specific categories to check (comma-separated)',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for content analysis (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '30',
				hint: 'Recommended: 30 seconds for moderation. Leave empty if analysis needs more time.',
			},
		],
	},
];

