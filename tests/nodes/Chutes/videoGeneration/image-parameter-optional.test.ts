/**
 * TDD Test: Image-to-Video should allow optional image parameter
 * 
 * When a user connects binary data from a previous node (HTTP Request, Read Binary File, etc.),
 * they should NOT be required to fill in the "image" parameter field.
 * 
 * This test verifies that the image parameter is optional in the node properties.
 */

import { INodeProperties } from 'n8n-workflow';

describe('Video Generation - Image Parameter Optional', () => {
	it('should mark image parameter as NOT required', async () => {
		// Import the Chutes node
		const { Chutes } = await import('../../../../nodes/Chutes/Chutes.node');
		const node = new Chutes();
		
		// Get the node properties
		const properties = node.description.properties as INodeProperties[];
		
		// Find the image parameter under videoGeneration resource
		const imageParam = properties.find(
			(prop) => 
				prop.name === 'image' && 
				prop.displayOptions?.show?.resource?.includes('videoGeneration')
		);
		
		// Verify the parameter exists
		expect(imageParam).toBeDefined();
		
		// Verify it's NOT required (should be false or undefined)
		expect(imageParam?.required).toBeFalsy();
	});
	
	it('should have helpful placeholder text explaining binary data usage', async () => {
		const { Chutes } = await import('../../../../nodes/Chutes/Chutes.node');
		const node = new Chutes();
		
		const properties = node.description.properties as INodeProperties[];
		const imageParam = properties.find(
			(prop) => 
				prop.name === 'image' && 
				prop.displayOptions?.show?.resource?.includes('videoGeneration')
		);
		
		// Should have a placeholder or description mentioning binary data
		const hasHelpText = 
			imageParam?.placeholder?.toLowerCase().includes('binary') ||
			imageParam?.placeholder?.toLowerCase().includes('connect') ||
			imageParam?.description?.toLowerCase().includes('binary');
		
		expect(hasHelpText).toBe(true);
	});
});

