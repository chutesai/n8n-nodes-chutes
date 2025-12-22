# Contributing to n8n-nodes-chutes

Thank you for your interest in contributing to the Chutes.ai n8n node!

## Development Setup

**Requirements:**
- Node.js 20.12.0 or higher
- npm 10.8.2 or higher

1. Clone the repository:
```bash
git clone https://github.com/chutesai/n8n-nodes-chutes.git
cd n8n-nodes-chutes
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Link for local development:
```bash
npm link
cd ~/.n8n/custom
npm link n8n-nodes-chutes
```

5. Start n8n:
```bash
n8n start
```

## Project Structure

```
n8n-nodes-chutes/
├── credentials/
│   └── ChutesApi.credentials.ts     # API authentication
├── nodes/
│   ├── Chutes/                      # Main workflow node
│   │   ├── Chutes.node.ts           # Node implementation
│   │   ├── chutes.svg               # Node icon
│   │   ├── methods/
│   │   │   ├── loadChutes.ts        # Load available chutes
│   │   │   └── loadOptions.ts       # Dynamic dropdowns
│   │   ├── operations/
│   │   │   ├── textGeneration.ts    # LLM text generation
│   │   │   ├── imageGeneration.ts   # Image generation
│   │   │   ├── videoGeneration.ts   # Video generation
│   │   │   ├── textToSpeech.ts      # TTS
│   │   │   ├── speechToText.ts      # STT
│   │   │   ├── musicGeneration.ts   # Music generation
│   │   │   ├── embeddings.ts        # Text embeddings
│   │   │   ├── contentModeration.ts # Content moderation
│   │   │   └── inference.ts         # Custom inference
│   │   └── transport/
│   │       ├── apiRequest.ts        # API communication
│   │       └── openApiDiscovery.ts  # Dynamic endpoint discovery
│   ├── ChutesChatModel/             # Chat model for AI Agent
│   │   ├── ChutesChatModel.node.ts
│   │   └── GenericChutesChatModel.ts
│   └── ChutesAIAgent/               # Standalone AI Agent
│       └── ChutesAIAgent.node.ts
├── docs/
│   ├── AI-AGENT-INTEGRATION.md      # Integration guide
│   └── CHUTES-AI-AGENT.md           # AI Agent documentation
├── tests/                           # Test suite
├── package.json
├── tsconfig.json
└── README.md
```

## Coding Guidelines

### TypeScript
- Use strict TypeScript types
- Follow n8n's type definitions from `n8n-workflow`
- No `any` types unless absolutely necessary

### API Requests
- Always use `this.helpers.requestWithAuthentication` for API calls
- Implement proper error handling with `NodeApiError`
- Include retry logic for rate-limited requests

### Node Parameters
- Use descriptive `displayName` and `description`
- Group related options in `collection` types
- Use `displayOptions` to show/hide parameters contextually

### No External Dependencies
**CRITICAL**: For verified community nodes, do NOT add runtime dependencies.
- ❌ Do not install: axios, lodash, moment, etc.
- ✅ Use only: n8n-workflow and Node.js built-ins

## Testing

Before submitting a PR:

1. Build without errors:
```bash
npm run build
```

2. Test locally with n8n:
```bash
n8n start
```

3. Test all operations:
   - Text generation (complete & chat)
   - Image generation
   - Inference operations

## Branching Strategy

**IMPORTANT:** All development follows this strict workflow:

### Branch Rules
- **`main`** - Protected branch, no direct pushes allowed
- **`DEV`** - Primary development branch for features and fixes
- **`beta-*`** - Beta testing branches for pre-release features

### Creating Pull Requests

1. **Branch from `DEV` or `beta-*` branch:**
```bash
# For new features
git checkout DEV
git pull origin DEV
git checkout -b feature/your-feature-name

# For beta features
git checkout beta-staging
git pull origin beta-staging
git checkout -b feature/beta-your-feature
```

2. **Make your changes**

3. **Test thoroughly** (see Testing section)

4. **Commit with descriptive messages:**
```bash
git commit -m "feat: Add streaming support for text generation"
```

5. **Push to your branch:**
```bash
git push origin feature/your-feature-name
```

6. **Create Pull Request:**
   - Target: `DEV` branch (or the `beta-*` branch you branched from)
   - **NOT** `main` - direct PRs to `main` will be rejected
   - Fill out the PR template
   - Wait for CI checks to pass
   - Request review

### Merge Flow
```
feature branch → DEV → beta-* → main
                 ↑     ↑        ↑
                 PRs   testing  release
```

## Commit Message Format

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## Questions?

- Open an issue on GitHub
- Check existing issues and PRs
- Review the [n8n community node documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

