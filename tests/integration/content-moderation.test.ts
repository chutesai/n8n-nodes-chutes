/**
 * Integration test for Content Moderation Implementation
 * 
 * Tests:
 * 1. contentModeration is a valid resource option
 * 2. contentModeration operations are defined
 * 3. handleContentModeration function exists in execute
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Content Moderation Implementation', () => {
	const nodeFilePath = join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	const nodeFileContent = readFileSync(nodeFilePath, 'utf-8');

	test('should have contentModeration as a valid resource option', () => {
		// Check that contentModeration is in the resource options
		const resourceMatch = nodeFileContent.match(/name:\s*'resource'[\s\S]*?options:\s*\[([\s\S]*?)\]/);
		expect(resourceMatch).toBeTruthy();
		
		if (resourceMatch) {
			const resourceOptions = resourceMatch[1];
			expect(resourceOptions).toContain("'contentModeration'");
		}
	});

	test('should have content moderation operations defined', () => {
		// Check that contentModeration operations are imported/defined
		const operationsImport = nodeFileContent.includes("import { contentModerationOperations }") ||
		                         nodeFileContent.includes("import contentModerationOperations") ||
		                         nodeFileContent.includes("from './operations/contentModeration'");
		
		expect(operationsImport).toBe(true);
	});

	test('should have handleContentModeration function in execute', () => {
		// Check that handleContentModeration is called in the execute function
		const executeMatch = nodeFileContent.match(/async execute\([\s\S]*?\) {([\s\S]*?)^}/m);
		expect(executeMatch).toBeTruthy();
		
		if (executeMatch) {
			const executeBody = executeMatch[1];
			// Should have: } else if (resource === 'contentModeration') {
			expect(executeBody).toMatch(/resource\s*===\s*['"]contentModeration['"]/);
			// Should call: handleContentModeration.call(this, i)
			expect(executeBody).toMatch(/handleContentModeration\.call\(this,\s*i\)/);
		}
	});
});

