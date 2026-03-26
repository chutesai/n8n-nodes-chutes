const fs = require('node:fs');
const path = require('node:path');

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const REQUIRED_THRESHOLD = 100;
const REQUIRED_PREFIXES = ['nodes/', 'credentials/', 'scripts/'];

function normalizePath(inputPath) {
	return String(inputPath).replace(/\\/g, '/');
}

function isRuntimeSurfaceFile(filePath) {
	const normalized = normalizePath(filePath);
	return REQUIRED_PREFIXES.some((prefix) => normalized.includes(`/${prefix}`) || normalized.startsWith(prefix));
}

function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
	fail(`Coverage summary not found at ${COVERAGE_SUMMARY_PATH}`);
}

const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
const coverageEntries = Object.entries(summary).filter(([entryPath]) => isRuntimeSurfaceFile(entryPath));

if (coverageEntries.length === 0) {
	fail('No coverage entries found for runtime surface under /nodes, /credentials, and /scripts');
}

const failures = [];

for (const [resolvedPath, metrics] of coverageEntries) {
	const checks = [
		['statements', metrics.statements?.pct],
		['branches', metrics.branches?.pct],
		['functions', metrics.functions?.pct],
		['lines', metrics.lines?.pct],
	];

	for (const [metricName, metricValue] of checks) {
		if (typeof metricValue !== 'number' || metricValue < REQUIRED_THRESHOLD) {
			failures.push(
				`${normalizePath(resolvedPath)} has ${metricName} at ${metricValue ?? 'unknown'}%, required ${REQUIRED_THRESHOLD}%`,
			);
		}
	}
}

if (failures.length > 0) {
	fail(`Runtime surface coverage gate failed:\n${failures.join('\n')}`);
}

process.stdout.write(
	`Runtime surface coverage gate passed (${REQUIRED_THRESHOLD}% on all /nodes, /credentials, and /scripts files).\n`,
);
