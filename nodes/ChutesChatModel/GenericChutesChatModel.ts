import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { IDataObject } from 'n8n-workflow';

interface ChutesChatModelConfig {
	chuteUrl: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	credentials: IDataObject;
	requestHelper: any; // n8n request helper passed from node
}

/**
 * LangChain-compatible chat model for Chutes.ai
 * Integrates with n8n's AI Agent by providing a standardized chat interface
 */
export class GenericChutesChatModel extends SimpleChatModel {
	chuteUrl: string;
	model: string;
	temperature: number;
	maxTokens: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	credentials: IDataObject;
	requestHelper: any;

	constructor(config: ChutesChatModelConfig) {
		super({});
		this.chuteUrl = config.chuteUrl;
		this.model = config.model ?? '';
		this.temperature = config.temperature ?? 0.7;
		this.maxTokens = config.maxTokens ?? 1000;
		this.topP = config.topP;
		this.frequencyPenalty = config.frequencyPenalty;
		this.presencePenalty = config.presencePenalty;
		this.credentials = config.credentials;
		this.requestHelper = config.requestHelper;
	}

	/**
	 * Required by LangChain SimpleChatModel
	 * Combines outputs from multiple calls (for batching)
	 */
	_combineLLMOutput() {
		return {};
	}

	/**
	 * Required by LangChain - returns the model type identifier
	 */
	_llmType(): string {
		return 'chutes-chat-model';
	}

	/**
	 * Main method called by LangChain to generate chat completions
	 * Converts LangChain messages to Chutes.ai format and calls the API
	 */
	async _call(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		runManager?: CallbackManagerForLLMRun,
	): Promise<string> {
		console.log('[GenericChutesChatModel] _call invoked with', messages.length, 'messages');
		console.log('[GenericChutesChatModel] Message types:', messages.map(m => m.constructor.name));
		
		// Convert LangChain messages to Chutes.ai chat completion format
		const formattedMessages = messages.map((message, index) => {
			// Handle plain message objects from ChutesAIAgent (with role already set)
			if (typeof message === 'object' && 'role' in message && typeof message.role === 'string') {
				// This is already a formatted message object from ChutesAIAgent
				// Preserve all properties (role, content, tool_call_id, tool_calls, etc.)
				console.log(`[GenericChutesChatModel] Message ${index}: Pre-formatted with role=${message.role}`);
				return message as any;
			}
			
			let role: 'system' | 'user' | 'assistant';
			
			try {
				// Map LangChain message types to OpenAI-compatible roles
				const messageType = typeof message._getType === 'function' ? message._getType() : message.constructor.name.toLowerCase();
				console.log(`[GenericChutesChatModel] Message ${index} type:`, messageType);
				
				if (messageType === 'system' || messageType.includes('system')) {
					role = 'system';
				} else if (messageType === 'human' || messageType.includes('human')) {
					role = 'user';
				} else if (messageType === 'ai' || messageType.includes('ai')) {
					role = 'assistant';
				} else {
					// Default to user for other message types
					console.log(`[GenericChutesChatModel] Unknown message type: ${messageType}, defaulting to user`);
					role = 'user';
				}
			} catch (error: any) {
				console.error('[GenericChutesChatModel] Error detecting message type:', error.message);
				role = 'user';
			}

			return {
				role,
				content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
			};
		});

		// Build request body for Chutes.ai /v1/chat/completions endpoint
		const body: IDataObject = {
			messages: formattedMessages,
			stream: false, // n8n doesn't support streaming in AI Agent yet
		};

		// Only include model if specified (some chutes auto-select the model)
		if (this.model && this.model !== '') {
			body.model = this.model;
		}

		// Add optional parameters
		if (this.temperature !== undefined) {
			body.temperature = this.temperature;
		}
		if (this.maxTokens !== undefined) {
			body.max_tokens = this.maxTokens;
		}
		if (this.topP !== undefined) {
			body.top_p = this.topP;
		}
		if (this.frequencyPenalty !== undefined) {
			body.frequency_penalty = this.frequencyPenalty;
		}
		if (this.presencePenalty !== undefined) {
			body.presence_penalty = this.presencePenalty;
		}

		// Add stop sequences from options if provided
		if (options.stop) {
			body.stop = options.stop;
		}

		// Add tools for function calling (if provided by AI Agent)
		const optionsAny = options as any;
		if (optionsAny.functions && Array.isArray(optionsAny.functions) && optionsAny.functions.length > 0) {
			// Check if tools are already in OpenAI format (from formatToolsForModel in ChutesAIAgent)
			const firstTool = optionsAny.functions[0];
			if (firstTool.type === 'function' && firstTool.function) {
				// Already in OpenAI format { type: 'function', function: {...} } - use directly
				body.tools = optionsAny.functions;
			} else {
				// Legacy n8n format { name, description, parameters } - wrap in OpenAI format
				body.tools = optionsAny.functions.map((fn: any) => ({
					type: 'function',
					function: {
						name: fn.name,
						description: fn.description,
						parameters: fn.parameters
					}
				}));
			}
			console.log('[GenericChutesChatModel] Added', (body.tools as any[]).length, 'tools to request');
		}

	try {
		console.log('[GenericChutesChatModel] Calling Chutes API:', `${this.chuteUrl}/v1/chat/completions`);
		
		// Log body with image data redacted (for vision models)
		const bodyForLogging = { ...body };
		if (bodyForLogging.messages && Array.isArray(bodyForLogging.messages)) {
			bodyForLogging.messages = bodyForLogging.messages.map((msg: any) => {
				if (msg.content && Array.isArray(msg.content)) {
					return {
						...msg,
						content: msg.content.map((item: any) => {
							if (item.type === 'image_url' && item.image_url) {
								return { type: 'image_url', image_url: '[redacted]' };
							}
							return item;
						}),
					};
				}
				return msg;
			});
		}
		console.log('[GenericChutesChatModel] Request body:', JSON.stringify(bodyForLogging, null, 2));
		
		// Use n8n's request helper to call Chutes.ai API
		const response = await this.requestHelper.request({
			method: 'POST',
			url: `${this.chuteUrl}/v1/chat/completions`,
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.credentials.apiKey}`,
				'User-Agent': 'n8n-ChutesAI-ChatModel/0.0.9',
				'X-Chutes-Source': 'n8n-ai-agent',
			},
			body,
			json: true,
		});
		
		console.log('[GenericChutesChatModel] Got API response');

			// Check if response contains tool calls
			const message = response.choices[0]?.message;
			if (message?.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
				console.log('[GenericChutesChatModel] Response contains', message.tool_calls.length, 'tool call(s)');
				// Return full message object with tool_calls (ChutesAIAgent needs this)
				return message as any;
			}

			// Stream tokens to callback manager if provided (for future streaming support)
			if (runManager && message?.content) {
				await runManager.handleLLMNewToken(message.content);
			}

			// Extract and return the message content (backwards compatibility for non-tool-calling usage)
			// Chutes.ai follows OpenAI format: response.choices[0].message.content
			return message?.content ?? '';
		} catch (error: any) {
			// Provide helpful error messages
			const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
			throw new Error(`Chutes.ai API error: ${errorMessage}`);
		}
	}

	/**
	 * Optional: Override to provide custom model identification
	 */
	get modelName(): string {
		return this.model || 'chutes-default';
	}
}

