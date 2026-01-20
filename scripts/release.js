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
// Check DEV branch test status (GitHub Actions)
// ═══════════════════════════════════════════════════════════

let devTestsPassed = false;

// First check if gh CLI is installed
const ghCheckResult = spawnSync('gh', ['--version'], {
  stdio: 'pipe',
  shell: true
});

if (ghCheckResult.status !== 0) {
  console.log('⚠️  GitHub CLI (gh) not installed - will run tests locally');
  console.log('');
} else {
  // gh CLI is available, check DEV branch test status
  try {
    console.log('🔍 Checking DEV branch test status...');
    console.log('');
    
    const ghResult = execSync('gh run list --branch DEV --limit 1 --json conclusion,status', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const runs = JSON.parse(ghResult);
    
    if (runs.length > 0) {
      const latestRun = runs[0];
      devTestsPassed = latestRun.conclusion === 'success' && latestRun.status === 'completed';
      
      if (devTestsPassed) {
        console.log('✅ DEV branch tests passed - will skip running tests again');
        console.log('');
        process.env.SKIP_TESTS = 'true';
      } else {
        console.log(`⚠️  DEV branch tests status: ${latestRun.conclusion} (${latestRun.status})`);
        console.log('   Will run tests locally');
        console.log('');
      }
    } else {
      console.log('⚠️  No test runs found for DEV branch');
      console.log('   Will run tests locally');
      console.log('');
    }
  } catch (error) {
    console.log('⚠️  Could not check DEV branch tests (not authenticated or API error)');
    console.log('   Will run tests locally');
    console.log('');
  }
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
  
  // Auto-sync with DEV first
  console.log('🔄 Syncing with DEV branch...');
  console.log('');
  
  const rebaseResult = spawnSync('git', ['rebase', 'DEV'], {
    stdio: 'inherit',
    shell: true
  });
  
  if (rebaseResult.status !== 0) {
    console.error('');
    console.error('❌ Rebase from DEV failed');
    console.error('');
    console.error('This usually means there are conflicts to resolve.');
    console.error('');
    console.error('To fix:');
    console.error('  1. Resolve conflicts in your editor');
    console.error('  2. git add <conflicted-files>');
    console.error('  3. git rebase --continue');
    console.error('  4. Run: npm run release (again)');
    console.error('');
    console.error('Or to abort the rebase:');
    console.error('  git rebase --abort');
    process.exit(rebaseResult.status || 1);
  }
  
  console.log('✅ Synced with DEV');
  console.log('');
  console.log('📤 Force pushing to remote...');
  console.log('');
  
  const pushResult = spawnSync('git', ['push', '--force-with-lease'], {
    stdio: 'inherit',
    shell: true
  });
  
  if (pushResult.status !== 0) {
    console.error('');
    console.error('❌ Force push failed');
    console.error('');
    console.error('Someone else may have pushed to this branch.');
    console.error('Run: git pull --rebase');
    process.exit(pushResult.status || 1);
  }
  
  console.log('✅ Pushed to remote');
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
// Step 3: Check npm login status
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('🔐 Checking npm login status...');
console.log('');

const whoamiResult = spawnSync('npm', ['whoami'], { 
  encoding: 'utf-8',
  stdio: 'pipe',
  shell: true 
});

const username = whoamiResult.stdout?.trim();
const isLoggedIn = whoamiResult.status === 0 && username && username.length > 0;

if (isLoggedIn) {
  console.log(`✅ Logged in to npm as: ${username}`);
  console.log('');
} else {
  console.log('❌ Not logged in to npm');
  console.log('');
  console.log('🔐 Running npm login...');
  console.log('   (This will open your browser for npm authentication)');
  console.log('');
  
  const loginResult = spawnSync('npm', ['login'], {
    stdio: 'inherit',
    shell: true
  });
  
  if (loginResult.status !== 0) {
    console.error('');
    console.error('❌ npm login failed or was cancelled');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ npm login successful');
  console.log('');
}

// ═══════════════════════════════════════════════════════════
// Step 4: Prompt for npm publish
// ═══════════════════════════════════════════════════════════

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
    console.log('   2. To sync more DEV changes: just run npm run release again');
    console.log('   3. When stable: merge DEV → main, delete beta branch');
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
