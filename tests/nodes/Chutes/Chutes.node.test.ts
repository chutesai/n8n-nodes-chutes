/**
 * Tests for Main Chutes Node
 * Following TDD principles - all tests in /tests directory
 */

import { Chutes } from '../../../nodes/Chutes/Chutes.node';
import { createMockExecuteFunctions } from '../../helpers/mocks';
import { mockTextCompletionResponse } from '../../helpers/fixtures';
import * as openApiDiscovery from '../../../nodes/Chutes/transport/openApiDiscovery';

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

		test('should support both API key and OAuth2 credentials', () => {
			const creds = node.description.credentials;
			expect(creds).toBeDefined();
			expect(creds).toEqual([
				{
					name: 'chutesApi',
					required: false,
				},
				{
					name: 'chutesOAuth2Api',
					required: false,
				},
			]);
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

		test('should have empty default chuteUrl for inference compatibility', () => {
			const chuteParam = node.description.properties.find((prop) => prop.name === 'chuteUrl');
			expect(chuteParam?.default).toBe('');
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

		test('should use requestWithAuthentication for speech-to-text requests', async () => {
			const mockFunctions = createMockExecuteFunctions({
				getInputData: jest.fn().mockReturnValue([{ json: {}, binary: undefined }]),
			});
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('speechToText') // resource
				.mockReturnValueOnce('transcribe') // operation
				.mockReturnValueOnce('https://stt.chutes.ai') // chuteUrl
				.mockReturnValueOnce('base64audio') // audio
				.mockReturnValueOnce({}); // additionalOptions

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([
				{ text: 'hello ', start: 0, end: 1 },
				{ text: 'world', start: 1, end: 2 },
			]);

			const result = await node.execute.call(mockFunctions);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
			expect(result[0][0].json.text).toBe('hello world');
		});

		test('should pass authenticated loader callback to OpenAPI discovery', async () => {
			const discoverSpy = jest
				.spyOn(openApiDiscovery, 'discoverChuteCapabilities')
				.mockResolvedValue({
					endpoints: [{ path: '/edit', method: 'POST', parameters: [] }],
					supportsTextToVideo: false,
					supportsImageToVideo: false,
					supportsImageEdit: true,
					imageEditPath: '/edit',
					supportsVideoToVideo: false,
					supportsKeyframeInterp: false,
				});
			const buildSpy = jest.spyOn(openApiDiscovery, 'buildRequestBody').mockReturnValue({
				endpoint: '/edit',
				body: { prompt: 'edit this', image: 'base64image' },
			});

			const mockFunctions = createMockExecuteFunctions({
				getInputData: jest.fn().mockReturnValue([{ json: {}, binary: undefined }]),
			});
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('imageGeneration') // resource
				.mockReturnValueOnce('edit') // operation
				.mockReturnValueOnce('https://image.chutes.ai') // chuteUrl
				.mockReturnValueOnce('edit this') // prompt
				.mockReturnValueOnce('1024x1024') // size
				.mockReturnValueOnce(1) // n
				.mockReturnValueOnce({}) // additionalOptions
				.mockReturnValueOnce('base64image'); // image

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				Buffer.from('fake-image'),
			);
			(mockFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'binary',
			});

			await node.execute.call(mockFunctions);

			expect(discoverSpy).toHaveBeenCalled();
			const secondArg = discoverSpy.mock.calls[0][1];
			expect(typeof secondArg).toBe('function');
			expect(buildSpy).toHaveBeenCalled();
		});
	});
});

