/**
 * Structural validation test for n8n parameter definitions - ALL OPERATIONS
 * 
 * This test prevents n8n framework violations by validating that:
 * - No child parameters within collections have displayOptions
 * - No child parameters within fixedCollections have displayOptions
 * 
 * Background: n8n cannot resolve parameter dependencies if displayOptions
 * are specified on child parameters of a collection or fixedCollection.
 * This causes the error: "Could not resolve parameter dependencies. Max iterations reached!"
 * 
 * SCOPE: This test checks EVERY operation file in the node to prevent
 * the bug from appearing in any resource type.
 * 
 * @see https://github.com/n8n-io/n8n/issues/... (n8n framework limitation)
 */

import { videoGenerationOperations } from '../../nodes/Chutes/operations/videoGeneration';
import { imageGenerationOperations } from '../../nodes/Chutes/operations/imageGeneration';
import { textGenerationOperations } from '../../nodes/Chutes/operations/textGeneration';
import { textToSpeechOperations } from '../../nodes/Chutes/operations/textToSpeech';
import { speechToTextOperations } from '../../nodes/Chutes/operations/speechToText';
import { musicGenerationOperations } from '../../nodes/Chutes/operations/musicGeneration';
import { embeddingsOperations } from '../../nodes/Chutes/operations/embeddings';
import { contentModerationOperations } from '../../nodes/Chutes/operations/contentModeration';
import { inferenceOperations } from '../../nodes/Chutes/operations/inference';

// ALL operation files that need to be checked
const allOperations = [
	{ name: 'videoGeneration', ops: videoGenerationOperations },
	{ name: 'imageGeneration', ops: imageGenerationOperations },
	{ name: 'textGeneration', ops: textGenerationOperations },
	{ name: 'textToSpeech', ops: textToSpeechOperations },
	{ name: 'speechToText', ops: speechToTextOperations },
	{ name: 'musicGeneration', ops: musicGenerationOperations },
	{ name: 'embeddings', ops: embeddingsOperations },
	{ name: 'contentModeration', ops: contentModerationOperations },
	{ name: 'inference', ops: inferenceOperations },
];

