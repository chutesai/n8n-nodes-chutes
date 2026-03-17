/**
 * Test: Chute field type
 *
 * REGRESSION TEST: Verifies that the shared chute field uses type: 'options'
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

	test('shared chuteUrl field should be type "options" with expression support', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlField = properties.find((prop: any) => prop.name === 'chuteUrl');

		expect(chuteUrlField).toBeDefined();
		expect(chuteUrlField?.type).toBe('options');
		expect(chuteUrlField?.noDataExpression).toBe(false);
	});

	test('all chuteUrl fields should have loadOptionsMethod', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlFields = properties.filter((prop: any) => prop.name === 'chuteUrl');

		chuteUrlFields.forEach((field: any) => {
			expect(field.typeOptions?.loadOptionsMethod).toBeDefined();
			expect(typeof field.typeOptions?.loadOptionsMethod).toBe('string');
		});
	});

	test('shared chuteUrl field should only depend on resource changes', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlField = properties.find((prop: any) => prop.name === 'chuteUrl');

		expect(chuteUrlField).toBeDefined();
		expect(chuteUrlField?.typeOptions?.loadOptionsDependsOn).toEqual(['resource']);
	});
});
