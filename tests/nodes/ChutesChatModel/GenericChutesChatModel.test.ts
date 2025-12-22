import { GenericChutesChatModel } from '../../../nodes/ChutesChatModel/GenericChutesChatModel';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

describe('GenericChutesChatModel', () => {
	let mockRequestHelper: any;
	let chatModel: GenericChutesChatModel;

	beforeEach(() => {
		// Mock n8n request helper
		mockRequestHelper = {
			request: jest.fn(),
		};

		chatModel = new GenericChutesChatModel({
			chuteUrl: 'https://llm.chutes.ai',
			model: 'deepseek-ai/DeepSeek-V3',
			temperature: 0.7,
			maxTokens: 1000,
			credentials: {
				apiKey: 'test-api-key',
			},
			requestHelper: mockRequestHelper,
		});
	});

	describe('_llmType', () => {
		it('should return correct LLM type identifier', () => {
			expect(chatModel._llmType()).toBe('chutes-chat-model');
		});
	});

	describe('modelName', () => {
		it('should return the configured model name', () => {
			expect(chatModel.modelName).toBe('deepseek-ai/DeepSeek-V3');
		});

		it('should return default name when no model specified', () => {
			const modelWithoutName = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});
			expect(modelWithoutName.modelName).toBe('chutes-default');
		});
	});

	describe('_call', () => {
		it('should convert LangChain messages to Chutes format correctly', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [
					{
						message: {
							content: 'Test response',
						},
					},
				],
			});

			const messages = [
				new SystemMessage('You are a helpful assistant'),
				new HumanMessage('Hello!'),
				new AIMessage('Hi there!'),
				new HumanMessage('How are you?'),
			];

			await chatModel._call(messages, {});

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://llm.chutes.ai/v1/chat/completions',
					body: expect.objectContaining({
						messages: [
							{ role: 'system', content: 'You are a helpful assistant' },
							{ role: 'user', content: 'Hello!' },
							{ role: 'assistant', content: 'Hi there!' },
							{ role: 'user', content: 'How are you?' },
						],
					}),
				}),
			);
		});

		it('should send correct API request with all parameters', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const modelWithAllOptions = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'test-model',
				temperature: 0.5,
				maxTokens: 500,
				topP: 0.9,
				frequencyPenalty: 0.1,
				presencePenalty: 0.2,
				credentials: { apiKey: 'test-key' },
				requestHelper: mockRequestHelper,
			});

			await modelWithAllOptions._call([new HumanMessage('Test')], {});

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
						'Content-Type': 'application/json',
						'X-Chutes-Source': 'n8n-ai-agent',
					}),
					body: expect.objectContaining({
						model: 'test-model',
						temperature: 0.5,
						max_tokens: 500,
						top_p: 0.9,
						frequency_penalty: 0.1,
						presence_penalty: 0.2,
						stream: false,
					}),
				}),
			);
		});

		it('should handle API response correctly', async () => {
			const expectedResponse = 'This is a test response from Chutes.ai';
			mockRequestHelper.request.mockResolvedValue({
				choices: [
					{
						message: {
							content: expectedResponse,
						},
					},
				],
			});

			const result = await chatModel._call([new HumanMessage('Test message')], {});

			expect(result).toBe(expectedResponse);
		});

		it('should include stop sequences from options', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			await chatModel._call([new HumanMessage('Test')], { stop: ['STOP', 'END'] });

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						stop: ['STOP', 'END'],
					}),
				}),
			);
		});

		it('should handle string stop sequences', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			await chatModel._call([new HumanMessage('Test')], { stop: ['STOP'] });

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						stop: ['STOP'],
					}),
				}),
			);
		});

		it('should omit model parameter if not specified', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const modelWithoutName = new GenericChutesChatModel({
				chuteUrl: 'https://custom-chute.chutes.ai',
				model: '',
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});

			await modelWithoutName._call([new HumanMessage('Test')], {});

			const callArgs = mockRequestHelper.request.mock.calls[0][0];
			expect(callArgs.body).not.toHaveProperty('model');
		});

		it('should handle API errors gracefully', async () => {
			mockRequestHelper.request.mockRejectedValue({
				response: {
					data: {
						error: {
							message: 'Invalid API key',
						},
					},
				},
			});

			await expect(chatModel._call([new HumanMessage('Test')], {})).rejects.toThrow(
				'Chutes.ai API error: Invalid API key',
			);
		});

		it('should handle generic errors', async () => {
			mockRequestHelper.request.mockRejectedValue(new Error('Network error'));

			await expect(chatModel._call([new HumanMessage('Test')], {})).rejects.toThrow(
				'Chutes.ai API error: Network error',
			);
		});

		it('should use correct chute URL', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const customModel = new GenericChutesChatModel({
				chuteUrl: 'https://custom-chute.chutes.ai',
				model: 'test',
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});

			await customModel._call([new HumanMessage('Test')], {});

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://custom-chute.chutes.ai/v1/chat/completions',
				}),
			);
		});

		it('should always set stream to false', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			await chatModel._call([new HumanMessage('Test')], {});

			expect(mockRequestHelper.request).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						stream: false,
					}),
				}),
			);
		});

		it('should return empty string if response has no content', async () => {
			mockRequestHelper.request.mockResolvedValue({
				choices: [{ message: {} }],
			});

			const result = await chatModel._call([new HumanMessage('Test')], {});
			expect(result).toBe('');
		});
	});

	describe('constructor', () => {
		it('should set default temperature if not provided', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'test',
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});
			expect(model.temperature).toBe(0.7);
		});

		it('should set default maxTokens if not provided', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'test',
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});
			expect(model.maxTokens).toBe(1000);
		});

		it('should preserve provided temperature', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'test',
				temperature: 1.5,
				credentials: { apiKey: 'test' },
				requestHelper: mockRequestHelper,
			});
			expect(model.temperature).toBe(1.5);
		});
	});
});