describe('ALL Operations - n8n Parameter Structure Validation', () => {
	describe('displayOptions placement rules', () => {
		it('should not have displayOptions on any child parameters within collection types - ALL OPERATIONS', () => {
			const allViolations: Array<{ operation: string; parent: string; child: string; paramType: string }> = [];

			// Check EVERY operation file
			allOperations.forEach(({ name, ops }) => {
				// Find all 'collection' type parameters in this operation
				const collections = ops.filter((p: any) => p.type === 'collection');

				collections.forEach((collection: any) => {
					const children = collection.options || [];
					children.forEach((child: any) => {
						if (child.displayOptions) {
							allViolations.push({
								operation: name,
								parent: collection.name || collection.displayName,
								child: child.name || child.displayName,
								paramType: 'collection',
							});
						}
					});
				});
			});

			// If this fails, it means someone added displayOptions to a child parameter
			// within a collection, which will break the n8n node at runtime
			if (allViolations.length > 0) {
				const errorMessage = allViolations
					.map(
						(v) =>
							`  ❌ [${v.operation}] ${v.paramType} "${v.parent}" has child "${v.child}" with displayOptions (not allowed by n8n)`,
					)
					.join('\n');
				throw new Error(
					`\n\nn8n Framework Violation Detected in ${allViolations.length} location(s):\n${errorMessage}\n\nFix: Remove displayOptions from child parameters. Use descriptions to clarify when they're used instead.\n`,
				);
			}

			expect(allViolations).toEqual([]);
		});

		it('should not have displayOptions on any child parameters within fixedCollection types - ALL OPERATIONS', () => {
			const allViolations: Array<{ operation: string; parent: string; child: string; paramType: string }> = [];

			// Check EVERY operation file
			allOperations.forEach(({ name, ops }) => {
				// Find all 'fixedCollection' type parameters in this operation
				const fixedCollections = ops.filter((p: any) => p.type === 'fixedCollection');

				fixedCollections.forEach((fixedCollection: any) => {
					const collectionOptions = fixedCollection.options || [];
					collectionOptions.forEach((option: any) => {
						const values = option.values || [];
						values.forEach((child: any) => {
							if (child.displayOptions) {
								allViolations.push({
									operation: name,
									parent: fixedCollection.name || fixedCollection.displayName,
									child: child.name || child.displayName,
									paramType: 'fixedCollection',
								});
							}
						});
					});
				});
			});

			// If this fails, it means someone added displayOptions to a child parameter
			// within a fixedCollection, which will break the n8n node at runtime
			if (allViolations.length > 0) {
				const errorMessage = allViolations
					.map(
						(v) =>
							`  ❌ [${v.operation}] ${v.paramType} "${v.parent}" has child "${v.child}" with displayOptions (not allowed by n8n)`,
					)
					.join('\n');
				throw new Error(
					`\n\nn8n Framework Violation Detected in ${allViolations.length} location(s):\n${errorMessage}\n\nFix: Remove displayOptions from child parameters. Consider restructuring to use top-level parameters if conditional visibility is needed.\n`,
				);
			}

			expect(allViolations).toEqual([]);
		});

		it('should not have displayOptions on nested fixedCollections/collections within collections - ALL OPERATIONS', () => {
			const allViolations: Array<{ operation: string; parent: string; nestedChild: string }> = [];

			// Check EVERY operation file
			allOperations.forEach(({ name, ops }) => {
				// Find all 'collection' type parameters
				const collections = ops.filter((p: any) => p.type === 'collection');

				collections.forEach((collection: any) => {
					const children = collection.options || [];
					children.forEach((child: any) => {
						// Check if this child is itself a collection or fixedCollection with displayOptions
						if ((child.type === 'collection' || child.type === 'fixedCollection') && child.displayOptions) {
							allViolations.push({
								operation: name,
								parent: collection.name || collection.displayName,
								nestedChild: child.name || child.displayName,
							});
						}
					});
				});
			});

			// If this fails, it means someone added displayOptions to a nested collection/fixedCollection
			// within a parent collection, which will break the n8n node at runtime
			if (allViolations.length > 0) {
				const errorMessage = allViolations
					.map(
						(v) =>
							`  ❌ [${v.operation}] collection "${v.parent}" has nested child "${v.nestedChild}" with displayOptions (not allowed by n8n)`,
					)
					.join('\n');
				throw new Error(
					`\n\nn8n Framework Violation Detected in ${allViolations.length} location(s):\n${errorMessage}\n\nFix: Remove displayOptions from nested collection/fixedCollection children. They inherit visibility from parent.\n`,
				);
			}

			expect(allViolations).toEqual([]);
		});

		it('should document the Additional Options collection structure (using videoGeneration as example)', () => {
			// This test serves as documentation for the structure we're validating
			// We use videoGeneration as an example, but the rules apply to ALL operations
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

		it('should document the LoRA adapters fixedCollection structure (using videoGeneration as example)', () => {
			// This test serves as documentation for fixedCollection structure
			// We use videoGeneration as an example, but the rules apply to ALL operations
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
		it('should prevent the 2026-01-14 videoGeneration bug (image_strength, image_frame_index)', () => {
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

		it('should prevent the 2026-01-14 imageGeneration bug (additionalImages with displayOptions)', () => {
			// This test specifically prevents the bug where additionalImages
			// had displayOptions inside the Additional Options collection.
			// This was added during multi-image edit implementation and broke n8n with:
			// "Could not resolve parameter dependencies. Max iterations reached!"

			const additionalOptions = imageGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			expect(additionalOptions).toBeDefined();

			const additionalImages = additionalOptions.options.find(
				(opt: any) => opt.name === 'additionalImages'
			);

			// additionalImages is a fixedCollection nested inside a collection
			// It MUST NOT have displayOptions
			if (additionalImages) {
				expect(additionalImages.displayOptions).toBeUndefined();
				expect(additionalImages.type).toBe('fixedCollection');
			}
		});
	});
});
