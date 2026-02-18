/**
 * Text-to-Video Generation Integration Test
 * 
 * Tests text-to-video generation with Phase 1 implementation:
 * - Args wrapper support
 * - Resolution to width/height conversion
 * - Parameter aliasing (frames->num_frames, fps->frame_rate)
 * 
 * Uses the global warmup infrastructure to find an available, warmed T2V chute.
 * Skips gracefully if no T2V-capable chute is available.
 * 
 * Saves output video to tests/test-output for manual inspection.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import {
	testOrSkip,
	hasApiKey,
	EXTENDED_TIMEOUT,
	getAuthHeaders,
	withRetry,
	initializeTestChutes,
	VIDEO_CHUTE_URL,
	VIDEO_CHUTE_NAME,
	supportsTextToVideo,
} from './test-helpers';
import { discoverChuteCapabilities, buildRequestBody } from '../../nodes/Chutes/transport/openApiDiscovery';
import type { IDataObject } from 'n8n-workflow';

describe('Text-to-Video Generation (Integration)', () => {
	// Initialize warmed chutes before running tests
	beforeAll(async () => {
		if (!hasApiKey()) {
			console.log('⚠️ CHUTES_API_KEY not set - skipping integration tests');
			return;
		}
		
		await initializeTestChutes();
		
		if (!VIDEO_CHUTE_URL) {
			console.log('⚠️ No video chute available - will skip video generation tests');
		} else if (VIDEO_CHUTE_NAME && !supportsTextToVideo({ name: VIDEO_CHUTE_NAME })) {
			console.log(`⚠️ Video chute "${VIDEO_CHUTE_NAME}" only supports I2V, not T2V - will skip T2V tests`);
		} else {
			console.log(`🎬 Using video chute: ${VIDEO_CHUTE_URL} (${VIDEO_CHUTE_NAME || 'unknown'})`);
		}
	}, 60000); // 1 minute for discovery

	testOrSkip('should generate 5-second bouncing ball video using text-to-video', async () => {
		if (!VIDEO_CHUTE_URL) {
			console.log('⏭️ Skipping - no video chute available');
			return;
		}
		
		// Check if the video chute supports text-to-video
		if (VIDEO_CHUTE_NAME && !supportsTextToVideo({ name: VIDEO_CHUTE_NAME })) {
			console.log(`⏭️ Skipping - video chute "${VIDEO_CHUTE_NAME}" only supports I2V, not T2V`);
			return;
		}

		console.log(`\n🎬 Testing text-to-video generation with bouncing ball prompt...`);
		console.log(`   Using chute: ${VIDEO_CHUTE_URL} (${VIDEO_CHUTE_NAME || 'unknown'})`);

		// User's cinematic prompt
		const prompt = `A slow cinematic dolly shot pushes through a dense bamboo forest at dawn, mist hanging low between the stalks as golden sunlight filters through the canopy in soft volumetric rays. Dew glistens on bamboo leaves in the foreground. The camera continues forward, revealing a shallow pond where a red-crowned crane stands motionless. The crane spreads its wings and lifts off gracefully, water rippling outward beneath it. The camera tilts upward to follow its ascent, cherry blossom petals drifting lazily through the frame on a soft breeze. A distant pagoda emerges through the morning fog on a hilltop. A second crane joins the first, both flying in formation toward the pagoda as the camera completes its upward arc. The shot settles on a wide view of the misty valley below, the two cranes now silhouettes against the brightening sky. Photorealistic, shot on 65mm film, natural motion blur, warm golden hour tones shifting to cool diffused light.`;

		// LTX-2 parameters for 19-second video
		const duration = 19; // seconds
		const fps = 25; // LTX-2 default frame rate
		
		// LTX-2 requires frames to follow: num_frames = 8n + 1
		let rawFrames = duration * fps; // 19 * 25 = 475
		const n = Math.round((rawFrames - 1) / 8); // (475-1)/8 = 59.25 -> 59
		const frames = 8 * n + 1; // 8*59+1 = 473 frames (valid for LTX-2)
		console.log(`   Calculated frames: ${rawFrames} -> ${frames} (8×${n}+1 for LTX-2)`);

		try {
			// Get API key (same as real node does)
			const apiKey = process.env.CHUTES_API_KEY;
			if (!apiKey) {
				throw new Error('CHUTES_API_KEY not set');
			}
			
			// Use Phase 1 logic to discover capabilities and build request (SAME AS REAL NODE)
			console.log('   🔍 Discovering chute capabilities...');
			const capabilities = await discoverChuteCapabilities(VIDEO_CHUTE_URL, apiKey);
			// Build user inputs (as they would come from n8n UI)
			const userInputs: IDataObject = {
				prompt,
				resolution: '768*512', // Will be converted to width/height
				frames, // Will be mapped to num_frames
				fps, // Will be mapped to frame_rate
				steps: 40, // Will be mapped to num_inference_steps
				guidance_scale: 3.0, // Will be mapped to cfg_guidance_scale
				seed: Math.floor(Math.random() * 1000000), // Random seed each run
			};

			// Use Phase 1 buildRequestBody logic
			console.log('   🔧 Building request body with Phase 1 logic...');
			const requestData = buildRequestBody('text2video', capabilities, userInputs, VIDEO_CHUTE_URL!);
			
			if (!requestData) {
				throw new Error('Failed to build request body');
			}
			
			console.log(`   📦 Request endpoint: ${requestData.endpoint}`);
			console.log(`   📦 Request body (flat params):`, Object.keys(requestData.body).join(', '));

		const result = await withRetry(async () => {
			const fullUrl = `${VIDEO_CHUTE_URL}${requestData.endpoint}`;
			console.log(`   📡 POST ${fullUrl}`);
			
			const response = await fetch(fullUrl, {
				method: 'POST',
				headers: getAuthHeaders(),
				body: JSON.stringify(requestData.body),
			});

			console.log(`Response status: ${response.status}`);
			
			if (!response.ok) {
				const error = await response.text();
				console.log(`Error response: ${error}`);
				
				// 429 means at capacity - retry
				if (response.status === 429) {
					throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
				}
				
				// 500 with infrastructure message = infrastructure down
				if (response.status === 500 && (error.includes('No infrastructure available') || error.includes('infrastructure'))) {
					throw new Error(`CHUTE_UNAVAILABLE: 500 - Infrastructure unavailable`);
				}
				
				// 502/503 means infrastructure down
				if (response.status === 502 || response.status === 503) {
					throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
				}
				
				throw new Error(`API error ${response.status}: ${error}`);
			}
			
			return response;
		}, {
			maxRetries: 2, // Reduced from 5 to fail faster when infrastructure is down
			delayMs: 3000, // Reduced from 5000ms to skip faster
			category: 'video',
			currentChuteUrl: VIDEO_CHUTE_URL || undefined,
		});

			// Get binary video data
			const videoBuffer = await result.arrayBuffer();
			console.log(`✅ Received ${videoBuffer.byteLength} bytes of video data`);
			
			expect(videoBuffer.byteLength).toBeGreaterThan(0);

			// Verify it's a valid video file (MP4 starts with specific bytes)
			const buffer = Buffer.from(videoBuffer);
			const header = buffer.slice(0, 12).toString('hex');
			console.log(`   Video header: ${header.substring(0, 24)}...`);
			
			// MP4 files typically start with 'ftyp' box
			const hasFtypBox = buffer.indexOf('ftyp', 0, 'utf8') !== -1;
			expect(hasFtypBox).toBe(true);

			// Save to test-output directory
			const outputDir = path.join(__dirname, '..', 'test-output');
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
		// Extract chute slug from URL for filename (e.g., "chutes-ltx-2" from "https://chutes-ltx-2.chutes.ai")
		const chuteSlug = VIDEO_CHUTE_URL?.match(/https:\/\/([^.]+)\.chutes\.ai/)?.[1] || 't2v';
		const filename = `${chuteSlug}-bouncing-ball-${timestamp}-${duration}s.mp4`;
		const outputPath = path.join(outputDir, filename);
		
		fs.writeFileSync(outputPath, buffer);
		
		console.log(`💾 Saved video to: ${outputPath}`);
		console.log(`📊 Video details:`);
		console.log(`   Duration: ${duration} seconds`);
		console.log(`   Frame rate: ${fps} fps`);
		console.log(`   Total frames: ${frames}`);
		console.log(`   Resolution: 768x512`);
		console.log(`   File size: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
		console.log('✅ Text-to-video 5-second bouncing ball video generation test passed');
	} catch (error) {
		const errorMsg = String(error);
		if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
		    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
		    errorMsg.includes('CHUTE_UNAVAILABLE') ||
		    errorMsg.includes('fetch failed') ||
		    errorMsg.includes('ECONNREFUSED') ||
		    errorMsg.includes('ETIMEDOUT')) {
			console.log('⏭️ Skipping - video chute(s) at capacity, unavailable, or network error');
			return; // Skip gracefully
		}
		throw error;
	}
	}, EXTENDED_TIMEOUT);
});
