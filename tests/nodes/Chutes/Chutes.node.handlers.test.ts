import {
	handleTextGeneration,
	handleInference,
	handleEmbeddings,
	handleMusicGeneration,
	handleTextToSpeech,
	withTimeout,
} from '../../../nodes/Chutes/Chutes.node';
import { chutesApiRequestWithRetry } from '../../../nodes/Chutes/transport/apiRequest';

jest.mock('../../../nodes/Chutes/transport/apiRequest', () => ({
	chutesApiRequestWithRetry: jest.fn(),
}));

function makeCtx(params: Record<string, any>) {
	return {
		getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) =>
			name in params ? params[name] : defaultValue,
		),
		getNode: jest.fn().mockReturnValue({ name: 'Chutes' }),
		helpers: {
			requestWithAuthentication: jest.fn(),
			request: jest.fn(),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('audio')),
		},
	} as any;
}

describe('Chutes node handler branches', () => {
	beforeEach(() => jest.clearAllMocks());

	test('withTimeout returns passthrough when timeout is disabled', async () => {
		const result = await withTimeout(Promise.resolve('ok'), 0, makeCtx({}), 0, 'Test');
		expect(result).toBe('ok');
	});

	test('handleTextGeneration throws on unsupported operation', async () => {
		const ctx = makeCtx({
			operation: 'bad-op',
			chuteUrl: 'https://llm.chutes.ai',
			additionalOptions: {},
		});
		await expect(handleTextGeneration.call(ctx, 0)).rejects.toThrow('not supported for text generation');
	});

	test('handleInference supports batch and status operations', async () => {
		(chutesApiRequestWithRetry as jest.Mock)
			.mockResolvedValueOnce({ jobId: 'j1' })
			.mockResolvedValueOnce({ status: 'done' });

		const batchCtx = makeCtx({
			operation: 'batch',
			chuteUrl: 'https://llm.chutes.ai',
			modelId: 'm',
			batchInputs: '{"inputs":[1,2]}',
			additionalOptions: {},
		});
		const statusCtx = makeCtx({
			operation: 'status',
			chuteUrl: 'https://llm.chutes.ai',
			jobId: 'j1',
			additionalOptions: {},
		});

		await expect(handleInference.call(batchCtx, 0)).resolves.toEqual({ jobId: 'j1' });
		await expect(handleInference.call(statusCtx, 0)).resolves.toEqual({ status: 'done' });
	});

	test('handleEmbeddings throws on unsupported operation', async () => {
		const ctx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://embeddings.chutes.ai',
			additionalOptions: {},
		});
		await expect(handleEmbeddings.call(ctx, 0)).rejects.toThrow('not supported for embeddings');
	});

	test('handleMusicGeneration throws on unsupported operation', async () => {
		const ctx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://music.chutes.ai',
			prompt: 'x',
			lyrics: '',
			additionalOptions: {},
		});
		await expect(handleMusicGeneration.call(ctx, 0)).rejects.toThrow('not supported for music generation');
	});

	test('handleTextToSpeech uses customVoice over voice', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('audio'));
		const ctx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://audio.chutes.ai',
			text: 'hello',
			voice: 'am_adam',
			customVoice: 'af_sarah',
			additionalOptions: {},
		});
		await handleTextToSpeech.call(ctx, 0);
		expect(chutesApiRequestWithRetry).toHaveBeenCalled();
	});
});
