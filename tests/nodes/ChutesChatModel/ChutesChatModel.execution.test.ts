/**
 * ChutesChatModel Execution Tests
 * 
 * TDD: These tests cover the supplyData method and GenericChutesChatModel execution
 * Following the TDD cycle: Failing test -> Implementation -> Passing test
 */

import { ChutesChatModel } from '../../../nodes/ChutesChatModel/ChutesChatModel.node';
import { GenericChutesChatModel } from '../../../nodes/ChutesChatModel/GenericChutesChatModel';
import { ISupplyDataFunctions } from 'n8n-workflow';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

// Create mock supply data context
function createMockSupplyDataContext(options: {
	nodeParameters?: Record<string, any>;
	credentials?: Record<string, any>;
	requestMock?: jest.Mock;
}): Partial<ISupplyDataFunctions> {
	const {
		nodeParameters = {},
		credentials = { apiKey: 'test-api-key' },
		requestMock = jest.fn(),
	} = options;

	const defaultParams: Record<string, any> = {
		chuteUrl: 'https://llm.chutes.ai',
		temperature: 0.7,
		options: {
			maxTokens: 1000,
			topP: 1,
			frequencyPenalty: 0,
			presencePenalty: 0,
		},
		...nodeParameters,
	};

	return {
		getNodeParameter: jest.fn((_paramName: string, _itemIndex: number, defaultValue?: any) => {
			const parts = _paramName.split('.');
			let value = defaultParams;
			for (const part of parts) {
				value = value?.[part];
			}
			return value !== undefined ? value : defaultValue;
		}),
		getCredentials: jest.fn().mockResolvedValue(credentials),
		helpers: {
			request: requestMock,
		} as any,
	};
}

