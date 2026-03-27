/**
 * Test: Custom Chute URL Input
 * 
 * Purpose: Verify that users can provide custom chute URLs via expressions
 * or from previous nodes AND use the dropdown
 * 
 * Implementation: type: 'options' with noDataExpression: false
 * - Provides dropdown autocomplete for browsing available chutes
 * - Allows expressions like {{ $json.chuteUrl }} for dynamic chute selection
 * 
 * Problems addressed:
 * - No way to put in a custom model or chute name that could flow from a previous node
 */

import { INodeProperties } from 'n8n-workflow';
import { Chutes } from '../../nodes/Chutes/Chutes.node';

describe('Custom Chute URL Input', () => {
	let nodeDescription: INodeProperties[];

	beforeAll(() => {
		const node = new Chutes();
		nodeDescription = node.description.properties;
	});

	it('should allow chuteUrl to accept string expressions', () => {
		// Shared chuteUrl field (single field for all resources)
		const chuteUrlProp = nodeDescription.find(
			(prop: INodeProperties) => prop.name === 'chuteUrl',
		) as INodeProperties;

		expect(chuteUrlProp).toBeDefined();
		
		// Type should be 'options' for dropdown + noDataExpression: false for expressions
		expect(chuteUrlProp.type).toBe('options');
		expect(chuteUrlProp.noDataExpression).toBe(false);
	});

	it('should have loadOptionsMethod for autocomplete dropdown', () => {
		const chuteUrlProp = nodeDescription.find(
			(prop: INodeProperties) => prop.name === 'chuteUrl',
		) as INodeProperties;

		expect(chuteUrlProp).toBeDefined();
		
		// Should have loadOptionsMethod for autocomplete suggestions
		// This gives users the dropdown while still allowing custom input
		expect(chuteUrlProp.typeOptions?.loadOptionsMethod).toBe('getChutesForSelectedResource');
	});

	it('should define one shared chuteUrl field for all resources', () => {
		const chuteUrlFields = nodeDescription.filter(
			(prop: INodeProperties) => prop.name === 'chuteUrl',
		);
		expect(chuteUrlFields).toHaveLength(1);
		expect(chuteUrlFields[0].type).toBe('options');
		expect(chuteUrlFields[0].noDataExpression).toBe(false);
		expect(chuteUrlFields[0].typeOptions?.loadOptionsDependsOn).toEqual(['resource']);
	});
});

