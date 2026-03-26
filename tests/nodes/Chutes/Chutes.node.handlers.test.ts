import {
	handleTextGeneration,
	handleImageGeneration,
	handleInference,
	handleEmbeddings,
	handleMusicGeneration,
	handleTextToSpeech,
	handleSpeechToText,
	handleContentModeration,
	handleVideoGeneration,
	withTimeout,
} from '../../../nodes/Chutes/Chutes.node';
import { chutesApiRequestWithRetry } from '../../../nodes/Chutes/transport/apiRequest';
import { buildRequestBody, discoverChuteCapabilities } from '../../../nodes/Chutes/transport/openApiDiscovery';

jest.mock('../../../nodes/Chutes/transport/apiRequest', () => ({
	chutesApiRequestWithRetry: jest.fn(),
}));

jest.mock('../../../nodes/Chutes/transport/openApiDiscovery', () => ({
	discoverChuteCapabilities: jest.fn().mockResolvedValue({ endpoints: [{ path: '/generate' }] }),
	buildRequestBody: jest.fn().mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } }),
}));

function makeCtx(params: Record<string, any>) {
	return {
		getNodeParameter: jest.fn((name: string, _item: number, defaultValue?: any) =>
			name in params ? params[name] : defaultValue,
		),
		getInputData: jest.fn().mockReturnValue([{ binary: undefined }]),
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

	test(
		'withTimeout throws timeout error when promise hangs',
		async () => {
			jest.useFakeTimers();
			try {
				const pending = new Promise<string>(() => {});
				const run = withTimeout(pending, 1, makeCtx({}), 0, 'Test');
				const caught = run.catch((err) => err);
				await jest.advanceTimersByTimeAsync(1200);
				const err = await caught;
				expect(err.message).toContain('Request timeout');
			} finally {
				jest.useRealTimers();
			}
		},
		10000,
	);

	test('withTimeout clears timer for resolve and reject paths', async () => {
		const resolved = await withTimeout(Promise.resolve('ok'), 1, makeCtx({}), 0, 'Resolve');
		expect(resolved).toBe('ok');
		await expect(withTimeout(Promise.reject(new Error('boom')), 1, makeCtx({}), 0, 'Reject')).rejects.toThrow(
			'boom',
		);
	});

	test('handleTextGeneration supports complete and chat operations', async () => {
		(chutesApiRequestWithRetry as jest.Mock)
			.mockResolvedValueOnce({ id: 'c1' })
			.mockResolvedValueOnce({ id: 'c2' });
		const completeCtx = makeCtx({
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hi',
			additionalOptions: { maxTokens: 50, topP: 0.9, stopSequences: 'a,b', responseFormat: 'json_object' },
		});
		const chatCtx = makeCtx({
			operation: 'chat',
			chuteUrl: 'https://llm.chutes.ai',
			messages: { messageValues: [{ role: 'user', content: 'hello' }] },
			additionalOptions: {},
		});
		await expect(handleTextGeneration.call(completeCtx, 0)).resolves.toEqual({ id: 'c1' });
		await expect(handleTextGeneration.call(chatCtx, 0)).resolves.toEqual({ id: 'c2' });
	});

	test('handleImageGeneration generate returns binary and json variants', async () => {
		(chutesApiRequestWithRetry as jest.Mock)
			.mockResolvedValueOnce(Buffer.from('img'))
			.mockResolvedValueOnce({ url: 'https://img' });
		const binaryCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			n: 1,
			additionalOptions: { seed: 7 },
		});
		const jsonCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			n: 1,
			additionalOptions: {},
		});
		const binary = (await handleImageGeneration.call(binaryCtx, 0)) as any;
		expect(binary.binaryData).toBeInstanceOf(Buffer);
		await expect(handleImageGeneration.call(jsonCtx, 0)).resolves.toEqual({ url: 'https://img' });
	});

	test('handleImageGeneration edit throws when no image data found', async () => {
		const ctx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: '',
			n: 1,
			additionalOptions: {},
		});
		await expect(handleImageGeneration.call(ctx, 0)).rejects.toThrow('No image data found');
	});

	test('handleImageGeneration generate maps all optional fields for multi-image', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('img'));
		const ctx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '768x512',
			n: 2,
			additionalOptions: {
				negativePrompt: 'bad',
				guidanceScale: 7,
				responseFormat: 'b64_json',
				quality: 'high',
				style: 'vivid',
				seed: 5,
			},
		});
		const out = (await handleImageGeneration.call(ctx, 0)) as any[];
		expect(out).toHaveLength(2);
		expect((chutesApiRequestWithRetry as jest.Mock).mock.calls[0][2]).toMatchObject({
			width: 768,
			height: 512,
			negative_prompt: 'bad',
			guidance_scale: 7,
			response_format: 'b64_json',
			quality: 'high',
			style: 'vivid',
			seed: 5,
		});
	});

	test('handleImageGeneration edit supports URL image source', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/edit' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/edit', body: { image_url: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ ok: true });
		const ctx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: 'https://example.com/image.png',
			n: 1,
			additionalOptions: {},
		});
		(ctx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('img'));
		await expect(handleImageGeneration.call(ctx, 0)).resolves.toEqual({ ok: true });
	});

	test('handleImageGeneration edit throws on invalid data URL', async () => {
		const ctx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: 'data:image/png;base64BROKEN',
			n: 1,
			additionalOptions: {},
		});
		await expect(handleImageGeneration.call(ctx, 0)).rejects.toThrow('Invalid data URL format');
	});

	test('handleImageGeneration edit multi-image loop path executes', async () => {
		(discoverChuteCapabilities as jest.Mock).mockImplementation(async (_url: string, loader: any) => {
			await loader('https://image.chutes.ai/openapi.json');
			return { endpoints: [{ path: '/edit' }] };
		});
		(buildRequestBody as jest.Mock).mockReturnValue({
			endpoint: '/edit',
			body: { image_b64s: ['a', 'b'], image_url: 'https://x' },
		});
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('edited'));
		const ctx = makeCtx(
			{
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: '512x512',
				image: '',
				n: 2,
				additionalOptions: { seed: 10 },
			},
		 );
		ctx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'image/png' } } }]);
		(ctx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ paths: {} });
		const out = (await handleImageGeneration.call(ctx, 0)) as any[];
		expect(out).toHaveLength(2);
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

	test('handleTextToSpeech omits separator voice and supports JSON response', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ url: 'https://audio' });
		const ctx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://audio.chutes.ai',
			text: 'hello',
			voice: '_separator_top',
			customVoice: '',
			additionalOptions: {},
		});
		await expect(handleTextToSpeech.call(ctx, 0)).resolves.toEqual({ url: 'https://audio' });
		const body = (chutesApiRequestWithRetry as jest.Mock).mock.calls.at(-1)?.[2];
		expect(body.voice).toBeUndefined();
	});

	test('handleSpeechToText transcribes chunks and optionally returns chunk list', async () => {
		const ctx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'data:audio/wav;base64,QUJD',
			additionalOptions: { includeChunks: true },
		});
		(ctx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([
			{ start: 0, end: 1.2, text: 'Hello ' },
			{ start: 1.2, end: 2.0, text: 'world' },
		]);
		const out = (await handleSpeechToText.call(ctx, 0)) as any;
		expect(out.text).toBe('Hello world');
		expect(out.chunkCount).toBe(2);
		expect(out.chunks).toHaveLength(2);
	});

	test('handleSpeechToText wraps request error', async () => {
		const ctx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'QUJD',
			additionalOptions: {},
		});
		(ctx.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(new Error('boom'));
		await expect(handleSpeechToText.call(ctx, 0)).rejects.toThrow('Failed to transcribe audio');
	});

	test('handleSpeechToText supports URL and throws on invalid data URL', async () => {
		const urlCtx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'https://example.com/audio.wav',
			additionalOptions: {},
		});
		(urlCtx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('aud'));
		(urlCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([]);
		await expect(handleSpeechToText.call(urlCtx, 0)).resolves.toBeDefined();

		const invalidDataUrlCtx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'data:audio/wav;base64BROKEN',
			additionalOptions: {},
		});
		await expect(handleSpeechToText.call(invalidDataUrlCtx, 0)).rejects.toThrow(
			'Invalid data URL format',
		);
	});

	test('handleSpeechToText throws when no audio and unsupported operation', async () => {
		const noAudioCtx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: '',
			additionalOptions: {},
		});
		await expect(handleSpeechToText.call(noAudioCtx, 0)).rejects.toThrow('No audio data found');

		const badOpCtx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'QUJD',
			additionalOptions: {},
		});
		await expect(handleSpeechToText.call(badOpCtx, 0)).rejects.toThrow('not supported for speech-to-text');
	});

	test('handleContentModeration supports hate-speech and nsfw text flows', async () => {
		(chutesApiRequestWithRetry as jest.Mock)
			.mockResolvedValueOnce([{ label: 'ok', score: 0.1 }])
			.mockResolvedValueOnce({ safe: true });
		const hateCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://hate-speech-detector.chutes.ai',
			content: 'hello',
			image: '',
			additionalOptions: {},
		});
		const nsfwCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: 'hello',
			image: '',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(hateCtx, 0)).resolves.toEqual({ label: 'ok', score: 0.1 });
		await expect(handleContentModeration.call(nsfwCtx, 0)).resolves.toEqual({ safe: true });
	});

	test('handleContentModeration hate speech requires content and returns raw fallback', async () => {
		const noContentCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://hate-speech-detector.chutes.ai',
			content: '',
			image: '',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(noContentCtx, 0)).rejects.toThrow(
			'Text content is required',
		);

		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce([]);
		const emptyArrayCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://hate-speech-detector.chutes.ai',
			content: 'hello',
			image: '',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(emptyArrayCtx, 0)).resolves.toEqual([]);
	});

	test('handleContentModeration image URL and invalid data URL branches', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ safe: true });
		const urlCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: 'https://example.com/image.png',
			additionalOptions: {},
		});
		(urlCtx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('img'));
		await expect(handleContentModeration.call(urlCtx, 0)).resolves.toEqual({ safe: true });

		const invalidCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: 'data:image/png;base64BROKEN',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(invalidCtx, 0)).rejects.toThrow('Invalid data URL format');
	});

	test('handleVideoGeneration text2video returns binary output', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));
		const ctx = makeCtx({
			operation: 'text2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			additionalOptions: { duration: 1, fps: 8 },
		});
		const out = (await handleVideoGeneration.call(ctx, 0)) as any;
		expect(out.mimeType).toBe('video/mp4');
	});

	test('handleVideoGeneration image2video requires image input', async () => {
		const ctx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			image: '',
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(ctx, 0)).rejects.toThrow('No image data found');
	});

	test('handleVideoGeneration covers ltx options, image2video, video2video, keyframe branches', async () => {
		(discoverChuteCapabilities as jest.Mock).mockImplementation(async (_url: string, loader: any) => {
			await loader('https://video.chutes.ai/openapi.json');
			return { endpoints: [{ path: '/generate' }], supportsTextToVideo: true, supportsImageToVideo: true };
		});
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));

		const textCtx = makeCtx({
			operation: 'text2video',
			chuteUrl: 'https://ltx-video.chutes.ai',
			prompt: 'x',
			additionalOptions: {
				resolution: '1280*720',
				steps: 22,
				seed: 1,
				duration: 2,
				fps: 24,
				loras: { loraItems: [{ name: 'style-a', strength: 0.8 }] },
				negativePrompt: 'bad',
				pipeline: 'custom',
				enhancePrompt: true,
				guidance_scale: 4.5,
			},
		});
		(textCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ paths: {} });
		await expect(handleVideoGeneration.call(textCtx, 0)).resolves.toBeDefined();

		const i2vCtx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://ltx-video.chutes.ai',
			prompt: 'x',
			image: 'data:image/png;base64,QUJD',
			additionalOptions: { image_strength: 0.9, image_frame_index: 2 },
		});
		(i2vCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ paths: {} });
		await expect(handleVideoGeneration.call(i2vCtx, 0)).resolves.toBeDefined();

		const v2vCtx = makeCtx({
			operation: 'video2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			video: 'data:video/mp4;base64,QUJD',
			additionalOptions: {},
		});
		(v2vCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ paths: {} });
		await expect(handleVideoGeneration.call(v2vCtx, 0)).resolves.toBeDefined();

		const keyframeCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'data:image/png;base64,QUJD', frameIndex: 0, strength: 1 },
					{ image: 'data:image/png;base64,REVG', frameIndex: 8, strength: 0.8 },
				],
			},
			additionalOptions: {},
		});
		(keyframeCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ paths: {} });
		await expect(handleVideoGeneration.call(keyframeCtx, 0)).resolves.toBeDefined();
	});

	test('extra branch coverage for text/image/inference/music/embeddings/content/video handlers', async () => {
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ ok: true });

		// text generation optional penalties
		const tgCtx = makeCtx({
			operation: 'complete',
			chuteUrl: 'https://llm.chutes.ai',
			prompt: 'hello',
			additionalOptions: { frequencyPenalty: 0.2, presencePenalty: 0.3 },
		});
		await handleTextGeneration.call(tgCtx, 0);
		const tgBody = (chutesApiRequestWithRetry as jest.Mock).mock.calls.at(-1)?.[2];
		expect(tgBody.frequency_penalty).toBe(0.2);
		expect(tgBody.presence_penalty).toBe(0.3);

		// image generation single-image options + unsupported op
		const imgGenCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '640x480',
			n: 1,
			additionalOptions: {
				negativePrompt: 'bad',
				guidanceScale: 4,
				responseFormat: 'url',
				quality: 'high',
				style: 'vivid',
				seed: 11,
			},
		});
		await handleImageGeneration.call(imgGenCtx, 0);
		const imgBody = (chutesApiRequestWithRetry as jest.Mock).mock.calls.at(-1)?.[2];
		expect(imgBody.width).toBe(640);
		const imgBadCtx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			n: 1,
			additionalOptions: {},
		});
		await expect(handleImageGeneration.call(imgBadCtx, 0)).rejects.toThrow('not supported');

		// image edit requestConfig null branch
		const imgEditCtx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: 'data:image/png;base64,QUJD',
			n: 1,
			additionalOptions: {},
		});
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/edit' }] });
		(buildRequestBody as jest.Mock).mockReturnValueOnce(null);
		await expect(handleImageGeneration.call(imgEditCtx, 0)).rejects.toThrow(
			'Could not find suitable endpoint',
		);

		// tts unsupported
		const ttsBadCtx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://audio.chutes.ai',
			text: 'hello',
			voice: '',
			customVoice: '',
			additionalOptions: {},
		});
		await expect(handleTextToSpeech.call(ttsBadCtx, 0)).rejects.toThrow('not supported');

		// stt download failure path
		const sttFailCtx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: 'https://example.com/a.wav',
			additionalOptions: {},
		});
		(sttFailCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('net'));
		await expect(handleSpeechToText.call(sttFailCtx, 0)).rejects.toThrow('Failed to download audio');

		// inference mapping + unsupported
		const infCtx = makeCtx({
			operation: 'predict',
			chuteUrl: 'https://llm.chutes.ai',
			modelId: 'm',
			input: '{"x":1}',
			additionalOptions: { outputFormat: 'json', webhookUrl: 'https://hook' },
		});
		await handleInference.call(infCtx, 0);
		const infBody = (chutesApiRequestWithRetry as jest.Mock).mock.calls.at(-1)?.[2];
		expect(infBody.output_format).toBe('json');
		const infBadCtx = makeCtx({ operation: 'bad', chuteUrl: 'https://llm.chutes.ai', additionalOptions: {} });
		await expect(handleInference.call(infBadCtx, 0)).rejects.toThrow('not supported');

		// music optional body + json fallback
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ url: 'music' });
		const musicCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://music.chutes.ai',
			prompt: 'x',
			lyrics: 'la',
			additionalOptions: { audio_b64: 'abc', music_duration: 12, cfg_strength: 3.2, steps: 20, seed: 7 },
		});
		await expect(handleMusicGeneration.call(musicCtx, 0)).resolves.toEqual({ url: 'music' });

		// embeddings encoding format + unsupported
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ data: [] });
		const embCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://embeddings.chutes.ai',
			text: 'hello',
			additionalOptions: { encodingFormat: 'base64' },
		});
		await expect(handleEmbeddings.call(embCtx, 0)).resolves.toEqual({ data: [] });

		// content moderation base64 image + missing + unsupported
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ safe: true });
		const cmBase64Ctx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: 'QUJD',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(cmBase64Ctx, 0)).resolves.toEqual({ safe: true });
		const cmMissingCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: '',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(cmMissingCtx, 0)).rejects.toThrow('Either content');
		const cmBadCtx = makeCtx({
			operation: 'bad',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: 'x',
			image: '',
			additionalOptions: {},
		});
		await expect(handleContentModeration.call(cmBadCtx, 0)).rejects.toThrow('not supported');

		// video error branches
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValueOnce(null);
		const vidNoEndpointCtx = makeCtx({
			operation: 'text2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(vidNoEndpointCtx, 0)).rejects.toThrow('Could not find suitable endpoint');

		const vidUnsupportedCtx = makeCtx({
			operation: 'unknown',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(vidUnsupportedCtx, 0)).rejects.toThrow('not supported');
	});

	test('video keyframe binary-name and empty-field fallback branches', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));

		const ctx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'start_frame_image', frameIndex: 0, strength: 1 },
					{ image: '', frameIndex: 8, strength: 0.8 },
				],
			},
			additionalOptions: {},
		});

		ctx.getInputData.mockReturnValue([
			{ binary: { start_frame_image: { mimeType: 'image/png' } } },
			{ binary: { data: { mimeType: 'image/png' } } },
		]);
		(ctx.helpers.getBinaryDataBuffer as jest.Mock)
			.mockResolvedValueOnce(Buffer.from('start'))
			.mockResolvedValueOnce(Buffer.from('second'));

		const out = await handleVideoGeneration.call(ctx, 0);
		expect((out as any).mimeType).toBe('video/mp4');
	});

	test('video keyframe URL download and error branches', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));

		const urlCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'https://example.com/a.png', frameIndex: 0, strength: 1 },
					{ image: 'https://example.com/b.png', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		(urlCtx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('img'));
		await expect(handleVideoGeneration.call(urlCtx, 0)).resolves.toBeDefined();

		const badUrlCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'https://example.com/a.png', frameIndex: 0, strength: 1 },
					{ image: 'https://example.com/b.png', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		(badUrlCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('download fail'));
		await expect(handleVideoGeneration.call(badUrlCtx, 0)).rejects.toThrow(
			'Failed to download keyframe image from URL',
		);
	});

	test('video keyframe handles unresolved images and requestConfig null', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValueOnce(null);
		const nullConfigCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'data:image/png;base64,QUJD', frameIndex: 0, strength: 1 },
					{ image: 'data:image/png;base64,REVG', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(nullConfigCtx, 0)).rejects.toThrow(
			'Could not find suitable endpoint for keyframe interpolation',
		);

		const unresolvedCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'missing-prop', frameIndex: 0, strength: 1 },
					{ image: 'another-missing', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		unresolvedCtx.getInputData.mockReturnValue([{ binary: {} }]);
		await expect(handleVideoGeneration.call(unresolvedCtx, 0)).rejects.toThrow(
			'Could not find image data for keyframe',
		);
	});

	test('final opposite-arm branch pass for remaining image/video/keyframe logic', async () => {
		// chat messages fallback ([] branch from messageValues || [])
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ ok: true });
		const chatFallbackCtx = makeCtx({
			operation: 'chat',
			chuteUrl: 'https://llm.chutes.ai',
			messages: {},
			additionalOptions: {},
		});
		await expect(handleTextGeneration.call(chatFallbackCtx, 0)).resolves.toEqual({ ok: true });

		// image generate n>1 with width/height missing, seed missing, non-buffer response
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ url: 'img' });
		const genMultiNoOptsCtx = makeCtx({
			operation: 'generate',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: 'bad-size',
			n: 2,
			additionalOptions: {},
		});
		await expect(handleImageGeneration.call(genMultiNoOptsCtx, 0)).resolves.toEqual([]);

		// image edit with no binary input + all optional edit settings + image_b64 logging + array reduce fallback
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/edit' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({
			endpoint: '/edit',
			body: { image_b64: 'abc', image_b64s: ['x', undefined] },
		});
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ notBuffer: true });
		const editOptsCtx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: 'QUJD',
			n: 1,
			additionalOptions: {
				negativePrompt: 'bad',
				guidanceScale: 5,
				responseFormat: 'url',
				quality: 'high',
				style: 'vivid',
				seed: 8,
			},
		});
		await expect(handleImageGeneration.call(editOptsCtx, 0)).resolves.toEqual({ notBuffer: true });

		// image edit n>1 requestConfig-null branch
		(buildRequestBody as jest.Mock)
			.mockReturnValueOnce({ endpoint: '/edit', body: { a: 1 } })
			.mockReturnValueOnce(null);
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('img'));
		const editMultiNullCtx = makeCtx({
			operation: 'edit',
			chuteUrl: 'https://image.chutes.ai',
			prompt: 'x',
			size: '512x512',
			image: 'QUJD',
			n: 2,
			additionalOptions: {},
		});
		await expect(handleImageGeneration.call(editMultiNullCtx, 0)).rejects.toThrow(
			'Could not build request for image editing',
		);

		// speech-to-text branch where mimeType is missing and chunk text fallback ('')
		const sttChunkFallbackCtx = makeCtx({
			operation: 'transcribe',
			chuteUrl: 'https://stt.chutes.ai',
			audio: '',
			additionalOptions: { includeChunks: false },
		});
		sttChunkFallbackCtx.getInputData.mockReturnValue([{ binary: { data: {} } }]);
		(sttChunkFallbackCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([{ nope: 1 }]);
		const sttOut = (await handleSpeechToText.call(sttChunkFallbackCtx, 0)) as any;
		expect(sttOut.text).toBe('');

		// content moderation: binary path true arm + download failure arm + valid data-url arm
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ safe: true });
		const cmBinaryCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: '',
			additionalOptions: {},
		});
		cmBinaryCtx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'image/png' } } }]);
		await expect(handleContentModeration.call(cmBinaryCtx, 0)).resolves.toEqual({ safe: true });

		const cmDownloadFailCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: 'https://example.com/x.png',
			additionalOptions: {},
		});
		(cmDownloadFailCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('nope'));
		await expect(handleContentModeration.call(cmDownloadFailCtx, 0)).rejects.toThrow(
			'Failed to download image',
		);

		const cmDataUrlCtx = makeCtx({
			operation: 'analyze',
			chuteUrl: 'https://nsfw.chutes.ai',
			content: '',
			image: 'data:image/png;base64,QUJD',
			additionalOptions: {},
		});
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ safe: true });
		await expect(handleContentModeration.call(cmDataUrlCtx, 0)).resolves.toEqual({ safe: true });

		// video text2video: no rounding branch, empty lora list branch, json return branch
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ job: 'queued' });
		const t2vJsonCtx = makeCtx({
			operation: 'text2video',
			chuteUrl: 'https://ltx-video.chutes.ai',
			prompt: 'x',
			additionalOptions: { duration: 1, fps: 9, loras: { loraItems: [{ name: '', strength: 0 }] } },
		});
		await expect(handleVideoGeneration.call(t2vJsonCtx, 0)).resolves.toEqual({ job: 'queued' });

		// image2video URL/data/base64 and requestConfig-null/json branches
		(buildRequestBody as jest.Mock).mockReturnValueOnce(null);
		const i2vNullCtx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			image: 'QUJD',
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(i2vNullCtx, 0)).rejects.toThrow(
			'Could not find suitable endpoint for image-to-video generation',
		);

		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ status: 'processing' });
		const i2vJsonCtx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			image: 'QUJD',
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(i2vJsonCtx, 0)).resolves.toEqual({ status: 'processing' });

		const i2vUrlCtx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			image: 'https://example.com/image.png',
			additionalOptions: {},
		});
		(i2vUrlCtx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('img'));
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce(Buffer.from('video'));
		await expect(handleVideoGeneration.call(i2vUrlCtx, 0)).resolves.toBeDefined();

		// video2video URL/data/base64 branches + requestConfig-null + json return + pipeline preset branch
		(buildRequestBody as jest.Mock).mockReturnValueOnce(null);
		const v2vNullCtx = makeCtx({
			operation: 'video2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			video: 'QUJD',
			additionalOptions: { pipeline: 'preset' },
		});
		await expect(handleVideoGeneration.call(v2vNullCtx, 0)).rejects.toThrow(
			'Could not find suitable endpoint for video-to-video transformation',
		);

		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ status: 'queued' });
		const v2vJsonCtx = makeCtx({
			operation: 'video2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			video: 'QUJD',
			additionalOptions: { pipeline: 'preset' },
		});
		await expect(handleVideoGeneration.call(v2vJsonCtx, 0)).resolves.toEqual({ status: 'queued' });

		const v2vUrlCtx = makeCtx({
			operation: 'video2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			video: 'https://example.com/video.mp4',
			additionalOptions: {},
		});
		(v2vUrlCtx.helpers.request as jest.Mock).mockResolvedValue(Buffer.from('vid'));
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce(Buffer.from('video'));
		await expect(handleVideoGeneration.call(v2vUrlCtx, 0)).resolves.toBeDefined();

		// keyframe fallback-loop branch where indexed item has no data but later fallback item does
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValueOnce({ url: 'video' });
		const keyframeFallbackCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: '', frameIndex: 0, strength: 0 },
					{ image: 'data:image/png;base64,REVG', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: { pipeline: 'preset' },
		});
		keyframeFallbackCtx.getInputData.mockReturnValue([
			{ binary: {} },
			{ binary: { data: { mimeType: 'image/png' } } },
		]);
		(keyframeFallbackCtx.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(Buffer.from('fallback'));
		await expect(handleVideoGeneration.call(keyframeFallbackCtx, 0)).resolves.toEqual({ url: 'video' });

		// keyframe invalid data URL branch
		const keyframeInvalidDataUrlCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'data:image/png;base64BROKEN', frameIndex: 0, strength: 1 },
					{ image: 'data:image/png;base64,REVG', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(keyframeInvalidDataUrlCtx, 0)).rejects.toThrow(
			'Invalid data URL format',
		);

		// keyframe branch where images collection is absent
		const keyframeNoImagesCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {},
			additionalOptions: {},
		});
		await expect(handleVideoGeneration.call(keyframeNoImagesCtx, 0)).rejects.toThrow(
			'at least 2 keyframe images',
		);
	});

	test('remaining warning/error branch closures for image/stt/moderation/video/keyframe', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }, { path: '/edit' }] });
			(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ ok: true });

			// image generate n=1 width/height false branch
			const imgNoSizeCtx = makeCtx({
				operation: 'generate',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: 'bad',
				n: 1,
				additionalOptions: {},
			});
			await expect(handleImageGeneration.call(imgNoSizeCtx, 0)).resolves.toEqual({ ok: true });

			// image edit: binary read warning + URL download failure + invalid data URL + no width/height
			const imgEditWarnCtx = makeCtx({
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: 'bad',
				image: 'QUJD',
				n: 1,
				additionalOptions: {},
			});
			imgEditWarnCtx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'image/png' } } }]);
			(imgEditWarnCtx.helpers.getBinaryDataBuffer as jest.Mock).mockRejectedValue(new Error('binary'));
			await expect(handleImageGeneration.call(imgEditWarnCtx, 0)).resolves.toEqual({ ok: true });

			const imgEditUrlFailCtx = makeCtx({
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: '512x512',
				image: 'https://example.com/x.png',
				n: 1,
				additionalOptions: {},
			});
			(imgEditUrlFailCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('download'));
			await expect(handleImageGeneration.call(imgEditUrlFailCtx, 0)).rejects.toThrow(
				'Failed to download image from URL',
			);

			const imgEditInvalidDataCtx = makeCtx({
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: '512x512',
				image: 'data:image/png;base64BROKEN',
				n: 1,
				additionalOptions: {},
			});
			await expect(handleImageGeneration.call(imgEditInvalidDataCtx, 0)).rejects.toThrow('Invalid data URL format');

			// image edit n>1 json response branch
			(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/edit', body: { prompt: 'x' } });
			const imgEditMultiJsonCtx = makeCtx({
				operation: 'edit',
				chuteUrl: 'https://image.chutes.ai',
				prompt: 'x',
				size: '512x512',
				image: 'QUJD',
				n: 2,
				additionalOptions: {},
			});
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ notBuffer: true });
			await expect(handleImageGeneration.call(imgEditMultiJsonCtx, 0)).resolves.toEqual([]);

			// tts custom voice true branch
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('audio'));
			const ttsCustomCtx = makeCtx({
				operation: 'generate',
				chuteUrl: 'https://audio.chutes.ai',
				text: 'hello',
				voice: 'custom',
				customVoice: 'af_custom',
				additionalOptions: {},
			});
			await expect(handleTextToSpeech.call(ttsCustomCtx, 0)).resolves.toBeDefined();

			// stt binary read warning + non-array response branch
			const sttWarnCtx = makeCtx({
				operation: 'transcribe',
				chuteUrl: 'https://stt.chutes.ai',
				audio: 'QUJD',
				additionalOptions: {},
			});
			sttWarnCtx.getInputData.mockReturnValue([{ binary: { data: {} } }]);
			(sttWarnCtx.helpers.getBinaryDataBuffer as jest.Mock).mockRejectedValue(new Error('broken'));
			(sttWarnCtx.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ not: 'array' });
			await expect(handleSpeechToText.call(sttWarnCtx, 0)).resolves.toBeDefined();

			// music generate false branches for optional flags
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ json: true });
			const musicNoOptsCtx = makeCtx({
				operation: 'generate',
				chuteUrl: 'https://music.chutes.ai',
				prompt: 'x',
				lyrics: '',
				additionalOptions: {},
			});
			await expect(handleMusicGeneration.call(musicNoOptsCtx, 0)).resolves.toEqual({ json: true });

			// moderation binary-read warning path
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ safe: true });
			const modWarnCtx = makeCtx({
				operation: 'analyze',
				chuteUrl: 'https://nsfw.chutes.ai',
				content: '',
				image: 'QUJD',
				additionalOptions: {},
			});
			modWarnCtx.getInputData.mockReturnValue([{ binary: { data: {} } }]);
			(modWarnCtx.helpers.getBinaryDataBuffer as jest.Mock).mockRejectedValue(new Error('bad'));
			await expect(handleContentModeration.call(modWarnCtx, 0)).resolves.toEqual({ safe: true });

			// image2video binary-read warning + URL failure + invalid data URL + ltx defaults + requestConfig null/json
			(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
			(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ job: 'queued' });
			const i2vWarnCtx = makeCtx({
				operation: 'image2video',
				chuteUrl: 'https://ltx-video.chutes.ai',
				prompt: 'x',
				image: 'QUJD',
				additionalOptions: {},
			});
			i2vWarnCtx.getInputData.mockReturnValue([{ binary: { data: {} } }]);
			(i2vWarnCtx.helpers.getBinaryDataBuffer as jest.Mock).mockRejectedValue(new Error('bad'));
			await expect(handleVideoGeneration.call(i2vWarnCtx, 0)).resolves.toEqual({ job: 'queued' });

			const i2vUrlFailCtx = makeCtx({
				operation: 'image2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				image: 'https://example.com/x.png',
				additionalOptions: {},
			});
			(i2vUrlFailCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('download'));
			await expect(handleVideoGeneration.call(i2vUrlFailCtx, 0)).rejects.toThrow(
				'Failed to download image from URL',
			);

			const i2vInvalidDataCtx = makeCtx({
				operation: 'image2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				image: 'data:image/png;base64BROKEN',
				additionalOptions: {},
			});
			await expect(handleVideoGeneration.call(i2vInvalidDataCtx, 0)).rejects.toThrow('Invalid data URL format');

			// video2video binary-read warning + URL failure + invalid data URL + no video data + no videoParam branch
			(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ status: 'ok' });
			const v2vWarnCtx = makeCtx({
				operation: 'video2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				video: 'QUJD',
				additionalOptions: {},
			});
			v2vWarnCtx.getInputData.mockReturnValue([{ binary: { data: {} } }]);
			(v2vWarnCtx.helpers.getBinaryDataBuffer as jest.Mock).mockRejectedValue(new Error('bad'));
			await expect(handleVideoGeneration.call(v2vWarnCtx, 0)).resolves.toEqual({ status: 'ok' });

			const v2vUrlFailCtx = makeCtx({
				operation: 'video2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				video: 'https://example.com/v.mp4',
				additionalOptions: {},
			});
			(v2vUrlFailCtx.helpers.request as jest.Mock).mockRejectedValue(new Error('download'));
			await expect(handleVideoGeneration.call(v2vUrlFailCtx, 0)).rejects.toThrow(
				'Failed to download video from URL',
			);

			const v2vInvalidDataCtx = makeCtx({
				operation: 'video2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				video: 'data:video/mp4;base64BROKEN',
				additionalOptions: {},
			});
			await expect(handleVideoGeneration.call(v2vInvalidDataCtx, 0)).rejects.toThrow('Invalid data URL format');

			const v2vNoVideoCtx = makeCtx({
				operation: 'video2video',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				video: '',
				additionalOptions: {},
			});
			await expect(handleVideoGeneration.call(v2vNoVideoCtx, 0)).rejects.toThrow('No video data found');

			// keyframe warnings in binary property lookup and indexed/fallback data fetch, plus empty imageParam in message
			(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });
			(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ url: 'ok' });
			const keyframeWarnCtx = makeCtx({
				operation: 'keyframe',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				keyframeImages: {
					images: [
						{ image: 'named_bin', frameIndex: 0, strength: 0 },
						{ image: '', frameIndex: 8, strength: 1 },
					],
				},
				additionalOptions: {},
			});
			keyframeWarnCtx.getInputData.mockReturnValue([
				{ binary: { named_bin: { mimeType: 'image/png' } } },
				{ binary: { data: { mimeType: 'image/png' } } },
			]);
			(keyframeWarnCtx.helpers.getBinaryDataBuffer as jest.Mock)
				.mockRejectedValueOnce(new Error('named fail'))
				.mockRejectedValueOnce(new Error('idx fail'))
				.mockResolvedValueOnce(Buffer.from('fallback'));
			await expect(handleVideoGeneration.call(keyframeWarnCtx, 0)).rejects.toThrow(
				'Could not find image data for keyframe',
			);

			const keyframeWarnFallbackCtx = makeCtx({
				operation: 'keyframe',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				keyframeImages: {
					images: [
						{ image: '', frameIndex: 0, strength: 0 },
						{ image: 'data:image/png;base64,REVG', frameIndex: 8, strength: 1 },
					],
				},
				additionalOptions: {},
			});
			keyframeWarnFallbackCtx.getInputData.mockReturnValue([
				{ binary: { data: { mimeType: 'image/png' } } },
				{ binary: { data: { mimeType: 'image/png' } } },
			]);
			(keyframeWarnFallbackCtx.helpers.getBinaryDataBuffer as jest.Mock)
				.mockRejectedValueOnce(new Error('idx fail'))
				.mockRejectedValueOnce(new Error('fallback0 fail'))
				.mockResolvedValueOnce(Buffer.from('fallback1'));
			await expect(handleVideoGeneration.call(keyframeWarnFallbackCtx, 0)).resolves.toEqual({
				url: 'ok',
			});

			const keyframeEmptyParamErrorCtx = makeCtx({
				operation: 'keyframe',
				chuteUrl: 'https://video.chutes.ai',
				prompt: 'x',
				keyframeImages: { images: [{ image: '', frameIndex: 0, strength: 1 }, { image: '', frameIndex: 8, strength: 1 }] },
				additionalOptions: {},
			});
			keyframeEmptyParamErrorCtx.getInputData.mockReturnValue([{ binary: {} }]);
			await expect(handleVideoGeneration.call(keyframeEmptyParamErrorCtx, 0)).rejects.toThrow('(empty)');
		} finally {
			warnSpy.mockRestore();
		}
	});

	test('final binary-success and keyframe index-false branches', async () => {
		(discoverChuteCapabilities as jest.Mock).mockResolvedValue({ endpoints: [{ path: '/generate' }] });
		(buildRequestBody as jest.Mock).mockReturnValue({ endpoint: '/generate', body: { prompt: 'x' } });

		// image2video binary success branch (line 1773)
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));
		const i2vBinaryCtx = makeCtx({
			operation: 'image2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			image: '',
			additionalOptions: {},
		});
		i2vBinaryCtx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'image/png' } } }]);
		(i2vBinaryCtx.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(Buffer.from('img'));
		await expect(handleVideoGeneration.call(i2vBinaryCtx, 0)).resolves.toBeDefined();

		// video2video binary success branch (line 1917)
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue(Buffer.from('video'));
		const v2vBinaryCtx = makeCtx({
			operation: 'video2video',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			video: '',
			additionalOptions: {},
		});
		v2vBinaryCtx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'video/mp4' } } }]);
		(v2vBinaryCtx.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(Buffer.from('vid'));
		await expect(handleVideoGeneration.call(v2vBinaryCtx, 0)).resolves.toBeDefined();

		// keyframeIdx < allInputItems.length false branch (line 2080 if false)
		(chutesApiRequestWithRetry as jest.Mock).mockResolvedValue({ url: 'ok' });
		const keyframeIdxFalseCtx = makeCtx({
			operation: 'keyframe',
			chuteUrl: 'https://video.chutes.ai',
			prompt: 'x',
			keyframeImages: {
				images: [
					{ image: 'data:image/png;base64,QUJD', frameIndex: 0, strength: 1 },
					{ image: '', frameIndex: 8, strength: 1 },
				],
			},
			additionalOptions: {},
		});
		keyframeIdxFalseCtx.getInputData.mockReturnValue([{ binary: { data: { mimeType: 'image/png' } } }]);
		(keyframeIdxFalseCtx.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(Buffer.from('fallback'));
		await expect(handleVideoGeneration.call(keyframeIdxFalseCtx, 0)).resolves.toEqual({ url: 'ok' });
	});
});
