/**
 * Test: Image Chutes - Top 20 Model Families
 * 
 * Verifies that image generation chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source image generation models (Dec 2025):
 * - FLUX (Black Forest Labs)
 * - Stable Diffusion 3/3.5, SDXL variants
 * - HiDream, PixArt, Kandinsky, DeepFloyd
 * - Kolors, HunyuanImage, Playground
 * - ControlNet, Animagine, Stable Cascade
 * - Waifu Diffusion, Fooocus, OmniGen, Sana, Lumina
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 image generation model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 Image Model Families ===
	
	// FLUX variants (Black Forest Labs) - Currently leading
	{
		chute_id: 'img1',
		name: 'flux-1-dev',
		slug: 'flux-1-dev',
		standard_template: 'diffusion',
		public: true,
		tagline: 'FLUX.1 dev model',
		description: 'High-quality image generation',
	},
	{
		chute_id: 'img2',
		name: 'flux-schnell',
		slug: 'flux-schnell',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Fast FLUX generation',
		description: 'Sub-second image generation',
	},
	{
		chute_id: 'img3',
		name: 'flux-kontext',
		slug: 'flux-kontext',
		standard_template: null,
		public: true,
		tagline: 'FLUX Kontext variant',
		description: 'Context-aware generation',
	},
	
	// Stable Diffusion variants
	{
		chute_id: 'img4',
		name: 'stable-diffusion-3.5',
		slug: 'stable-diffusion-3-5',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Latest SD generation',
		description: 'Improved text rendering',
	},
	{
		chute_id: 'img5',
		name: 'sdxl-base',
		slug: 'sdxl-base',
		standard_template: 'diffusion',
		public: true,
		tagline: 'SDXL baseline',
		description: 'Stable Diffusion XL',
	},
	{
		chute_id: 'img6',
		name: 'sdxl-lightning',
		slug: 'sdxl-lightning',
		standard_template: null,
		public: true,
		tagline: 'Sub-second generation',
		description: 'Distilled SDXL for speed',
	},
	{
		chute_id: 'img7',
		name: 'sdxl-turbo',
		slug: 'sdxl-turbo',
		standard_template: null,
		public: true,
		tagline: 'Fast SDXL variant',
		description: 'Real-time image generation',
	},
	
	// Other top model families
	{
		chute_id: 'img8',
		name: 'hidream-i1-17b',
		slug: 'hidream-i1-17b',
		standard_template: null,
		public: true,
		tagline: '17B parameters, MoE',
		description: 'Sparse Mixture-of-Experts architecture',
	},
	{
		chute_id: 'img9',
		name: 'pixart-sigma',
		slug: 'pixart-sigma',
		standard_template: null,
		public: true,
		tagline: 'DiT-based, efficient',
		description: 'Midjourney-competitive quality',
	},
	{
		chute_id: 'img10',
		name: 'kandinsky-v5',
		slug: 'kandinsky-v5',
		standard_template: null,
		public: true,
		tagline: 'Russian AI model',
		description: 'Sber AI image generation',
	},
	{
		chute_id: 'img11',
		name: 'deepfloyd-if',
		slug: 'deepfloyd-if',
		standard_template: null,
		public: true,
		tagline: 'Excellent text rendering',
		description: 'Stability AI text comprehension',
	},
	{
		chute_id: 'img12',
		name: 'kolors-sdxl',
		slug: 'kolors-sdxl',
		standard_template: null,
		public: true,
		tagline: 'ChatGLM encoder',
		description: 'Kwai SDXL-based model',
	},
	{
		chute_id: 'img13',
		name: 'hunyuan-image-3',
		slug: 'hunyuan-image-3',
		standard_template: null,
		public: true,
		tagline: 'Tencent multimodal',
		description: 'Chinese image generation model',
	},
	{
		chute_id: 'img14',
		name: 'playground-2.5',
		slug: 'playground-2-5',
		standard_template: null,
		public: true,
		tagline: 'Midjourney aesthetic',
		description: 'Trained for Midjourney style',
	},
	{
		chute_id: 'img15',
		name: 'controlnet-canny',
		slug: 'controlnet-canny',
		standard_template: null,
		public: true,
		tagline: 'Structure-guided',
		description: 'Edge detection control',
	},
	{
		chute_id: 'img16',
		name: 'animagine-xl-3.1',
		slug: 'animagine-xl-3-1',
		standard_template: null,
		public: true,
		tagline: 'Anime/manga specialized',
		description: 'Anime art generation',
	},
	{
		chute_id: 'img17',
		name: 'stable-cascade',
		slug: 'stable-cascade',
		standard_template: null,
		public: true,
		tagline: 'Würstchen architecture',
		description: 'Efficient multi-stage generation',
	},
	{
		chute_id: 'img18',
		name: 'waifu-diffusion-v1.5',
		slug: 'waifu-diffusion-v1-5',
		standard_template: null,
		public: true,
		tagline: 'Anime community model',
		description: 'Anime-focused fine-tune',
	},
	{
		chute_id: 'img19',
		name: 'omnigen',
		slug: 'omnigen',
		standard_template: null,
		public: true,
		tagline: 'Unified generation',
		description: 'Multi-task image model',
	},
	{
		chute_id: 'img20',
		name: 'sana-1b',
		slug: 'sana-1b',
		standard_template: null,
		public: true,
		tagline: 'Lightweight flow-matching',
		description: 'Efficient generation',
	},
	{
		chute_id: 'img21',
		name: 'lumina-next',
		slug: 'lumina-next',
		standard_template: null,
		public: true,
		tagline: 'Flow-matching DiT',
		description: 'DiT architecture with flow matching',
	},
	
	// === Should be EXCLUDED - Non-image chutes ===
	
	// LLM chute
	{
		chute_id: 'llm1',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Language model',
		description: 'LLM for text generation',
	},
	
	// Video chute (careful with HunyuanVideo vs HunyuanImage)
	{
		chute_id: 'video1',
		name: 'hunyuan-video-13b',
		slug: 'hunyuan-video-13b',
		standard_template: null,
		public: true,
		tagline: 'Video generation',
		description: 'Tencent video model',
	},
	
	// Embedding chute
	{
		chute_id: 'emb1',
		name: 'BAAI/bge-large-en-v1.5',
		slug: 'baai-bge-large-en-v1-5',
		standard_template: 'tei',
		public: true,
		tagline: 'Text embeddings',
		description: 'Embedding model',
	},
	
	// Private image chute
	{
		chute_id: 'priv1',
		name: 'private-flux-dev',
		slug: 'private-flux-dev',
		standard_template: 'diffusion',
		public: false,
		tagline: 'Private FLUX',
		description: 'Private image generation',
	},
];

describe('Image Chutes - Top 20 Model Families', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: mockChutes.length,
					items: mockChutes,
				}),
			} as any,
		};
	});

	test('should include FLUX model variants', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://flux-1-dev.chutes.ai');
		expect(slugs).toContain('https://flux-schnell.chutes.ai');
		expect(slugs).toContain('https://flux-kontext.chutes.ai');
	});

	test('should include Stable Diffusion and SDXL variants', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://stable-diffusion-3-5.chutes.ai');
		expect(slugs).toContain('https://sdxl-base.chutes.ai');
		expect(slugs).toContain('https://sdxl-lightning.chutes.ai');
		expect(slugs).toContain('https://sdxl-turbo.chutes.ai');
	});

	test('should include emerging model families (HiDream, PixArt, etc.)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://hidream-i1-17b.chutes.ai');
		expect(slugs).toContain('https://pixart-sigma.chutes.ai');
		expect(slugs).toContain('https://kandinsky-v5.chutes.ai');
		expect(slugs).toContain('https://deepfloyd-if.chutes.ai');
	});

	test('should include Asian models (Kolors, HunyuanImage)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://kolors-sdxl.chutes.ai');
		expect(slugs).toContain('https://hunyuan-image-3.chutes.ai');
	});

	test('should include specialized models (Playground, ControlNet, Animagine)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://playground-2-5.chutes.ai');
		expect(slugs).toContain('https://controlnet-canny.chutes.ai');
		expect(slugs).toContain('https://animagine-xl-3-1.chutes.ai');
	});

	test('should include anime-focused models (Waifu Diffusion)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://waifu-diffusion-v1-5.chutes.ai');
	});

	test('should include efficient models (Cascade, Sana, Lumina, OmniGen)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://stable-cascade.chutes.ai');
		expect(slugs).toContain('https://omnigen.chutes.ai');
		expect(slugs).toContain('https://sana-1b.chutes.ai');
		expect(slugs).toContain('https://lumina-next.chutes.ai');
	});

	test('should exclude video chutes (even with similar names like HunyuanVideo)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://hunyuan-video-13b.chutes.ai');
	});

	test('should exclude LLM and embedding chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
		expect(slugs).not.toContain('https://baai-bge-large-en-v1-5.chutes.ai');
	});

	test('should exclude private image chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-flux-dev.chutes.ai');
	});

	test('should return all 21 public image chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(21);
	});
});

