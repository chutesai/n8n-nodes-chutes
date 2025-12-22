import { INodeProperties } from 'n8n-workflow';

export const musicGenerationOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['musicGeneration'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate music from text prompt',
				action: 'Generate music',
			},
		],
		default: 'generate',
	},

	// Style Prompt
	{
		displayName: 'Style Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['musicGeneration'],
			},
		},
		default: '',
		description: 'Describe the musical style, genre, instruments, mood, and tempo',
		placeholder: 'Upbeat electronic dance music with heavy bass, synthesizers, energetic',
		hint: 'Examples: "jazz ballad, piano and saxophone, slow tempo, romantic" or "rock anthem, electric guitars, powerful drums"',
	},

	// Lyrics (always visible, not in Additional Options)
	{
		displayName: 'Lyrics',
		name: 'lyrics',
		type: 'string',
		typeOptions: {
			rows: 6,
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['musicGeneration'],
			},
		},
		default: '',
		description: 'Song lyrics in LRC format with timestamps ([MM:SS.ms]lyric text). Some models like DiffRhythm REQUIRE LRC timestamps for lyrics to appear. Leave empty for instrumental music.',
		placeholder: '[00:00.00]Verse 1: First line of lyrics\n[00:05.50]Second line continues\n[00:10.00]Chorus: Main hook here',
		hint: '⚠️ LRC timestamp format REQUIRED: [MM:SS.ms]Lyric text. Learn format: https://en.wikipedia.org/wiki/LRC_(file_format) 💡 TIP: Use an LLM node (like Deepseek/Qwen) before this node to automatically add timestamps to plain lyrics. Ensure total lyrics duration matches your chosen song length.',
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
				resource: ['musicGeneration'],
			},
		},
		options: [
			{
				displayName: 'Music Duration (seconds)',
				name: 'music_duration',
				type: 'number',
				default: 60,
				description: 'Song duration in seconds (15-285). Default: 60s (1 minute)',
				hint: 'Shorter durations generate faster. Ensure lyrics match the duration. Range: 15-285 seconds.',
			},
			{
				displayName: 'CFG Strength',
				name: 'cfg_strength',
				type: 'number',
				default: 7.0,
				description: 'How closely to follow the style prompt (1-20). Higher = more faithful to prompt.',
				hint: 'Recommended: 7.0 for balanced results. Lower for more creativity, higher for strict adherence.',
			},
			{
				displayName: 'Quality Steps',
				name: 'steps',
				type: 'number',
				default: 50,
				description: 'Number of generation steps (20-200). More steps = higher quality but slower.',
				hint: 'Recommended: 50 for good quality. Increase to 100+ for best quality.',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: undefined,
				description: 'Random seed for reproducible results. Leave empty for random generation.',
				placeholder: '42',
			},
			{
				displayName: 'Reference Audio (Base64)',
				name: 'audio_b64',
				type: 'string',
				default: '',
				description: 'Base64-encoded reference audio to match the style. Either provide a Style Prompt OR Reference Audio.',
				placeholder: 'data:audio/wav;base64,...',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for music generation (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '300',
				hint: 'Recommended: 300 seconds (5 minutes) for music generation. Leave empty if generation needs more time.',
			},
		],
	},
];

