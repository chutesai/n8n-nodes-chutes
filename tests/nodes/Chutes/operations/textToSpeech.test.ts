import { textToSpeechOperations } from '../../../../nodes/Chutes/operations/textToSpeech';

describe('Text-to-Speech Operations', () => {
	describe('Operation Selector', () => {
		test('should have operation parameter', () => {
			const operationParam = textToSpeechOperations.find((op) => op.name === 'operation');
			
			expect(operationParam).toBeDefined();
			expect(operationParam?.type).toBe('options');
		});

		test('should have generate operation', () => {
			const operationParam = textToSpeechOperations.find((op) => op.name === 'operation');
			const options = (operationParam as any)?.options;
			
			expect(options).toBeDefined();
			expect(options.find((opt: any) => opt.value === 'generate')).toBeDefined();
		});

		test('should default to generate', () => {
			const operationParam = textToSpeechOperations.find((op) => op.name === 'operation');
			expect(operationParam?.default).toBe('generate');
		});
	});

	describe('Text Field', () => {
		test('should have text parameter', () => {
			const textParam = textToSpeechOperations.find((op) => op.name === 'text');
			
			expect(textParam).toBeDefined();
			expect(textParam?.type).toBe('string');
		});

		test('should be required', () => {
			const textParam = textToSpeechOperations.find((op) => op.name === 'text');
			expect(textParam?.required).toBe(true);
		});

		test('should display for textToSpeech resource', () => {
			const textParam = textToSpeechOperations.find((op) => op.name === 'text');
			
			expect(textParam?.displayOptions?.show?.resource).toEqual(['textToSpeech']);
		});

		test('should have multiline text area', () => {
			const textParam = textToSpeechOperations.find((op) => op.name === 'text');
			expect(textParam?.typeOptions?.rows).toBe(4);
		});

		test('should have placeholder', () => {
			const textParam = textToSpeechOperations.find((op) => op.name === 'text');
			expect(textParam?.placeholder).toBeDefined();
		});
	});

	describe('Voice Selection', () => {
		test('should have voice parameter', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			
			expect(voiceParam).toBeDefined();
			expect(voiceParam?.type).toBe('options');
		});

		test('should display for textToSpeech resource', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			expect(voiceParam?.displayOptions?.show?.resource).toEqual(['textToSpeech']);
		});

		test('should have voice options with visual group separators', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			
			// Should have 73 total: 1 default + 1 custom + 17 separators (9 languages × 2 genders, minus 2 single-gender) + 54 Kokoro voices
			expect(options.length).toBeGreaterThan(70);
			expect(options.length).toBe(73);
		});

		test('should include Default option first', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			
			expect(options[0].name).toBe('Default');
			expect(options[0].value).toBe('');
		});

		test('should have Custom option second', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			
			expect(options[1].name).toBe('Custom...');
			expect(options[1].value).toBe('custom');
		});

		test('should include visual group separators by language', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			const separators = options.filter((o: any) => o.value.startsWith('_separator_'));
			
			// Should have 17 language/gender group separators
			// 9 languages, some with F+M (2 separators), some with only F or M (1 separator)
			expect(separators.length).toBe(17);
			
			// Check for specific language separators
			const separatorValues = separators.map((s: any) => s.value);
			// American English (F+M)
			expect(separatorValues).toContain('_separator_af');
			expect(separatorValues).toContain('_separator_am');
			// British English (F+M)
			expect(separatorValues).toContain('_separator_bf');
			expect(separatorValues).toContain('_separator_bm');
			// Spanish (F+M)
			expect(separatorValues).toContain('_separator_ef');
			expect(separatorValues).toContain('_separator_em');
			// French (F only)
			expect(separatorValues).toContain('_separator_ff');
			// Hindi (F+M)
			expect(separatorValues).toContain('_separator_hf');
			expect(separatorValues).toContain('_separator_hm');
			// Italian (F+M)
			expect(separatorValues).toContain('_separator_if');
			expect(separatorValues).toContain('_separator_im');
			// Japanese (F+M)
			expect(separatorValues).toContain('_separator_jf');
			expect(separatorValues).toContain('_separator_jm');
			// Brazilian Portuguese (F+M)
			expect(separatorValues).toContain('_separator_pf');
			expect(separatorValues).toContain('_separator_pm');
			// Mandarin Chinese (F+M)
			expect(separatorValues).toContain('_separator_zf');
			expect(separatorValues).toContain('_separator_zm');
		});

		test('should include Kokoro named voices', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			const voiceNames = options.map((o: any) => o.value);
			
			// Check for key Kokoro voices from different categories
			expect(voiceNames).toContain('af_bella'); // American Female
			expect(voiceNames).toContain('am_adam'); // American Male
			expect(voiceNames).toContain('bf_alice'); // British Female
			expect(voiceNames).toContain('bm_daniel'); // British Male
			expect(voiceNames).toContain('jf_alpha'); // Japanese Female
			expect(voiceNames).toContain('zf_xiaobei'); // Chinese Female
		});

		test('should include custom option', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			const options = (voiceParam as any)?.options;
			const voiceValues = options.map((o: any) => o.value);
			
			expect(voiceValues).toContain('custom');
		});

		test('should have hint with link to playground', () => {
			const voiceParam = textToSpeechOperations.find((op) => op.name === 'voice');
			
			expect((voiceParam as any)?.hint).toContain('https://chutes.ai/playground');
			expect((voiceParam as any)?.hint).toContain('Kokoro');
		});
	});

	describe('Custom Voice Field', () => {
		test('should have customVoice parameter', () => {
			const customVoiceParam = textToSpeechOperations.find((op) => op.name === 'customVoice');
			
			expect(customVoiceParam).toBeDefined();
			expect(customVoiceParam?.type).toBe('string');
		});

		test('should only display when voice is custom', () => {
			const customVoiceParam = textToSpeechOperations.find((op) => op.name === 'customVoice');
			
			expect(customVoiceParam?.displayOptions?.show?.resource).toEqual(['textToSpeech']);
			expect(customVoiceParam?.displayOptions?.show?.voice).toEqual(['custom']);
		});

		test('should have placeholder text', () => {
			const customVoiceParam = textToSpeechOperations.find((op) => op.name === 'customVoice');
			expect(customVoiceParam?.placeholder).toBeDefined();
		});
	});

	describe('Additional Options', () => {
		let additionalOptions: any;

		beforeAll(() => {
			additionalOptions = textToSpeechOperations.find((op) => op.name === 'additionalOptions');
		});

		test('should have additional options collection', () => {
			expect(additionalOptions).toBeDefined();
			expect(additionalOptions?.type).toBe('collection');
		});

		test('should display for textToSpeech resource', () => {
			expect(additionalOptions?.displayOptions?.show?.resource).toEqual(['textToSpeech']);
		});

		describe('Speed Option', () => {
			test('should have speed option', () => {
				const speedOption = additionalOptions?.options?.find((opt: any) => opt.name === 'speed');
				
				expect(speedOption).toBeDefined();
				expect(speedOption?.type).toBe('number');
			});

			test('should default to 1.0', () => {
				const speedOption = additionalOptions?.options?.find((opt: any) => opt.name === 'speed');
				expect(speedOption?.default).toBe(1.0);
			});
		});
	});
});

