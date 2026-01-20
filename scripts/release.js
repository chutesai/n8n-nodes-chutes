#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// Dependency checks
// ═══════════════════════════════════════════════════════════

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
  console.error('❌ node_modules not found');
  console.error('');
  console.error('   Run: npm install');
  process.exit(1);
}

// Check if release-it is installed
const releaseItPath = path.join(__dirname, '..', 'node_modules', '.bin', 'release-it');
const releaseItPathCmd = releaseItPath + '.cmd'; // Windows

if (!fs.existsSync(releaseItPath) && !fs.existsSync(releaseItPathCmd)) {
  console.error('❌ release-it not found');
  console.error('');
  console.error('   Run: npm install');
  console.error('');
  console.error('   If still missing, run: npm install release-it --save-dev');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// Branch detection
// ═══════════════════════════════════════════════════════════

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

// Determine release type
let isBeta = false;
let releaseItArgs = [];

if (branch === 'release') {
  console.log('🚀 Stable release from "release" branch');
  console.log('');
} else if (branch.startsWith('beta-')) {
  console.log(`🧪 Beta release from "${branch}" branch`);
  console.log('');
  isBeta = true;
  releaseItArgs = ['--preRelease=beta'];
} else {
  console.error(`❌ Cannot release from branch: ${branch}`);
  console.error('');
  console.error('Valid release branches:');
  console.error('  - release      → stable release (npm @latest)');
  console.error('  - beta-*       → beta release (npm @beta)');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// Step 1: Run release-it
// ═══════════════════════════════════════════════════════════

console.log('📦 Running release-it...');
console.log('');

const releaseResult = spawnSync('npx', ['release-it', ...releaseItArgs], {
  stdio: 'inherit',
  shell: true
});

if (releaseResult.status !== 0) {
  console.error('');
  console.error('❌ release-it failed or was cancelled');
  process.exit(releaseResult.status || 1);
}

// ═══════════════════════════════════════════════════════════
// Step 2: Build
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('🔨 Building dist/...');
console.log('');

const buildResult = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

if (buildResult.status !== 0) {
  console.error('');
  console.error('❌ Build failed');
  process.exit(buildResult.status || 1);
}

// ═══════════════════════════════════════════════════════════
// Step 3: Prompt for npm publish
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
if (isBeta) {
  console.log('📋 Ready to publish BETA to npm');
  console.log('   Command: npm publish --tag beta --access public');
} else {
  console.log('📋 Ready to publish STABLE to npm');
  console.log('   Command: npm publish --access public');
}
console.log('');
console.log('   This will open your browser for YubiKey authentication.');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Press ENTER to publish, or Ctrl+C to cancel... ', () => {
  rl.close();
  
  console.log('');
  console.log('🚀 Publishing to npm...');
  console.log('');
  
  const publishArgs = isBeta 
    ? ['publish', '--tag', 'beta', '--access', 'public']
    : ['publish', '--access', 'public'];
  
  const publishResult = spawnSync('npm', publishArgs, {
    stdio: 'inherit',
    shell: true
  });
  
  if (publishResult.status !== 0) {
    console.error('');
    console.error('❌ npm publish failed');
    process.exit(publishResult.status || 1);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  if (isBeta) {
    console.log('✅ Beta release complete!');
    console.log('');
    console.log('   Users can install with:');
    console.log('   npm install n8n-nodes-chutes@beta');
    console.log('');
    console.log('   Next steps:');
    console.log('   1. Test the beta release');
    console.log('   2. When ready, create PR: beta-* → DEV → main');
  } else {
    console.log('✅ Stable release complete!');
    console.log('');
    console.log('   Users get this version by default');
    console.log('');
    console.log('   Next steps:');
    console.log('   1. Create PR: release → main on GitHub');
    console.log('   2. Merge and delete release branch');
  }
  console.log('═══════════════════════════════════════════════════════════');
});
