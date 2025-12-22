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

	const resourcesWithChuteUrl = [
		'textGeneration',
		'imageGeneration',
		'videoGeneration',
		'textToSpeech',
		'speechToText',
		'musicGeneration',
		'embeddings',
		'contentModeration',
		'inference',
	];

	test.each(resourcesWithChuteUrl)(
		'%s chuteUrl field should be type "options" with expression support',
		(resourceName) => {
			const properties = nodeInstance.description.properties;
			
			// Find the chuteUrl field for this resource
			const chuteUrlField = properties.find(
				(prop: any) =>
					prop.name === 'chuteUrl' &&
					prop.displayOptions?.show?.resource?.includes(resourceName)
			);

			expect(chuteUrlField).toBeDefined();
			expect(chuteUrlField?.type).toBe('options'); // Must be 'options' for dropdown
			expect(chuteUrlField?.noDataExpression).toBe(false); // Must be false for expressions like {{ $json.chuteUrl }}
		}
	);

	test('all chuteUrl fields should have loadOptionsMethod', () => {
		const properties = nodeInstance.description.properties;
		const chuteUrlFields = properties.filter((prop: any) => prop.name === 'chuteUrl');

		chuteUrlFields.forEach((field: any) => {
			expect(field.typeOptions?.loadOptionsMethod).toBeDefined();
			expect(typeof field.typeOptions?.loadOptionsMethod).toBe('string');
		});
	});
});

