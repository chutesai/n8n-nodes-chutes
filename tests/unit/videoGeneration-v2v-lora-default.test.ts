/**
 * Test: V2V LoRA requirement and default value
 * 
 * Video-to-Video requires at least one LoRA adapter because it uses the ic_lora pipeline.
 * This test ensures the UI enforces this requirement with a helpful default.
 */

import { videoGenerationOperations } from '../../nodes/Chutes/operations/videoGeneration';

describe('Video-to-Video LoRA Configuration', () => {
	it('should have at least one LoRA pre-configured by default for V2V', () => {
		// Find the LoRA adapters parameter
		const additionalOptions = videoGenerationOperations.find(
			(p: any) => p.name === 'additionalOptions'
		) as any;

		const loraParam = additionalOptions.options.find((opt: any) => opt.name === 'loras');

		expect(loraParam).toBeDefined();
		expect(loraParam.type).toBe('fixedCollection');
		
		// Check default value - should have at least one LoRA configured
		expect(loraParam.default).toBeDefined();
		expect(loraParam.default.loraItems).toBeDefined();
		expect(Array.isArray(loraParam.default.loraItems)).toBe(true);
		expect(loraParam.default.loraItems.length).toBeGreaterThanOrEqual(1);
		
		// Check the default LoRA
		const defaultLora = loraParam.default.loraItems[0];
		expect(defaultLora.name).toBe('detailer');
		expect(defaultLora.strength).toBe(1.0);
	});

	it('should have description explaining LoRA requirement for V2V', () => {
		const additionalOptions = videoGenerationOperations.find(
			(p: any) => p.name === 'additionalOptions'
		) as any;

		const loraParam = additionalOptions.options.find((opt: any) => opt.name === 'loras');

		expect(loraParam.description).toBeDefined();
		expect(loraParam.description.toLowerCase()).toContain('video-to-video');
		expect(loraParam.description.toLowerCase()).toContain('required');
	});

	it('should have detailer option available in LoRA list', () => {
		const additionalOptions = videoGenerationOperations.find(
			(p: any) => p.name === 'additionalOptions'
		) as any;

		const loraParam = additionalOptions.options.find((opt: any) => opt.name === 'loras');
		
		// Find the LoRA name field
		const loraNameField = loraParam.options[0].values.find((v: any) => v.name === 'name');
		
		expect(loraNameField).toBeDefined();
		expect(loraNameField.type).toBe('options');
		
		// Check that 'detailer' is in the options
		const detailerOption = loraNameField.options.find((opt: any) => opt.value === 'detailer');
		expect(detailerOption).toBeDefined();
		expect(detailerOption.name).toBe('Detailer');
		expect(detailerOption.description).toContain('details');
	});
});
