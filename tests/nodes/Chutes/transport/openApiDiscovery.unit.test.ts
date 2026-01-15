/**
 * Unit test for OpenAPI Discovery - Default Endpoint Selection
 * 
 * This test verifies that when OpenAPI schema is broken/unavailable,
 * the fallback correctly uses /generate for I2V operations
 */

describe('OpenAPI Discovery - Default Endpoints', () => {
	it('should default imageToVideoPath to /generate (not /image2video)', async () => {
		const { discoverChuteCapabilities } = await import('../../../../nodes/Chutes/transport/openApiDiscovery');
		
		// Simulate broken OpenAPI schema by using a non-existent URL
		const capabilities = await discoverChuteCapabilities('https://fake-chute.example.com', 'fake-key');
		
		// Verify the default I2V path is /generate (matching Wan-2.2-I2V pattern)
		expect(capabilities.imageToVideoPath).toBe('/generate');
		
		// Verify T2V also uses /generate (modern chutes like LTX-2 use /generate for everything)
		expect(capabilities.textToVideoPath).toBe('/generate');
	});

	it('should include /generate in fallback endpoints', async () => {
		const { discoverChuteCapabilities } = await import('../../../../nodes/Chutes/transport/openApiDiscovery');
		
		const capabilities = await discoverChuteCapabilities('https://fake-chute.example.com', 'fake-key');
		
		const paths = capabilities.endpoints.map(e => e.path);
		expect(paths).toContain('/generate');
		expect(paths).toContain('/text2video');
		expect(paths).toContain('/image2video');
	});

	it('should use imageToVideoPath for I2V requests', async () => {
		const { discoverChuteCapabilities, buildRequestBody } = await import('../../../../nodes/Chutes/transport/openApiDiscovery');
		
		const capabilities = await discoverChuteCapabilities('https://fake-chute.example.com', 'fake-key');
		
		const userInputs = {
			prompt: 'test prompt',
			image: 'base64data...'
		};
		
		const requestConfig = buildRequestBody('image2video', capabilities, userInputs);
		
		// Should use /generate (the imageToVideoPath default)
		expect(requestConfig?.endpoint).toBe('/generate');
	});
});

