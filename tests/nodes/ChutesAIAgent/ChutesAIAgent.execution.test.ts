import {
	ChutesAIAgent,
	formatToolsForModel,
	parseToolCalls,
} from '../../../nodes/ChutesAIAgent/ChutesAIAgent.node';
import { NodeConnectionTypes } from 'n8n-workflow';
import { HumanMessage } from '@langchain/core/messages';

function createContext(overrides: Record<string, any> = {}) {
	const logger = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	return {
		logger,
		getInputData: jest.fn().mockReturnValue([{ json: { chatInput: 'hello' } }]),
		getNode: jest.fn().mockReturnValue({ name: 'ChutesAIAgent' }),
		continueOnFail: jest.fn().mockReturnValue(false),
		getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
			if (name === 'promptType') return 'auto';
			if (name === 'options') return {};
			if (name === 'text') return defaultValue ?? '';
			return defaultValue;
		}),
		getInputConnectionData: jest.fn(async (type: string) => {
			if (type === NodeConnectionTypes.AiLanguageModel) {
				return {
					_call: jest.fn().mockResolvedValue('model-output'),
				};
			}
			throw new Error('not connected');
		}),
		...overrides,
	};
}

describe('ChutesAIAgent execute', () => {
	test('formatToolsForModel applies defaults', () => {
		const out = formatToolsForModel([{ name: 'a' }, { description: 'd' } as any]);
		expect(out[0]).toMatchObject({ name: 'a' });
		expect(out[1]).toMatchObject({ name: 'unnamed_tool', description: 'd' });
	});

	test('parseToolCalls handles string/function_call/tool_calls formats', () => {
		expect(parseToolCalls('plain')).toEqual([]);
		expect(
			parseToolCalls({
				function_call: { name: 'f', arguments: '{"x":1}' },
			}),
		).toEqual([{ name: 'f', args: { x: 1 } }]);
		expect(
			parseToolCalls({
				tool_calls: [{ function: { name: 'g', arguments: '{"y":2}' } }],
			}),
		).toEqual([{ name: 'g', args: { y: 2 } }]);
		expect(
			parseToolCalls({
				tool_calls: [{ name: 'legacy', args: { z: 3 } }],
			}),
		).toEqual([{ name: 'legacy', args: { z: 3 } }]);
		expect(
			parseToolCalls({
				tool_calls: [{ function: { name: 'obj', arguments: { q: 1 } } }],
			}),
		).toEqual([{ name: 'obj', args: { q: 1 } }]);
		expect(
			parseToolCalls({
				function_call: { name: 'obj-args', arguments: { x: 9 } },
			}),
		).toEqual([{ name: 'obj-args', args: { x: 9 } }]);
		expect(
			parseToolCalls({
				tool_calls: [{}],
			}),
		).toEqual([{ name: undefined, args: {} }]);
		expect(
			parseToolCalls({
				function_call: { name: 'bad', arguments: '{oops' },
				tool_calls: [{ function: { name: 'bad2', arguments: '{oops' } }],
			}),
		).toEqual([]);
	});
	test('throws when chat model is missing', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return null;
				throw new Error('not connected');
			}),
		});

		await expect(node.execute.call(ctx as any)).rejects.toThrow('Chat Model must be connected');
	});

	test('uses define prompt mode', async () => {
		const node = new ChutesAIAgent();
		const modelCall = jest.fn().mockResolvedValue('done');
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'promptType') return 'define';
				if (name === 'text') return 'manual prompt';
				if (name === 'options') return { systemMessage: 'sys' };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) {
					return { _call: modelCall };
				}
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);

		expect(modelCall).toHaveBeenCalled();
		expect(out[0][0].json.output).toBe('done');
		expect(out[0][0].json.prompt).toBe('manual prompt');
	});

	test('uses fallback input field when chatInput is absent', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputData: jest.fn().mockReturnValue([{ json: { input: 'from-input' } }]),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.prompt).toBe('from-input');
	});

	test('uses text fallback input field when chatInput and input are absent', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputData: jest.fn().mockReturnValue([{ json: { text: 'from-text' } }]),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.prompt).toBe('from-text');
	});

	test('throws on empty prompt in define mode', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'promptType') return 'define';
				if (name === 'text') return '   ';
				if (name === 'options') return {};
				return defaultValue;
			}),
		});

		await expect(node.execute.call(ctx as any)).rejects.toThrow('Prompt is empty');
	});

	test('returns intermediate steps when enabled and tools run', async () => {
		const node = new ChutesAIAgent();
		const tool = {
			name: 'sum',
			description: 'sum things',
			schema: { type: 'object', properties: {} },
			invoke: jest.fn().mockResolvedValue({ ok: true }),
		};
		const model = {
			_call: jest
				.fn()
				.mockResolvedValueOnce({
					tool_calls: [
						{
							function: {
								name: 'sum',
								arguments: JSON.stringify({ a: 1, b: 2 }),
							},
						},
					],
				})
				.mockResolvedValueOnce('final answer'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'promptType') return 'auto';
				if (name === 'options') return { returnIntermediateSteps: true, maxIterations: 3 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [tool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(tool.invoke).toHaveBeenCalledWith({ a: 1, b: 2 });
		expect(out[0][0].json.output).toBe('final answer');
		expect(Array.isArray((out[0][0].json as any).intermediateSteps)).toBe(true);
	});

	test('supports function_call format tool invocation', async () => {
		const node = new ChutesAIAgent();
		const tool = {
			name: 'sum',
			description: 'sum',
			schema: { type: 'object', properties: {} },
			invoke: jest.fn().mockResolvedValue('3'),
		};
		const model = {
			_call: jest
				.fn()
				.mockResolvedValueOnce({
					function_call: {
						name: 'sum',
						arguments: JSON.stringify({ a: 1, b: 2 }),
					},
				})
				.mockResolvedValueOnce('done'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { returnIntermediateSteps: true, maxIterations: 2 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [tool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(tool.invoke).toHaveBeenCalledWith({ a: 1, b: 2 });
		expect(out[0][0].json.output).toBe('done');
	});

	test('ignores invalid function_call json args and returns model response', async () => {
		const node = new ChutesAIAgent();
		const model = {
			_call: jest.fn().mockResolvedValue({
				function_call: {
					name: 'sum',
					arguments: '{bad json',
				},
				content: 'final',
			}),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 1 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [{ name: 'sum', invoke: jest.fn() }];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('final');
	});

	test('handles tool missing from registry', async () => {
		const node = new ChutesAIAgent();
		const availableTool = {
			name: 'existingTool',
			description: 'available',
			schema: { type: 'object', properties: {} },
			invoke: jest.fn().mockResolvedValue('ok'),
		};
		const model = {
			_call: jest
				.fn()
				.mockResolvedValueOnce({
					tool_calls: [{ function: { name: 'missingTool', arguments: '{}' } }],
				})
				.mockResolvedValueOnce('finished'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { returnIntermediateSteps: true, maxIterations: 2 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [availableTool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('finished');
		const steps = (out[0][0].json as any).intermediateSteps;
		expect(steps[0].observation).toContain('not found');
	});

	test('returns error item when continueOnFail is true', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			continueOnFail: jest.fn().mockReturnValue(true),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.error).toContain('No valid input found');
	});

	test('uses invoke method when _call is unavailable', async () => {
		const node = new ChutesAIAgent();
		const invoke = jest.fn().mockResolvedValue({ text: 'invoked output' });
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { invoke };
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(invoke).toHaveBeenCalled();
		expect(out[0][0].json.output).toBe('invoked output');
	});

	test('throws when connected chat model has no callable method', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return {};
				throw new Error('not connected');
			}),
		});

		await expect(node.execute.call(ctx as any)).rejects.toThrow('does not have a valid call method');
	});

	test('memory load and save paths work, parser failures fall back to raw output', async () => {
		const node = new ChutesAIAgent();
		const memory = {
			loadMemoryVariables: jest.fn().mockResolvedValue({ chat_history: [new HumanMessage('history')] }),
			saveContext: jest.fn().mockRejectedValue(new Error('save failed')),
		};
		const outputParser = {
			parse: jest.fn().mockRejectedValue(new Error('parse failed')),
		};
		const modelCall = jest.fn().mockResolvedValue('answer');
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { _call: modelCall };
				if (type === NodeConnectionTypes.AiMemory) return memory;
				if (type === NodeConnectionTypes.AiOutputParser) return outputParser;
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(memory.loadMemoryVariables).toHaveBeenCalled();
		expect(memory.saveContext).toHaveBeenCalled();
		expect(outputParser.parse).toHaveBeenCalledWith('answer');
		expect(out[0][0].json.output).toBe('answer');
	});

	test('uses invoke in tool loop path', async () => {
		const node = new ChutesAIAgent();
		const model = {
			invoke: jest.fn().mockResolvedValueOnce({
				tool_calls: [{ function: { name: 'sum', arguments: '{"a":1}' } }],
			}),
		};
		const tool = {
			name: 'sum',
			description: 'sum',
			schema: { type: 'object', properties: {} },
			invoke: jest.fn().mockResolvedValue('ok'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 2 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [tool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toContain('tool_calls');
	});

	test('memory load failure is non-fatal', async () => {
		const node = new ChutesAIAgent();
		const memory = {
			loadMemoryVariables: jest.fn().mockRejectedValue(new Error('memory fail')),
		};
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) {
					return { _call: jest.fn().mockResolvedValue('ok') };
				}
				if (type === NodeConnectionTypes.AiMemory) return memory;
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('ok');
	});

	test('handles non-array tool connection payload', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { _call: jest.fn().mockResolvedValue('ok') };
				if (type === NodeConnectionTypes.AiTool) return { name: 'single', invoke: jest.fn() };
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('ok');
	});

	test('memory history non-array is ignored and non-string content logging path executes', async () => {
		const node = new ChutesAIAgent();
		const memory = {
			loadMemoryVariables: jest.fn().mockResolvedValue({ chat_history: [{ content: { a: 1 }, constructor: { name: 'X' } }] }),
		};
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { _call: jest.fn().mockResolvedValue('ok') };
				if (type === NodeConnectionTypes.AiMemory) return memory;
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('ok');
	});

	test('memory history non-array value skips splice branch', async () => {
		const node = new ChutesAIAgent();
		const memory = {
			loadMemoryVariables: jest.fn().mockResolvedValue({ chat_history: 'not-an-array' }),
		};
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { _call: jest.fn().mockResolvedValue('ok') };
				if (type === NodeConnectionTypes.AiMemory) return memory;
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('ok');
	});

	test('simple invoke path falls back to JSON.stringify when no content/text', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return { invoke: jest.fn().mockResolvedValue({ foo: 'bar' }) };
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('{"foo":"bar"}');
	});

	test('tool loop final answer falls back to JSON.stringify for object response', async () => {
		const node = new ChutesAIAgent();
		const model = { _call: jest.fn().mockResolvedValue({ foo: 'bar' }) };
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 1 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [{ name: 't', invoke: jest.fn() }];
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('{"foo":"bar"}');
	});

	test('continueOnFail returns unknown fallback for non-Error thrown before wrapping', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			continueOnFail: jest.fn().mockReturnValue(true),
			getNodeParameter: jest.fn((name: string) => {
				if (name === 'promptType') throw {};
				return {};
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.error).toContain('Unknown error occurred');
	});

	test(
		'simple _call timeout branch executes',
		async () => {
			jest.useFakeTimers();
			try {
				const node = new ChutesAIAgent();
				const ctx = createContext({
					getInputConnectionData: jest.fn(async (type: string) => {
						if (type === NodeConnectionTypes.AiLanguageModel) {
							return { _call: jest.fn().mockImplementation(() => new Promise(() => {})) };
						}
						throw new Error('not connected');
					}),
				});
				const run = node.execute.call(ctx as any);
				const caught = run.catch((error) => error);
				await jest.advanceTimersByTimeAsync(61000);
				const error = await caught;
				expect(error.message).toContain('timeout after 60 seconds');
			} finally {
				jest.useRealTimers();
			}
		},
		20000,
	);

	test(
		'simple invoke timeout branch executes',
		async () => {
			jest.useFakeTimers();
			try {
				const node = new ChutesAIAgent();
				const ctx = createContext({
					getInputConnectionData: jest.fn(async (type: string) => {
						if (type === NodeConnectionTypes.AiLanguageModel) {
							return { invoke: jest.fn().mockImplementation(() => new Promise(() => {})) };
						}
						throw new Error('not connected');
					}),
				});
				const run = node.execute.call(ctx as any);
				const caught = run.catch((error) => error);
				await jest.advanceTimersByTimeAsync(61000);
				const error = await caught;
				expect(error.message).toContain('timeout after 60 seconds');
			} finally {
				jest.useRealTimers();
			}
		},
		20000,
	);

	test('handles nullable connected data for optional inputs', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) {
					return { _call: jest.fn().mockResolvedValue('ok') };
				}
				if (type === NodeConnectionTypes.AiTool) return null;
				if (type === NodeConnectionTypes.AiMemory) return null;
				if (type === NodeConnectionTypes.AiOutputParser) return null;
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('ok');
	});

	test('tool loop supports content-based final object response', async () => {
		const node = new ChutesAIAgent();
		const model = {
			_call: jest.fn().mockResolvedValue({ content: 'content-final' }),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 1 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [{ name: 't', invoke: jest.fn() }];
				throw new Error('not connected');
			}),
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toBe('content-final');
	});

	test('tool loop surfaces invalid model method error path', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 1 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return {};
				if (type === NodeConnectionTypes.AiTool) return [{ name: 't', invoke: jest.fn() }];
				throw new Error('not connected');
			}),
		});

		await expect(node.execute.call(ctx as any)).rejects.toThrow('Chat model execution failed');
	});

	test('tool without invoke/call records tool capability error', async () => {
		const node = new ChutesAIAgent();
		const brokenTool = { name: 'broken', description: 'broken', schema: {} };
		const model = {
			_call: jest
				.fn()
				.mockResolvedValueOnce({
					tool_calls: [{ function: { name: 'broken', arguments: '{}' } }],
				})
				.mockResolvedValueOnce('done'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { returnIntermediateSteps: true, maxIterations: 2 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [brokenTool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		const steps = (out[0][0].json as any).intermediateSteps;
		expect(steps[0].observation).toContain('does not have invoke() or call()');
	});

	test('returns max-iterations fallback message when no final answer produced', async () => {
		const node = new ChutesAIAgent();
		const tool = { name: 'loop', description: 'loop', schema: {}, invoke: jest.fn().mockResolvedValue('ok') };
		const model = {
			_call: jest.fn().mockResolvedValue({
				tool_calls: [{ function: { name: 'loop', arguments: '{}' } }],
			}),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { maxIterations: 1 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [tool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.output).toContain('Max iterations reached');
	});

	test('continueOnFail handles non-Error throw with unknown fallback', async () => {
		const node = new ChutesAIAgent();
		const ctx = createContext({
			continueOnFail: jest.fn().mockReturnValue(true),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) {
					return {
						_call: jest.fn().mockRejectedValue({}),
					};
				}
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.error).toContain('Chat model execution failed');
	});

	test('tool call fallback uses tool.call and captures tool execution errors', async () => {
		const node = new ChutesAIAgent();
		const badTool = {
			name: 'legacy',
			description: 'legacy',
			schema: { type: 'object', properties: {} },
			call: jest.fn().mockRejectedValue(new Error('tool failed')),
		};
		const model = {
			_call: jest
				.fn()
				.mockResolvedValueOnce({
					tool_calls: [{ function: { name: 'legacy', arguments: '{}' } }],
				})
				.mockResolvedValueOnce('done'),
		};
		const ctx = createContext({
			getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) => {
				if (name === 'options') return { returnIntermediateSteps: true, maxIterations: 2 };
				return defaultValue;
			}),
			getInputConnectionData: jest.fn(async (type: string) => {
				if (type === NodeConnectionTypes.AiLanguageModel) return model;
				if (type === NodeConnectionTypes.AiTool) return [badTool];
				throw new Error('not connected');
			}),
		});

		const out = await node.execute.call(ctx as any);
		const steps = (out[0][0].json as any).intermediateSteps;
		expect(steps[0].observation).toContain('tool failed');
	});

});

