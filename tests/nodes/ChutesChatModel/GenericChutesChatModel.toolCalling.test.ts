/**
 * Tests for tool calling functionality in GenericChutesChatModel
 * These tests verify OpenAI-compatible tool calling with the Chutes API
 */

import * as fs from 'fs';
import * as path from 'path';

describe('GenericChutesChatModel Tool Calling', () => {
	describe('Sending tools to API', () => {
		it('should send tools array in API request body when options.functions provided', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the _call method where the API request body is constructed
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			expect(callMethodMatch).toBeDefined();
			
			const methodBody = callMethodMatch![0];
			
			// Should check for options.functions (via optionsAny) and add tools to the request body
			// Expected code pattern:
			// const optionsAny = options as any;
			// if (optionsAny.functions) {
			//   body.tools = optionsAny.functions.map(...)
			// }
			expect(methodBody).toContain('optionsAny.functions');
			expect(methodBody).toContain('body.tools');
		});
		
		it('should format tools in OpenAI tool format when sending to API', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find where tools are added to body
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			const methodBody = callMethodMatch![0];
			
			// Should format tools as: { type: 'function', function: {...} }
			expect(methodBody).toContain("type: 'function'");
		});
	});

	describe('Returning tool_calls from API response', () => {
		it('should return full message object when tool_calls present in API response', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the _call method's return logic
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			const methodBody = callMethodMatch![0];
			
			// Should check for tool_calls in response and return full message
			// Expected code pattern:
			// if (message?.tool_calls && ...) {
			//   return message;
			// }
			expect(methodBody).toContain('tool_calls');
			expect(methodBody).toContain('return message');
		});
		
		it('should still return content string when no tool_calls in response', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the _call method's return logic
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			const methodBody = callMethodMatch![0];
			
			// Should return string content when no tool_calls (backwards compatibility)
			// The return statement should have both branches:
			// - Return full message when tool_calls exist
			// - Return content string otherwise
			expect(methodBody).toContain('message.content');
		});
	});

	describe('Message formatter for tool roles', () => {
		it('should handle tool role by preserving pre-formatted messages', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find where messages are formatted (formattedMessages)
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			expect(callMethodMatch).toBeDefined();
			
			const methodBody = callMethodMatch![0];
			
			// Should check if message already has a 'role' property and preserve it
			// This handles tool, function, and other custom roles from ChutesAIAgent
			expect(methodBody).toContain("'role' in message");
			expect(methodBody).toContain('Pre-formatted');
		});
		
		it('should preserve tool message properties like tool_call_id and tool_calls', () => {
			const sourceFile = path.join(__dirname, '../../../nodes/ChutesChatModel/GenericChutesChatModel.ts');
			const sourceCode = fs.readFileSync(sourceFile, 'utf8');
			
			// Find the message formatter
			const callMethodMatch = sourceCode.match(/async _call\([\s\S]*?^	\}/m);
			const methodBody = callMethodMatch![0];
			
			// Should preserve all properties when returning pre-formatted messages
			// The comment should mention preserving tool_call_id and tool_calls
			expect(methodBody).toContain('tool_call_id');
			expect(methodBody).toContain('tool_calls');
		});
	});
});
