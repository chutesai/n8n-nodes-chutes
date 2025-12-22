import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Format tools for the model (function calling format)
 */
function formatToolsForModel(tools: any[]): any[] {
	return tools.map((tool: any) => ({
		name: tool.name || 'unnamed_tool',
		description: tool.description || 'No description provided',
		parameters: tool.schema || {
			type: 'object',
			properties: {},
			required: [],
		},
	}));
}

/**
 * Parse tool calls from model response
 */
function parseToolCalls(response: any): Array<{ name: string; args: any }> {
	const toolCalls: Array<{ name: string; args: any }> = [];

	// If response is a string, no tool calls
	if (typeof response === 'string') {
		return toolCalls;
	}

	// Check for function_call (OpenAI format)
	if (response.function_call) {
		try {
			toolCalls.push({
				name: response.function_call.name,
				args: typeof response.function_call.arguments === 'string'
					? JSON.parse(response.function_call.arguments)
					: response.function_call.arguments,
			});
		} catch (error) {
			// Failed to parse - ignore this tool call
		}
	}

	// Check for tool_calls array (OpenAI format)
	if (Array.isArray(response.tool_calls)) {
		for (const call of response.tool_calls) {
			try {
				toolCalls.push({
					name: call.function?.name || call.name,
					args: typeof call.function?.arguments === 'string'
						? JSON.parse(call.function.arguments)
						: call.function?.arguments || call.args || {},
				});
			} catch (error) {
				// Failed to parse - ignore this tool call
			}
		}
	}

	return toolCalls;
}

// Simplified prompt type options matching n8n's AI Agent
const promptTypeOptions: INodeProperties = {
	displayName: 'Source for Prompt (User Message)',
	name: 'promptType',
	type: 'options',
	options: [
		{
			name: 'Connected Chat Trigger Node',
			value: 'auto',
			description:
				"Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger",
		},
		{
			name: 'Define below',
			value: 'define',
			description: 'Use an expression to reference data in previous nodes or enter static text',
		},
	],
	default: 'auto',
};

const textInput: INodeProperties = {
	displayName: 'Prompt (User Message)',
	name: 'text',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'e.g. Hello, how can you help me?',
	typeOptions: {
		rows: 2,
	},
};

const textFromPreviousNode: INodeProperties = {
	displayName: 'Prompt (User Message)',
	name: 'text',
	type: 'string',
	required: true,
	default: '={{ $json.chatInput }}',
	typeOptions: {
		rows: 2,
	},
};

