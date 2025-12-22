import { INodeProperties } from 'n8n-workflow';

export const textGenerationOperations: INodeProperties[] = [
	// Operation selector for Text Generation
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['textGeneration'],
			},
		},
		options: [
			{
				name: 'Complete',
				value: 'complete',
				description: 'Generate text completion from a prompt',
				action: 'Generate text completion',
			},
			{
				name: 'Chat',
				value: 'chat',
				description: 'Have a conversation with chat messages',
				action: 'Generate chat completion',
			},
		],
		default: 'complete',
	},

	// Model selection removed - chute selection IS the model selection
	// Each chute URL (e.g., https://chutes-deepseek-v3.chutes.ai) specifies the model
	// No need for additional model parameter

	// Prompt for 'complete' operation
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
				resource: ['textGeneration'],
				operation: ['complete'],
			},
		},
		default: '',
		description: 'The prompt to generate text from',
		placeholder: 'Write a story about a robot discovering emotions...',
	},

	// Messages for 'chat' operation
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		displayOptions: {
			show: {
				resource: ['textGeneration'],
				operation: ['chat'],
			},
		},
		description: 'The messages for the chat conversation',
		default: {},
		options: [
			{
				displayName: 'Message',
				name: 'messageValues',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
							{ name: 'Assistant', value: 'assistant' },
						],
						default: 'user',
						description: 'The role of the message sender',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'The content of the message',
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
				resource: ['textGeneration'],
			},
		},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberStepSize: 0.1,
				},
				default: 0.7,
				description: 'Controls randomness: 0 is focused, 2 is very random',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100000,
				},
				default: 1000,
				description: 'Maximum number of tokens to generate',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberStepSize: 0.01,
				},
				default: 1,
				description: 'Nucleus sampling: only consider tokens with top_p probability mass',
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberStepSize: 0.1,
				},
				default: 0,
				description: 'Reduce repetition of token frequencies',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberStepSize: 0.1,
				},
				default: 0,
				description: 'Reduce repetition of any tokens',
			},
			{
				displayName: 'Stop Sequences',
				name: 'stopSequences',
				type: 'string',
				default: '',
				description: 'Sequences where the API will stop generating (comma-separated)',
				placeholder: '\\n\\n, END, STOP',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'JSON', value: 'json_object' },
				],
				default: 'text',
				description: 'Format of the response',
			},
			{
				displayName: 'Stream',
				name: 'stream',
				type: 'boolean',
				default: false,
				description: 'Whether to stream the response in real-time',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: undefined,
				description: 'Seed for deterministic generation',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for response (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '300',
				hint: 'Recommended: 300 seconds (5 minutes) for long generations. Leave empty if chute needs more time.',
			},
		],
	},
];

