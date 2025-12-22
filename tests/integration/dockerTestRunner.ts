/**
 * Docker Integration Test Runner
 * Orchestrates building, deploying, and testing nodes in Docker n8n instance
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { N8nApiClient, WorkflowData } from '../helpers/n8nApiClient';

const execAsync = promisify(exec);

export interface DockerTestConfig {
	buildCommand?: string;
	containerName?: string;
	n8nUrl?: string;
	n8nCredentials?: {
		email: string;
		password: string;
	};
}

export interface TestResult {
	success: boolean;
	executionData?: any;
	error?: string;
	logs?: string[];
}

export class DockerTestRunner {
	private client: N8nApiClient;
	private config: Required<DockerTestConfig>;

	constructor(config: DockerTestConfig = {}) {
		this.config = {
			buildCommand: config.buildCommand || 'npm run build',
			containerName: config.containerName || 'n8n-chutes-test',
			n8nUrl: config.n8nUrl || 'http://localhost:5678',
			n8nCredentials: config.n8nCredentials || {
				email: 'admin',
				password: 'admin',
			},
		};

		this.client = new N8nApiClient(this.config.n8nUrl);
	}

	/**
	 * Check if Docker container is running
	 */
	async isDockerRunning(): Promise<boolean> {
		try {
			const { stdout } = await execAsync(
				`docker ps --filter "name=${this.config.containerName}" --format "{{.Names}}"`,
			);
			return stdout.trim() === this.config.containerName;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Build the node
	 */
	async buildNode(): Promise<void> {
		console.log('🔨 Building node...');
		await execAsync(this.config.buildCommand);
		console.log('✅ Node built successfully');
	}

	/**
	 * Deploy node to Docker
	 */
	async deployToDocker(): Promise<void> {
		console.log('📦 Deploying to Docker...');

		// Restart Docker container to pick up changes
		await execAsync(`docker restart ${this.config.containerName}`);

		// Wait for n8n to be ready
		await this.waitForN8n();

		console.log('✅ Deployed to Docker');
	}

	/**
	 * Wait for n8n to be ready
	 */
	async waitForN8n(timeout: number = 60000): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			if (await this.client.isReady()) {
				return;
			}
			await this.sleep(1000);
		}

		throw new Error('n8n failed to start within timeout');
	}

	/**
	 * Run a workflow test
	 */
	async runWorkflowTest(workflowData: WorkflowData): Promise<TestResult> {
		try {
			// Authenticate
			await this.client.authenticate(this.config.n8nCredentials);

			// Create workflow
			const workflow = await this.client.createWorkflow(workflowData);
			console.log(`📝 Created workflow: ${workflow.id}`);

			// Execute workflow
			const execution = await this.client.executeWorkflow(workflow.id);
			console.log(`▶️  Executing workflow: ${execution.id}`);

			// Wait for execution to complete
			const result = await this.client.waitForExecution(execution.id);

			// Get logs
			const logs = await this.getDockerLogs();

			// Clean up
			await this.client.deleteWorkflow(workflow.id);

			return {
				success: result.finished && !result.data.resultData.error,
				executionData: result.data.resultData,
				logs,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Get Docker logs
	 */
	async getDockerLogs(since: string = '2m'): Promise<string[]> {
		try {
			const { stdout } = await execAsync(
				`docker logs ${this.config.containerName} --since ${since} 2>&1`,
			);
			return stdout.split('\n').filter((line) => line.trim());
		} catch (error) {
			return [];
		}
	}

	/**
	 * Full test cycle: build, deploy, test
	 */
	async runFullTest(workflowData: WorkflowData): Promise<TestResult> {
		// Check Docker is running
		if (!(await this.isDockerRunning())) {
			return {
				success: false,
				error: 'Docker container is not running',
			};
		}

		// Build node
		await this.buildNode();

		// Deploy to Docker
		await this.deployToDocker();

		// Run test
		return this.runWorkflowTest(workflowData);
	}

	/**
	 * Sleep helper
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, ms);
			timer.unref(); // Don't keep process alive
		});
	}
}

