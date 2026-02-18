import { ChutesChatModel } from '../../../nodes/ChutesChatModel/ChutesChatModel.node';
import { NodeConnectionTypes } from 'n8n-workflow';

describe('ChutesChatModel Node', () => {
	let chatModelNode: ChutesChatModel;

	beforeEach(() => {
		chatModelNode = new ChutesChatModel();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(chatModelNode.description.displayName).toBe('Chutes Chat Model');
			expect(chatModelNode.description.name).toBe('chutesChatModel');
			expect(chatModelNode.description.version).toBe(1);
		});

		it('should have correct icon', () => {
			expect(chatModelNode.description.icon).toBe('file:chutes.png');
		});

		it('should require chutesApi credentials', () => {
			expect(chatModelNode.description.credentials).toEqual([
				{
					name: 'chutesApi',
					required: true,
				},
			]);
		});

		it('should have no inputs', () => {
			expect(chatModelNode.description.inputs).toEqual([]);
		});

		it('should output AiLanguageModel', () => {
			expect(chatModelNode.description.outputs).toEqual([NodeConnectionTypes.AiLanguageModel]);
		});

		it('should be categorized under AI', () => {
			expect(chatModelNode.description.codex?.categories).toContain('AI');
		});

		it('should have Language Models subcategory', () => {
			expect(chatModelNode.description.codex?.subcategories?.AI).toContain('Language Models');
			expect(chatModelNode.description.codex?.subcategories?.AI).toContain('Chat Models');
		});
	});

	describe('Node Properties', () => {
		it('should have chuteUrl property', () => {
			const chuteUrlProp = chatModelNode.description.properties.find(p => p.name === 'chuteUrl');
			expect(chuteUrlProp).toBeDefined();
			expect(chuteUrlProp?.type).toBe('options');
			expect(chuteUrlProp?.required).toBe(true);
			expect(chuteUrlProp?.default).toBe('https://llm.chutes.ai');
		});

		it('should have model property', () => {
			const modelProp = chatModelNode.description.properties.find(p => p.name === 'model');
			expect(modelProp).toBeDefined();
			expect(modelProp?.type).toBe('options');
			expect(modelProp?.required).toBe(false);
		});

		it('should have temperature property with correct range', () => {
			const tempProp = chatModelNode.description.properties.find(p => p.name === 'temperature');
			expect(tempProp).toBeDefined();
			expect(tempProp?.type).toBe('number');
			expect(tempProp?.default).toBe(0.7);
			expect(tempProp?.typeOptions?.minValue).toBe(0);
			expect(tempProp?.typeOptions?.maxValue).toBe(2);
		});

		it('should have options collection', () => {
			const optionsProp = chatModelNode.description.properties.find(p => p.name === 'options');
			expect(optionsProp).toBeDefined();
			expect(optionsProp?.type).toBe('collection');
		});

		it('should have maxTokens in options', () => {
			const optionsProp = chatModelNode.description.properties.find(p => p.name === 'options');
			const maxTokensOption = optionsProp?.options?.find((o: any) => o.name === 'maxTokens') as any;
			expect(maxTokensOption).toBeDefined();
			expect(maxTokensOption?.type).toBe('number');
			expect(maxTokensOption?.default).toBe(1000);
		});

		it('should have topP in options with correct range', () => {
			const optionsProp = chatModelNode.description.properties.find(p => p.name === 'options');
			const topPOption = optionsProp?.options?.find((o: any) => o.name === 'topP') as any;
			expect(topPOption).toBeDefined();
			expect(topPOption?.typeOptions?.minValue).toBe(0);
			expect(topPOption?.typeOptions?.maxValue).toBe(1);
		});

		it('should have frequencyPenalty in options with correct range', () => {
			const optionsProp = chatModelNode.description.properties.find(p => p.name === 'options');
			const freqPenaltyOption = optionsProp?.options?.find((o: any) => o.name === 'frequencyPenalty') as any;
			expect(freqPenaltyOption).toBeDefined();
			expect(freqPenaltyOption?.typeOptions?.minValue).toBe(-2);
			expect(freqPenaltyOption?.typeOptions?.maxValue).toBe(2);
		});

		it('should have presencePenalty in options with correct range', () => {
			const optionsProp = chatModelNode.description.properties.find(p => p.name === 'options');
			const presPenaltyOption = optionsProp?.options?.find((o: any) => o.name === 'presencePenalty') as any;
			expect(presPenaltyOption).toBeDefined();
			expect(presPenaltyOption?.typeOptions?.minValue).toBe(-2);
			expect(presPenaltyOption?.typeOptions?.maxValue).toBe(2);
		});
	});

	describe('Load Options Methods', () => {
		it('should have getLLMChutes method', () => {
			expect(chatModelNode.methods?.loadOptions?.getLLMChutes).toBeDefined();
		});

		it('should have getModelsForSelectedChute method', () => {
			expect(chatModelNode.methods?.loadOptions?.getModelsForSelectedChute).toBeDefined();
		});
	});

	describe('supplyData Method', () => {
		it('should exist', () => {
			expect(chatModelNode.supplyData).toBeDefined();
			expect(typeof chatModelNode.supplyData).toBe('function');
		});

		it('should return a chat model instance', async () => {
			// Mock the ISupplyDataFunctions context
			const mockContext = {
				getNodeParameter: jest.fn((paramName: string, _itemIndex: number, defaultValue?: any) => {
					const params: any = {
						chuteUrl: 'https://llm.chutes.ai',
						model: 'deepseek-ai/DeepSeek-V3',
						temperature: 0.7,
						options: {},
					};
					return params[paramName] ?? defaultValue;
				}),
				getCredentials: jest.fn().mockResolvedValue({
					apiKey: 'test-api-key',
				}),
				helpers: {
					request: jest.fn(),
				},
			};

			const result = await chatModelNode.supplyData.call(mockContext as any, 0);

			expect(result).toBeDefined();
			expect(result.response).toBeDefined();
			expect((result.response as any)._llmType()).toBe('chutes-chat-model');
		});

		it('should pass all parameters to chat model', async () => {
			const mockContext = {
				getNodeParameter: jest.fn((paramName: string, _itemIndex: number, defaultValue?: any) => {
					const params: any = {
						chuteUrl: 'https://custom.chutes.ai',
						model: 'test-model',
						temperature: 1.2,
						options: {
							maxTokens: 2000,
							topP: 0.95,
							frequencyPenalty: 0.5,
							presencePenalty: 0.3,
						},
					};
					return params[paramName] ?? defaultValue;
				}),
				getCredentials: jest.fn().mockResolvedValue({
					apiKey: 'test-key',
				}),
				helpers: {
					request: jest.fn(),
				},
			};

			const result = await chatModelNode.supplyData.call(mockContext as any, 0);
			const model = result.response as any;

			expect(model.chuteUrl).toBe('https://custom.chutes.ai');
			expect(model.model).toBe('test-model');
			expect(model.temperature).toBe(1.2);
			expect(model.maxTokens).toBe(2000);
			expect(model.topP).toBe(0.95);
			expect(model.frequencyPenalty).toBe(0.5);
			expect(model.presencePenalty).toBe(0.3);
		});

		it('should handle default values correctly', async () => {
			const mockContext = {
				getNodeParameter: jest.fn((paramName: string, _itemIndex: number, defaultValue?: any) => {
					const params: any = {
						chuteUrl: 'https://llm.chutes.ai',
						model: '',
						temperature: 0.7,
						options: {},
					};
					return params[paramName] ?? defaultValue;
				}),
				getCredentials: jest.fn().mockResolvedValue({
					apiKey: 'test-key',
				}),
				helpers: {
					request: jest.fn(),
				},
			};

			const result = await chatModelNode.supplyData.call(mockContext as any, 0);
			const model = result.response as any;

			expect(model.temperature).toBe(0.7);
			expect(model.maxTokens).toBe(1000);
		});
	});
});

