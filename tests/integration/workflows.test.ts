/**
 * Integration Tests for Workflow Execution
 * Following TDD principles - all tests in /tests directory
 */

import { Chutes } from '../../nodes/Chutes/Chutes.node';
import { createMockExecuteFunctions } from '../helpers/mocks';
import {
	mockTextCompletionResponse,
	mockChatCompletionResponse,
} from '../helpers/fixtures';

describe('Workflow Integration Tests', () => {
	let node: Chutes;

	beforeEach(() => {
		node = new Chutes();
	});

	describe('Text Generation Workflow', () => {
		test('should complete text generation workflow successfully', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration') // resource (from execute)
				.mockReturnValueOnce('complete') // operation (from handleTextGeneration)
				.mockReturnValueOnce('gpt-3.5-turbo') // model (from handleTextGeneration)
				.mockReturnValueOnce('https://llm.chutes.ai') // chuteUrl (from handleTextGeneration)
				.mockReturnValueOnce({ temperature: 0.8, maxTokens: 100 }) // additionalOptions (from handleTextGeneration)
				.mockReturnValueOnce('Write a haiku about coding'); // prompt (from complete operation)

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextCompletionResponse,
			);

			const result = await node.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('choices');
			expect(result[0][0].json.source).toBe('chutes.ai');
			// Verify that 'complete' operation now uses chat completions endpoint
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					url: expect.stringContaining('/chat/completions'),
				}),
			);
		});

		test('should handle chat completion workflow', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const chatMessages = {
				messageValues: [
					{ role: 'system', content: 'You are helpful.' },
					{ role: 'user', content: 'Hello!' },
				],
			};

			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration') // resource (from execute)
				.mockReturnValueOnce('chat') // operation (from handleTextGeneration)
				.mockReturnValueOnce('gpt-4') // model (from handleTextGeneration)
				.mockReturnValueOnce('https://llm.chutes.ai') // chuteUrl (from handleTextGeneration)
				.mockReturnValueOnce({}) // additionalOptions (from handleTextGeneration)
				.mockReturnValueOnce(chatMessages); // messages (from chat operation)

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockChatCompletionResponse,
			);

			const result = await node.execute.call(mockFunctions);

			expect(result[0][0].json).toHaveProperty('choices');
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					url: expect.stringContaining('/chat/completions'),
				}),
			);
		});
	});

	describe('Image Generation Workflow', () => {
		test('should complete image generation workflow successfully', async () => {
			const mockFunctions = createMockExecuteFunctions();
			
			// Create a mock binary image buffer (PNG header)
			const mockImageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
			
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('imageGeneration') // resource (from execute main loop)
				.mockReturnValueOnce('generate') // operation (from main loop skip logic check)
				.mockReturnValueOnce('generate') // operation (from handleImageGeneration)
				.mockReturnValueOnce('https://image.chutes.ai') // chuteUrl (from handleImageGeneration)
				.mockReturnValueOnce('A futuristic city') // prompt (from handleImageGeneration)
				.mockReturnValueOnce('1024x1024') // size (from handleImageGeneration)
				.mockReturnValueOnce(1) // n (single image for simpler test)
				.mockReturnValueOnce({}); // additionalOptions (from handleImageGeneration)

			// Mock requestWithAuthentication (used by chutesApiRequest)
			// Return binary image data
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(mockImageBuffer);
			
			// Mock prepareBinaryData (used when handling binary responses)
			(mockFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: mockImageBuffer.toString('base64'),
				mimeType: 'image/png',
				fileName: 'generated-image.png',
			});

			const result = await node.execute.call(mockFunctions);

			// Result should have binary data from image generation
			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
			expect(result[0].length).toBeGreaterThan(0);
			expect(result[0][0].json.source).toBe('chutes.ai');
		});
	});

	describe('Multiple Items Processing', () => {
		test('should process multiple input items', async () => {
			const mockFunctions = createMockExecuteFunctions({
				getInputData: jest.fn().mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]),
			});

		let callCount = 0;
		(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
			const responses = [
				'textGeneration', // resource (from execute)
				'complete', // operation (from handleTextGeneration)
				'https://llm.chutes.ai', // chuteUrl (from handleTextGeneration)
				{}, // additionalOptions (from handleTextGeneration)
				'Test prompt', // prompt (from complete operation)
			];
			return responses[callCount++ % responses.length];
		});

		(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
			mockTextCompletionResponse,
		);

			const result = await node.execute.call(mockFunctions);

			expect(result[0]).toHaveLength(3);
			expect((result[0][0].pairedItem as any)?.item).toBe(0);
			expect((result[0][1].pairedItem as any)?.item).toBe(1);
			expect((result[0][2].pairedItem as any)?.item).toBe(2);
		});
	});

	describe('Error Handling in Workflows', () => {
		test('should handle API errors gracefully with continueOnFail', async () => {
			const mockFunctions = createMockExecuteFunctions({
				continueOnFail: jest.fn().mockReturnValue(true),
				getInputData: jest.fn().mockReturnValue([{ json: {} }, { json: {} }]),
			});

			let callCount = 0;
			(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
			const responses = [
				'textGeneration', // resource (from execute)
				'complete', // operation (from handleTextGeneration)
				'https://llm.chutes.ai', // chuteUrl (from handleTextGeneration)
				{}, // additionalOptions (from handleTextGeneration)
				'Test prompt', // prompt (from complete operation)
			];
			return responses[callCount++ % responses.length];
		});

		(mockFunctions.helpers.requestWithAuthentication as jest.Mock)
			.mockResolvedValueOnce(mockTextCompletionResponse)
			.mockRejectedValueOnce(new Error('API Error'));

			const result = await node.execute.call(mockFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).not.toHaveProperty('error');
			expect(result[0][1].json).toHaveProperty('error');
		});
	});

	describe('Parameter Transformation', () => {
		test('should transform parameter names for API (snake_case)', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration')
				.mockReturnValueOnce('complete')
				.mockReturnValueOnce('https://llm.chutes.ai')
				.mockReturnValueOnce({
					maxTokens: 500,
					topP: 0.9,
					frequencyPenalty: 0.5,
					presencePenalty: 0.2,
				})
				.mockReturnValueOnce('Test prompt');

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextCompletionResponse,
			);

			await node.execute.call(mockFunctions);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					body: expect.objectContaining({
						max_tokens: 500,
						top_p: 0.9,
						frequency_penalty: 0.5,
						presence_penalty: 0.2,
					}),
				}),
			);
		});

		test('should transform stop sequences to array', async () => {
			const mockFunctions = createMockExecuteFunctions();
			(mockFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('textGeneration')
				.mockReturnValueOnce('complete')
				.mockReturnValueOnce('https://llm.chutes.ai')
				.mockReturnValueOnce({
					stopSequences: 'END, STOP, \\n\\n',
				})
				.mockReturnValueOnce('Test prompt');

			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextCompletionResponse,
			);

			await node.execute.call(mockFunctions);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					body: expect.objectContaining({
						stop: ['END', 'STOP', '\\n\\n'],
					}),
				}),
			);
		});
	});
});

