import { ChutesAIAgent } from '../../../nodes/ChutesAIAgent/ChutesAIAgent.node';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as fs from 'fs';
import * as path from 'path';

describe('ChutesAIAgent Node', () => {
	let aiAgentNode: ChutesAIAgent;

	beforeEach(() => {
		aiAgentNode = new ChutesAIAgent();
	});

	describe('Node Description', () => {
		it('should have correct display name', () => {
			expect(aiAgentNode.description.displayName).toBe('Chutes AI Agent');
		});

		it('should have correct name', () => {
			expect(aiAgentNode.description.name).toBe('chutesAIAgent');
		});

		it('should have correct version', () => {
			expect(aiAgentNode.description.version).toBe(1);
		});

		it('should require chutesApi credentials', () => {
			expect(aiAgentNode.description.credentials).toBeDefined();
			expect(aiAgentNode.description.credentials).toEqual([
				{
					name: 'chutesApi',
					required: true,
				},
			]);
		});

		it('should have all required inputs', () => {
			const inputs = aiAgentNode.description.inputs as any[];
			expect(inputs).toHaveLength(5);

			// Main input
			expect(inputs[0]).toBe(NodeConnectionTypes.Main);

			// Chat Model input (required)
			const chatModelInput = inputs[1];
			expect(chatModelInput.displayName).toBe('Chat Model');
			expect(chatModelInput.type).toBe(NodeConnectionTypes.AiLanguageModel);
			expect(chatModelInput.required).toBe(true);
			expect(chatModelInput.maxConnections).toBe(1);

			// Tool input (optional, unlimited)
			const toolInput = inputs[2];
			expect(toolInput.displayName).toBe('Tool');
			expect(toolInput.type).toBe(NodeConnectionTypes.AiTool);
			expect(toolInput.required).toBe(false);
			expect(toolInput.maxConnections).toBeUndefined();

			// Memory input (optional)
			const memoryInput = inputs[3];
			expect(memoryInput.displayName).toBe('Memory');
			expect(memoryInput.type).toBe(NodeConnectionTypes.AiMemory);
			expect(memoryInput.required).toBe(false);
			expect(memoryInput.maxConnections).toBe(1);

			// Output Parser input (optional)
			const outputParserInput = inputs[4];
			expect(outputParserInput.displayName).toBe('Output Parser');
			expect(outputParserInput.type).toBe(NodeConnectionTypes.AiOutputParser);
			expect(outputParserInput.required).toBe(false);
			expect(outputParserInput.maxConnections).toBe(1);
		});

		it('should output Main connection type', () => {
			expect(aiAgentNode.description.outputs).toEqual([NodeConnectionTypes.Main]);
		});

		it('should be categorized under AI/Agents', () => {
			expect(aiAgentNode.description.codex?.categories).toContain('AI');
			expect(aiAgentNode.description.codex?.subcategories?.AI).toContain('Agents');
		});
	});

	describe('Node Properties', () => {
		it('should have chutesAgentNotice', () => {
			const noticeProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'chutesAgentNotice',
			);
			expect(noticeProp).toBeDefined();
			expect(noticeProp?.type).toBe('notice');
		});

		it('should have chuteUrl property for direct chute selection', () => {
			const chuteUrlProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'chuteUrl',
			);
			expect(chuteUrlProp).toBeDefined();
			expect(chuteUrlProp?.type).toBe('options');
			expect((chuteUrlProp as any)?.default).toBe('https://llm.chutes.ai');
		});

		it('should have chuteUrl with noDataExpression: false', () => {
			const chuteUrlProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'chuteUrl',
			);
			expect((chuteUrlProp as any)?.noDataExpression).toBe(false);
		});

		it('should have chuteUrl with placeholder', () => {
			const chuteUrlProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'chuteUrl',
			);
			expect((chuteUrlProp as any)?.placeholder).toBeDefined();
			expect((chuteUrlProp as any)?.placeholder).toContain('chutes.ai');
		});

		it('should have chuteUrl with hint mentioning expressions', () => {
			const chuteUrlProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'chuteUrl',
			);
			expect((chuteUrlProp as any)?.hint).toContain('expression');
		});

		it('should have promptType parameter', () => {
			const promptTypeProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'promptType',
			);
			expect(promptTypeProp).toBeDefined();
			expect(promptTypeProp?.type).toBe('options');
			expect((promptTypeProp as any)?.options).toHaveLength(2);
			expect((promptTypeProp as any)?.default).toBe('auto');
		});

		it('should have text parameters with display options', () => {
			const textProps = aiAgentNode.description.properties.filter((p) => p.name === 'text');
			expect(textProps.length).toBeGreaterThan(0);

			// Should have one for 'auto' mode and one for 'define' mode
			const autoText = textProps.find(
				(p) => (p as any)?.default === '={{ $json.chatInput }}',
			);
			const defineText = textProps.find((p) => (p as any)?.default === '');

			expect(autoText).toBeDefined();
			expect(defineText).toBeDefined();
		});

		it('should have hasOutputParser parameter', () => {
			const hasOutputParserProp = aiAgentNode.description.properties.find(
				(p) => p.name === 'hasOutputParser',
			);
			expect(hasOutputParserProp).toBeDefined();
			expect(hasOutputParserProp?.type).toBe('boolean');
			expect((hasOutputParserProp as any)?.default).toBe(false);
		});

		it('should have options collection with system message', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			expect(optionsProp).toBeDefined();
			expect(optionsProp?.type).toBe('collection');

			const options = (optionsProp as any)?.options;
			const systemMessage = options.find((o: any) => o.name === 'systemMessage');
			expect(systemMessage).toBeDefined();
			expect(systemMessage.default).toBe('You are a helpful AI assistant.');
		});

		it('should have options collection with maxIterations', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			const options = (optionsProp as any)?.options;
			const maxIterations = options.find((o: any) => o.name === 'maxIterations');

			expect(maxIterations).toBeDefined();
			expect(maxIterations.type).toBe('number');
			expect(maxIterations.default).toBe(10);
		});

		it('should have options collection with returnIntermediateSteps', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			const options = (optionsProp as any)?.options;
			const returnIntermediateSteps = options.find(
				(o: any) => o.name === 'returnIntermediateSteps',
			);

			expect(returnIntermediateSteps).toBeDefined();
			expect(returnIntermediateSteps.type).toBe('boolean');
			expect(returnIntermediateSteps.default).toBe(false);
		});
	});

	describe('Execute Method', () => {
		it('should have execute method', () => {
			expect(aiAgentNode.execute).toBeDefined();
			expect(typeof aiAgentNode.execute).toBe('function');
		});

		// Note: Full integration tests would require mocking IExecuteFunctions
		// and setting up complex LangChain agent execution which is better
		// suited for integration tests with real Chutes.ai API
	});

	describe('Load Options Methods', () => {
		it('should have getLLMChutes method', () => {
			expect(aiAgentNode.methods?.loadOptions?.getLLMChutes).toBeDefined();
		});
	});

	describe('Agent Features', () => {
		it('should support tool calling (multiple tools via unlimited connections)', () => {
			const inputs = aiAgentNode.description.inputs as any[];
			const toolInput = inputs.find((i: any) => i.displayName === 'Tool');

			expect(toolInput).toBeDefined();
			expect(toolInput.maxConnections).toBeUndefined(); // Unlimited
			expect(toolInput.required).toBe(false);
		});

		it('should support memory integration', () => {
			const inputs = aiAgentNode.description.inputs as any[];
			const memoryInput = inputs.find((i: any) => i.displayName === 'Memory');

			expect(memoryInput).toBeDefined();
			expect(memoryInput.maxConnections).toBe(1);
			expect(memoryInput.type).toBe(NodeConnectionTypes.AiMemory);
		});

		it('should support output parsing', () => {
			const inputs = aiAgentNode.description.inputs as any[];
			const parserInput = inputs.find((i: any) => i.displayName === 'Output Parser');

			expect(parserInput).toBeDefined();
			expect(parserInput.maxConnections).toBe(1);
			expect(parserInput.type).toBe(NodeConnectionTypes.AiOutputParser);
		});

		it('should have configurable max iterations', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			const options = (optionsProp as any)?.options;
			const maxIterations = options.find((o: any) => o.name === 'maxIterations');

			expect(maxIterations.typeOptions?.minValue).toBe(1);
			expect(maxIterations.default).toBe(10);
		});

		it('should support intermediate steps tracking', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			const options = (optionsProp as any)?.options;
			const returnIntermediateSteps = options.find(
				(o: any) => o.name === 'returnIntermediateSteps',
			);

			expect(returnIntermediateSteps).toBeDefined();
			expect(returnIntermediateSteps.type).toBe('boolean');
		});
	});

	describe('Comparison with n8n AI Agent', () => {
		it('should have same input structure as n8n AI Agent', () => {
			const inputs = aiAgentNode.description.inputs as any[];

			// Should have: Main, Chat Model, Tool, Memory, Output Parser
			expect(inputs).toHaveLength(5);
			expect(inputs[0]).toBe(NodeConnectionTypes.Main);

			const connectionInputs = inputs.slice(1);
			expect(connectionInputs.map((i: any) => i.type)).toEqual([
				NodeConnectionTypes.AiLanguageModel,
				NodeConnectionTypes.AiTool,
				NodeConnectionTypes.AiMemory,
				NodeConnectionTypes.AiOutputParser,
			]);
		});

		it('should have similar property structure to n8n AI Agent', () => {
			const properties = aiAgentNode.description.properties;

			// Should have prompt type, text inputs, output parser flag, options
			const propertyNames = properties.map((p) => p.name);

			expect(propertyNames).toContain('promptType');
			expect(propertyNames).toContain('text');
			expect(propertyNames).toContain('hasOutputParser');
			expect(propertyNames).toContain('options');
		});

		it('should support all key AI Agent features', () => {
			const optionsProp = aiAgentNode.description.properties.find((p) => p.name === 'options');
			const options = (optionsProp as any)?.options;
			const optionNames = options.map((o: any) => o.name);

			// Key features from n8n's AI Agent
			expect(optionNames).toContain('systemMessage');
			expect(optionNames).toContain('maxIterations');
			expect(optionNames).toContain('returnIntermediateSteps');
		});
	});

	describe('Code Quality', () => {
		it('should not have console.log debugging statements in production code', () => {
			const sourceFilePath = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');
			
			// Check for console.log statements (excluding commented lines)
			const lines = sourceCode.split('\n');
			const consoleLogLines = lines
				.map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
				.filter(({ line }) => !line.startsWith('//') && !line.startsWith('*'))
				.filter(({ line }) => line.includes('console.log'));
			
			expect(consoleLogLines).toEqual([]);
		});
	});
});
