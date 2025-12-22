/**
 * Tests for Main Chutes Node
 * Following TDD principles - all tests in /tests directory
 */

import { Chutes } from '../../../nodes/Chutes/Chutes.node';
import { createMockExecuteFunctions } from '../../helpers/mocks';
import { mockTextCompletionResponse } from '../../helpers/fixtures';

describe('Chutes Node', () => {
	let node: Chutes;

	beforeEach(() => {
		node = new Chutes();
	});

	describe('Node Properties', () => {
		test('should have correct display name', () => {
			expect(node.description.displayName).toBe('Chutes');
		});

		test('should have correct node name', () => {
			expect(node.description.name).toBe('chutes');
		});

		test('should be in transform group', () => {
			expect(node.description.group).toContain('transform');
		});

		test('should have version 1', () => {
			expect(node.description.version).toBe(1);
		});

	test('should have correct icon', () => {
		expect(node.description.icon).toBe('file:chutes.png');
	});

		test('should have main input and output', () => {
			expect(node.description.inputs).toContain('main');
			expect(node.description.outputs).toContain('main');
		});

		test('should require chutesApi credentials', () => {
			const creds = node.description.credentials;
			expect(creds).toBeDefined();
			expect(creds?.[0].name).toBe('chutesApi');
			expect(creds?.[0].required).toBe(true);
		});
	});

	describe('Resource Options', () => {
		test('should have resource parameter', () => {
			const resourceParam = node.description.properties.find((prop) => prop.name === 'resource');

			expect(resourceParam).toBeDefined();
			expect(resourceParam?.type).toBe('options');
		});

		test('should have textGeneration resource', () => {
			const resourceParam = node.description.properties.find((prop) => prop.name === 'resource');
			const options = resourceParam?.options as any[];

		const textGen = options.find((opt) => opt.value === 'textGeneration');
		expect(textGen).toBeDefined();
		expect(textGen?.name).toBe('LLM (Text Generation)');
		});

		test('should have imageGeneration resource', () => {
			const resourceParam = node.description.properties.find((prop) => prop.name === 'resource');
			const options = resourceParam?.options as any[];

			const imageGen = options.find((opt) => opt.value === 'imageGeneration');
			expect(imageGen).toBeDefined();
			expect(imageGen?.name).toBe('Image Generation');
		});

		test('should have inference resource', () => {
			const resourceParam = node.description.properties.find((prop) => prop.name === 'resource');
			const options = resourceParam?.options as any[];

		const inference = options.find((opt) => opt.value === 'inference');
		expect(inference).toBeDefined();
		expect(inference?.name).toBe('Custom Inference');
		});
	});

	describe('Load Options Methods', () => {
		test('should have getChutesTextModels method', () => {
			expect(node.methods?.loadOptions?.getChutesTextModels).toBeDefined();
		});

		test('should have getChutesImageModels method', () => {
			expect(node.methods?.loadOptions?.getChutesImageModels).toBeDefined();
		});
	});

	describe('Execute Method', () => {
		test('should process input items', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration') // resource
				.mockReturnValueOnce('complete') // operation
				.mockReturnValueOnce('gpt-3.5-turbo') // model
				.mockReturnValueOnce('Test prompt') // prompt
				.mockReturnValueOnce({}); // additionalOptions

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextCompletionResponse,
			);

			const result = await node.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		test('should add source: chutes.ai to output', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration')
				.mockReturnValueOnce('complete')
				.mockReturnValueOnce('gpt-3.5-turbo')
				.mockReturnValueOnce('Test prompt')
				.mockReturnValueOnce({});

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextCompletionResponse,
			);

			const result = await node.execute.call(mockFunctions);

			expect(result[0][0].json).toHaveProperty('source', 'chutes.ai');
		});

		test('should handle errors with continueOnFail', async () => {
			const mockFunctions = createMockExecuteFunctions({
				continueOnFail: jest.fn().mockReturnValue(true),
			});
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration')
				.mockReturnValueOnce('complete')
				.mockReturnValueOnce('gpt-3.5-turbo')
				.mockReturnValueOnce('Test prompt')
				.mockReturnValueOnce({});

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

			const result = await node.execute.call(mockFunctions);

			expect(result[0][0].json).toHaveProperty('error');
			expect(result[0][0].json).toHaveProperty('source', 'chutes.ai');
		});

		test('should throw error when continueOnFail is false', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration')
				.mockReturnValueOnce('complete')
				.mockReturnValueOnce('gpt-3.5-turbo')
				.mockReturnValueOnce('Test prompt')
				.mockReturnValueOnce({});

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

			await expect(node.execute.call(mockFunctions)).rejects.toThrow();
		});
	});
});

