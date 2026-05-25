// ============================================
// 协商服务 - 入口文件
// 集成到 SF backend
// ============================================

export * from './types.js';
export * from './engine.js';
export * from './llm-adapter.js';
export * from './openclaw-adapter.js';
export * from './timeout-adapter.js';
export * from './odw-adapter.js';
export * from './feishu-adapter.js';

import { NegotiationEngine } from './engine.js';
import { LLMAdapter } from './llm-adapter.js';
import { OpenClawAdapter } from './openclaw-adapter.js';
import { TimeoutAdapter } from './timeout-adapter.js';
import { ODWOutputAdapter, ODWStorageAdapter } from './odw-adapter.js';
import type { Speaker, MeetingState, Message, BlackboardItem } from './types.js';

export interface LLMConfig {
  baseUrl: string;       // API Base URL (e.g., https://api.siliconflow.cn/v1)
  apiKey: string;        // API Key
  model: string;          // 模型名称 (e.g., Qwen/Qwen2.5-7B-Instruct)
  maxTokens?: number;    // 最大 token 数
  temperature?: number; // 温度参数
}

export interface OpenClawConfig {
  baseUrl: string;           // OpenClaw Gateway URL
  apiToken: string;         // API Token
  defaultAgentId: string;   // 默认 Agent ID
  agentMapping?: Record<string, string>;  // 角色 -> Agent ID 映射
  model?: string;
  timeout?: number;          // 请求超时(ms)，默认 30000
  retries?: number;         // 重试次数，默认 2
  retryDelay?: number;      // 重试间隔(ms)，默认 1000
}

export interface CreateNegotiationEngineOptions {
  meetingId: string;
  topic: string;
  participants: Speaker[];
  maxRounds?: number;
  userAsArbitrator?: boolean;
  // LLM 模式配置（SiliconFlow 等）
  llm?: LLMConfig;
  // OpenClaw 模式配置
  openClaw?: OpenClawConfig;
  /**
   * 超时保护配置（可选，默认已内置安全值）
   */
  timeout?: {
    callTimeoutMs?: number;    // 单次 LLM 调用超时（默认 60000ms）
    retryCount?: number;       // 调用失败重试次数（默认 2 次）
    retryDelayMs?: number;     // 重试间隔（默认 3000ms）
    roundTimeoutMs?: number;  // 单轮总超时（默认 180000ms）
  };
  storage?: {
    dataDir: string;
  };
  wsClients?: Set<any>;
  callbacks?: {
    onMessage?: (message: Message) => void;
    onBlackboardUpdate?: (items: BlackboardItem[]) => void;
    onStatusUpdate?: (status: MeetingState) => void;
  };
}

export function createNegotiationEngine(options: CreateNegotiationEngineOptions): NegotiationEngine {
  let inputAdapter: any;

  if (options.openClaw) {
    // OpenClaw 模式
    const openClawAdapter = new OpenClawAdapter({
      baseUrl: options.openClaw.baseUrl,
      apiToken: options.openClaw.apiToken,
      defaultAgentId: options.openClaw.defaultAgentId,
      agentMapping: options.openClaw.agentMapping,
      model: options.openClaw.model,
      timeout: options.openClaw.timeout,
      retries: options.openClaw.retries,
      retryDelay: options.openClaw.retryDelay,
    });

    // OpenClaw 模式不需要超时包裹，直接使用
    inputAdapter = openClawAdapter;
  } else if (options.llm) {
    // LLM 模式（SiliconFlow 等）
    const llmAdapter = new LLMAdapter({
      baseUrl: options.llm.baseUrl,
      apiKey: options.llm.apiKey,
      model: options.llm.model,
      maxTokens: options.llm.maxTokens,
      temperature: options.llm.temperature,
    });

    // LLM 模式使用超时守卫
    inputAdapter = new TimeoutAdapter(llmAdapter, {
      timeoutMs: options.timeout?.callTimeoutMs ?? 60000,
      retryCount: options.timeout?.retryCount ?? 2,
      retryDelayMs: options.timeout?.retryDelayMs ?? 3000,
    });
  } else {
    throw new Error('必须提供 openClaw 或 llm 配置');
  }

  // 输出适配器
  const outputAdapter = new ODWOutputAdapter({
    wsClients: options.wsClients || new Set(),
    onMessage: options.callbacks?.onMessage,
    onBlackboardUpdate: options.callbacks?.onBlackboardUpdate,
    onStatusUpdate: options.callbacks?.onStatusUpdate,
  });

  // 存储适配器
  const storageAdapter = options.storage
    ? new ODWStorageAdapter({ dataDir: options.storage.dataDir })
    : undefined;

  return new NegotiationEngine(
    {
      meetingId: options.meetingId,
      topic: options.topic,
      participants: options.participants,
      maxRounds: options.maxRounds,
      userAsArbitrator: options.userAsArbitrator,
    },
    {
      input: inputAdapter,
      output: outputAdapter,
      storage: storageAdapter,
    },
    {
      roundTimeoutMs: options.timeout?.roundTimeoutMs ?? 180000, // 单轮看门狗，默认 3 分钟
    }
  );
}