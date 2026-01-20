import {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { GenericChutesChatModel } from './GenericChutesChatModel';
import * as loadChutes from '../Chutes/methods/loadChutes';

export class ChutesChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chutes Chat Model',
		name: 'chutesChatModel',
		icon: 'file:chutes.png',
		group: ['transform'],
		version: 1,
		description: 'Use Chutes.ai LLM models with n8n AI Agent',
		defaults: {
			name: 'Chutes Chat Model',
		},
		credentials: [
			{
				name: 'chutesApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Chat Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/chutesai/n8n-nodes-chutes',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		properties: [
		{
			displayName: 'Chute',
			name: 'chuteUrl',
			type: 'options',
			noDataExpression: false,
			required: false,
			typeOptions: {
				loadOptionsMethod: 'getLLMChutes',
			},
			default: 'https://llm.chutes.ai',
			description: 'Select a specific chute to use or enter a custom chute URL (e.g., from a previous node using expressions)',
			placeholder: 'https://chutes-deepseek-ai-deepseek-v3-2.chutes.ai',
			hint: 'Browse available chutes at <a href="https://chutes.ai/app/playground" target="_blank">Chutes.ai Playground</a>. You can also use expressions like {{ $json.chuteUrl }}',
		},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				default: 0.7,
				description: 'Controls randomness in responses. Lower = more focused, higher = more creative.',
				hint: 'Range: 0.0 to 2.0. Default: 0.7',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1000,
						description: 'Maximum number of tokens to generate in the response',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 1,
						description: 'Nucleus sampling: only tokens with top P probability mass are considered',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						default: 0,
						description: 'Penalize tokens based on their frequency in the text so far',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						default: 0,
						description: 'Penalize tokens based on whether they appear in the text so far',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Reuse load options methods from the main Chutes node
			getLLMChutes: loadChutes.getLLMChutes,
		},
	};

	/**
	 * Supply the chat model instance to n8n's AI Agent
	 * This is the critical method that makes the node compatible with AI Agent
	 */
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		console.log('[ChutesChatModel] supplyData called, itemIndex:', itemIndex);
		
		try {
			const chuteUrl = this.getNodeParameter('chuteUrl', itemIndex) as string;
			console.log('[ChutesChatModel] chuteUrl:', chuteUrl);
			
			// Model is determined by the chute URL itself (e.g., https://chutes-deepseek-ai-deepseek-v3-2.chutes.ai)
			// No separate model parameter needed - leave empty string
			const model = '';
			console.log('[ChutesChatModel] model:', model);
			
			const temperature = this.getNodeParameter('temperature', itemIndex, 0.7) as number;
			const options = this.getNodeParameter('options', itemIndex, {}) as {
				maxTokens?: number;
				topP?: number;
				frequencyPenalty?: number;
				presencePenalty?: number;
			};

			// Get credentials
			console.log('[ChutesChatModel] Getting credentials...');
			const credentials = await this.getCredentials('chutesApi');
			console.log('[ChutesChatModel] Credentials obtained');

			// Create and configure the chat model
			console.log('[ChutesChatModel] Creating GenericChutesChatModel...');
			const chatModel = new GenericChutesChatModel({
				chuteUrl,
				model,
				temperature,
				maxTokens: options.maxTokens,
				topP: options.topP,
				frequencyPenalty: options.frequencyPenalty,
				presencePenalty: options.presencePenalty,
				credentials,
				requestHelper: this.helpers, // Pass n8n request helper to the model
			});
			console.log('[ChutesChatModel] Chat model created successfully');

			return {
				response: chatModel,
			};
		} catch (error) {
			console.error('[ChutesChatModel] Error in supplyData:', error);
			throw error;
		}
	}
}

