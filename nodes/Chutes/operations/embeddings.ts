import { INodeProperties } from 'n8n-workflow';

export const embeddingsOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['embeddings'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate text embeddings',
				action: 'Generate embeddings',
			},
		],
		default: 'generate',
	},

	// Text Input
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['embeddings'],
			},
		},
		default: '',
		description: 'Text to generate embeddings for',
		placeholder: 'The quick brown fox jumps over the lazy dog',
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
				resource: ['embeddings'],
			},
		},
		options: [
			{
				displayName: 'Normalize',
				name: 'normalize',
				type: 'boolean',
				default: true,
				description: 'Whether to normalize the embedding vector',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for embedding generation (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '30',
				hint: 'Recommended: 30 seconds for embeddings. Leave empty if generation needs more time.',
			},
		],
	},
];

