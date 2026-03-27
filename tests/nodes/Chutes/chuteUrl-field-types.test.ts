/**
 * Test: ChuteUrl Field Types
 * 
 * REGRESSION TEST: Verifies that all chuteUrl fields use type: 'options'
 * with noDataExpression: false to enable BOTH dropdown AND expressions.
 * 
 * Using type: 'options' with noDataExpression: false gives users the best of both worlds:
 * - Dropdown autocomplete for browsing available chutes
 * - Expression support for dynamic chute selection from previous nodes ({{ $json.chuteUrl }})
 */

import { Chutes } from '../../../nodes/Chutes/Chutes.node';

describe('ChuteUrl Field Types - Expression Support', () => {
	let nodeInstance: Chutes;

	beforeEach(() => {
		nodeInstance = new Chutes();
	});

	test('should have exactly one shared chuteUrl field', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlFields = properties.filter((prop: any) => prop.name === 'chuteUrl');

		expect(chuteUrlFields).toHaveLength(1);
	});

	test('shared chuteUrl field should support expressions and resource-aware loading', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlField = properties.find((prop: any) => prop.name === 'chuteUrl');

		expect(chuteUrlField).toBeDefined();
		expect(chuteUrlField?.type).toBe('options');
		expect(chuteUrlField?.noDataExpression).toBe(false);
		expect(chuteUrlField?.typeOptions?.loadOptionsMethod).toBe('getChutesForSelectedResource');
		expect(chuteUrlField?.typeOptions?.loadOptionsDependsOn).toEqual(['resource']);
		expect(chuteUrlField?.default).toBe('');
	});
});

