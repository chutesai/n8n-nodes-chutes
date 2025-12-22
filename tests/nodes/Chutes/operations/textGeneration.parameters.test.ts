/**
 * TDD Tests for Text Generation Operation Parameters
 * Focus: Selectors, visibility, validation, ranges
 * Priority: CRITICAL (main pain point)
 */

import { textGenerationOperations } from '../../../../nodes/Chutes/operations/textGeneration';

describe('Text Generation Operation Parameters - TDD', () => {
	describe('Operation Selector', () => {
		test('should have operation selector with correct type', () => {
			const operationParam = textGenerationOperations.find((p) => p.name === 'operation');
			
			expect(operationParam).toBeDefined();
			expect(operationParam?.type).toBe('options');
			expect(operationParam?.noDataExpression).toBe(true);
		});

		test('should display operation selector only when resource is textGeneration', () => {
			const operationParam = textGenerationOperations.find((p) => p.name === 'operation');
			
			expect(operationParam?.displayOptions?.show?.resource).toEqual(['textGeneration']);
		});

		test('should have complete and chat operation options', () => {
			const operationParam = textGenerationOperations.find((p) => p.name === 'operation');
			const options = operationParam?.options as any[];
			
			expect(options).toHaveLength(2);
			
			const completeOption = options.find((opt) => opt.value === 'complete');
			expect(completeOption).toBeDefined();
			expect(completeOption?.name).toBe('Complete');
			expect(completeOption?.action).toBe('Generate text completion');
			
			const chatOption = options.find((opt) => opt.value === 'chat');
			expect(chatOption).toBeDefined();
			expect(chatOption?.name).toBe('Chat');
			expect(chatOption?.action).toBe('Generate chat completion');
		});

		test('should default to complete operation', () => {
			const operationParam = textGenerationOperations.find((p) => p.name === 'operation');
			expect(operationParam?.default).toBe('complete');
		});
	});

	// Model Selection tests removed - model parameter was removed in Bug #3
	// Chute URL now determines the model

	describe('Prompt Field (Complete Operation)', () => {
		test('should have prompt field for complete operation', () => {
			const promptParam = textGenerationOperations.find((p) => p.name === 'prompt');
			
			expect(promptParam).toBeDefined();
			expect(promptParam?.type).toBe('string');
		});

		test('should be required', () => {
			const promptParam = textGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.required).toBe(true);
		});

		test('should display only for complete operation', () => {
			const promptParam = textGenerationOperations.find((p) => p.name === 'prompt');
			
			expect(promptParam?.displayOptions?.show?.resource).toEqual(['textGeneration']);
			expect(promptParam?.displayOptions?.show?.operation).toEqual(['complete']);
		});

		test('should have multiline text area (rows)', () => {
			const promptParam = textGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.typeOptions?.rows).toBe(4);
		});

		test('should have placeholder text', () => {
			const promptParam = textGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.placeholder).toBeDefined();
			expect(promptParam?.placeholder).toContain('robot');
		});
	});

	describe('Messages Field (Chat Operation)', () => {
		test('should have messages field for chat operation', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			
			expect(messagesParam).toBeDefined();
			expect(messagesParam?.type).toBe('fixedCollection');
		});

		test('should display only for chat operation', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			
			expect(messagesParam?.displayOptions?.show?.resource).toEqual(['textGeneration']);
			expect(messagesParam?.displayOptions?.show?.operation).toEqual(['chat']);
		});

		test('should allow multiple messages', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			expect(messagesParam?.typeOptions?.multipleValues).toBe(true);
		});

		test('should be sortable', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			expect(messagesParam?.typeOptions?.sortable).toBe(true);
		});

		test('should have role and content fields in message values', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			const messageValues = (messagesParam?.options?.[0] as any)?.values;
			
			expect(messageValues).toBeDefined();
			expect(messageValues).toHaveLength(2);
			
			const roleField = messageValues?.find((v: any) => v.name === 'role');
			expect(roleField).toBeDefined();
			expect(roleField?.type).toBe('options');
			
			const contentField = messageValues?.find((v: any) => v.name === 'content');
			expect(contentField).toBeDefined();
			expect(contentField?.type).toBe('string');
		});

		test('should have system, user, and assistant role options', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			const roleField = (messagesParam?.options?.[0] as any)?.values?.find((v: any) => v.name === 'role');
			const roleOptions = roleField?.options;
			
			expect(roleOptions).toHaveLength(3);
			expect(roleOptions).toContainEqual({ name: 'System', value: 'system' });
			expect(roleOptions).toContainEqual({ name: 'User', value: 'user' });
			expect(roleOptions).toContainEqual({ name: 'Assistant', value: 'assistant' });
		});

		test('should default role to user', () => {
			const messagesParam = textGenerationOperations.find((p) => p.name === 'messages');
			const roleField = (messagesParam?.options?.[0] as any)?.values?.find((v: any) => v.name === 'role');
			expect(roleField?.default).toBe('user');
		});
	});

	describe('Temperature Parameter', () => {
		test('should have temperature in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const temperatureOption = additionalOptions?.options?.find((o: any) => o.name === 'temperature') as any;
			
			expect(temperatureOption).toBeDefined();
			expect(temperatureOption?.type).toBe('number');
		});

		test('should have range 0-2', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const temperatureOption = additionalOptions?.options?.find((o: any) => o.name === 'temperature') as any;
			
			expect(temperatureOption?.typeOptions?.minValue).toBe(0);
			expect(temperatureOption?.typeOptions?.maxValue).toBe(2);
		});

		test('should have step size of 0.1', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const temperatureOption = additionalOptions?.options?.find((o: any) => o.name === 'temperature') as any;
			
			expect(temperatureOption?.typeOptions?.numberStepSize).toBe(0.1);
		});

		test('should default to 0.7', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const temperatureOption = additionalOptions?.options?.find((o: any) => o.name === 'temperature') as any;
			
			expect(temperatureOption?.default).toBe(0.7);
		});
	});

	describe('Max Tokens Parameter', () => {
		test('should have maxTokens in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const maxTokensOption = additionalOptions?.options?.find((o: any) => o.name === 'maxTokens') as any;
			
			expect(maxTokensOption).toBeDefined();
			expect(maxTokensOption?.type).toBe('number');
		});

		test('should have minimum value of 1', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const maxTokensOption = additionalOptions?.options?.find((o: any) => o.name === 'maxTokens') as any;
			
			expect(maxTokensOption?.typeOptions?.minValue).toBe(1);
		});

		test('should have maximum value of 100000', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const maxTokensOption = additionalOptions?.options?.find((o: any) => o.name === 'maxTokens') as any;
			
			expect(maxTokensOption?.typeOptions?.maxValue).toBe(100000);
		});

		test('should default to 1000', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const maxTokensOption = additionalOptions?.options?.find((o: any) => o.name === 'maxTokens') as any;
			
			expect(maxTokensOption?.default).toBe(1000);
		});
	});

	describe('Top P Parameter', () => {
		test('should have topP in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const topPOption = additionalOptions?.options?.find((o: any) => o.name === 'topP') as any;
			
			expect(topPOption).toBeDefined();
			expect(topPOption?.type).toBe('number');
		});

		test('should have range 0-1', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const topPOption = additionalOptions?.options?.find((o: any) => o.name === 'topP') as any;
			
			expect(topPOption?.typeOptions?.minValue).toBe(0);
			expect(topPOption?.typeOptions?.maxValue).toBe(1);
		});

		test('should have step size of 0.01', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const topPOption = additionalOptions?.options?.find((o: any) => o.name === 'topP') as any;
			
			expect(topPOption?.typeOptions?.numberStepSize).toBe(0.01);
		});

		test('should default to 1', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const topPOption = additionalOptions?.options?.find((o: any) => o.name === 'topP') as any;
			
			expect(topPOption?.default).toBe(1);
		});
	});

	describe('Frequency Penalty Parameter', () => {
		test('should have frequencyPenalty in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const freqPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'frequencyPenalty') as any;
			
			expect(freqPenaltyOption).toBeDefined();
			expect(freqPenaltyOption?.type).toBe('number');
		});

		test('should have range -2 to 2', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const freqPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'frequencyPenalty') as any;
			
			expect(freqPenaltyOption?.typeOptions?.minValue).toBe(-2);
			expect(freqPenaltyOption?.typeOptions?.maxValue).toBe(2);
		});

		test('should default to 0', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const freqPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'frequencyPenalty') as any;
			
			expect(freqPenaltyOption?.default).toBe(0);
		});
	});

	describe('Presence Penalty Parameter', () => {
		test('should have presencePenalty in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const presPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'presencePenalty') as any;
			
			expect(presPenaltyOption).toBeDefined();
			expect(presPenaltyOption?.type).toBe('number');
		});

		test('should have range -2 to 2', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const presPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'presencePenalty') as any;
			
			expect(presPenaltyOption?.typeOptions?.minValue).toBe(-2);
			expect(presPenaltyOption?.typeOptions?.maxValue).toBe(2);
		});

		test('should default to 0', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const presPenaltyOption = additionalOptions?.options?.find((o: any) => o.name === 'presencePenalty') as any;
			
			expect(presPenaltyOption?.default).toBe(0);
		});
	});

	describe('Stop Sequences Parameter', () => {
		test('should have stopSequences in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const stopSeqOption = additionalOptions?.options?.find((o: any) => o.name === 'stopSequences') as any;
			
			expect(stopSeqOption).toBeDefined();
			expect(stopSeqOption?.type).toBe('string');
		});

		test('should have placeholder for comma-separated values', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const stopSeqOption = additionalOptions?.options?.find((o: any) => o.name === 'stopSequences') as any;
			
			expect(stopSeqOption?.placeholder).toBeDefined();
			expect(stopSeqOption?.placeholder).toContain(',');
		});

		test('should default to empty string', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const stopSeqOption = additionalOptions?.options?.find((o: any) => o.name === 'stopSequences') as any;
			
			expect(stopSeqOption?.default).toBe('');
		});
	});

	describe('Response Format Parameter', () => {
		test('should have responseFormat in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			
			expect(responseFormatOption).toBeDefined();
			expect(responseFormatOption?.type).toBe('options');
		});

		test('should have text and json_object options', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			const options = responseFormatOption?.options;
			
			expect(options).toHaveLength(2);
			expect(options).toContainEqual({ name: 'Text', value: 'text' });
			expect(options).toContainEqual({ name: 'JSON', value: 'json_object' });
		});

		test('should default to text', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			
			expect(responseFormatOption?.default).toBe('text');
		});
	});

	describe('Stream Parameter', () => {
		test('should have stream boolean in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const streamOption = additionalOptions?.options?.find((o: any) => o.name === 'stream') as any;
			
			expect(streamOption).toBeDefined();
			expect(streamOption?.type).toBe('boolean');
		});

		test('should default to false', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const streamOption = additionalOptions?.options?.find((o: any) => o.name === 'stream') as any;
			
			expect(streamOption?.default).toBe(false);
		});
	});

	describe('Seed Parameter', () => {
		test('should have seed in additionalOptions', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const seedOption = additionalOptions?.options?.find((o: any) => o.name === 'seed') as any;
			
			expect(seedOption).toBeDefined();
			expect(seedOption?.type).toBe('number');
		});

		test('should have undefined default (optional)', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const seedOption = additionalOptions?.options?.find((o: any) => o.name === 'seed') as any;
			
			expect(seedOption?.default).toBeUndefined();
		});
	});

	describe('Additional Options Collection', () => {
		test('should display for textGeneration resource', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			
			expect(additionalOptions?.displayOptions?.show?.resource).toEqual(['textGeneration']);
		});

		test('should be collection type', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			
			expect(additionalOptions?.type).toBe('collection');
		});

		test('should have all expected options', () => {
			const additionalOptions = textGenerationOperations.find((p) => p.name === 'additionalOptions');
			const optionNames = additionalOptions?.options?.map((o: any) => o.name);
			
			expect(optionNames).toContain('temperature');
			expect(optionNames).toContain('maxTokens');
			expect(optionNames).toContain('topP');
			expect(optionNames).toContain('frequencyPenalty');
			expect(optionNames).toContain('presencePenalty');
			expect(optionNames).toContain('stopSequences');
			expect(optionNames).toContain('responseFormat');
			expect(optionNames).toContain('stream');
			expect(optionNames).toContain('seed');
		});
	});
});

