/**
 * Music Generation UI Test
 * 
 * Verifies that the music generation UI properly displays both
 * Style Prompt and Lyrics fields as top-level, visible fields.
 * 
 * Following TDD: This test should FAIL first, showing that we need
 * to update the UI to make lyrics always visible and rename prompt.
 */

import { musicGenerationOperations } from '../../../../nodes/Chutes/operations/musicGeneration';

describe('Music Generation UI Fields', () => {
	test('should have Style Prompt field (not just Prompt)', () => {
		const stylePromptField = musicGenerationOperations.find(
			(field) => field.name === 'prompt' && field.displayName === 'Style Prompt'
		);

		expect(stylePromptField).toBeDefined();
		expect(stylePromptField?.required).toBe(true);
		expect(stylePromptField?.description).toContain('style');
	});

	test('should have Lyrics field at top level (not in Additional Options)', () => {
		// Find the lyrics field at top level
		const lyricsField = musicGenerationOperations.find(
			(field) => field.name === 'lyrics'
		);

		expect(lyricsField).toBeDefined();
		expect(lyricsField?.type).toBe('string');
		expect(lyricsField?.displayName).toBe('Lyrics');
		expect(lyricsField?.required).toBe(false); // Optional
		
		// Should have proper displayOptions to show with musicGeneration resource
		expect(lyricsField?.displayOptions?.show?.resource).toEqual(['musicGeneration']);
	});

	test('should NOT have lyrics in Additional Options', () => {
		const additionalOptions = musicGenerationOperations.find(
			(field) => field.name === 'additionalOptions'
		);

		expect(additionalOptions).toBeDefined();
		
		// Check that lyrics is NOT in the options array
		const options = (additionalOptions as any)?.options || [];
		const lyricsInOptions = options.find((opt: any) => opt.name === 'lyrics');
		
		expect(lyricsInOptions).toBeUndefined();
	});

	test('Additional Options should contain all control parameters', () => {
		const additionalOptions = musicGenerationOperations.find(
			(field) => field.name === 'additionalOptions'
		);

		const options = (additionalOptions as any)?.options || [];
		
		// New v0.0.3 parameters
		const durationField = options.find((opt: any) => opt.name === 'music_duration');
		const cfgField = options.find((opt: any) => opt.name === 'cfg_strength');
		const stepsField = options.find((opt: any) => opt.name === 'steps');
		const seedField = options.find((opt: any) => opt.name === 'seed');
		
		// Original parameters
		const audioField = options.find((opt: any) => opt.name === 'audio_b64');
		const timeoutField = options.find((opt: any) => opt.name === 'timeout');

		expect(durationField).toBeDefined();
		expect(cfgField).toBeDefined();
		expect(stepsField).toBeDefined();
		expect(seedField).toBeDefined();
		expect(audioField).toBeDefined();
		expect(timeoutField).toBeDefined();
		
		// Verify defaults
		expect(durationField?.default).toBe(60);
		expect(cfgField?.default).toBe(7.0);
		expect(stepsField?.default).toBe(50);
	});
});

