/**
 * n8n API Client for Docker Integration Testing
 * Provides methods to interact with n8n REST API for automated testing
 */

import * as http from 'http';

export interface N8nCredentials {
	email: string;
	password: string;
}

export interface WorkflowData {
	name: string;
	nodes: any[];
	connections: any;
	settings?: any;
	staticData?: any;
}

export interface ExecutionResult {
	id: string;
	finished: boolean;
	mode: string;
	startedAt: Date;
	stoppedAt?: Date;
	workflowData: any;
	data: {
		resultData: {
			runData: any;
			error?: any;
		};
	};
}

export class N8nApiClient {
	private baseUrl: string;
	private authCookie: string | null = null;

	constructor(baseUrl: string = 'http://localhost:5678') {
		this.baseUrl = baseUrl;
	}

	/**
	 * Authenticate with n8n instance
	 */
	async authenticate(credentials: N8nCredentials): Promise<void> {
		const response = await this.request('POST', '/api/v1/auth/login', credentials);

		if (response.headers['set-cookie']) {
			this.authCookie = response.headers['set-cookie'][0];
		}
	}

	/**
	 * Check if n8n is ready
	 */
	async isReady(): Promise<boolean> {
		try {
			await this.request('GET', '/healthz');
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Create a workflow
	 */
	async createWorkflow(workflowData: WorkflowData): Promise<any> {
		return this.request('POST', '/api/v1/workflows', workflowData);
	}

	/**
	 * Execute a workflow
	 */
	async executeWorkflow(workflowId: string): Promise<ExecutionResult> {
		const response = await this.request('POST', `/api/v1/workflows/${workflowId}/run`, {});
		return response.data;
	}

	/**
	 * Get execution result
	 */
	async getExecution(executionId: string): Promise<ExecutionResult> {
		const response = await this.request('GET', `/api/v1/executions/${executionId}`);
		return response.data;
	}

	/**
	 * Wait for execution to complete
	 */
	async waitForExecution(
		executionId: string,
		timeout: number = 30000,
	): Promise<ExecutionResult> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const execution = await this.getExecution(executionId);

			if (execution.finished) {
				return execution;
			}

			await this.sleep(500);
		}

		throw new Error(`Execution ${executionId} timed out after ${timeout}ms`);
	}

	/**
	 * Delete a workflow
	 */
	async deleteWorkflow(workflowId: string): Promise<void> {
		await this.request('DELETE', `/api/v1/workflows/${workflowId}`);
	}

	/**
	 * Get all workflows
	 */
	async getWorkflows(): Promise<any[]> {
		const response = await this.request('GET', '/api/v1/workflows');
		return response.data;
	}

	/**
	 * Clean up all test workflows
	 */
	async cleanupTestWorkflows(namePrefix: string = 'TEST_'): Promise<void> {
		const workflows = await this.getWorkflows();
		const testWorkflows = workflows.filter((w) => w.name.startsWith(namePrefix));

		for (const workflow of testWorkflows) {
			await this.deleteWorkflow(workflow.id);
		}
	}

	/**
	 * Make HTTP request to n8n API
	 */
	private request(
		method: string,
		path: string,
		body?: any,
	): Promise<{ data: any; headers: any }> {
		return new Promise((resolve, reject) => {
			const url = new URL(this.baseUrl + path);
			const options: http.RequestOptions = {
				hostname: url.hostname,
				port: url.port,
				path: url.pathname + url.search,
				method,
				headers: {
					'Content-Type': 'application/json',
					...(this.authCookie && { Cookie: this.authCookie }),
				},
			};

			const req = http.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					try {
						const parsedData = data ? JSON.parse(data) : {};
						if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
							resolve({ data: parsedData, headers: res.headers });
						} else {
							reject(
								new Error(
									`Request failed with status ${res.statusCode}: ${JSON.stringify(parsedData)}`,
								),
							);
						}
					} catch (error) {
						reject(error);
					}
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			if (body) {
				req.write(JSON.stringify(body));
			}

			req.end();
		});
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

