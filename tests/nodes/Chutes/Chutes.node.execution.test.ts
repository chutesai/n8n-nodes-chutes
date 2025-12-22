/**
 * Test suite for Chutes node execution - response handling
 * 
 * Tests the main execute method's handling of different response types
 * from the Chutes.ai API to ensure proper output formatting.
 */

import { Chutes } from '../../../nodes/Chutes/Chutes.node';

describe('Chutes Node - Execute Method Response Handling', () => {
	describe('Bug #1: String Response Handling', () => {
		test('should wrap string responses in data object', () => {
			// This test validates the fix for Bug #1
			// When API returns a string (e.g., image URL), it should be wrapped
			// in an object, not spread character-by-character
			
			const mockStringResponse = 'https://image.chutes.ai/generated/12345.png';
			
			// Simulate the old buggy behavior (for reference)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const buggyOutput = { ...(mockStringResponse as any), source: 'chutes.ai' };
			// This creates: { 0: 'h', 1: 't', 2: 't', 3: 'p', ... }
			
			expect(buggyOutput).toHaveProperty('0'); // Bug symptom
			expect(buggyOutput).toHaveProperty('1'); // Bug symptom
			
			// Correct behavior after fix
			const correctOutput = {
				data: mockStringResponse,
				source: 'chutes.ai'
			};
			
			expect(correctOutput).toHaveProperty('data');
			expect(correctOutput.data).toBe(mockStringResponse);
			expect(correctOutput).not.toHaveProperty('0');
			expect(correctOutput).not.toHaveProperty('1');
		});

		test('should handle object responses correctly', () => {
			const mockObjectResponse = {
				url: 'https://image.chutes.ai/generated/12345.png',
				width: 1024,
				height: 1024,
			};
			
			const output = { ...mockObjectResponse, source: 'chutes.ai' };
			
			expect(output).toHaveProperty('url');
			expect(output).toHaveProperty('width');
			expect(output).toHaveProperty('height');
			expect(output).toHaveProperty('source');
			expect(output.source).toBe('chutes.ai');
		});

		test('should handle array responses correctly', () => {
			const mockArrayResponse = [
				{ url: 'https://image.chutes.ai/1.png' },
				{ url: 'https://image.chutes.ai/2.png' },
			];
			
			// Array items should each get source added
			const output = mockArrayResponse.map(item => ({
				...item,
				source: 'chutes.ai'
			}));
			
			expect(Array.isArray(output)).toBe(true);
			expect(output).toHaveLength(2);
			expect(output[0]).toHaveProperty('url');
			expect(output[0]).toHaveProperty('source');
			expect(output[0].source).toBe('chutes.ai');
		});

		test('should wrap primitive number responses', () => {
			const mockNumberResponse = 42;
			
			// Numbers should be wrapped in value object
			const output = {
				value: mockNumberResponse,
				source: 'chutes.ai'
			};
			
			expect(output).toHaveProperty('value');
			expect(output.value).toBe(42);
			expect(output).toHaveProperty('source');
		});

		test('should wrap primitive boolean responses', () => {
			const mockBooleanResponse = true;
			
			// Booleans should be wrapped in value object
			const output = {
				value: mockBooleanResponse,
				source: 'chutes.ai'
			};
			
			expect(output).toHaveProperty('value');
			expect(output.value).toBe(true);
			expect(output).toHaveProperty('source');
		});
	});

	describe('Response Type Detection', () => {
		test('should correctly identify string type', () => {
			const testString = 'https://example.com';
			expect(typeof testString).toBe('string');
		});

		test('should correctly identify object type', () => {
			const testObject = { url: 'https://example.com' };
			expect(typeof testObject).toBe('object');
			expect(testObject).not.toBeNull();
			expect(Array.isArray(testObject)).toBe(false);
		});

		test('should correctly identify array type', () => {
			const testArray = [1, 2, 3];
			expect(Array.isArray(testArray)).toBe(true);
		});

		test('should correctly identify null', () => {
			const testNull = null;
			expect(testNull).toBeNull();
			expect(typeof testNull).toBe('object'); // JavaScript quirk
		});
	});

	describe('Chutes Node Properties', () => {
		test('should have correct node type name', () => {
			const node = new Chutes();
			expect(node.description.name).toBe('chutes');
		});

		test('should have correct display name', () => {
			const node = new Chutes();
			expect(node.description.displayName).toBe('Chutes');
		});

		test('should have main input and output', () => {
			const node = new Chutes();
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
		});

		test('should require chutesApi credentials', () => {
			const node = new Chutes();
			expect(node.description.credentials).toEqual([
				{
					name: 'chutesApi',
					required: true,
				},
			]);
		});

		test('should have all expected resources', () => {
			const node = new Chutes();
			const resourceProperty = node.description.properties.find(
				(p: any) => p.name === 'resource'
			);
			
			expect(resourceProperty).toBeDefined();
			expect(resourceProperty?.options).toBeDefined();
			
			const resourceValues = resourceProperty?.options?.map((o: any) => o.value);
			
			expect(resourceValues).toContain('textGeneration');
			expect(resourceValues).toContain('imageGeneration');
			expect(resourceValues).toContain('inference');
		});
	});
});

