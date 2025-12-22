/**
 * Therm Utility for n8n-nodes-chutes
 * 
 * Provides functionality to "warm up" chutes, making them ready for immediate use.
 * Named after thermals that gliders/parachutes use to gain altitude.
 * 
 * Ported from ai-sdk-provider-chutes.
 */

export type ChuteStatus = 'hot' | 'warming' | 'cold' | 'unknown';

export interface WarmupResult {
	success: boolean;
	chuteId: string;
	isHot: boolean;
	status: ChuteStatus;
	instanceCount: number;
	log?: string;
}

/**
 * Warm up a chute to prepare it for immediate use.
 * 
 * This sends a request to the Chutes API warmup endpoint, which triggers
 * the chute to spin up infrastructure so it's ready to handle requests.
 */
export async function warmUpChute(
	chuteId: string,
	apiKey: string,
	baseURL: string = 'https://api.chutes.ai'
): Promise<WarmupResult> {
	if (!chuteId || chuteId.trim() === '') {
		throw new Error('chuteId is required');
	}

	if (!apiKey || apiKey.trim() === '') {
		throw new Error('apiKey is required');
	}

	const url = `${baseURL}/chutes/warmup/${chuteId}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'X-Provider': 'n8n-nodes-chutes',
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Warmup failed for ${chuteId}: ${response.status} - ${text}`);
	}

	let data: unknown;
	try {
		const rawText = await response.text();
		
		// API returns SSE (Server-Sent Events) format with "data: " prefix
		// Strip the "data: " prefix before parsing JSON
		const jsonText = rawText.startsWith('data: ') ? rawText.substring(6) : rawText;
		
		data = JSON.parse(jsonText);
	} catch (err) {
		// Silently fail - parseWarmupResponse will handle undefined data
		data = undefined;
	}

	const parsed = parseWarmupResponse(data);

	return {
		success: true,
		chuteId,
		isHot: parsed.isHot,
		status: parsed.status,
		instanceCount: parsed.instanceCount,
		log: parsed.log,
	};
}

/**
 * Parse the warmup API response into developer-friendly fields
 */
function parseWarmupResponse(data: unknown): {
	status: ChuteStatus;
	isHot: boolean;
	instanceCount: number;
	log?: string;
} {
	if (!data || typeof data !== 'object') {
		return { status: 'unknown', isHot: false, instanceCount: 0 };
	}

	const obj = data as Record<string, unknown>;
	const rawStatus = typeof obj.status === 'string' ? obj.status.toLowerCase() : '';
	const log = typeof obj.log === 'string' ? obj.log : undefined;

	// Parse status
	const status: ChuteStatus =
		rawStatus === 'hot' ? 'hot' :
		rawStatus === 'warming' ? 'warming' :
		rawStatus === 'cold' ? 'cold' : 'unknown';

	// Parse instance count from log (e.g., "chute is hot, 1 instances available")
	let instanceCount = 0;
	if (log) {
		const match = log.match(/(\d+)\s*instances?\s*available/i);
		if (match) {
			instanceCount = parseInt(match[1], 10);
		}
	}

	return {
		status,
		isHot: status === 'hot',
		instanceCount,
		log,
	};
}


