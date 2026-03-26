import * as fs from 'fs';
import * as path from 'path';

describe('package.json n8n configuration', () => {
	let pkg: any;

	beforeAll(() => {
		const raw = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8');
		pkg = JSON.parse(raw);
	});

	test('should register ChutesApi credential', () => {
		expect(pkg.n8n.credentials).toContain('dist/credentials/ChutesApi.credentials.js');
	});

	test('should register ChutesOAuth2Api credential', () => {
		expect(pkg.n8n.credentials).toContain('dist/credentials/ChutesOAuth2Api.credentials.js');
	});

	test('should register all three nodes', () => {
		expect(pkg.n8n.nodes).toContain('dist/nodes/Chutes/Chutes.node.js');
		expect(pkg.n8n.nodes).toContain('dist/nodes/ChutesChatModel/ChutesChatModel.node.js');
		expect(pkg.n8n.nodes).toContain('dist/nodes/ChutesAIAgent/ChutesAIAgent.node.js');
	});
});
