import { Chutes } from '../../../nodes/Chutes/Chutes.node';
import { createMockExecuteFunctions } from '../../helpers/mocks';
import { chutesApiRequestWithRetry } from '../../../nodes/Chutes/transport/apiRequest';
import {
	discoverChuteCapabilities,
	buildRequestBody,
} from '../../../nodes/Chutes/transport/openApiDiscovery';

jest.mock('../../../nodes/Chutes/transport/apiRequest', () => ({
	chutesApiRequestWithRetry: jest.fn(),
}));

jest.mock('../../../nodes/Chutes/transport/openApiDiscovery', () => ({
	discoverChuteCapabilities: jest.fn(),
	buildRequestBody: jest.fn(),
}));

function makeContext(params: Record<string, any>, inputData: any[] = [{ json: {}, binary: {} }]) {
	return createMockExecuteFunctions({
		getInputData: jest.fn().mockReturnValue(inputData),
		getNodeParameter: jest.fn((name: string, _itemIndex: number, defaultValue?: any) =>
			name in params ? params[name] : defaultValue,
		),
		helpers: {
			requestWithAuthentication: jest.fn(),
			request: jest.fn(),
			prepareBinaryData: jest.fn().mockResolvedValue({ data: 'prepared' }),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('bin')),
		} as any,
	});
}

describe('Chutes full execute coverage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('executes textGeneration complete and wraps object response', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ ok: true });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textGeneration',
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hello',
			additionalOptions: {},
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.ok).toBe(true);
	});

	test('executes textGeneration chat path', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ choices: [] });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textGeneration',
			operation: 'chat',
			chuteUrl: 'https://llm.chutes.ai',
			messages: { messageValues: [{ role: 'user', content: 'h' }] },
			additionalOptions: { stopSequences: 'A,B', responseFormat: 'text', topP: 0.9, maxTokens: 77 },
		});

		await node.execute.call(ctx as any);
		expect(chutesApiRequestWithRetry).toHaveBeenCalled();
	});

	test('returns multiple binary images for imageGeneration n>1', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('img'));
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'imageGeneration',
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'draw',
			size: '512x512',
			n: 2,
			additionalOptions: { seed: 10 },
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0]).toHaveLength(2);
		expect(ctx.helpers.prepareBinaryData).toHaveBeenCalledTimes(2);
	});

	test('image edit path uses discovered endpoint and binary input', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('edited'));
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({
			endpoints: [{ path: '/edit', method: 'POST', parameters: [] }],
		});
		(buildRequestBody as jest.Mock).mockReturnValue({
			endpoint: '/edit',
			body: { prompt: 'edit', image: 'abc' },
		});
		const node = new Chutes();
		const ctx = makeContext(
			{
				resource: 'imageGeneration',
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'edit',
				size: '512x512',
				n: 1,
				additionalOptions: {},
				image: '',
			},
			[{ json: {}, binary: { data: { mimeType: 'image/png' } } }],
		);

		const out = await node.execute.call(ctx as any);
		expect(discoverChuteCapabilities).toHaveBeenCalled();
		expect(out[0][0].binary).toBeDefined();
	});

	test('textToSpeech returns binary audio metadata', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('audio'));
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textToSpeech',
			operation: 'generate',
			chuteUrl: 'https://audio.chutes.ai',
			text: 'hello',
			voice: 'am_adam',
			customVoice: '',
			additionalOptions: { speed: 1 },
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].binary).toBeDefined();
	});

	test('speechToText transcribe handles includeChunks', async () => {
		const node = new Chutes();
		const ctx = makeContext(
			{
				resource: 'speechToText',
				operation: 'transcribe',
				chuteUrl: 'https://stt.chutes.ai',
				audio: '',
				additionalOptions: { includeChunks: true, language: 'en' },
			},
			[{ json: {}, binary: { data: { mimeType: 'audio/wav' } } }],
		);
		(ctx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([
			{ text: 'a', start: 0, end: 1 },
			{ text: 'b', start: 1, end: 2 },
		]);

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.text).toBe('ab');
		expect((out[0][0].json as any).chunks).toHaveLength(2);
	});

	test('inference predict calls inference endpoint', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ job: 'x' });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'inference',
			operation: 'predict',
			chuteUrl: 'https://llm.chutes.ai',
			additionalOptions: {},
			modelId: 'm1',
			input: '{"a":1}',
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].json.job).toBe('x');
	});

	test('musicGeneration returns binary response', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('wav'));
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'musicGeneration',
			operation: 'generate',
			chuteUrl: 'https://music.chutes.ai',
			prompt: 'style',
			lyrics: 'lyrics',
			additionalOptions: { steps: 2, seed: 1 },
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].binary).toBeDefined();
	});

	test('embeddings generation path', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ data: [{ embedding: [1, 2] }] });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'embeddings',
			operation: 'generate',
			chuteUrl: 'https://embeddings.chutes.ai',
			text: 'embed me',
			additionalOptions: {},
		});

		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).data).toBeDefined();
	});

	test('contentModeration hate-speech special case', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue([{ label: 'ok', score: 0.1 }]);
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'contentModeration',
			operation: 'analyze',
			chuteUrl: 'https://chutes-hate-speech-detector.chutes.ai',
			content: 'text',
			image: '',
			additionalOptions: {},
		});

		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).label).toBe('ok');
	});

	test('contentModeration text endpoint fallback', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ safe: true });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'contentModeration',
			operation: 'analyze',
			chuteUrl: 'https://chutes-nsfw-classifier.chutes.ai',
			content: 'plain',
			image: '',
			additionalOptions: {},
		});

		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).safe).toBe(true);
	});

	test('video text2video path via request body builder', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('vid'));
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'p' } });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'videoGeneration',
			operation: 'text2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'p',
			additionalOptions: {},
		});

		const out = await node.execute.call(ctx as any);
		expect(out[0][0].binary).toBeDefined();
	});

	test('video keyframe path validates at least two images', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: {} });
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'videoGeneration',
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'p',
			additionalOptions: {},
			keyframeImages: {
				images: [{ image: 'data:image/png;base64,AAAA', frameIndex: 0, strength: 1 }],
			},
		});

		await expect(node.execute.call(ctx as any)).rejects.toThrow('at least 2 keyframe images');
	});

	test('execute handles unsupported resource error and continueOnFail path', async () => {
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'unknown-resource',
		});
		(ctx.continueOnFail as jest.Mock).mockReturnValue(true);
		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).error).toContain('not implemented');
	});

	test('execute rethrows errors when continueOnFail is false', async () => {
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'unknown-resource',
		});
		(ctx.continueOnFail as jest.Mock).mockReturnValue(false);
		await expect(node.execute.call(ctx as any)).rejects.toThrow('not implemented');
	});

	test('execute wraps array JSON items without binaryData marker', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue([{ a: 1 }, { b: 2 }]);
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textGeneration',
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hello',
			additionalOptions: {},
		});
		const out = await node.execute.call(ctx as any);
		expect(out[0]).toHaveLength(2);
		expect((out[0][0].json as any).a).toBe(1);
		expect((out[0][1].json as any).b).toBe(2);
	});

	test('execute wraps string responses into data field', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue('plain-response');
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textGeneration',
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hello',
			additionalOptions: {},
		});
		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).data).toBe('plain-response');
	});

	test('execute wraps primitive responses into value field', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(123);
		const node = new Chutes();
		const ctx = makeContext({
			resource: 'textGeneration',
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hello',
			additionalOptions: {},
		});
		const out = await node.execute.call(ctx as any);
		expect((out[0][0].json as any).value).toBe(123);
	});
});
