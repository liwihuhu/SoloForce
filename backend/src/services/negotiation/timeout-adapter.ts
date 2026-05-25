// ============================================
// 超时守卫适配器 - 包裹任意 InputAdapter
// 提供单次 LLM 调用超时保护
// ============================================

import type { InputAdapter, NegotiationRequest, NegotiationResponse, ToolCall, ToolResult, SummaryResult } from './types';

/**
 * 超时守卫配置
 */
export interface TimeoutAdapterConfig {
  timeoutMs: number;        // 单次调用超时（毫秒）
  retryCount: number;       // 失败重试次数
  retryDelayMs: number;     // 重试间隔（毫秒）
}

/**
 * 超时守卫适配器
 * 包裹任意 InputAdapter，自动加超时 + 重试保护
 */
export class TimeoutAdapter implements InputAdapter {
  private inner: InputAdapter;
  private config: TimeoutAdapterConfig;

  constructor(inner: InputAdapter, config: Partial<TimeoutAdapterConfig> = {}) {
    this.inner = inner;
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000,   // 默认 30s
      retryCount: config.retryCount ?? 2,     // 默认重试 2 次
      retryDelayMs: config.retryDelayMs ?? 3000, // 默认 3s 后重试
    };
  }

  async sendNegotiationRequest(request: NegotiationRequest): Promise<NegotiationResponse> {
    const { timeoutMs, retryCount, retryDelayMs } = this.config;
    let lastError: string = '';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.withTimeout(
          this.inner.sendNegotiationRequest(request),
          timeoutMs,
          `LLM 调用超时 (${timeoutMs}ms)`
        );

        if (result.success) {
          if (attempt > 0) {
            console.log(`[TimeoutAdapter] 第 ${attempt} 次重试成功`);
          }
          return result;
        }

        // LLM 返回了 success=false，不重试，直接返回
        lastError = result.error || '未知错误';
        console.warn(`[TimeoutAdapter] LLM 调用失败（不重试）: ${lastError}`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[TimeoutAdapter] 第 ${attempt + 1} 次失败: ${lastError}`);

        if (attempt < retryCount) {
          await this.delay(retryDelayMs);
        }
      }
    }

    // 全部重试失败
    console.error(`[TimeoutAdapter] 重试 ${retryCount} 次后仍失败: ${lastError}`);
    return {
      success: false,
      content: '',
      error: `LLM 调用失败（已重试 ${retryCount} 次）: ${lastError}`,
    };
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    // 工具调用也加上超时保护（默认 15s）
    return this.withTimeout(
      this.inner.executeToolCall(toolCall),
      15000,
      `工具调用超时 (15s): ${toolCall.name}`
    );
  }

  async sendSummaryRequest(
    topic: string,
    blackboard: { authorName: string; authorType: string; type: string; content: string; toolName?: string }[],
    participants: { name: string; role: string; roleName: string }[]
  ): Promise<SummaryResult> {
    // 总结生成时间较长，设置 60s 超时
    return this.withTimeout(
      this.inner.sendSummaryRequest(topic, blackboard, participants),
      60000,
      '会议总结生成超时 (60s)'
    );
  }

  // ==================== 私有方法 ====================

  /**
   * Promise 超时控制
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
