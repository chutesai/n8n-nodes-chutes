/**
 * Tests for tool calling functionality in ChutesAIAgent
 * These tests verify OpenAI-compatible tool calling format
 */

import * as fs from 'fs';
import * as path from 'path';

describe('ChutesAIAgent Tool Calling', () => {
	describe('formatToolsForModel', () => {
		it('should format tools in OpenAI function calling format with type and nested function object', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Check that the function returns objects with { type: 'function', function: {...} } structure
			// This is the OpenAI tool calling format as shown in the Python reference
			
			// The current implementation is:
			// return tools.map((tool: any) => ({
			//   name: tool.name || 'unnamed_tool',
			//   description: tool.description || 'No description provided',
			//   parameters: tool.schema || {...}
			// }));
			
			// It should be:
			// return tools.map((tool: any) => ({
			//   type: 'function',
			//   function: {
			//     name: tool.name || 'unnamed_tool',
			//     description: tool.description || 'No description provided',
			//     parameters: tool.schema || {...}
			//   }
			// }));
			
			// Check the current implementation
			const formatFunctionMatch = sourceCode.match(/function formatToolsForModel\(tools: any\[\]\): any\[\] \{[\s\S]*?^}/m);
			expect(formatFunctionMatch).toBeDefined();
			
			const functionBody = formatFunctionMatch![0];
			
			// The function should return { type: 'function', function: {...} }
			expect(functionBody).toContain("type: 'function'");
			expect(functionBody).toContain('function: {');
		});
	});

	describe('parseToolCalls', () => {
		it('should extract tool_call id from OpenAI tool_calls response', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// parseToolCalls should return {id, name, args} not just {name, args}
			// The id is required to send back tool results with tool_call_id
			
			// Current implementation returns: Array<{ name: string; args: any }>
			// Should return: Array<{ id: string; name: string; args: any }>
			
			const parseFunctionMatch = sourceCode.match(/function parseToolCalls\(response: any\): Array<\{[^}]+\}> \{/);
			expect(parseFunctionMatch).toBeDefined();
			
			const returnTypeMatch = parseFunctionMatch![0].match(/Array<\{([^}]+)\}>/);
			expect(returnTypeMatch).toBeDefined();
			
			const returnType = returnTypeMatch![1];
			
			// Should include 'id' in the return type
			expect(returnType).toContain('id:');
		});
		
		it('should extract id from tool_calls array in parseToolCalls implementation', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the parseToolCalls function
			const parseFunctionMatch = sourceCode.match(/function parseToolCalls\(response: any\)[\s\S]*?^}/m);
			expect(parseFunctionMatch).toBeDefined();
			
			const functionBody = parseFunctionMatch![0];
			
			// The function should extract call.id when pushing to toolCalls
			// Current: toolCalls.push({ name: ..., args: ... })
			// Should be: toolCalls.push({ id: call.id, name: ..., args: ... })
			expect(functionBody).toContain('id: call.id');
		});
	});

	describe('Tool result message format', () => {
		it('should send tool results with OpenAI format: role=tool, tool_call_id, content', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find where tool results are pushed to currentMessages
			// Current format: { role: 'function', name: toolCall.name, content: ... }
			// OpenAI format: { role: 'tool', tool_call_id: toolCall.id, content: ... }
			
			// Look for the section where tool results are added
			const toolResultSection = sourceCode.match(/\/\/ Add tool result to conversation[\s\S]{0,500}currentMessages\.push\(\{[\s\S]*?\}\);/);
			expect(toolResultSection).toBeDefined();
			
			const sectionText = toolResultSection![0];
			
			// Should use 'tool' role, not 'function'
			expect(sectionText).toContain("role: 'tool'");
			// Should include tool_call_id
			expect(sectionText).toContain('tool_call_id: toolCall.id');
		});
	});

	describe('Assistant message preservation', () => {
		it('should preserve original assistant message with tool_calls (not create fake message)', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// The code should NOT create a fake "Used tools: X" message
			// Instead it should preserve the original response from the LLM that contains tool_calls
			
			// Find the execute method
			const executeMethodMatch = sourceCode.match(/async execute\([\s\S]*?^\t\}/m);
			expect(executeMethodMatch).toBeDefined();
			
			// Should NOT contain the fake "Used tools:" message
			expect(executeMethodMatch![0]).not.toContain('Used tools:');
		});
		
		it('should add original LLM response with tool_calls to conversation history', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// After getting a response with tool_calls, should add the original response to messages
			// This should happen BEFORE executing the tools
			
			// Look for where we handle tool calls
			const handleToolCallsSection = sourceCode.match(/const toolCalls = parseToolCalls\(response\);[\s\S]{0,800}\/\/ Execute each tool call/);
			expect(handleToolCallsSection).toBeDefined();
			
			const sectionText = handleToolCallsSection![0];
			
			// Should push the original response to currentMessages before executing tools
			// The response should have role: 'assistant' and tool_calls
			expect(sectionText).toContain("currentMessages.push");
			expect(sectionText).toContain("role: 'assistant'");
		});
	});

	describe('Tool argument normalization', () => {
		it('should normalize single-property args object to string for simple LangChain tools (e.g. Wikipedia)', () => {
			// This test reproduces the "undefined" bug where Wikipedia receives {query: "term"}
			// but expects just "term", causing it to search for "undefined"
			
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesAIAgent/ChutesAIAgent.node.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the tool execution section where we normalize and invoke
			const toolExecutionMatch = sourceCode.match(/\/\/ Execute the tool[\s\S]{0,1500}tool\.invoke\(toolInput\)/);
			expect(toolExecutionMatch).toBeDefined();
			
			const executionSection = toolExecutionMatch![0];
			
			// Before calling tool.invoke(toolCall.args), we should normalize the args
			// For single-property objects like {query: "term"}, extract the value
			// This prevents LangChain tools from receiving undefined when they expect a string
			
			// Should have normalization logic that creates toolInput
			expect(executionSection).toContain('let toolInput = toolCall.args');
			
			// Should check if object has single property and extract that value
			expect(executionSection).toContain('keys.length === 1');
			expect(executionSection).toContain('toolInput = toolInput[keys[0]]');
			
			// Should pass normalized toolInput to tool.invoke()
			expect(executionSection).toContain('tool.invoke(toolInput)');
		});
	});
});