export class ChutesAIAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chutes AI Agent',
		name: 'chutesAIAgent',
		icon: 'file:chutes.png',
		group: ['transform'],
		version: 1,
		description: 'AI Agent that works exclusively with Chutes Chat Model. Generates an action plan and executes it. Can use external tools.',
		defaults: {
			name: 'Chutes AI Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools', 'Chutes'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/chutesai/n8n-nodes-chutes',
					},
				],
			},
		},
		inputs: [
			NodeConnectionTypes.Main,
			{
				displayName: 'Chat Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
				// Note: Removing filter to allow all AI Language Model nodes
				// The connection type itself provides the filtering
			},
			{
				displayName: 'Tool',
				maxConnections: undefined,
				type: NodeConnectionTypes.AiTool,
				required: false,
			},
			{
				displayName: 'Memory',
				maxConnections: 1,
				type: NodeConnectionTypes.AiMemory,
				required: false,
			},
			{
				displayName: 'Output Parser',
				maxConnections: 1,
				type: NodeConnectionTypes.AiOutputParser,
				required: false,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Tip: This is an alternative to the official n8n AI Agent, configured to work exclusively with the Chutes Chat Model Node.',
				name: 'chutesAgentNotice',
				type: 'notice',
				default: '',
			},
			promptTypeOptions,
			{
				...textFromPreviousNode,
				displayOptions: {
					show: {
						promptType: ['auto'],
					},
				},
			},
			{
				...textInput,
				displayOptions: {
					show: {
						promptType: ['define'],
					},
				},
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			{
				displayName: `Connect an output parser on the canvas to specify the output format you require`,
				name: 'outputParserNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						hasOutputParser: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						default: 'You are a helpful AI assistant.',
						description: 'Instructions for the AI agent behavior',
						typeOptions: {
							rows: 4,
						},
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'Maximum number of iterations the agent can take',
						typeOptions: {
							minValue: 1,
						},
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description: 'Whether to return the agent\'s intermediate steps',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		console.log('[ChutesAIAgent] Execute method started');
		const items = this.getInputData();
		console.log('[ChutesAIAgent] Got input data:', items.length, 'items');
		const returnData: INodeExecutionData[] = [];

		// Get chat model from connection
		console.log('[ChutesAIAgent] Getting chat model connection...');
		const chatModelData = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as any;
		console.log('[ChutesAIAgent] Chat model data:', chatModelData ? 'exists' : 'null');

		if (!chatModelData) {
			throw new NodeOperationError(
				this.getNode(),
				'Chat Model must be connected. Please connect a Chutes Chat Model node to the Chat Model input.',
			);
		}

		// Get connected tools (optional) - n8n returns ALL tools at index 0 as an array
		console.log('[ChutesAIAgent] Getting tools...');
		let tools: any[] = [];
		try {
			const connectedTools = (await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0)) as any;
			tools = connectedTools ? (Array.isArray(connectedTools) ? connectedTools : [connectedTools]).flat() : [];
			console.log('[ChutesAIAgent] Found', tools.length, 'tools');
		} catch (error) {
			console.log('[ChutesAIAgent] No tools connected (this is OK)');
		}

		// Get memory (optional)
		console.log('[ChutesAIAgent] Getting memory...');
		let memory: any = undefined;
		try {
			memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as any;
			console.log('[ChutesAIAgent] Memory:', memory ? 'connected' : 'not connected');
		} catch (error) {
			console.log('[ChutesAIAgent] No memory connected (this is OK)');
		}

		// Get output parser (optional)
		console.log('[ChutesAIAgent] Getting output parser...');
		let outputParser: any = undefined;
		try {
			outputParser = (await this.getInputConnectionData(NodeConnectionTypes.AiOutputParser, 0)) as any;
			console.log('[ChutesAIAgent] Output parser:', outputParser ? 'connected' : 'not connected');
		} catch (error) {
			console.log('[ChutesAIAgent] No output parser connected (this is OK)');
		}

		// Process each input item
		console.log('[ChutesAIAgent] Processing items...');
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			console.log('[ChutesAIAgent] Processing item', itemIndex);
			try {
				// Get prompt based on promptType setting
				const promptType = this.getNodeParameter('promptType', itemIndex) as string;
				let prompt: string;

				if (promptType === 'define') {
					prompt = this.getNodeParameter('text', itemIndex) as string;
				} else {
					// Auto mode - look for chatInput field
					const inputData = items[itemIndex].json;
					if (typeof inputData.chatInput === 'string') {
						prompt = inputData.chatInput;
					} else if (typeof inputData.input === 'string') {
						prompt = inputData.input;
					} else if (typeof inputData.text === 'string') {
						prompt = inputData.text;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							'No valid input found. Please provide a "chatInput", "input", or "text" field, or use "Define below" mode.',
						);
					}
				}

				if (!prompt || prompt.trim() === '') {
					throw new NodeOperationError(
						this.getNode(),
						'Prompt is empty. Please provide a message for the AI agent.',
					);
				}

				// Get options
				const options = this.getNodeParameter('options', itemIndex, {}) as any;
				const systemMessage = options.systemMessage || 'You are a helpful AI assistant.';
				const maxIterations = options.maxIterations || 10;
				const returnIntermediateSteps = options.returnIntermediateSteps || false;

			// Build conversation with system message and user prompt using LangChain message types
			const messages: any[] = [
				new SystemMessage(systemMessage),
				new HumanMessage(prompt),
			];

			// If memory is connected, prepend conversation history
			if (memory && typeof memory.loadMemoryVariables === 'function') {
				try {
					const memoryVars = await memory.loadMemoryVariables({ input: prompt });
					if (memoryVars.chat_history && Array.isArray(memoryVars.chat_history)) {
						// Insert history after system message but before current prompt
						messages.splice(1, 0, ...memoryVars.chat_history);
					}
				} catch (error) {
					// Memory load failed - continue without history
					this.logger.warn(`Failed to load memory: ${(error as Error).message}`);
				}
			}

			// Execute agent loop with tool calling
			let agentOutput = '';
			const intermediateSteps: any[] = [];

		// If no tools are connected, just do a simple chat completion
		if (tools.length === 0) {
			try {
				this.logger.info(`[ChutesAIAgent] Calling chat model with ${messages.length} messages`);
				this.logger.debug(`[ChutesAIAgent] Messages: ${JSON.stringify(messages.map((m: any) => ({ type: m.constructor.name, content: typeof m.content === 'string' ? m.content.substring(0, 100) : 'non-string' })))}`);
				
				// For simple chat, call the model directly
				if (typeof chatModelData._call === 'function') {
					this.logger.info('[ChutesAIAgent] Using _call method');
					agentOutput = await Promise.race([
						chatModelData._call(messages, {}),
						new Promise((_, reject) => setTimeout(() => reject(new Error('Chat model call timeout after 60 seconds')), 60000))
					]) as string;
					this.logger.info(`[ChutesAIAgent] Got response: ${agentOutput.substring(0, 100)}...`);
				} else if (typeof chatModelData.invoke === 'function') {
					this.logger.info('[ChutesAIAgent] Using invoke method');
					const result = await Promise.race([
						chatModelData.invoke(messages, {}),
						new Promise((_, reject) => setTimeout(() => reject(new Error('Chat model invoke timeout after 60 seconds')), 60000))
					]);
					agentOutput = (result as any).content || (result as any).text || JSON.stringify(result);
					this.logger.info(`[ChutesAIAgent] Got response: ${agentOutput.substring(0, 100)}...`);
				} else {
					throw new Error('Connected chat model does not have a valid call method');
				}
			} catch (error: any) {
				this.logger.error(`[ChutesAIAgent] Error: ${error.message}`);
				this.logger.error(`[ChutesAIAgent] Stack: ${error.stack}`);
				throw new NodeOperationError(
					this.getNode(),
					`Chat model execution failed: ${error.message}${error.stack ? '\n' + error.stack : ''}`,
					{ itemIndex },
				);
			}
		} else {
				// Tool calling mode - run agent loop
				let currentMessages = [...messages];

				// Format tools for function calling if available
				const toolDefinitions = formatToolsForModel(tools);

				for (let iteration = 0; iteration < maxIterations; iteration++) {
					// Call the chat model
					let response: any;
					try {
						const callOptions: any = {
							functions: toolDefinitions,
						};

						if (typeof chatModelData._call === 'function') {
							// LangChain SimpleChatModel
							response = await chatModelData._call(currentMessages, callOptions);
						} else if (typeof chatModelData.invoke === 'function') {
							// LangChain runnable
							const result = await chatModelData.invoke(currentMessages, callOptions);
							response = result.content || result.text || JSON.stringify(result);
						} else {
							throw new Error('Connected chat model does not have a valid call method');
						}
					} catch (error: any) {
						throw new NodeOperationError(
							this.getNode(),
							`Chat model execution failed: ${error.message}`,
							{ itemIndex },
						);
					}

					// Handle response - check if it's a tool call or final answer
					const toolCalls = parseToolCalls(response);

					if (toolCalls.length === 0) {
						// No tool calls - this is the final answer
						agentOutput = typeof response === 'string' ? response : response.content || JSON.stringify(response);
						break;
					}

					// Execute each tool call
					for (const toolCall of toolCalls) {
						const tool = tools.find((t: any) => t.name === toolCall.name);

						if (!tool) {
							const errorMsg = `Tool "${toolCall.name}" not found. Available tools: ${tools.map((t: any) => t.name).join(', ')}`;
							currentMessages.push({
								role: 'function',
								name: toolCall.name,
								content: JSON.stringify({ error: errorMsg }),
							});
							intermediateSteps.push({
								action: toolCall,
								observation: errorMsg,
							});
							continue;
						}

						// Execute the tool
						let toolResult: any;
						try {
							if (typeof tool.invoke === 'function') {
								toolResult = await tool.invoke(toolCall.args);
							} else if (typeof tool.call === 'function') {
								toolResult = await tool.call(toolCall.args);
							} else {
								throw new Error(`Tool "${toolCall.name}" does not have invoke() or call() method`);
							}
						} catch (error: any) {
							toolResult = { error: error.message };
						}

						// Add tool result to conversation
						currentMessages.push({
							role: 'function',
							name: toolCall.name,
							content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
						});

						// Track intermediate step
						intermediateSteps.push({
							action: {
								tool: toolCall.name,
								toolInput: toolCall.args,
								log: `Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
							},
							observation: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
						});
					}

					// Add assistant message indicating tool calls were made
					currentMessages.push({
						role: 'assistant',
						content: `Used tools: ${toolCalls.map((t: any) => t.name).join(', ')}`,
					});
				}

				if (!agentOutput) {
					agentOutput = 'Max iterations reached without final answer. Please try rephrasing your question or reducing complexity.';
				}
			}

			// Apply output parser if connected
			let finalOutput: any = agentOutput;
			if (outputParser && typeof outputParser.parse === 'function') {
				try {
					finalOutput = await outputParser.parse(agentOutput);
				} catch (error: any) {
					this.logger.warn(`Output parser failed: ${error.message}. Using raw output.`);
				}
			}

			// Save to memory if connected
			if (memory && typeof memory.saveContext === 'function') {
				try {
					await memory.saveContext({ input: prompt }, { output: agentOutput });
				} catch (error: any) {
					this.logger.warn(`Failed to save to memory: ${error.message}`);
				}
			}

			// Build output
			const output: any = {
				output: finalOutput,
				prompt,
			};

			if (returnIntermediateSteps && intermediateSteps.length > 0) {
				output.intermediateSteps = intermediateSteps;
			}

			returnData.push({
				json: output,
				pairedItem: {
					item: itemIndex,
				},
			});
			} catch (error) {
				if (this.continueOnFail()) {
					const err = error as Error;
					returnData.push({
						json: {
							error: err.message || 'Unknown error occurred',
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
