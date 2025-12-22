/**
 * TDD Tests for Image Generation Operation Parameters
 * Focus: Selectors, visibility, validation, ranges
 * Priority: CRITICAL (main pain point)
 */

import { imageGenerationOperations } from '../../../../nodes/Chutes/operations/imageGeneration';

describe('Image Generation Operation Parameters - TDD', () => {
	describe('Operation Selector', () => {
		test('should have operation selector', () => {
			const operationParam = imageGenerationOperations.find((p) => p.name === 'operation');
			
			expect(operationParam).toBeDefined();
			expect(operationParam?.type).toBe('options');
		});

		test('should display only for imageGeneration resource', () => {
			const operationParam = imageGenerationOperations.find((p) => p.name === 'operation');
			
			expect(operationParam?.displayOptions?.show?.resource).toEqual(['imageGeneration']);
		});

	test('should have generate and edit operations', () => {
		const operationParam = imageGenerationOperations.find((p) => p.name === 'operation');
		const options = operationParam?.options as any[];
		
		expect(options).toHaveLength(2);
		
		const generateOption = options.find((opt) => opt.value === 'generate');
		expect(generateOption).toBeDefined();
		expect(generateOption?.name).toBe('Generate');
		expect(generateOption?.action).toBe('Generate images');
		
		const editOption = options.find((opt) => opt.value === 'edit');
		expect(editOption).toBeDefined();
		expect(editOption?.name).toBe('Edit');
		expect(editOption?.action).toBe('Edit image');
	});

		test('should default to generate', () => {
			const operationParam = imageGenerationOperations.find((p) => p.name === 'operation');
			expect(operationParam?.default).toBe('generate');
		});
	});

	// Model Selection tests removed - model parameter was removed in Bug #3
	// Chute URL now determines the model

	describe('Prompt Field', () => {
		test('should have prompt field', () => {
			const promptParam = imageGenerationOperations.find((p) => p.name === 'prompt');
			
			expect(promptParam).toBeDefined();
			expect(promptParam?.type).toBe('string');
		});

		test('should be required', () => {
			const promptParam = imageGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.required).toBe(true);
		});

		test('should display for imageGeneration generate operation', () => {
			const promptParam = imageGenerationOperations.find((p) => p.name === 'prompt');
			
			expect(promptParam?.displayOptions?.show?.resource).toEqual(['imageGeneration']);
			expect(promptParam?.displayOptions?.show?.operation).toEqual(['generate']);
		});

		test('should have multiline text area', () => {
			const promptParam = imageGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.typeOptions?.rows).toBe(4);
		});

		test('should have placeholder', () => {
			const promptParam = imageGenerationOperations.find((p) => p.name === 'prompt');
			expect(promptParam?.placeholder).toBeDefined();
			expect(promptParam?.placeholder).toContain('landscape');
		});
	});

	describe('Size Parameter', () => {
		test('should have size parameter', () => {
			const sizeParam = imageGenerationOperations.find((p) => p.name === 'size');
			
			expect(sizeParam).toBeDefined();
			expect(sizeParam?.type).toBe('options');
		});

		test('should have all size options', () => {
			const sizeParam = imageGenerationOperations.find((p) => p.name === 'size');
			const options = sizeParam?.options as any[];
			
			expect(options).toHaveLength(5);
			expect(options).toContainEqual({ name: '256x256', value: '256x256' });
			expect(options).toContainEqual({ name: '512x512', value: '512x512' });
			expect(options).toContainEqual({ name: '1024x1024', value: '1024x1024' });
			expect(options).toContainEqual({ name: '1024x1792', value: '1024x1792' });
			expect(options).toContainEqual({ name: '1792x1024', value: '1792x1024' });
		});

		test('should default to 1024x1024', () => {
			const sizeParam = imageGenerationOperations.find((p) => p.name === 'size');
			expect(sizeParam?.default).toBe('1024x1024');
		});

	test('should display for both generate and edit operations', () => {
		const sizeParam = imageGenerationOperations.find((p) => p.name === 'size');
		
		expect(sizeParam?.displayOptions?.show?.resource).toEqual(['imageGeneration']);
		expect(sizeParam?.displayOptions?.show?.operation).toEqual(['generate', 'edit']);
	});
	});

	describe('Number of Images Parameter', () => {
		test('should have n (number of images) parameter', () => {
			const nParam = imageGenerationOperations.find((p) => p.name === 'n');
			
			expect(nParam).toBeDefined();
			expect(nParam?.type).toBe('number');
		});

	test('should have range 1-10 (sequential requests)', () => {
		const nParam = imageGenerationOperations.find((p) => p.name === 'n');
		
		expect(nParam?.typeOptions?.minValue).toBe(1);
		// Multiple images supported via sequential requests
		expect(nParam?.typeOptions?.maxValue).toBe(10);
	});

		test('should default to 1', () => {
			const nParam = imageGenerationOperations.find((p) => p.name === 'n');
			expect(nParam?.default).toBe(1);
		});

	test('should display for both generate and edit operations', () => {
		const nParam = imageGenerationOperations.find((p) => p.name === 'n');
		
		expect(nParam?.displayOptions?.show?.resource).toEqual(['imageGeneration']);
		expect(nParam?.displayOptions?.show?.operation).toEqual(['generate', 'edit']);
	});
	});

	describe('Quality Parameter', () => {
		test('should have quality in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const qualityOption = additionalOptions?.options?.find((o: any) => o.name === 'quality') as any;
			
			expect(qualityOption).toBeDefined();
			expect(qualityOption?.type).toBe('options');
		});

		test('should have standard and hd options', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const qualityOption = additionalOptions?.options?.find((o: any) => o.name === 'quality') as any;
			const options = qualityOption?.options;
			
			expect(options).toHaveLength(2);
			expect(options).toContainEqual({ name: 'Standard', value: 'standard' });
			expect(options).toContainEqual({ name: 'HD', value: 'hd' });
		});

		test('should default to standard', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const qualityOption = additionalOptions?.options?.find((o: any) => o.name === 'quality') as any;
			
			expect(qualityOption?.default).toBe('standard');
		});
	});

	describe('Style Parameter', () => {
		test('should have style in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const styleOption = additionalOptions?.options?.find((o: any) => o.name === 'style') as any;
			
			expect(styleOption).toBeDefined();
			expect(styleOption?.type).toBe('options');
		});

		test('should have natural and vivid options', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const styleOption = additionalOptions?.options?.find((o: any) => o.name === 'style') as any;
			const options = styleOption?.options;
			
			expect(options).toHaveLength(2);
			expect(options).toContainEqual({ name: 'Natural', value: 'natural' });
			expect(options).toContainEqual({ name: 'Vivid', value: 'vivid' });
		});

		test('should default to natural', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const styleOption = additionalOptions?.options?.find((o: any) => o.name === 'style') as any;
			
			expect(styleOption?.default).toBe('natural');
		});
	});

	describe('Seed Parameter', () => {
		test('should have seed in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const seedOption = additionalOptions?.options?.find((o: any) => o.name === 'seed') as any;
			
			expect(seedOption).toBeDefined();
			expect(seedOption?.type).toBe('number');
		});

		test('should have undefined default (optional)', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const seedOption = additionalOptions?.options?.find((o: any) => o.name === 'seed') as any;
			
			expect(seedOption?.default).toBeUndefined();
		});
	});

	describe('Negative Prompt Parameter', () => {
		test('should have negativePrompt in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const negPromptOption = additionalOptions?.options?.find((o: any) => o.name === 'negativePrompt') as any;
			
			expect(negPromptOption).toBeDefined();
			expect(negPromptOption?.type).toBe('string');
		});

		test('should have multiline text area', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const negPromptOption = additionalOptions?.options?.find((o: any) => o.name === 'negativePrompt') as any;
			
			expect(negPromptOption?.typeOptions?.rows).toBe(2);
		});

		test('should have placeholder', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const negPromptOption = additionalOptions?.options?.find((o: any) => o.name === 'negativePrompt') as any;
			
			expect(negPromptOption?.placeholder).toBeDefined();
			expect(negPromptOption?.placeholder).toContain('blurry');
		});

		test('should default to empty string', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const negPromptOption = additionalOptions?.options?.find((o: any) => o.name === 'negativePrompt') as any;
			
			expect(negPromptOption?.default).toBe('');
		});
	});

	describe('Guidance Scale Parameter', () => {
		test('should have guidanceScale in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const guidanceOption = additionalOptions?.options?.find((o: any) => o.name === 'guidanceScale') as any;
			
			expect(guidanceOption).toBeDefined();
			expect(guidanceOption?.type).toBe('number');
		});

		test('should have range 0-20', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const guidanceOption = additionalOptions?.options?.find((o: any) => o.name === 'guidanceScale') as any;
			
			expect(guidanceOption?.typeOptions?.minValue).toBe(0);
			expect(guidanceOption?.typeOptions?.maxValue).toBe(20);
		});

		test('should have step size of 0.5', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const guidanceOption = additionalOptions?.options?.find((o: any) => o.name === 'guidanceScale') as any;
			
			expect(guidanceOption?.typeOptions?.numberStepSize).toBe(0.5);
		});

		test('should default to 7.5', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const guidanceOption = additionalOptions?.options?.find((o: any) => o.name === 'guidanceScale') as any;
			
			expect(guidanceOption?.default).toBe(7.5);
		});
	});

	describe('Response Format Parameter', () => {
		test('should have responseFormat in additionalOptions', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			
			expect(responseFormatOption).toBeDefined();
			expect(responseFormatOption?.type).toBe('options');
		});

		test('should have url and b64_json options', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			const options = responseFormatOption?.options;
			
			expect(options).toHaveLength(2);
			expect(options).toContainEqual({ name: 'URL', value: 'url' });
			expect(options).toContainEqual({ name: 'Base64', value: 'b64_json' });
		});

		test('should default to url', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const responseFormatOption = additionalOptions?.options?.find((o: any) => o.name === 'responseFormat') as any;
			
			expect(responseFormatOption?.default).toBe('url');
		});
	});

	describe('Additional Options Collection', () => {
		test('should display for imageGeneration resource', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			
			expect(additionalOptions?.displayOptions?.show?.resource).toEqual(['imageGeneration']);
		});

		test('should be collection type', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			
			expect(additionalOptions?.type).toBe('collection');
		});

		test('should have all expected options', () => {
			const additionalOptions = imageGenerationOperations.find((p) => p.name === 'additionalOptions');
			const optionNames = additionalOptions?.options?.map((o: any) => o.name);
			
			expect(optionNames).toContain('quality');
			expect(optionNames).toContain('style');
			expect(optionNames).toContain('seed');
			expect(optionNames).toContain('negativePrompt');
			expect(optionNames).toContain('guidanceScale');
			expect(optionNames).toContain('responseFormat');
		});
	});
});

