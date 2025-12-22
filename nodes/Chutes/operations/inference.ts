import { INodeProperties } from 'n8n-workflow';

export const inferenceOperations: INodeProperties[] = [
	// Operation selector for Inference
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['inference'],
			},
		},
		options: [
			{
				name: 'Predict',
				value: 'predict',
				description: 'Run inference on a custom model',
				action: 'Run model inference',
			},
			{
				name: 'Batch',
				value: 'batch',
				description: 'Process multiple inputs in batch',
				action: 'Run batch inference',
			},
			{
				name: 'Get Status',
				value: 'status',
				description: 'Check status of an inference job',
				action: 'Get job status',
			},
		],
		default: 'predict',
	},

	// Model/Deployment ID
	{
		displayName: 'Model ID',
		name: 'modelId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['inference'],
				operation: ['predict', 'batch'],
			},
		},
		default: '',
		description: 'The ID of the deployed model on Chutes.ai',
		placeholder: 'model_abc123',
	},

	// Input data for predict
	{
		displayName: 'Input',
		name: 'input',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['inference'],
				operation: ['predict'],
			},
		},
		default: '{}',
		description: 'Input data for the model (JSON format)',
		placeholder: '{"text": "Hello world"}',
	},

	// Batch inputs
	{
		displayName: 'Batch Inputs',
		name: 'batchInputs',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['inference'],
				operation: ['batch'],
			},
		},
		default: '[]',
		description: 'Array of input data for batch processing',
		placeholder: '[{"text": "Input 1"}, {"text": "Input 2"}]',
	},

	// Job ID for status check
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['inference'],
				operation: ['status'],
			},
		},
		default: '',
		description: 'The ID of the inference job to check',
		placeholder: 'job_xyz789',
	},

	// Additional Options for Inference
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['inference'],
			},
		},
		options: [
			{
				displayName: 'Maximum Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: undefined,
				description: 'Maximum time to wait for inference (in seconds). Leave empty for no timeout. If exceeded, the node will error and can trigger n8n\'s retry flow.',
				placeholder: '60',
				hint: 'Recommended: 60 seconds (1 minute) for inference. Leave empty if inference needs more time.',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				description: 'URL to receive results for async inference',
				placeholder: 'https://your-webhook.com/callback',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Normal', value: 'normal' },
					{ name: 'High', value: 'high' },
				],
				default: 'normal',
				description: 'Priority of the inference job',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'Raw', value: 'raw' },
				],
				default: 'json',
				description: 'Format of the inference output',
			},
		],
	},
];

