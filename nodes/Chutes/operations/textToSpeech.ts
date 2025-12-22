import { INodeProperties } from 'n8n-workflow';

export const textToSpeechOperations: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['textToSpeech'],
			},
		},
		options: [
			{
				name: 'Generate Speech',
				value: 'generate',
				description: 'Convert text to speech audio',
				action: 'Generate speech',
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
				resource: ['textToSpeech'],
			},
		},
		default: '',
		description: 'Text to convert to speech',
		placeholder: 'Hello, this is a text-to-speech conversion',
	},

	// Voice Selection - grouped by voice type with visual separators
	{
		displayName: 'Voice',
		name: 'voice',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['textToSpeech'],
			},
		},
		options: [
			{ name: 'Default', value: '', description: 'Use the chute\'s default voice' },
			{ name: 'Custom...', value: 'custom', description: 'Enter a custom voice name' },
			
			// 🇺🇸 American English: 11F 9M
			{ name: '─── 🇺🇸 American English (Female) ───', value: '_separator_af', description: 'American English female voices (11)' },
			{ name: 'af_alloy', value: 'af_alloy' },
			{ name: 'af_aoede', value: 'af_aoede' },
			{ name: 'af_bella', value: 'af_bella' },
			{ name: 'af_heart', value: 'af_heart' },
			{ name: 'af_jessica', value: 'af_jessica' },
			{ name: 'af_kore', value: 'af_kore' },
			{ name: 'af_nicole', value: 'af_nicole' },
			{ name: 'af_nova', value: 'af_nova' },
			{ name: 'af_river', value: 'af_river' },
			{ name: 'af_sarah', value: 'af_sarah' },
			{ name: 'af_sky', value: 'af_sky' },
			
			{ name: '─── 🇺🇸 American English (Male) ───', value: '_separator_am', description: 'American English male voices (9)' },
			{ name: 'am_adam', value: 'am_adam' },
			{ name: 'am_echo', value: 'am_echo' },
			{ name: 'am_eric', value: 'am_eric' },
			{ name: 'am_fenrir', value: 'am_fenrir' },
			{ name: 'am_liam', value: 'am_liam' },
			{ name: 'am_michael', value: 'am_michael' },
			{ name: 'am_onyx', value: 'am_onyx' },
			{ name: 'am_puck', value: 'am_puck' },
			{ name: 'am_santa', value: 'am_santa' },
			
			// 🇬🇧 British English: 4F 4M
			{ name: '─── 🇬🇧 British English (Female) ───', value: '_separator_bf', description: 'British English female voices (4)' },
			{ name: 'bf_alice', value: 'bf_alice' },
			{ name: 'bf_emma', value: 'bf_emma' },
			{ name: 'bf_isabella', value: 'bf_isabella' },
			{ name: 'bf_lily', value: 'bf_lily' },
			
			{ name: '─── 🇬🇧 British English (Male) ───', value: '_separator_bm', description: 'British English male voices (4)' },
			{ name: 'bm_daniel', value: 'bm_daniel' },
			{ name: 'bm_fable', value: 'bm_fable' },
			{ name: 'bm_george', value: 'bm_george' },
			{ name: 'bm_lewis', value: 'bm_lewis' },
			
			// 🇪🇸 Spanish: 1F 2M
			{ name: '─── 🇪🇸 Spanish (Female) ───', value: '_separator_ef', description: 'Spanish female voices (1)' },
			{ name: 'ef_dora', value: 'ef_dora' },
			
			{ name: '─── 🇪🇸 Spanish (Male) ───', value: '_separator_em', description: 'Spanish male voices (2)' },
			{ name: 'em_alex', value: 'em_alex' },
			{ name: 'em_santa', value: 'em_santa' },
			
			// 🇫🇷 French: 1F
			{ name: '─── 🇫🇷 French (Female) ───', value: '_separator_ff', description: 'French female voices (1)' },
			{ name: 'ff_siwis', value: 'ff_siwis' },
			
			// 🇮🇳 Hindi: 2F 2M
			{ name: '─── 🇮🇳 Hindi (Female) ───', value: '_separator_hf', description: 'Hindi female voices (2)' },
			{ name: 'hf_alpha', value: 'hf_alpha' },
			{ name: 'hf_beta', value: 'hf_beta' },
			
			{ name: '─── 🇮🇳 Hindi (Male) ───', value: '_separator_hm', description: 'Hindi male voices (2)' },
			{ name: 'hm_omega', value: 'hm_omega' },
			{ name: 'hm_psi', value: 'hm_psi' },
			
			// 🇮🇹 Italian: 1F 1M
			{ name: '─── 🇮🇹 Italian (Female) ───', value: '_separator_if', description: 'Italian female voices (1)' },
			{ name: 'if_sara', value: 'if_sara' },
			
			{ name: '─── 🇮🇹 Italian (Male) ───', value: '_separator_im', description: 'Italian male voices (1)' },
			{ name: 'im_nicola', value: 'im_nicola' },
			
			// 🇯🇵 Japanese: 4F 1M
			{ name: '─── 🇯🇵 Japanese (Female) ───', value: '_separator_jf', description: 'Japanese female voices (4)' },
			{ name: 'jf_alpha', value: 'jf_alpha' },
			{ name: 'jf_gongitsune', value: 'jf_gongitsune' },
			{ name: 'jf_nezumi', value: 'jf_nezumi' },
			{ name: 'jf_tebukuro', value: 'jf_tebukuro' },
			
			{ name: '─── 🇯🇵 Japanese (Male) ───', value: '_separator_jm', description: 'Japanese male voices (1)' },
			{ name: 'jm_kumo', value: 'jm_kumo' },
			
			// 🇧🇷 Brazilian Portuguese: 1F 2M
			{ name: '─── 🇧🇷 Brazilian Portuguese (Female) ───', value: '_separator_pf', description: 'Brazilian Portuguese female voices (1)' },
			{ name: 'pf_dora', value: 'pf_dora' },
			
			{ name: '─── 🇧🇷 Brazilian Portuguese (Male) ───', value: '_separator_pm', description: 'Brazilian Portuguese male voices (2)' },
			{ name: 'pm_alex', value: 'pm_alex' },
			{ name: 'pm_santa', value: 'pm_santa' },
			
			// 🇨🇳 Mandarin Chinese: 4F 4M
			{ name: '─── 🇨🇳 Mandarin Chinese (Female) ───', value: '_separator_zf', description: 'Mandarin Chinese female voices (4)' },
			{ name: 'zf_xiaobei', value: 'zf_xiaobei' },
			{ name: 'zf_xiaoni', value: 'zf_xiaoni' },
			{ name: 'zf_xiaoxiao', value: 'zf_xiaoxiao' },
			{ name: 'zf_xiaoyi', value: 'zf_xiaoyi' },
			
			{ name: '─── 🇨🇳 Mandarin Chinese (Male) ───', value: '_separator_zm', description: 'Mandarin Chinese male voices (4)' },
			{ name: 'zm_yunjian', value: 'zm_yunjian' },
			{ name: 'zm_yunxi', value: 'zm_yunxi' },
			{ name: 'zm_yunxia', value: 'zm_yunxia' },
			{ name: 'zm_yunyang', value: 'zm_yunyang' },
		],
		default: '',
		description: 'Voice to use for speech generation',
		hint: 'The Kokoro model supports 54 named voices organized by region/type. For other TTS chutes, use the Custom option. Visit https://chutes.ai/playground to discover voices for your selected chute.',
		// Note: Separators (values starting with '_separator_') are visual category headers.
		// If accidentally selected, they are gracefully ignored and the chute's default voice is used.
	},

	// Custom Voice Name (shown when "Custom" is selected)
	{
		displayName: 'Custom Voice',
		name: 'customVoice',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['textToSpeech'],
				voice: ['custom'],
			},
		},
		default: '',
		description: 'Enter a custom voice name or ID',
		placeholder: 'Enter voice name (e.g., af_bella, voice_123)',
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
				resource: ['textToSpeech'],
			},
		},
		options: [
			{
				displayName: 'Speed',
				name: 'speed',
				type: 'number',
				default: 1.0,
				description: 'Speech speed multiplier',
			},
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for audio generation (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '180',
				hint: 'Recommended: 180 seconds (3 minutes) for long text. Leave empty if generation needs more time.',
			},
		],
	},
];

