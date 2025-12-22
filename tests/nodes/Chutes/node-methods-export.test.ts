/**
 * Test: Node Methods Export
 * 
 * Verifies that the Chutes node class exports the `methods` property
 * with all loadOptions functions, enabling n8n to populate dropdowns
 * with filtered chutes.
 * 
 * REGRESSION: Without this property, all chute dropdowns appear empty
 * and users cannot see auto-populated chute options.
 */

import { Chutes } from '../../../nodes/Chutes/Chutes.node';

describe('Chutes Node - Methods Export', () => {
	let nodeInstance: Chutes;

	beforeEach(() => {
		nodeInstance = new Chutes();
	});

	test('should export methods property', () => {
		expect(nodeInstance.methods).toBeDefined();
		expect(typeof nodeInstance.methods).toBe('object');
	});

	test('should export loadOptions in methods', () => {
		expect(nodeInstance.methods?.loadOptions).toBeDefined();
		expect(typeof nodeInstance.methods?.loadOptions).toBe('object');
	});

	test('should include getLLMChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getLLMChutes');
		expect(typeof loadOptions?.getLLMChutes).toBe('function');
	});

	test('should include getImageChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getImageChutes');
		expect(typeof loadOptions?.getImageChutes).toBe('function');
	});

	test('should include getVideoChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getVideoChutes');
		expect(typeof loadOptions?.getVideoChutes).toBe('function');
	});

	test('should include getTTSChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getTTSChutes');
		expect(typeof loadOptions?.getTTSChutes).toBe('function');
	});

	test('should include getSTTChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getSTTChutes');
		expect(typeof loadOptions?.getSTTChutes).toBe('function');
	});

	test('should include getMusicChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getMusicChutes');
		expect(typeof loadOptions?.getMusicChutes).toBe('function');
	});

	test('should include getEmbeddingChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getEmbeddingChutes');
		expect(typeof loadOptions?.getEmbeddingChutes).toBe('function');
	});

	test('should include getModerationChutes in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getModerationChutes');
		expect(typeof loadOptions?.getModerationChutes).toBe('function');
	});

	test('should include getChutes (generic) in loadOptions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		expect(loadOptions).toHaveProperty('getChutes');
		expect(typeof loadOptions?.getChutes).toBe('function');
	});

	test('should include model loading functions', () => {
		const loadOptions = nodeInstance.methods?.loadOptions;
		// These functions load models from /v1/models endpoints
		expect(loadOptions).toHaveProperty('getChutesTextModels');
		expect(loadOptions).toHaveProperty('getChutesImageModels');
		expect(loadOptions).toHaveProperty('getModelsForSelectedChute');
	});
});

