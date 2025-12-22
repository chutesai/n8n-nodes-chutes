/**
 * Integration test for Embeddings Implementation
 * 
 * Tests:
 * 1. embeddings is a valid resource option
 * 2. embeddings operations are defined
 * 3. handleEmbeddings function exists in execute
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Embeddings Implementation', () => {
	const nodeFilePath = join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	const nodeFileContent = readFileSync(nodeFilePath, 'utf-8');

	test('should have embeddings as a valid resource option', () => {
		// Check that embeddings is in the resource options
		const resourceMatch = nodeFileContent.match(/name:\s*'resource'[\s\S]*?options:\s*\[([\s\S]*?)\]/);
		expect(resourceMatch).toBeTruthy();
		
		if (resourceMatch) {
			const resourceOptions = resourceMatch[1];
			expect(resourceOptions).toContain("'embeddings'");
		}
	});

	test('should have embeddings operations defined', () => {
		// Check that embeddings operations are imported/defined
		const operationsImport = nodeFileContent.includes("import { embeddingsOperations }") ||
		                         nodeFileContent.includes("import embeddingsOperations") ||
		                         nodeFileContent.includes("from './operations/embeddings'");
		
		expect(operationsImport).toBe(true);
	});

	test('should have handleEmbeddings function in execute', () => {
		// Check that handleEmbeddings is called in the execute function
		const executeMatch = nodeFileContent.match(/async execute\([\s\S]*?\) {([\s\S]*?)^}/m);
		expect(executeMatch).toBeTruthy();
		
		if (executeMatch) {
			const executeBody = executeMatch[1];
			// Should have: } else if (resource === 'embeddings') {
			expect(executeBody).toMatch(/resource\s*===\s*['"]embeddings['"]/);
			// Should call: handleEmbeddings.call(this, i)
			expect(executeBody).toMatch(/handleEmbeddings\.call\(this,\s*i\)/);
		}
	});
});

