import { INodeProperties } from 'n8n-workflow';

export const speechToTextOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['speechToText'],
			},
		},
		options: [
			{
				name: 'Transcribe',
				value: 'transcribe',
				description: 'Transcribe audio to text',
				action: 'Transcribe audio',
			},
		],
		default: 'transcribe',
	},

	// Audio Input - Automatically uses binary data from previous node
	{
		displayName: 'Audio',
		name: 'audio',
		type: 'string',
		required: false, // Not required if binary data is present
		displayOptions: {
			show: {
				resource: ['speechToText'],
			},
		},
		default: '',
		description: 'Leave empty to use binary audio from previous node, or provide an audio URL or base64 string',
		placeholder: 'https://example.com/audio.mp3 (or leave empty for binary data)',
		hint: '💡 Tip: Binary data from previous nodes (HTTP Request, Read Binary File, etc.) is automatically detected. Only fill this field if you want to override with a URL or base64 string.',
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
				resource: ['speechToText'],
			},
		},
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en',
				description: 'Audio language code (e.g., en, es, fr)',
			},
			{
				displayName: 'Include Chunks',
				name: 'includeChunks',
				type: 'boolean',
				default: false,
				description: 'Whether to include timestamped chunks in the output. When enabled, returns both continuous text and individual chunks with timestamps. Useful for subtitles, word timing, or segment analysis.',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for transcription (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '180',
				hint: 'Recommended: 180 seconds (3 minutes) for long audio files. Leave empty if transcription needs more time.',
			},
		],
	},
];

