import { speechToTextOperations } from '../../../../nodes/Chutes/operations/speechToText';

describe('Speech-to-Text Operations', () => {
	describe('Operation Selector', () => {
		test('should have operation parameter', () => {
			const operationParam = speechToTextOperations.find((op) => op.name === 'operation');
			
			expect(operationParam).toBeDefined();
			expect(operationParam?.type).toBe('options');
		});

		test('should have transcribe operation', () => {
			const operationParam = speechToTextOperations.find((op) => op.name === 'operation');
			const options = (operationParam as any)?.options;
			
			expect(options).toBeDefined();
			expect(options.find((opt: any) => opt.value === 'transcribe')).toBeDefined();
		});

		test('should default to transcribe', () => {
			const operationParam = speechToTextOperations.find((op) => op.name === 'operation');
			expect(operationParam?.default).toBe('transcribe');
		});
	});

	describe('Audio Input Field', () => {
		test('should have audio parameter', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			
			expect(audioParam).toBeDefined();
			expect(audioParam?.type).toBe('string');
		});

		test('should NOT be required (binary data is auto-detected)', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			expect(audioParam?.required).toBe(false);
		});

		test('should display for speechToText resource', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			
			expect(audioParam?.displayOptions?.show?.resource).toEqual(['speechToText']);
		});

		test('should have empty default (binary data is used)', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			expect(audioParam?.default).toBe('');
		});

		test('should have helpful description about binary data', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			expect(audioParam?.description).toContain('Leave empty');
			expect(audioParam?.description).toContain('binary audio');
		});

		test('should have helpful hint about automatic detection', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			expect(audioParam?.hint).toContain('Binary data');
			expect(audioParam?.hint).toContain('automatically detected');
		});

		test('should have URL placeholder', () => {
			const audioParam = speechToTextOperations.find((op) => op.name === 'audio');
			expect(audioParam?.placeholder).toContain('http');
			expect(audioParam?.placeholder).toContain('leave empty');
		});
	});

	describe('Additional Options', () => {
		let additionalOptions: any;

		beforeAll(() => {
			additionalOptions = speechToTextOperations.find((op) => op.name === 'additionalOptions');
		});

		test('should have additional options collection', () => {
			expect(additionalOptions).toBeDefined();
			expect(additionalOptions?.type).toBe('collection');
		});

		test('should display for speechToText resource', () => {
			expect(additionalOptions?.displayOptions?.show?.resource).toEqual(['speechToText']);
		});

		describe('Language Option', () => {
			test('should have language option', () => {
				const languageOption = additionalOptions?.options?.find((opt: any) => opt.name === 'language');
				
				expect(languageOption).toBeDefined();
				expect(languageOption?.type).toBe('string');
			});

			test('should default to "en"', () => {
				const languageOption = additionalOptions?.options?.find((opt: any) => opt.name === 'language');
				expect(languageOption?.default).toBe('en');
			});

			test('should have helpful description', () => {
				const languageOption = additionalOptions?.options?.find((opt: any) => opt.name === 'language');
				expect(languageOption?.description).toContain('language code');
			});
		});

		describe('Include Chunks Option (NEW FEATURE)', () => {
			test('should have includeChunks option', () => {
				const includeChunksOption = additionalOptions?.options?.find((opt: any) => opt.name === 'includeChunks');
				
				expect(includeChunksOption).toBeDefined();
				expect(includeChunksOption?.type).toBe('boolean');
			});

			test('should default to false (clean output)', () => {
				const includeChunksOption = additionalOptions?.options?.find((opt: any) => opt.name === 'includeChunks');
				expect(includeChunksOption?.default).toBe(false);
			});

			test('should have descriptive name', () => {
				const includeChunksOption = additionalOptions?.options?.find((opt: any) => opt.name === 'includeChunks');
				expect(includeChunksOption?.displayName).toBe('Include Chunks');
			});

			test('should explain use cases in description', () => {
				const includeChunksOption = additionalOptions?.options?.find((opt: any) => opt.name === 'includeChunks');
				const description = includeChunksOption?.description;
				
				expect(description).toContain('timestamped chunks');
				expect(description).toContain('subtitles');
				expect(description).toContain('timing');
			});
		});
	});

	describe('Parameter Count', () => {
		test('should have exactly 3 main parameters', () => {
			// operation, audio, additionalOptions
			expect(speechToTextOperations.length).toBe(3);
		});
	});
});

