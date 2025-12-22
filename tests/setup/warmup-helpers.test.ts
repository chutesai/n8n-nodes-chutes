/**
 * Test: Warmup Helpers with Retry and Fallback Logic
 * 
 * TDD Step 1: Failing test that defines the desired behavior
 * 
 * The warmup should:
 * 1. Try to warm up a chute and POLL to wait for it to become hot
 * 2. If it doesn't warm up after max polls, try the next chute of the same type
 * 3. Only return chutes that are actually hot (isHot === true)
 * 4. Return null if no chutes of that type can be warmed
 */

import { warmupChuteWithRetry, warmupChuteTypeWithFallback } from './warmup-helpers';

describe('Warmup Helpers - Retry and Fallback Logic', () => {
	describe('warmupChuteWithRetry', () => {
		it('should wait for chute to become hot and return it', async () => {
			const chute = {
				chute_id: 'test-chute-1',
				slug: 'test-chute',
				name: 'Test Chute',
			};

			const mockWarmupChute = jest.fn().mockResolvedValue({ 
				success: true, 
				isHot: false, 
				status: 'warming' 
			});

			// Mock: status checks - becomes hot on 3rd check
			const mockCheckChuteStatus = jest.fn()
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				.mockResolvedValueOnce({ isHot: true, status: 'hot', instanceCount: 1 });

			const result = await warmupChuteWithRetry(
				chute,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 5, pollIntervalMs: 100 }
			);

			expect(result).toEqual({
				chuteId: 'test-chute-1',
				url: 'https://test-chute.chutes.ai',
				name: 'Test Chute',
				isHot: true,
			});

			expect(mockWarmupChute).toHaveBeenCalledTimes(1);
			expect(mockWarmupChute).toHaveBeenCalledWith('test-chute-1', 'test-api-key');
			expect(mockCheckChuteStatus).toHaveBeenCalledTimes(3);
		});

		it('should return null if chute never becomes hot', async () => {
			const chute = {
				chute_id: 'cold-chute',
				slug: 'cold-chute',
				name: 'Cold Chute',
			};

			const mockWarmupChute = jest.fn().mockResolvedValue({ 
				success: true,
				isHot: false,
				status: 'warming'
			});

			// Mock: status always returns not hot
			const mockCheckChuteStatus = jest.fn().mockResolvedValue({ 
				isHot: false, 
				status: 'warming' 
			});

			const result = await warmupChuteWithRetry(
				chute,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 3, pollIntervalMs: 50 }
			);

			expect(result).toBeNull();
			expect(mockCheckChuteStatus).toHaveBeenCalledTimes(3);
		});

		it('should handle warmup API errors gracefully', async () => {
			const chute = {
				chute_id: 'error-chute',
				slug: 'error-chute',
				name: 'Error Chute',
			};

			const mockWarmupChute = jest.fn().mockRejectedValue(new Error('API Error'));
			const mockCheckChuteStatus = jest.fn();

			const result = await warmupChuteWithRetry(
				chute,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 3, pollIntervalMs: 50 }
			);

			expect(result).toBeNull();
			expect(mockCheckChuteStatus).not.toHaveBeenCalled(); // Should not poll if warmup fails
		});
	});

	describe('warmupChuteTypeWithFallback', () => {
		it('should try first chute, then fallback to second if first fails', async () => {
			const chutes = [
				{ chute_id: 'chute-1', slug: 'chute-1', name: 'Chute 1' },
				{ chute_id: 'chute-2', slug: 'chute-2', name: 'Chute 2' },
			];

			const mockWarmupChute = jest.fn().mockResolvedValue({ 
				success: true,
				isHot: false,
				status: 'warming'
			});

			// Mock: First chute never becomes hot, second chute becomes hot on 2nd check
			const mockCheckChuteStatus = jest.fn()
				// First chute attempts (never hot)
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				// Second chute attempts (becomes hot)
				.mockResolvedValueOnce({ isHot: false, status: 'warming' })
				.mockResolvedValueOnce({ isHot: true, status: 'hot', instanceCount: 2 });

			const result = await warmupChuteTypeWithFallback(
				'tts',
				chutes,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 3, pollIntervalMs: 50 }
			);

			expect(result).toEqual({
				chuteId: 'chute-2',
				url: 'https://chute-2.chutes.ai',
				name: 'Chute 2',
				isHot: true,
			});

			// Should have tried to warm both chutes
			expect(mockWarmupChute).toHaveBeenCalledTimes(2);
			expect(mockWarmupChute).toHaveBeenNthCalledWith(1, 'chute-1', 'test-api-key');
			expect(mockWarmupChute).toHaveBeenNthCalledWith(2, 'chute-2', 'test-api-key');
			
			// First chute: 3 polls, Second chute: 2 polls
			expect(mockCheckChuteStatus).toHaveBeenCalledTimes(5);
		});

		it('should return null if all chutes fail to warm up', async () => {
			const chutes = [
				{ chute_id: 'chute-1', slug: 'chute-1', name: 'Chute 1' },
				{ chute_id: 'chute-2', slug: 'chute-2', name: 'Chute 2' },
			];

			const mockWarmupChute = jest.fn().mockResolvedValue({ 
				success: true,
				isHot: false,
				status: 'warming'
			});

			const mockCheckChuteStatus = jest.fn().mockResolvedValue({ 
				isHot: false, 
				status: 'warming' 
			});

			const result = await warmupChuteTypeWithFallback(
				'embeddings',
				chutes,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 2, pollIntervalMs: 50 }
			);

			expect(result).toBeNull();
			expect(mockWarmupChute).toHaveBeenCalledTimes(2);
			expect(mockCheckChuteStatus).toHaveBeenCalledTimes(4); // 2 chutes × 2 polls each
		});

		it('should return immediately if first chute becomes hot', async () => {
			const chutes = [
				{ chute_id: 'chute-1', slug: 'chute-1', name: 'Chute 1' },
				{ chute_id: 'chute-2', slug: 'chute-2', name: 'Chute 2' },
			];

			const mockWarmupChute = jest.fn().mockResolvedValue({ 
				success: true,
				isHot: false,
				status: 'warming'
			});

			// First chute becomes hot immediately on first poll
			const mockCheckChuteStatus = jest.fn()
				.mockResolvedValueOnce({ isHot: true, status: 'hot', instanceCount: 1 });

			const result = await warmupChuteTypeWithFallback(
				'llm',
				chutes,
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 3, pollIntervalMs: 50 }
			);

			expect(result).toEqual({
				chuteId: 'chute-1',
				url: 'https://chute-1.chutes.ai',
				name: 'Chute 1',
				isHot: true,
			});

			// Should only have tried first chute
			expect(mockWarmupChute).toHaveBeenCalledTimes(1);
			expect(mockCheckChuteStatus).toHaveBeenCalledTimes(1);
		});

		it('should return null if no chutes provided', async () => {
			const mockWarmupChute = jest.fn();
			const mockCheckChuteStatus = jest.fn();

			const result = await warmupChuteTypeWithFallback(
				'video',
				[],
				'test-api-key',
				mockWarmupChute,
				mockCheckChuteStatus,
				{ maxPolls: 3, pollIntervalMs: 50 }
			);

			expect(result).toBeNull();
			expect(mockWarmupChute).not.toHaveBeenCalled();
			expect(mockCheckChuteStatus).not.toHaveBeenCalled();
		});
	});
});

