/**
 * Tests for Inference Operations
 * Following TDD principles - all tests in /tests directory
 */

import { inferenceOperations } from '../../../../nodes/Chutes/operations/inference';

describe('Inference Operations', () => {
	describe('Operation Selector', () => {
		test('should have operation parameter', () => {
			const operationParam = inferenceOperations.find((op) => op.name === 'operation');

			expect(operationParam).toBeDefined();
			expect(operationParam?.type).toBe('options');
		});

		test('should have predict operation', () => {
			const operationParam = inferenceOperations.find((op) => op.name === 'operation');
			const options = operationParam?.options as any[];

			const predictOp = options.find((opt) => opt.value === 'predict');
			expect(predictOp).toBeDefined();
			expect(predictOp?.name).toBe('Predict');
		});

		test('should have batch operation', () => {
			const operationParam = inferenceOperations.find((op) => op.name === 'operation');
			const options = operationParam?.options as any[];

			const batchOp = options.find((opt) => opt.value === 'batch');
			expect(batchOp).toBeDefined();
			expect(batchOp?.name).toBe('Batch');
		});

		test('should have status operation', () => {
			const operationParam = inferenceOperations.find((op) => op.name === 'operation');
			const options = operationParam?.options as any[];

			const statusOp = options.find((opt) => opt.value === 'status');
			expect(statusOp).toBeDefined();
			expect(statusOp?.name).toBe('Get Status');
		});
	});

	describe('Model ID Field', () => {
		test('should have modelId parameter', () => {
			const modelIdParam = inferenceOperations.find((op) => op.name === 'modelId');

			expect(modelIdParam).toBeDefined();
			expect(modelIdParam?.type).toBe('string');
			expect(modelIdParam?.required).toBe(true);
		});

		test('should show modelId for predict and batch operations', () => {
			const modelIdParam = inferenceOperations.find((op) => op.name === 'modelId');

			expect(modelIdParam?.displayOptions?.show?.operation).toContain('predict');
			expect(modelIdParam?.displayOptions?.show?.operation).toContain('batch');
		});
	});

	describe('Input Field (Predict)', () => {
		test('should have input parameter', () => {
			const inputParam = inferenceOperations.find((op) => op.name === 'input');

			expect(inputParam).toBeDefined();
			expect(inputParam?.type).toBe('json');
			expect(inputParam?.required).toBe(true);
		});

		test('should show input only for predict operation', () => {
			const inputParam = inferenceOperations.find((op) => op.name === 'input');

			expect(inputParam?.displayOptions?.show?.operation).toContain('predict');
		});
	});

	describe('Batch Inputs Field', () => {
		test('should have batchInputs parameter', () => {
			const batchInputsParam = inferenceOperations.find((op) => op.name === 'batchInputs');

			expect(batchInputsParam).toBeDefined();
			expect(batchInputsParam?.type).toBe('json');
			expect(batchInputsParam?.required).toBe(true);
		});

		test('should show batchInputs only for batch operation', () => {
			const batchInputsParam = inferenceOperations.find((op) => op.name === 'batchInputs');

			expect(batchInputsParam?.displayOptions?.show?.operation).toContain('batch');
		});
	});

	describe('Job ID Field (Status)', () => {
		test('should have jobId parameter', () => {
			const jobIdParam = inferenceOperations.find((op) => op.name === 'jobId');

			expect(jobIdParam).toBeDefined();
			expect(jobIdParam?.type).toBe('string');
			expect(jobIdParam?.required).toBe(true);
		});

		test('should show jobId only for status operation', () => {
			const jobIdParam = inferenceOperations.find((op) => op.name === 'jobId');

			expect(jobIdParam?.displayOptions?.show?.operation).toContain('status');
		});
	});

	describe('Additional Options', () => {
		let additionalOptions: any;

		beforeEach(() => {
			const optionsParam = inferenceOperations.find((op) => op.name === 'additionalOptions');
			additionalOptions = optionsParam?.options as any[];
		});

		test('should have timeout option', () => {
			const timeoutOption = additionalOptions.find((opt: any) => opt.name === 'timeout');

			expect(timeoutOption).toBeDefined();
			expect(timeoutOption?.type).toBe('number');
			expect(timeoutOption?.default).toBe(undefined); // No default timeout - user must explicitly set it
			expect(timeoutOption?.displayName).toBe('Maximum Timeout (seconds)');
			expect(timeoutOption?.placeholder).toBe('60');
		});

		test('should have webhook URL option', () => {
			const webhookOption = additionalOptions.find((opt: any) => opt.name === 'webhookUrl');

			expect(webhookOption).toBeDefined();
			expect(webhookOption?.type).toBe('string');
		});

		test('should have priority option', () => {
			const priorityOption = additionalOptions.find((opt: any) => opt.name === 'priority');

			expect(priorityOption).toBeDefined();
			expect(priorityOption?.type).toBe('options');
			expect(priorityOption?.options).toContainEqual(
				expect.objectContaining({ name: 'Low', value: 'low' }),
			);
			expect(priorityOption?.options).toContainEqual(
				expect.objectContaining({ name: 'Normal', value: 'normal' }),
			);
			expect(priorityOption?.options).toContainEqual(
				expect.objectContaining({ name: 'High', value: 'high' }),
			);
		});

		test('should have output format option', () => {
			const formatOption = additionalOptions.find((opt: any) => opt.name === 'outputFormat');

			expect(formatOption).toBeDefined();
			expect(formatOption?.options).toContainEqual(
				expect.objectContaining({ name: 'JSON', value: 'json' }),
			);
			expect(formatOption?.options).toContainEqual(
				expect.objectContaining({ name: 'Raw', value: 'raw' }),
			);
		});
	});
});

