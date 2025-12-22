/**
 * Test: Music Generation Implementation
 * 
 * Purpose: Verify that music generation resource is implemented
 * 
 * Problems addressed:
 * - Resource "musicGeneration" not implemented error (problems.txt line 21-45)
 */

describe('Music Generation Implementation', () => {
	it('should have musicGeneration as a valid resource option', () => {
		const { Chutes } = require('../../nodes/Chutes/Chutes.node');
		const node = new Chutes();
		
		// Find the resource selector
		const resourceField = node.description.properties.find((prop: any) => prop.name === 'resource');
		expect(resourceField).toBeDefined();
		
		// Verify musicGeneration is in the options
		const musicOption = resourceField.options.find((opt: any) => opt.value === 'musicGeneration');
		expect(musicOption).toBeDefined();
		expect(musicOption.name).toBe('Music Generation');
	});

	it('should have music generation operations defined', () => {
		const { musicGenerationOperations } = require('../../nodes/Chutes/operations/musicGeneration');
		
		expect(musicGenerationOperations).toBeDefined();
		expect(Array.isArray(musicGenerationOperations)).toBe(true);
		
		// Should have at least operation selector and prompt field
		const operationField = musicGenerationOperations.find((field: any) => field.name === 'operation');
		const promptField = musicGenerationOperations.find((field: any) => field.name === 'prompt');
		
		expect(operationField).toBeDefined();
		expect(promptField).toBeDefined();
	});

	it('should have handleMusicGeneration function in execute', () => {
		// This test verifies the handler exists
		const fs = require('fs');
		const nodeContent = fs.readFileSync('nodes/Chutes/Chutes.node.ts', 'utf8');
		
		// Should have the handler function defined
		expect(nodeContent).toContain('handleMusicGeneration');
		
		// Should call the handler in the execute function
		expect(nodeContent).toMatch(/resource === 'musicGeneration'/);
	});
});
