/**
 * TDD Test: LTX-2 UI Operations (Phase 2)
 * 
 * Tests that videoGeneration.ts has all required LTX-2 UI elements:
 * 1. Video-to-Video operation
 * 2. Keyframe Interpolation operation
 * 3. Video input field
 * 4. Keyframe images collection
 * 5. LoRA configuration with 11 options
 * 6. LTX-2 specific options (negative prompt, pipeline, enhance prompt)
 */

import { videoGenerationOperations } from '../../nodes/Chutes/operations/videoGeneration';

describe('LTX-2 UI Operations (Phase 2)', () => {
	describe('New Operations', () => {
		test('should have Video-to-Video operation', () => {
			const operationSelector = videoGenerationOperations.find(
				(prop) => prop.name === 'operation' && prop.type === 'options'
			);
			
			expect(operationSelector).toBeDefined();
			expect(operationSelector?.options).toBeDefined();
			
			const v2vOperation = (operationSelector?.options as any[])?.find(
				(opt) => opt.value === 'video2video'
			);
			
			expect(v2vOperation).toBeDefined();
			expect(v2vOperation?.name).toBe('Video to Video');
			expect(v2vOperation?.description).toContain('video');
		});

		test('should have Keyframe Interpolation operation', () => {
			const operationSelector = videoGenerationOperations.find(
				(prop) => prop.name === 'operation' && prop.type === 'options'
			);
			
			expect(operationSelector).toBeDefined();
			
			const keyframeOperation = (operationSelector?.options as any[])?.find(
				(opt) => opt.value === 'keyframe'
			);
			
			expect(keyframeOperation).toBeDefined();
			expect(keyframeOperation?.name).toBe('Keyframe Interpolation');
			expect(keyframeOperation?.description).toContain('keyframe');
		});
	});

	describe('Video Input Field', () => {
		test('should have video input field for V2V operation', () => {
			const videoInput = videoGenerationOperations.find(
				(prop) => prop.name === 'video'
			);
			
			expect(videoInput).toBeDefined();
			expect(videoInput?.displayName).toBe('Input Video');
			expect(videoInput?.type).toBe('string');
			
			// Should only show for video2video operation
			expect(videoInput?.displayOptions?.show?.operation).toContain('video2video');
		});
	});

	describe('Keyframe Images Collection', () => {
		test('should have keyframe images fixedCollection', () => {
			const keyframeImages = videoGenerationOperations.find(
				(prop) => prop.name === 'keyframeImages'
			);
			
			expect(keyframeImages).toBeDefined();
			expect(keyframeImages?.displayName).toBe('Keyframe Images');
			expect(keyframeImages?.type).toBe('fixedCollection');
			
			// Should only show for keyframe operation
			expect(keyframeImages?.displayOptions?.show?.operation).toContain('keyframe');
		});

		test('keyframe images should have image, frameIndex, and strength fields', () => {
			const keyframeImages = videoGenerationOperations.find(
				(prop) => prop.name === 'keyframeImages'
			) as any;
			
			expect(keyframeImages).toBeDefined();
			expect(keyframeImages?.options).toBeDefined();
			expect(Array.isArray(keyframeImages?.options)).toBe(true);
			
			const imagesOption = keyframeImages?.options?.find((opt: any) => opt.name === 'images');
			expect(imagesOption).toBeDefined();
			expect(imagesOption?.values).toBeDefined();
			
			const imageField = imagesOption?.values?.find((v: any) => v.name === 'image');
			const frameIndexField = imagesOption?.values?.find((v: any) => v.name === 'frameIndex');
			const strengthField = imagesOption?.values?.find((v: any) => v.name === 'strength');
			
			expect(imageField).toBeDefined();
			expect(frameIndexField).toBeDefined();
			expect(frameIndexField?.type).toBe('number');
			expect(strengthField).toBeDefined();
			expect(strengthField?.type).toBe('number');
		});
	});

	describe('LoRA Configuration', () => {
		test('should have LoRA adapters collection', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			expect(additionalOptions).toBeDefined();
			
			const lorasOption = additionalOptions?.options?.find((opt: any) => opt.name === 'loras');
			
			expect(lorasOption).toBeDefined();
			expect(lorasOption?.displayName).toBe('LoRA Adapters');
			expect(lorasOption?.type).toBe('fixedCollection');
		});

		test('LoRA should have all 11 LTX-2 adapter options', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			const lorasOption = additionalOptions?.options?.find((opt: any) => opt.name === 'loras');
			expect(lorasOption).toBeDefined();
			
			const loraItems = lorasOption?.options?.find((opt: any) => opt.name === 'loraItems');
			expect(loraItems).toBeDefined();
			
			const nameField = loraItems?.values?.find((v: any) => v.name === 'name');
			expect(nameField).toBeDefined();
			expect(nameField?.type).toBe('options');
			
			const loraOptions = nameField?.options;
			expect(Array.isArray(loraOptions)).toBe(true);
			expect(loraOptions?.length).toBe(11);
			
			// Check for specific LoRAs
			const expectedLoras = [
				'canny-control',
				'depth-control',
				'pose-control',
				'detailer',
				'camera-dolly-in',
				'camera-dolly-out',
				'camera-dolly-left',
				'camera-dolly-right',
				'camera-jib-up',
				'camera-jib-down',
				'camera-static',
			];
			
			expectedLoras.forEach((loraValue) => {
				const lora = loraOptions?.find((opt: any) => opt.value === loraValue);
				expect(lora).toBeDefined();
			});
		});

		test('LoRA should have strength field', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			const lorasOption = additionalOptions?.options?.find((opt: any) => opt.name === 'loras');
			const loraItems = lorasOption?.options?.find((opt: any) => opt.name === 'loraItems');
			const strengthField = loraItems?.values?.find((v: any) => v.name === 'strength');
			
			expect(strengthField).toBeDefined();
			expect(strengthField?.type).toBe('number');
			expect(strengthField?.default).toBe(1.0);
		});
	});

	describe('LTX-2 Specific Options', () => {
		test('should have negative prompt option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			const negativePrompt = additionalOptions?.options?.find(
				(opt: any) => opt.name === 'negativePrompt'
			);
			
			expect(negativePrompt).toBeDefined();
			expect(negativePrompt?.displayName).toBe('Negative Prompt');
			expect(negativePrompt?.type).toBe('string');
		});

		test('should have pipeline type option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			const pipeline = additionalOptions?.options?.find(
				(opt: any) => opt.name === 'pipeline'
			);
			
			expect(pipeline).toBeDefined();
			expect(pipeline?.displayName).toBe('Pipeline Type');
			expect(pipeline?.type).toBe('options');
			
			// Check for pipeline options
			const options = pipeline?.options;
			expect(Array.isArray(options)).toBe(true);
			expect(options?.length).toBeGreaterThanOrEqual(4);
			
			const expectedPipelines = ['two_stage', 'distilled', 'ic_lora', 'keyframe_interp'];
			expectedPipelines.forEach((pipelineValue) => {
				const opt = options?.find((o: any) => o.value === pipelineValue);
				expect(opt).toBeDefined();
			});
		});

		test('should have enhance prompt option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			const enhancePrompt = additionalOptions?.options?.find(
				(opt: any) => opt.name === 'enhancePrompt'
			);
			
			expect(enhancePrompt).toBeDefined();
			expect(enhancePrompt?.displayName).toBe('Enhance Prompt');
			expect(enhancePrompt?.type).toBe('boolean');
			expect(enhancePrompt?.default).toBe(false);
		});

		test('should have guidance scale option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(prop) => prop.name === 'additionalOptions' && prop.type === 'collection'
			) as any;
			
			// guidance_scale already exists, but verify it's there
			const guidanceScale = additionalOptions?.options?.find(
				(opt: any) => opt.name === 'guidance_scale' || opt.name === 'guidanceScale'
			);
			
			expect(guidanceScale).toBeDefined();
			expect(guidanceScale?.type).toBe('number');
		});
	});
});
