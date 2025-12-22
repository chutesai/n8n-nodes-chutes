/**
 * Unit tests for video generation operations
 * Tests the video generation operations configuration and validation
 */

import { videoGenerationOperations } from '../../../../nodes/Chutes/operations/videoGeneration';
import { INodeProperties } from 'n8n-workflow';

describe('Video Generation Operations', () => {
	describe('Operation Configuration', () => {
		test('should define video generation operations', () => {
			expect(videoGenerationOperations).toBeDefined();
			expect(Array.isArray(videoGenerationOperations)).toBe(true);
			expect(videoGenerationOperations.length).toBeGreaterThan(0);
		});

		test('should have operation selector with text2video and image2video', () => {
			const operationSelector = videoGenerationOperations.find(
				(op) => op.name === 'operation',
			) as INodeProperties;

			expect(operationSelector).toBeDefined();
			expect(operationSelector.type).toBe('options');
			expect(operationSelector.options).toHaveLength(2);

			const operationValues = operationSelector.options?.map((opt: any) => opt.value);
			expect(operationValues).toContain('text2video');
			expect(operationValues).toContain('image2video');
		});

		test('should have prompt field', () => {
			const promptField = videoGenerationOperations.find(
				(op) => op.name === 'prompt',
			);

			expect(promptField).toBeDefined();
			expect(promptField?.type).toBe('string');
			expect(promptField?.required).toBe(true);
		});

	test('should have image input field for image2video', () => {
		const imageField = videoGenerationOperations.find(
			(op) => op.name === 'image',
		);

		expect(imageField).toBeDefined();
		expect(imageField?.type).toBe('string');
		expect(imageField?.required).toBe(false); // Optional to allow binary data from previous nodes
		expect(imageField?.displayOptions?.show?.operation).toContain('image2video');
	});

		test('should have additional options', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			expect(additionalOptions).toBeDefined();
			expect(additionalOptions.type).toBe('collection');
			expect(additionalOptions.options).toBeDefined();
			expect(Array.isArray(additionalOptions.options)).toBe(true);
		});

		test('should have resolution option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const resolutionOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'resolution',
			) as INodeProperties;

			expect(resolutionOption).toBeDefined();
			expect(resolutionOption.default).toBe('1280*720');
		});

		test('should have steps option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const stepsOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'steps',
			) as INodeProperties;

			expect(stepsOption).toBeDefined();
			expect(stepsOption.type).toBe('number');
			expect(stepsOption.default).toBe(25);
		});

		test('should have duration option (in seconds)', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const durationOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'duration',
			) as INodeProperties;

			expect(durationOption).toBeDefined();
			expect(durationOption.type).toBe('number');
			expect(durationOption.default).toBe(5); // Default 5 seconds
			expect(durationOption.description).toContain('seconds');
		});

		test('should have fps option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const fpsOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'fps',
			) as INodeProperties;

			expect(fpsOption).toBeDefined();
			expect(fpsOption.type).toBe('number');
			expect(fpsOption.default).toBe(24);
		});

		test('should have seed option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const seedOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'seed',
			) as INodeProperties;

			expect(seedOption).toBeDefined();
			expect(seedOption.type).toBe('number');
			expect(seedOption.default).toBeUndefined();
		});

		test('should have timeout option', () => {
			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			) as INodeProperties;

			const timeoutOption = additionalOptions.options?.find(
				(opt: any) => opt.name === 'timeout',
			) as INodeProperties;

			expect(timeoutOption).toBeDefined();
			expect(timeoutOption.type).toBe('number');
			expect(timeoutOption.default).toBeUndefined();
		});
	});

	describe('Display Conditions', () => {
		test('all fields should show for videoGeneration resource', () => {
			const promptField = videoGenerationOperations.find((op) => op.name === 'prompt');
			expect(promptField?.displayOptions?.show?.resource).toContain('videoGeneration');

			const operationField = videoGenerationOperations.find((op) => op.name === 'operation');
			expect(operationField?.displayOptions?.show?.resource).toContain('videoGeneration');

			const additionalOptions = videoGenerationOperations.find(
				(op) => op.name === 'additionalOptions',
			);
			expect(additionalOptions?.displayOptions?.show?.resource).toContain('videoGeneration');
		});

		test('image field should only show for image2video operation', () => {
			const imageField = videoGenerationOperations.find((op) => op.name === 'image');
			
			expect(imageField?.displayOptions?.show?.resource).toContain('videoGeneration');
			expect(imageField?.displayOptions?.show?.operation).toContain('image2video');
		});
	});
});

