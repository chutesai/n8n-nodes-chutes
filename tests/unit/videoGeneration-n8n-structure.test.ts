/**
 * Structural validation test for n8n parameter definitions
 * 
 * This test prevents n8n framework violations by validating that:
 * - No child parameters within collections have displayOptions
 * - No child parameters within fixedCollections have displayOptions
 * 
 * Background: n8n cannot resolve parameter dependencies if displayOptions
 * are specified on child parameters of a collection or fixedCollection.
 * This causes the error: "Could not resolve parameter dependencies. Max iterations reached!"
 * 
 * @see https://github.com/n8n-io/n8n/issues/... (n8n framework limitation)
 */

import { videoGenerationOperations } from '../../nodes/Chutes/operations/videoGeneration';

describe('Video Generation - n8n Parameter Structure Validation', () => {
	describe('displayOptions placement rules', () => {
		it('should not have displayOptions on any child parameters within collection types', () => {
			// Find all 'collection' type parameters
			const collections = videoGenerationOperations.filter(
				(p: any) => p.type === 'collection'
			);

			expect(collections.length).toBeGreaterThan(0); // Ensure we're actually testing something

			const violations: Array<{ parent: string; child: string; paramType: string }> = [];

			collections.forEach((collection: any) => {
				const children = collection.options || [];
				children.forEach((child: any) => {
					if (child.displayOptions) {
						violations.push({
							parent: collection.name || collection.displayName,
							child: child.name || child.displayName,
							paramType: 'collection',
						});
					}
				});
			});

			// If this fails, it means someone added displayOptions to a child parameter
			// within a collection, which will break the n8n node at runtime
			if (violations.length > 0) {
				const errorMessage = violations
					.map(
						(v) =>
							`  ❌ ${v.paramType} "${v.parent}" has child "${v.child}" with displayOptions (not allowed by n8n)`,
					)
					.join('\n');
				throw new Error(
					`\n\nn8n Framework Violation Detected:\n${errorMessage}\n\nFix: Remove displayOptions from child parameters. Use descriptions to clarify when they're used instead.\n`,
				);
			}

			expect(violations).toEqual([]);
		});

		it('should not have displayOptions on any child parameters within fixedCollection types', () => {
			// Find all 'fixedCollection' type parameters
			const fixedCollections = videoGenerationOperations.filter(
				(p: any) => p.type === 'fixedCollection'
			);

			expect(fixedCollections.length).toBeGreaterThan(0); // Ensure we're actually testing something

			const violations: Array<{ parent: string; child: string; paramType: string }> = [];

			fixedCollections.forEach((fixedCollection: any) => {
				const collectionOptions = fixedCollection.options || [];
				collectionOptions.forEach((option: any) => {
					const values = option.values || [];
					values.forEach((child: any) => {
						if (child.displayOptions) {
							violations.push({
								parent: fixedCollection.name || fixedCollection.displayName,
								child: child.name || child.displayName,
								paramType: 'fixedCollection',
							});
						}
					});
				});
			});

			// If this fails, it means someone added displayOptions to a child parameter
			// within a fixedCollection, which will break the n8n node at runtime
			if (violations.length > 0) {
				const errorMessage = violations
					.map(
						(v) =>
							`  ❌ ${v.paramType} "${v.parent}" has child "${v.child}" with displayOptions (not allowed by n8n)`,
					)
					.join('\n');
				throw new Error(
					`\n\nn8n Framework Violation Detected:\n${errorMessage}\n\nFix: Remove displayOptions from child parameters. Consider restructuring to use top-level parameters if conditional visibility is needed.\n`,
				);
			}

			expect(violations).toEqual([]);
		});

		it('should document the Additional Options collection structure', () => {
			// This test serves as documentation for the structure we're validating
			const additionalOptions = videoGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			expect(additionalOptions).toBeDefined();
			expect(additionalOptions.type).toBe('collection');
			expect(additionalOptions.options).toBeDefined();
			expect(Array.isArray(additionalOptions.options)).toBe(true);

			// Verify that specific parameters exist (the ones we just fixed)
			const childNames = additionalOptions.options.map((opt: any) => opt.name);
			expect(childNames).toContain('image_strength');
			expect(childNames).toContain('image_frame_index');
		});

		it('should document the LoRA adapters fixedCollection structure', () => {
			// This test serves as documentation for fixedCollection structure
			const additionalOptions = videoGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			const loraParam = additionalOptions.options.find((opt: any) => opt.name === 'loras');

			expect(loraParam).toBeDefined();
			expect(loraParam.type).toBe('fixedCollection');
			expect(loraParam.options).toBeDefined();
			expect(Array.isArray(loraParam.options)).toBe(true);

			// FixedCollection has options with 'values' arrays
			const firstOption = loraParam.options[0];
			expect(firstOption.values).toBeDefined();
			expect(Array.isArray(firstOption.values)).toBe(true);
		});
	});

	describe('regression prevention', () => {
		it('should prevent the exact bug that broke the node on 2026-01-14', () => {
			// This test specifically documents and prevents the bug where
			// image_strength and image_frame_index had displayOptions inside
			// the Additional Options collection, causing n8n to fail with:
			// "Could not resolve parameter dependencies. Max iterations reached!"

			const additionalOptions = videoGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			const imageStrength = additionalOptions.options.find(
				(opt: any) => opt.name === 'image_strength'
			);
			const imageFrameIndex = additionalOptions.options.find(
				(opt: any) => opt.name === 'image_frame_index'
			);

			// These parameters MUST NOT have displayOptions
			expect(imageStrength.displayOptions).toBeUndefined();
			expect(imageFrameIndex.displayOptions).toBeUndefined();

			// They should still exist and have proper defaults
			expect(imageStrength).toBeDefined();
			expect(imageFrameIndex).toBeDefined();
			expect(imageStrength.default).toBe(1.0);
			expect(imageFrameIndex.default).toBe(0);
		});
	});
});