describe('ChutesChatModel Execution Tests', () => {
	let chatModelNode: ChutesChatModel;

	beforeEach(() => {
		chatModelNode = new ChutesChatModel();
		jest.clearAllMocks();
	});

	describe('supplyData Method', () => {
		it('should return a GenericChutesChatModel instance', async () => {
			const context = createMockSupplyDataContext({});

			const result = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);

			expect(result).toBeDefined();
			expect(result.response).toBeDefined();
			expect(result.response).toBeInstanceOf(GenericChutesChatModel);
		});

		it('should configure model with correct parameters', async () => {
			const context = createMockSupplyDataContext({
				nodeParameters: {
					chuteUrl: 'https://custom-llm.chutes.ai',
					temperature: 0.5,
					options: {
						maxTokens: 2000,
						topP: 0.9,
						frequencyPenalty: 0.5,
						presencePenalty: 0.3,
					},
				},
			});

			const result = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);
			const model = result.response as GenericChutesChatModel;

			expect(model.chuteUrl).toBe('https://custom-llm.chutes.ai');
			expect(model.model).toBe(''); // Model is empty - chute URL specifies the model
			expect(model.temperature).toBe(0.5);
			expect(model.maxTokens).toBe(2000);
			expect(model.topP).toBe(0.9);
			expect(model.frequencyPenalty).toBe(0.5);
			expect(model.presencePenalty).toBe(0.3);
		});

		it('should use default values when options not provided', async () => {
			const context = createMockSupplyDataContext({
				nodeParameters: {
					chuteUrl: 'https://llm.chutes.ai',
					temperature: 0.7,
					options: {},
				},
			});

			const result = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);
			const model = result.response as GenericChutesChatModel;

			expect(model.temperature).toBe(0.7);
			expect(model.maxTokens).toBe(1000); // Default
		});

		it('should pass credentials to the model', async () => {
			const context = createMockSupplyDataContext({
				credentials: { apiKey: 'my-secret-key' },
			});

			const result = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);
			const model = result.response as GenericChutesChatModel;

			expect(model.credentials).toEqual({ apiKey: 'my-secret-key' });
		});

		it('should pass request helper to the model', async () => {
			const mockRequest = jest.fn();
			const context = createMockSupplyDataContext({
				requestMock: mockRequest,
			});

			const result = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);
			const model = result.response as GenericChutesChatModel;

			expect(model.requestHelper).toBeDefined();
		});
	});

	describe('GenericChutesChatModel', () => {
		it('should have correct _llmType', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: jest.fn() },
			});

			expect(model._llmType()).toBe('chutes-chat-model');
		});

		it('should return model name when specified', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'my-custom-model',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: jest.fn() },
			});

			expect(model.modelName).toBe('my-custom-model');
		});

		it('should return default model name when model not specified', () => {
			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: jest.fn() },
			});

			expect(model.modelName).toBe('chutes-default');
		});
	});

	describe('GenericChutesChatModel _call Method', () => {
		it('should convert messages to correct format', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response from model' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				temperature: 0.7,
				maxTokens: 1000,
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			const messages = [
				new SystemMessage('You are a helpful assistant'),
				new HumanMessage('Hello!'),
				new AIMessage('Hi there!'),
				new HumanMessage('How are you?'),
			];

			await model._call(messages, {});

			// Verify the request was called with correct message format
			expect(mockRequest).toHaveBeenCalledTimes(1);
			const requestArgs = mockRequest.mock.calls[0][0];
			
			expect(requestArgs.body.messages).toEqual([
				{ role: 'system', content: 'You are a helpful assistant' },
				{ role: 'user', content: 'Hello!' },
				{ role: 'assistant', content: 'Hi there!' },
				{ role: 'user', content: 'How are you?' },
			]);
		});

		it('should include model parameters in request', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: 'deepseek-ai/DeepSeek-V3',
				temperature: 0.8,
				maxTokens: 500,
				topP: 0.95,
				frequencyPenalty: 0.2,
				presencePenalty: 0.1,
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			await model._call([new HumanMessage('Test')], {});

			const requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.model).toBe('deepseek-ai/DeepSeek-V3');
			expect(requestArgs.body.temperature).toBe(0.8);
			expect(requestArgs.body.max_tokens).toBe(500);
			expect(requestArgs.body.top_p).toBe(0.95);
			expect(requestArgs.body.frequency_penalty).toBe(0.2);
			expect(requestArgs.body.presence_penalty).toBe(0.1);
			expect(requestArgs.body.stream).toBe(false);
		});

		it('should use correct API endpoint', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://custom-chute.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			await model._call([new HumanMessage('Test')], {});

			const requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.url).toBe('https://custom-chute.chutes.ai/v1/chat/completions');
		});

		it('should include authorization header', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'my-secret-key' },
				requestHelper: { request: mockRequest },
			});

			await model._call([new HumanMessage('Test')], {});

			const requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.headers.Authorization).toBe('Bearer my-secret-key');
		});

		it('should return content from response', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'This is the AI response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			const result = await model._call([new HumanMessage('Test')], {});

			expect(result).toBe('This is the AI response');
		});

		it('should handle empty content gracefully', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: '' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			const result = await model._call([new HumanMessage('Test')], {});

			expect(result).toBe('');
		});

		it('should throw error on API failure', async () => {
			const mockRequest = jest.fn().mockRejectedValue(new Error('API Error: Rate limited'));

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			await expect(model._call([new HumanMessage('Test')], {}))
				.rejects.toThrow('Chutes.ai API error');
		});

		it('should include stop sequences when provided', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			await model._call([new HumanMessage('Test')], { stop: ['END', 'STOP'] });

			const requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.stop).toEqual(['END', 'STOP']);
		});

		it('should not include model in request when empty', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			await model._call([new HumanMessage('Test')], {});

			const requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.model).toBeUndefined();
		});

		it('should handle different message types correctly', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'Response' } }],
			});

			const model = new GenericChutesChatModel({
				chuteUrl: 'https://llm.chutes.ai',
				model: '',
				credentials: { apiKey: 'test-key' },
				requestHelper: { request: mockRequest },
			});

			// Test with only system message
			await model._call([new SystemMessage('System only')], {});
			let requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.messages[0].role).toBe('system');

			// Test with only human message
			mockRequest.mockClear();
			await model._call([new HumanMessage('Human only')], {});
			requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.messages[0].role).toBe('user');

			// Test with only AI message
			mockRequest.mockClear();
			await model._call([new AIMessage('AI only')], {});
			requestArgs = mockRequest.mock.calls[0][0];
			expect(requestArgs.body.messages[0].role).toBe('assistant');
		});
	});

	describe('Integration with n8n AI Agent', () => {
		it('should be compatible as AI Language Model output', async () => {
			const mockRequest = jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'AI Agent compatible response' } }],
			});

			const context = createMockSupplyDataContext({
				requestMock: mockRequest,
			});

			// Simulate what AI Agent does: get the model from supplyData
			const supplyResult = await chatModelNode.supplyData.call(context as ISupplyDataFunctions, 0);
			const model = supplyResult.response as GenericChutesChatModel;

			// AI Agent calls _call method
			const result = await model._call([
				new SystemMessage('You are a helpful assistant'),
				new HumanMessage('What is 2+2?'),
			], {});

			expect(result).toBe('AI Agent compatible response');
			expect(mockRequest).toHaveBeenCalledTimes(1);
		});
	});
});

