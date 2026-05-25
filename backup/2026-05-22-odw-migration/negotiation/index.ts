// ============================================
// 协商服务 - 入口文件
// 集成到 ODW backend
// ============================================

export * from './types.js';
export * from './engine.js';
export * from './openclaw-adapter.js';
export * from './odw-adapter.js';
export * from './feishu-adapter.js';

import { NegotiationEngine } from './engine.js';
import { OpenClawAdapter } from './openclaw-adapter.js';
import { ODWOutputAdapter, ODWStorageAdapter } from './odw-adapter.js';
import type { Speaker, MeetingState, Message, BlackboardItem } from './types.js';

export interface CreateNegotiationEngineOptions {
  meetingId: string;
  topic: string;
  participants: Speaker[];
  maxRounds?: number;
  userAsArbitrator?: boolean;
  openClaw: {
    baseUrl: string;
    apiToken: string;
    defaultAgentId: string;
    agentMapping?: Record<string, string>;
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
  const openclawAdapter = new OpenClawAdapter({
    baseUrl: options.openClaw.baseUrl,
    apiToken: options.openClaw.apiToken,
    defaultAgentId: options.openClaw.defaultAgentId,
    agentMapping: options.openClaw.agentMapping,
  });

  const outputAdapter = new ODWOutputAdapter({
    wsClients: options.wsClients || new Set(),
    onMessage: options.callbacks?.onMessage,
    onBlackboardUpdate: options.callbacks?.onBlackboardUpdate,
    onStatusUpdate: options.callbacks?.onStatusUpdate,
  });

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
      input: openclawAdapter,
      output: outputAdapter,
      storage: storageAdapter,
    }
  );
}
