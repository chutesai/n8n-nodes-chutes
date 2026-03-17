#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');

if (!fs.existsSync(summaryPath)) {
	console.error(`Coverage summary not found at ${summaryPath}`);
	process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

const thresholds = {
	'credentials/ChutesApi.credentials.ts': {
		lines: 100,
		statements: 100,
		functions: 100,
		branches: 100,
	},
	'nodes/Chutes/transport/apiRequest.ts': {
		lines: 100,
		statements: 100,
		functions: 100,
	},
	'nodes/Chutes/transport/requestWithChutesCredential.ts': {
		lines: 100,
		statements: 100,
		functions: 100,
		branches: 100,
	},
};

const failures = [];

const computePct = (covered, total) => {
	if (total === 0) {
		return 100;
	}

	return Number(((covered / total) * 100).toFixed(2));
};

const enumerateLines = (loc) => {
	const lines = [];
	for (let line = loc.start.line; line <= loc.end.line; line += 1) {
		lines.push(line);
	}
	return lines;
};

for (const [relativePath, fileThresholds] of Object.entries(thresholds)) {
	const summaryEntry = Object.entries(summary).find(([filePath]) => filePath.endsWith(relativePath));

	if (!summaryEntry) {
		failures.push(`Missing coverage entry for ${relativePath}`);
		continue;
	}

	const [, metrics] = summaryEntry;
	const coveredStatements = Object.values(metrics.s).filter((count) => count > 0).length;
	const totalStatements = Object.keys(metrics.s).length;
	const coveredFunctions = Object.values(metrics.f).filter((count) => count > 0).length;
	const totalFunctions = Object.keys(metrics.f).length;

	const allLines = new Set();
	const coveredLines = new Set();
	for (const [statementId, loc] of Object.entries(metrics.statementMap)) {
		for (const line of enumerateLines(loc)) {
			allLines.add(line);
			if (metrics.s[statementId] > 0) {
				coveredLines.add(line);
			}
		}
	}

	const branchCounts = Object.values(metrics.b).flat();
	const coveredBranches = branchCounts.filter((count) => count > 0).length;
	const totalBranches = branchCounts.length;

	const computedMetrics = {
		lines: { pct: computePct(coveredLines.size, allLines.size) },
		statements: { pct: computePct(coveredStatements, totalStatements) },
		functions: { pct: computePct(coveredFunctions, totalFunctions) },
		branches: { pct: computePct(coveredBranches, totalBranches) },
	};

	for (const [metricName, minimum] of Object.entries(fileThresholds)) {
		const actual = computedMetrics[metricName]?.pct;
		if (typeof actual !== 'number') {
			failures.push(`Missing ${metricName} coverage for ${relativePath}`);
			continue;
		}

		if (actual < minimum) {
			failures.push(
				`${relativePath}: ${metricName} coverage ${actual}% is below required ${minimum}%`,
			);
		}
	}
}

if (failures.length > 0) {
	console.error('Critical auth coverage check failed:\n');
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log('Critical auth coverage check passed.');
