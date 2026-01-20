/**
 * ChutesAIAgent Execution Tests
 * 
 * TDD: These tests cover the execute() method with mocked dependencies
 * Following the TDD cycle: Failing test -> Implementation -> Passing test
 */

import { ChutesAIAgent } from '../../../nodes/ChutesAIAgent/ChutesAIAgent.node';
import { IExecuteFunctions, INodeExecutionData, NodeConnectionTypes } from 'n8n-workflow';

// Mock chat model that returns predefined responses
function createMockChatModel(response: string) {
	return {
		_call: jest.fn().mockResolvedValue(response),
		invoke: jest.fn().mockResolvedValue({ content: response }),
		_llmType: () => 'mock-chat-model',
	};
}

// Mock tool that can be called by the agent
function createMockTool(name: string, result: string) {
	return {
		name,
		description: `A mock tool called ${name}`,
		schema: { type: 'object', properties: {}, required: [] },
		invoke: jest.fn().mockResolvedValue(result),
		call: jest.fn().mockResolvedValue(result),
	};
}

// Mock memory that stores conversation history
function createMockMemory() {
	const history: any[] = [];
	return {
		loadMemoryVariables: jest.fn().mockResolvedValue({ chat_history: history }),
		saveContext: jest.fn().mockImplementation((input, output) => {
			history.push({ input, output });
			return Promise.resolve();
		}),
	};
}

// Mock output parser
function createMockOutputParser(parsedResult: any) {
	return {
		parse: jest.fn().mockResolvedValue(parsedResult),
	};
}

// Create mock execution context
function createMockExecutionContext(options: {
	inputData?: INodeExecutionData[];
	nodeParameters?: Record<string, any>;
	chatModel?: any;
	tools?: any[];
	memory?: any;
	outputParser?: any;
}): Partial<IExecuteFunctions> {
	const {
		inputData = [{ json: { chatInput: 'Hello, world!' } }],
		nodeParameters = {},
		chatModel = null,
		tools = [],
		memory = null,
		outputParser = null,
	} = options;

	const defaultParams: Record<string, any> = {
		promptType: 'auto',
		text: '={{ $json.chatInput }}',
		options: {
			systemMessage: 'You are a helpful AI assistant.',
			maxIterations: 10,
			returnIntermediateSteps: false,
		},
		...nodeParameters,
	};

	return {
		getInputData: jest.fn().mockReturnValue(inputData),
		getNodeParameter: jest.fn((name: string, _itemIndex: number, defaultValue?: any) => {
			// Handle nested paths like 'options.systemMessage'
			const parts = name.split('.');
			let value = defaultParams;
			for (const part of parts) {
				value = value?.[part];
			}
			return value !== undefined ? value : defaultValue;
		}),
		getInputConnectionData: jest.fn().mockImplementation(async (type: string, _index: number) => {
			if (type === NodeConnectionTypes.AiLanguageModel) {
				return chatModel;
			}
			if (type === NodeConnectionTypes.AiTool) {
				// n8n returns all tools as an array at index 0
				return tools.length > 0 ? tools : null;
			}
			if (type === NodeConnectionTypes.AiMemory) {
				return memory;
			}
			if (type === NodeConnectionTypes.AiOutputParser) {
				return outputParser;
			}
			return null;
		}),
		getNode: jest.fn().mockReturnValue({ name: 'Chutes AI Agent', type: 'chutesAIAgent' }),
		continueOnFail: jest.fn().mockReturnValue(false),
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		},
	};
}

