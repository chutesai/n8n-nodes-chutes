const fs = require('node:fs');
const path = require('node:path');

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const REQUIRED_FILES = [
	'credentials/ChutesApi.credentials.ts',
	'nodes/Chutes/transport/apiRequest.ts',
	'nodes/Chutes/transport/requestWithChutesCredential.ts',
];
const REQUIRED_THRESHOLD = 100;

function normalizePath(inputPath) {
	return String(inputPath).replace(/\\/g, '/');
}

function findCoverageEntry(summary, targetRelativePath) {
	const target = normalizePath(targetRelativePath);
	return Object.entries(summary).find(([entryPath]) => normalizePath(entryPath).endsWith(target));
}

function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
	fail(`Coverage summary not found at ${COVERAGE_SUMMARY_PATH}`);
}

const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));

for (const requiredFile of REQUIRED_FILES) {
	const entry = findCoverageEntry(summary, requiredFile);
	if (!entry) {
		fail(`Missing coverage entry for critical auth file: ${requiredFile}`);
	}

	const [resolvedPath, metrics] = entry;
	const checks = [
		['statements', metrics.statements.pct],
		['branches', metrics.branches.pct],
		['functions', metrics.functions.pct],
		['lines', metrics.lines.pct],
	];

	for (const [metricName, metricValue] of checks) {
		if (metricValue < REQUIRED_THRESHOLD) {
			fail(
				`Critical auth coverage gate failed: ${requiredFile} (${resolvedPath}) has ${metricName} at ${metricValue}%, required ${REQUIRED_THRESHOLD}%`,
			);
		}
	}
}

process.stdout.write('Critical auth coverage gate passed (100% on all required files).\n');
