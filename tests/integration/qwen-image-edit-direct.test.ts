/**
 * Image Edit - Direct API Test
 * 
 * Tests the /generate endpoint with correct parameter format.
 * Uses WARMED_IMAGE_CHUTE from global warmup infrastructure.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.CHUTES_API_KEY;
const IMAGE_CHUTE = process.env.WARMED_IMAGE_CHUTE || null;
const API_BASE = 'https://api.chutes.ai/chutes/?include_public=true&limit=500';

interface CatalogChute {
	slug?: string;
	name?: string;
	standard_template?: string;
	description?: string;
	tagline?: string;
}

function toChuteUrl(slug: string): string {
	return `https://${slug}.chutes.ai`;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function discoverImageEditCandidates(apiKey: string, limit = 5): Promise<string[]> {
	const candidates: string[] = [];
	if (IMAGE_CHUTE) {
		candidates.push(IMAGE_CHUTE.replace(/\/$/, ''));
	}

	// Prefer known-good edit chutes first when available.
	const preferred = [
		'https://chutes-qwen-image-edit-2509.chutes.ai',
		'https://chutes-qwen-image-edit-2511.chutes.ai',
	];
	for (const chuteUrl of preferred) {
		if (!candidates.includes(chuteUrl)) {
			candidates.push(chuteUrl);
		}
	}

	const response = await fetch(API_BASE, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});
	if (!response.ok) {
		return candidates;
	}
	const payload = (await response.json()) as { items?: CatalogChute[] };
	const discovered = (payload.items || [])
		.filter((chute) => {
			const slug = String(chute.slug || '').toLowerCase();
			const name = String(chute.name || '').toLowerCase();
			const description = String(chute.description || '').toLowerCase();
			const tagline = String(chute.tagline || '').toLowerCase();
			return (
				slug.includes('qwen-image-edit') ||
				name.includes('qwen-image-edit') ||
				name.includes('image-edit') ||
				description.includes('image edit') ||
				tagline.includes('image edit')
			);
		})
		.map((chute) => String(chute.slug || '').trim())
		.filter((slug) => slug.length > 0)
		.map((slug) => toChuteUrl(slug))
		.slice(0, limit);

	for (const chuteUrl of discovered) {
		if (!candidates.includes(chuteUrl)) {
			candidates.push(chuteUrl);
		}
	}

	return candidates.slice(0, limit);
}

describe('Image Edit - Direct API', () => {
	const testOrSkip = API_KEY ? test : test.skip;
	
	if (!API_KEY) {
		console.warn('⚠️  No API key available, skipping image edit test');
	}

	testOrSkip('should edit image using warmed chute', async () => {
		console.log('\n🖼️  Testing Image Edit with direct API call...');
		const chuteCandidates = await discoverImageEditCandidates(API_KEY as string);
		expect(chuteCandidates.length).toBeGreaterThan(0);
		console.log(`   🎯 Candidate chutes: ${chuteCandidates.join(', ')}`);
		
		// Read the cat image
		const imagePath = path.join(__dirname, '../cathatfatstack.png');
		console.log(`   📂 Reading image from: ${imagePath}`);
		
		const imageBuffer = fs.readFileSync(imagePath);
		const imageBase64 = imageBuffer.toString('base64');
		console.log(`   ✅ Image loaded: ${imageBuffer.length} bytes (base64: ${imageBase64.length} chars)`);

		// Try WITHOUT input_args wrapping first (maybe public API doesn't need it?)
		const requestBodyFlat = {
			prompt: 'make the hat green and the cat black and the pancakes blueberry pancakes, and make the syrup strawberry colored syrup',
			image_b64s: [imageBase64], // Array of base64 strings (1-3 images)
			negative_prompt: '',
			width: 1024,
			height: 1024,
			num_inference_steps: 40, // Use default from schema
			true_cfg_scale: 4.0,
		};
		
		// Also have wrapped version ready
		const requestBodyWrapped = {
			input_args: requestBodyFlat
		};

		console.log(`   📤 Request body structure:`);
		console.log(`      - endpoint: /generate`);
		console.log(`      - prompt: "${requestBodyFlat.prompt}"`);
		console.log(`      - image_b64s length: ${requestBodyFlat.image_b64s.length}`);
		console.log(`      - image_b64s[0] size: ${requestBodyFlat.image_b64s[0].length} chars`);
		console.log(`      - dimensions: ${requestBodyFlat.width}x${requestBodyFlat.height}`);
		console.log(`      - steps: ${requestBodyFlat.num_inference_steps}`);
		const attemptSummaries: string[] = [];

		for (const chuteUrl of chuteCandidates) {
			console.log(`\n   🔁 Trying chute: ${chuteUrl}`);
			let response: Response | null = null;
			for (let attempt = 1; attempt <= 3; attempt++) {
				try {
					const controller1 = new AbortController();
					const timeout1 = setTimeout(() => controller1.abort(), 45000);
					response = await fetch(`${chuteUrl}/generate`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(requestBodyFlat),
						signal: controller1.signal,
					});
					clearTimeout(timeout1);

					if (response.status === 400 || response.status === 422) {
						const controller2 = new AbortController();
						const timeout2 = setTimeout(() => controller2.abort(), 45000);
						response = await fetch(`${chuteUrl}/generate`, {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(requestBodyWrapped),
							signal: controller2.signal,
						});
						clearTimeout(timeout2);
					}

					if (
						(response.status === 429 ||
							response.status === 502 ||
							response.status === 503 ||
							response.status === 504) &&
						attempt < 3
					) {
						await sleep(3000 * attempt);
						continue;
					}
					break;
				} catch (error: any) {
					if (attempt < 3) {
						await sleep(3000 * attempt);
						continue;
					}
					attemptSummaries.push(`${chuteUrl}: network/timeout error (${error.message})`);
					response = null;
				}
			}

			if (!response) {
				if (!attemptSummaries.some((entry) => entry.startsWith(`${chuteUrl}:`))) {
					attemptSummaries.push(`${chuteUrl}: no response`);
				}
				continue;
			}

			console.log(`   📥 Response status: ${response.status}`);
			if (!response.ok) {
				const errorText = await response.text();
				attemptSummaries.push(`${chuteUrl}: HTTP ${response.status} ${errorText.substring(0, 120)}`);
				continue;
			}

			const contentType = response.headers.get('content-type') || '';
			expect(contentType).toMatch(/image\/(jpeg|png)/);
			const imageData = await response.arrayBuffer();
			expect(imageData.byteLength).toBeGreaterThan(10000);

			const outputDir = path.join(__dirname, '../test-output');
			fs.mkdirSync(outputDir, { recursive: true });
			const outputPath = path.join(outputDir, 'qwen-edited-green-hat-black-cat-blueberry-pancakes.jpg');
			fs.writeFileSync(outputPath, Buffer.from(imageData));

			console.log(`\n🎉 SUCCESS! Edited image saved to: ${outputPath}`);
			console.log(`   ✅ Working chute: ${chuteUrl}`);
			expect(fs.existsSync(outputPath)).toBe(true);
			return;
		}

		// Second pass: service can recover between attempts; try candidates once more.
		console.log('\n   🔁 Starting second-pass retries across all candidate chutes...');
		for (const chuteUrl of chuteCandidates) {
			await sleep(5000);
			let response: Response;
			try {
				response = await fetch(`${chuteUrl}/generate`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBodyWrapped),
				});
			} catch (error: any) {
				attemptSummaries.push(`${chuteUrl}: second-pass network error (${error.message})`);
				continue;
			}
			if (!response.ok) {
				const errorText = await response.text();
				attemptSummaries.push(`${chuteUrl}: second-pass HTTP ${response.status} ${errorText.substring(0, 120)}`);
				continue;
			}
			const contentType = response.headers.get('content-type') || '';
			expect(contentType).toMatch(/image\/(jpeg|png)/);
			const imageData = await response.arrayBuffer();
			expect(imageData.byteLength).toBeGreaterThan(10000);
			return;
		}

		throw new Error(
			`No image-edit chute produced a successful response. Attempts:\n${attemptSummaries.join('\n')}`,
		);
	}, 300000); // 5 minutes - image editing is legitimately slow
});