describe('ChutesAIAgent Execution Tests', () => {
	let agentNode: ChutesAIAgent;

	beforeEach(() => {
		agentNode = new ChutesAIAgent();
		jest.clearAllMocks();
	});

	describe('Basic Chat (No Tools)', () => {
		it('should execute basic chat and return response', async () => {
			const mockResponse = 'Hello! I am an AI assistant. How can I help you today?';
			const mockChatModel = createMockChatModel(mockResponse);

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Hello!' } }],
				chatModel: mockChatModel,
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(result).toHaveLength(1); // One output array
			expect(result[0]).toHaveLength(1); // One item
			expect(result[0][0].json.output).toBe(mockResponse);
			expect(result[0][0].json.prompt).toBe('Hello!');
			expect(mockChatModel._call).toHaveBeenCalled();
		});

		it('should throw error when chat model is not connected', async () => {
			const context = createMockExecutionContext({
				chatModel: null,
			});

			await expect(agentNode.execute.call(context as IExecuteFunctions))
				.rejects.toThrow('Chat Model must be connected');
		});

		it('should throw error when prompt is empty', async () => {
			const mockChatModel = createMockChatModel('response');
			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: '' } }],
				chatModel: mockChatModel,
			});

			await expect(agentNode.execute.call(context as IExecuteFunctions))
				.rejects.toThrow('Prompt is empty');
		});

		it('should use define mode when promptType is define', async () => {
			const mockResponse = 'Response to custom prompt';
			const mockChatModel = createMockChatModel(mockResponse);

			const context = createMockExecutionContext({
				inputData: [{ json: {} }],
				chatModel: mockChatModel,
				nodeParameters: {
					promptType: 'define',
					text: 'My custom prompt',
				},
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(result[0][0].json.prompt).toBe('My custom prompt');
		});

		it('should look for alternative input fields (input, text) in auto mode', async () => {
			const mockResponse = 'Response';
			const mockChatModel = createMockChatModel(mockResponse);

			// Test with 'input' field
			const contextWithInput = createMockExecutionContext({
				inputData: [{ json: { input: 'From input field' } }],
				chatModel: mockChatModel,
			});

			const result1 = await agentNode.execute.call(contextWithInput as IExecuteFunctions);
			expect(result1[0][0].json.prompt).toBe('From input field');

			// Test with 'text' field
			const contextWithText = createMockExecutionContext({
				inputData: [{ json: { text: 'From text field' } }],
				chatModel: mockChatModel,
			});

			const result2 = await agentNode.execute.call(contextWithText as IExecuteFunctions);
			expect(result2[0][0].json.prompt).toBe('From text field');
		});
	});

	describe('Tool Calling', () => {
		it('should call tools when model returns tool calls', async () => {
			// Create a mock that first returns a tool call, then a final answer
			const mockChatModel = {
				_call: jest.fn()
					.mockResolvedValueOnce({
						tool_calls: [{
							function: {
								name: 'calculator',
								arguments: JSON.stringify({ expression: '2+2' }),
							},
						}],
					})
					.mockResolvedValueOnce('The result of 2+2 is 4'),
				_llmType: () => 'mock-chat-model',
			};

			const mockTool = createMockTool('calculator', '4');

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'What is 2+2?' } }],
				chatModel: mockChatModel,
				tools: [mockTool],
			});

		const result = await agentNode.execute.call(context as IExecuteFunctions);

		// After normalization, single-property args objects are extracted to their value
		// This matches how LangChain simple tools (Calculator, Wikipedia, etc.) expect input
		expect(mockTool.invoke).toHaveBeenCalledWith('2+2');
		expect(result[0][0].json.output).toBe('The result of 2+2 is 4');
		});

		it('should handle tool not found error gracefully', async () => {
			const mockChatModel = {
				_call: jest.fn()
					.mockResolvedValueOnce({
						tool_calls: [{
							function: {
								name: 'nonexistent_tool',
								arguments: '{}',
							},
						}],
					})
					.mockResolvedValueOnce('I could not find that tool'),
				_llmType: () => 'mock-chat-model',
			};

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Use a tool' } }],
				chatModel: mockChatModel,
				tools: [createMockTool('other_tool', 'result')],
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			// Should continue and return response despite tool not found
			expect(result[0][0].json.output).toBe('I could not find that tool');
		});

		it('should return intermediate steps when enabled', async () => {
			const mockChatModel = {
				_call: jest.fn()
					.mockResolvedValueOnce({
						tool_calls: [{
							function: {
								name: 'search',
								arguments: JSON.stringify({ query: 'weather' }),
							},
						}],
					})
					.mockResolvedValueOnce('The weather is sunny'),
				_llmType: () => 'mock-chat-model',
			};

			const mockTool = createMockTool('search', 'Sunny, 72°F');

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'What is the weather?' } }],
				chatModel: mockChatModel,
				tools: [mockTool],
				nodeParameters: {
					options: {
						returnIntermediateSteps: true,
					},
				},
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(result[0][0].json.intermediateSteps).toBeDefined();
			expect(Array.isArray(result[0][0].json.intermediateSteps)).toBe(true);
			expect((result[0][0].json.intermediateSteps as any[]).length).toBeGreaterThan(0);
		});
	});

	describe('Memory Integration', () => {
		it('should load memory variables before processing', async () => {
			const mockResponse = 'I remember our conversation';
			const mockChatModel = createMockChatModel(mockResponse);
			const mockMemory = createMockMemory();

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Do you remember?' } }],
				chatModel: mockChatModel,
				memory: mockMemory,
			});

			await agentNode.execute.call(context as IExecuteFunctions);

			expect(mockMemory.loadMemoryVariables).toHaveBeenCalled();
		});

		it('should save context to memory after processing', async () => {
			const mockResponse = 'Hello! Nice to meet you.';
			const mockChatModel = createMockChatModel(mockResponse);
			const mockMemory = createMockMemory();

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Hi there!' } }],
				chatModel: mockChatModel,
				memory: mockMemory,
			});

			await agentNode.execute.call(context as IExecuteFunctions);

			expect(mockMemory.saveContext).toHaveBeenCalledWith(
				{ input: 'Hi there!' },
				{ output: mockResponse }
			);
		});

		it('should handle memory errors gracefully', async () => {
			const mockResponse = 'Response without memory';
			const mockChatModel = createMockChatModel(mockResponse);
			const mockMemory = {
				loadMemoryVariables: jest.fn().mockRejectedValue(new Error('Memory error')),
				saveContext: jest.fn().mockRejectedValue(new Error('Save error')),
			};

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Hello' } }],
				chatModel: mockChatModel,
				memory: mockMemory,
			});

			// Should not throw, should continue without memory
			const result = await agentNode.execute.call(context as IExecuteFunctions);
			expect(result[0][0].json.output).toBe(mockResponse);
		});
	});

	describe('Output Parser Integration', () => {
		it('should apply output parser to final response', async () => {
			const mockResponse = '{"name": "John", "age": 30}';
			const mockChatModel = createMockChatModel(mockResponse);
			const mockOutputParser = createMockOutputParser({ name: 'John', age: 30 });

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Get user data' } }],
				chatModel: mockChatModel,
				outputParser: mockOutputParser,
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(mockOutputParser.parse).toHaveBeenCalledWith(mockResponse);
			expect(result[0][0].json.output).toEqual({ name: 'John', age: 30 });
		});

		it('should use raw output when parser fails', async () => {
			const mockResponse = 'Invalid JSON response';
			const mockChatModel = createMockChatModel(mockResponse);
			const mockOutputParser = {
				parse: jest.fn().mockRejectedValue(new Error('Parse error')),
			};

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Get data' } }],
				chatModel: mockChatModel,
				outputParser: mockOutputParser,
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			// Should fallback to raw output
			expect(result[0][0].json.output).toBe(mockResponse);
		});
	});

	describe('Max Iterations', () => {
		it('should stop after max iterations and return message', async () => {
			// Mock that always returns tool calls (infinite loop scenario)
			const mockChatModel = {
				_call: jest.fn().mockResolvedValue({
					tool_calls: [{
						function: {
							name: 'loop_tool',
							arguments: '{}',
						},
					}],
				}),
				_llmType: () => 'mock-chat-model',
			};

			const mockTool = createMockTool('loop_tool', 'loop result');

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Loop forever' } }],
				chatModel: mockChatModel,
				tools: [mockTool],
				nodeParameters: {
					options: {
						maxIterations: 3,
					},
				},
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			// Should have called tool 3 times (max iterations)
			expect(mockTool.invoke).toHaveBeenCalledTimes(3);
			// Should return max iterations message
			expect(result[0][0].json.output).toContain('Max iterations reached');
		});
	});

	describe('Error Handling', () => {
		it('should handle chat model errors', async () => {
			const mockChatModel = {
				_call: jest.fn().mockRejectedValue(new Error('API Error')),
				_llmType: () => 'mock-chat-model',
			};

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Hello' } }],
				chatModel: mockChatModel,
			});

			await expect(agentNode.execute.call(context as IExecuteFunctions))
				.rejects.toThrow('Chat model execution failed');
		});

		it('should continue on fail when enabled', async () => {
			const mockChatModel = {
				_call: jest.fn().mockRejectedValue(new Error('API Error')),
				_llmType: () => 'mock-chat-model',
			};

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Hello' } }],
				chatModel: mockChatModel,
			});
			(context.continueOnFail as jest.Mock).mockReturnValue(true);

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(result[0][0].json.error).toBeDefined();
		});

		it('should process multiple items', async () => {
			const mockChatModel = createMockChatModel('Response');

			const context = createMockExecutionContext({
				inputData: [
					{ json: { chatInput: 'First message' } },
					{ json: { chatInput: 'Second message' } },
					{ json: { chatInput: 'Third message' } },
				],
				chatModel: mockChatModel,
			});

			const result = await agentNode.execute.call(context as IExecuteFunctions);

			expect(result[0]).toHaveLength(3);
			expect(result[0][0].json.prompt).toBe('First message');
			expect(result[0][1].json.prompt).toBe('Second message');
			expect(result[0][2].json.prompt).toBe('Third message');
		});
	});

	describe('System Message', () => {
		it('should include system message in chat', async () => {
			const mockResponse = 'I am a pirate assistant!';
			const mockChatModel = createMockChatModel(mockResponse);

			const context = createMockExecutionContext({
				inputData: [{ json: { chatInput: 'Who are you?' } }],
				chatModel: mockChatModel,
				nodeParameters: {
					options: {
						systemMessage: 'You are a pirate. Respond in pirate speak.',
					},
				},
			});

			await agentNode.execute.call(context as IExecuteFunctions);

			// The system message should be included in the call
			const callArgs = mockChatModel._call.mock.calls[0][0];
			expect(callArgs[0].content).toContain('pirate');
		});
	});
});

