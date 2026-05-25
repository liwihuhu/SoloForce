// ============================================
// ODW 适配器 - 存储适配器 + 输出适配器
// ============================================

import type { 
  OutputAdapter, 
  StorageAdapter, 
  MeetingState, 
  BlackboardItem,
  Message 
} from '../core/types';

// ==================== 存储适配器 ====================

export interface ODWStorageConfig {
  dataDir: string;  // ODW 的 data 目录
}

export class ODWStorageAdapter implements StorageAdapter {
  private dataDir: string;
  private fs: any;  // Node.js fs (lazy load)
  private path: any;

  constructor(config: ODWStorageConfig) {
    this.dataDir = config.dataDir;
  }

  async saveMeetingState(state: MeetingState): Promise<void> {
    await this.ensureDir(`${this.dataDir}/meetings`);
    const filepath = `${this.dataDir}/meetings/${state.meetingId}.json`;
    await this.writeFile(filepath, JSON.stringify(state, null, 2));
  }

  async loadMeetingState(meetingId: string): Promise<MeetingState | null> {
    const filepath = `${this.dataDir}/meetings/${meetingId}.json`;
    try {
      const content = await this.readFile(filepath);
      return content ? JSON.parse(content) : null;
    } catch {
      return null;
    }
  }

  async saveBlackboardSnapshot(meetingId: string, blackboard: BlackboardItem[]): Promise<void> {
    await this.ensureDir(`${this.dataDir}/blackboard`);
    const filepath = `${this.dataDir}/blackboard/${meetingId}.json`;
    await this.writeFile(filepath, JSON.stringify({
      meetingId,
      updatedAt: new Date().toISOString(),
      items: blackboard,
    }, null, 2));
  }

  async cleanupOldMeetings(ttlDays: number): Promise<void> {
    // TODO: 实现清理逻辑
    // 读取 meetings/ 目录，删除 ttlDays 天前的文件
    console.log(`[ODWStorage] Cleanup not implemented yet, ttlDays=${ttlDays}`);
  }

  // ==================== 私有方法 ====================

  private async ensureDir(dir: string): Promise<void> {
    const fs = await this.getFs();
    const path = await this.getPath();
    try {
      await fs.promises.access(dir);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  private async writeFile(filepath: string, content: string): Promise<void> {
    const fs = await this.getFs();
    await fs.promises.writeFile(filepath, content, 'utf-8');
  }

  private async readFile(filepath: string): Promise<string | null> {
    const fs = await this.getFs();
    try {
      return await fs.promises.readFile(filepath, 'utf-8');
    } catch {
      return null;
    }
  }

  private async getFs() {
    if (!this.fs) {
      this.fs = await import('fs');
    }
    return this.fs;
  }

  private async getPath() {
    if (!this.path) {
      this.path = await import('path');
    }
    return this.path;
  }
}

// ==================== 输出适配器 ====================

export interface ODWOutputConfig {
  wsClients: Set<any>;  // WebSocket 客户端集合
  onMessage?: (message: Message) => void;
  onBlackboardUpdate?: (items: BlackboardItem[]) => void;
  onStatusUpdate?: (status: MeetingState) => void;
}

export class ODWOutputAdapter implements OutputAdapter {
  private wsClients: Set<any>;
  private onMessage?: (message: Message) => void;
  private onBlackboardUpdate?: (items: BlackboardItem[]) => void;
  private onStatusUpdate?: (status: MeetingState) => void;

  constructor(config: ODWOutputConfig) {
    this.wsClients = config.wsClients;
    this.onMessage = config.onMessage;
    this.onBlackboardUpdate = config.onBlackboardUpdate;
    this.onStatusUpdate = config.onStatusUpdate;
  }

  pushMessage(message: Message): void {
    // 回调给 ODW
    this.onMessage?.(message);
    
    // 广播给 WebSocket 客户端
    this.broadcast({ type: 'message', payload: message });
  }

  pushBlackboardUpdate(items: BlackboardItem[]): void {
    // 回调给 ODW
    this.onBlackboardUpdate?.(items);
    
    // 广播给 WebSocket 客户端
    this.broadcast({ type: 'blackboard', payload: items });
  }

  pushStatusUpdate(status: MeetingState): void {
    // 回调给 ODW
    this.onStatusUpdate?.(status);
    
    // 广播给 WebSocket 客户端
    this.broadcast({ type: 'status', payload: status });
  }

  pushError(error: string): void {
    this.broadcast({ type: 'error', payload: error });
  }

  private broadcast(data: any): void {
    const message = JSON.stringify(data);
    for (const client of this.wsClients) {
      if (client.readyState === 1) {  // WebSocket.OPEN
        client.send(message);
      }
    }
  }
}
