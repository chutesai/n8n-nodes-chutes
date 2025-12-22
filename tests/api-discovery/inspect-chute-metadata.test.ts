/**
 * API Discovery: Inspect Chute Metadata
 * 
 * This test inspects what data the Chutes API returns for image chutes
 * to determine if we can detect edit vs. generation capabilities.
 */

import 'dotenv/config';

describe('🔍 Chute Metadata Discovery', () => {
	const apiKey = process.env.CHUTES_API_KEY;

	if (!apiKey) {
		it.skip('requires CHUTES_API_KEY', () => {});
		return;
	}

	it('should inspect image chute metadata from list API', async () => {
		const response = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=500', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		const data = await response.json() as any;
		console.log('\n📊 List API Response Structure:');
		console.log('Total chutes:', data.total);
		console.log('Sample chute keys:', Object.keys(data.items[0]));
		
		// Find a few image chutes
		const imageChutes = data.items.filter((c: any) => 
			c.standard_template === 'diffusion' && c.public
		).slice(0, 3);

		console.log('\n🖼️ Sample Image Chutes:');
		imageChutes.forEach((chute: any) => {
			console.log('\n---');
			console.log('Name:', chute.name);
			console.log('Slug:', chute.slug);
			console.log('Template:', chute.standard_template);
			console.log('All fields:', JSON.stringify(chute, null, 2));
		});

		// Check cord_refs
		console.log('\n🔗 Cord Refs Sample:');
		if (data.cord_refs) {
			const chuteId = imageChutes[0].chute_id;
			console.log('Cord refs for first chute:', JSON.stringify(data.cord_refs[chuteId], null, 2));
		}
	}, 30000);

	it('should fetch chute source code', async () => {
		// First get a chute ID
		const listResponse = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=500', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		const listData = await listResponse.json() as any;
		const imageChute = listData.items.find((c: any) => c.standard_template === 'diffusion' && c.public);
		
		if (!imageChute) {
			console.log('⚠️ No image chute found to test with');
			return;
		}

		console.log('\n📝 Fetching source code for:', imageChute.name);

		// Fetch source code
		const codeResponse = await fetch(`https://api.chutes.ai/chutes/code/${imageChute.chute_id}`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		if (codeResponse.ok) {
			const code = await codeResponse.text();
			console.log('\n✅ Source code retrieved!');
			console.log('Code length:', code.length);
			console.log('\nFirst 500 chars:');
			console.log(code.substring(0, 500));
			
			// Look for edit-related keywords
			const hasEdit = code.toLowerCase().includes('edit') || 
			                code.toLowerCase().includes('inpaint') ||
			                code.toLowerCase().includes('mask');
			console.log('\nContains edit-related keywords:', hasEdit);
		} else {
			console.log('❌ Failed to fetch source code:', codeResponse.status);
		}
	}, 30000);

	it('should check OpenAPI schema for operations', async () => {
		// Get an image chute
		const listResponse = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=500', {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		const listData = await listResponse.json() as any;
		const imageChute = listData.items.find((c: any) => c.standard_template === 'diffusion' && c.public);
		
		if (!imageChute) {
			console.log('⚠️ No image chute found to test with');
			return;
		}

		const chuteUrl = `https://${imageChute.slug}.chutes.ai`;
		console.log('\n🔍 Checking OpenAPI schema for:', chuteUrl);

		// Fetch OpenAPI schema
		const schemaResponse = await fetch(`${chuteUrl}/openapi.json`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (schemaResponse.ok) {
			const schema = await schemaResponse.json() as any;
			console.log('\n✅ OpenAPI schema retrieved!');
			console.log('Paths:', Object.keys(schema.paths || {}));
			
			// Look for image generation and editing endpoints
			const paths = schema.paths || {};
			const hasV1Images = '/v1/images/generations' in paths;
			const hasV1Edits = '/v1/images/edits' in paths;
			const hasGenerate = '/generate' in paths;
			const hasEdit = '/edit' in paths;
			
			console.log('\nEndpoint Detection:');
			console.log('  /v1/images/generations:', hasV1Images);
			console.log('  /v1/images/edits:', hasV1Edits);
			console.log('  /generate:', hasGenerate);
			console.log('  /edit:', hasEdit);
			
			// If it has both generations and edits, it supports both operations
			if (hasV1Edits || hasEdit) {
				console.log('\n✅ This chute SUPPORTS EDITING!');
			} else {
				console.log('\n❌ This chute only supports generation');
			}
		} else {
			console.log('❌ Failed to fetch OpenAPI schema:', schemaResponse.status);
		}
	}, 30000);
});

