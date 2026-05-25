// ============================================
// 协商引擎 - 核心逻辑
// 统一使用 executeRound() 作为轮次执行单位
// 支持自动轮次和手动轮次两种模式
// ============================================

import type { 
  Speaker, 
  BlackboardItem, 
  NegotiationRequest, 
  NegotiationResponse,
  ToolCall,
  MeetingState,
  InputAdapter,
  OutputAdapter,
  StorageAdapter,
  Message
} from './types';

/**
 * 协商引擎 - 核心逻辑
 */
export class NegotiationEngine {
  private inputAdapter: InputAdapter;
  private outputAdapter: OutputAdapter;
  private storageAdapter?: StorageAdapter;
  
  private state: MeetingState;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor(
    config: {
      meetingId: string;
      topic: string;
      participants: Speaker[];
      maxRounds?: number;
      userAsArbitrator?: boolean;
    },
    adapters: {
      input: InputAdapter;
      output: OutputAdapter;
      storage?: StorageAdapter;
    }
  ) {
    this.inputAdapter = adapters.input;
    this.outputAdapter = adapters.output;
    this.storageAdapter = adapters.storage;
    
    this.state = {
      meetingId: config.meetingId,
      topic: config.topic,
      status: 'setup',
      currentRound: 0,
      maxRounds: config.maxRounds || 99,  // 默认99轮，足够长
      messages: [],
      blackboard: [],
      participants: config.participants,
      userAsArbitrator: config.userAsArbitrator ?? true
    };
  }

  // ==================== 公开方法 ====================

  /**
   * 开始会议（第一轮）
   * 只初始化，不自动执行多轮
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.state.status = 'active';
    this.state.currentRound = 0;
    
    // 添加系统消息：议题发布
    this.addSystemMessage(`📢 议题发布：「${this.state.topic}」`);
    
    // 议题加入黑板
    this.addToBlackboard({
      authorId: 'system',
      authorName: '系统',
      authorType: 'system',
      type: 'opinion',
      content: `议题：${this.state.topic}`,
    });
    
    // 执行第一轮（不是调用 runDiscussion）
    this.executeRound();
  }

  /**
   * 暂停会议
   */
  pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
    this.state.status = 'paused';
    this.outputAdapter.pushStatusUpdate(this.state);
  }

  /**
   * 继续会议（resume 或 advanceToNextRound）
   * 如果处于 waiting_next_round 状态，则开始下一轮
   */
  resume(): void {
    if (!this.isRunning) return;
    
    if (this.state.status === 'waiting_next_round') {
      // 处于等待状态，继续下一轮
      this.advanceToNextRound();
    } else if (this.state.status === 'paused') {
      // 普通暂停后恢复
      this.isPaused = false;
      this.state.status = 'active';
      this.outputAdapter.pushStatusUpdate(this.state);
    }
  }

  /**
   * 推进到下一轮
   * 只能在 waiting_next_round 状态下调用
   */
  advanceToNextRound(): void {
    if (!this.isRunning) return;
    if (this.state.status !== 'waiting_next_round') return;
    
    this.isPaused = false;
    this.state.status = 'active';
    this.outputAdapter.pushStatusUpdate(this.state);
    this.executeRound();
  }

  /**
   * 执行一轮发言
   * 每轮结束后都暂停，等待用户决定是否继续
   */
  private executeRound(): void {
    if (!this.isRunning) return;
    
    this.state.currentRound++;
    this.addSystemMessage(`🔄 第 ${this.state.currentRound} 轮讨论开始`);
    
    // 异步执行发言序列
    this.runRoundSequence().catch(err => {
      console.error('轮次执行异常:', err);
      this.outputAdapter.pushError(`轮次执行异常: ${err}`);
    });
  }

  /**
   * 运行一轮发言序列
   */
  private async runRoundSequence(): Promise<void> {
    for (const participant of this.state.participants) {
      if (!this.isRunning) break;
      
      // 检查暂停
      while (this.isPaused && this.isRunning) {
        await this.delay(500);
      }
      if (!this.isRunning) break;
      
      // 发言延迟（模拟思考）
      await this.delay(2000 + Math.random() * 2000);
      
      // 执行发言
      await this.speak(participant);
    }
    
    // 本轮结束
    if (!this.isRunning) return;
    
    // 检查是否已达到最大轮次
    if (this.state.currentRound >= this.state.maxRounds) {
      // 全部轮次结束，进入最终决策
      this.addSystemMessage(`⚖️ 所有轮次已完成，请仲裁者做出最终决策`);
      this.state.status = 'finished';
      this.isRunning = false;
      this.outputAdapter.pushStatusUpdate(this.state);
      this.saveState();
      return;
    }
    
    // 还有下一轮，暂停等待用户决定
    this.addSystemMessage(`📋 第 ${this.state.currentRound} 轮讨论结束，请决定是否继续下一轮`);
    this.isPaused = true;
    this.state.status = 'waiting_next_round';
    this.outputAdapter.pushStatusUpdate(this.state);
  }

  /**
   * 结束会议
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.isPaused = false;
    this.state.status = 'finished';
    this.outputAdapter.pushStatusUpdate(this.state);
    this.saveState();
  }

  /**
   * 用户发言（仲裁者）
   * 即使会议结束（finished），用户仍可发言（用于最终决策）
   */
  userSpeak(content: string, mentionedIds?: string[]): void {
    // 构建带 @ 的内容
    let displayContent = content;
    if (mentionedIds && mentionedIds.length > 0) {
      const mentioned = this.state.participants.filter(p => mentionedIds.includes(p.id));
      const names = mentioned.map(p => p.name).join('、');
      displayContent = `${content} @${names}`;
    }
    
    // 添加到黑板（带类型）
    this.addToBlackboard({
      authorId: 'user',
      authorName: '仲裁者（我）',
      authorType: 'user',
      type: content.startsWith('决定') || content.startsWith('✅') ? 'decision' : 'opinion',
      content: displayContent,
      mentionedIds: mentionedIds || [],
    });
    
    // 添加到消息
    this.addMessage({
      senderId: 'user',
      senderName: '仲裁者（我）',
      senderAvatar: '👤',
      senderType: 'user',
      content: displayContent,
      isUser: true,
      mentionedIds: mentionedIds || [],
    });
    
    // 如果是等待下一轮状态，用户发言后继续下一轮
    if (this.state.status === 'waiting_next_round' && this.isRunning) {
      this.advanceToNextRound();
    }
  }

  /**
   * 用户添加问题到黑板
   */
  userAddQuestion(content: string): void {
    this.addToBlackboard({
      authorId: 'user',
      authorName: '仲裁者（我）',
      authorType: 'user',
      type: 'question',
      content,
    });
  }

  /**
   * 获取当前状态
   */
  getState(): MeetingState {
    return { ...this.state };
  }

  // ==================== 私有方法 ====================

  /**
   * 单个参与者发言
   */
  private async speak(speaker: Speaker): Promise<void> {
    // 获取用户最新发言（权重最高）
    const userContent = this.getLastUserContent();
    
    // 构造请求
    const request: NegotiationRequest = {
      meetingId: this.state.meetingId,
      speaker,
      topic: this.state.topic,
      blackboard: this.state.blackboard,
      userPriorityContent: userContent,
    };
    
    // 通知前端：状态更新
    this.outputAdapter.pushStatusUpdate({
      ...this.state,
      status: 'active',
    });
    
    try {
      // 调用 LLM
      const response = await this.inputAdapter.sendNegotiationRequest(request);
      
      if (!response.success) {
        this.outputAdapter.pushError(`发言失败: ${response.error}`);
        return;
      }
      
      // 执行工具调用（如果有）
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.executeToolCalls(response.toolCalls, speaker);
      }
      
      // 添加发言到黑板
      this.addToBlackboard({
        authorId: speaker.id,
        authorName: speaker.name,
        authorType: speaker.role,
        type: 'opinion',
        content: response.content,
      });
      
      // 添加发言到消息
      this.addMessage({
        senderId: speaker.id,
        senderName: speaker.name,
        senderAvatar: speaker.avatar || '🤖',
        senderType: speaker.role,
        content: response.content,
        isAI: true,
      });
      
    } catch (error) {
      this.outputAdapter.pushError(`发言异常: ${error}`);
    }
  }

  /**
   * 执行工具调用
   */
  private async executeToolCalls(toolCalls: ToolCall[], speaker: Speaker): Promise<void> {
    for (const toolCall of toolCalls) {
      // 显示正在使用工具
      const toolMessage = `🔧 ${speaker.name} 正在使用 ${toolCall.name}...`;
      this.outputAdapter.pushMessage({
        id: `tool-${Date.now()}`,
        senderId: 'system',
        senderName: '系统',
        senderAvatar: '🤖',
        senderType: 'system',
        content: toolMessage,
        isSystem: true,
        timestamp: this.getTimeString(),
      });
      
      try {
        const result = await this.inputAdapter.executeToolCall(toolCall);
        
        // 工具结果写入黑板
        this.addToBlackboard({
          authorId: speaker.id,
          authorName: speaker.name,
          authorType: speaker.role,
          type: 'tool_result',
          content: result.output,
          toolName: toolCall.name,
          toolOutput: result.output,
        });
        
      } catch (error) {
        this.addToBlackboard({
          authorId: speaker.id,
          authorName: speaker.name,
          authorType: speaker.role,
          type: 'tool_result',
          content: `工具执行失败: ${error}`,
          toolName: toolCall.name,
        });
      }
    }
  }

  /**
   * 添加系统消息
   */
  private addSystemMessage(content: string): void {
    const message: Message = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: 'system',
      senderName: '系统',
      senderAvatar: '🤖',
      senderType: 'system',
      content,
      isSystem: true,
      timestamp: this.getTimeString(),
    };
    
    this.state.messages.push(message);
    this.outputAdapter.pushMessage(message);
  }

  /**
   * 添加消息
   */
  private addMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: this.getTimeString(),
    };
    
    this.state.messages.push(fullMessage);
    this.outputAdapter.pushMessage(fullMessage);
  }

  /**
   * 添加到黑板
   */
  private addToBlackboard(item: Omit<BlackboardItem, 'id' | 'timestamp'>): void {
    const blackboardItem: BlackboardItem = {
      ...item,
      id: `bb-${Date.now()}`,
      timestamp: this.getTimeString(),
    };
    
    this.state.blackboard.push(blackboardItem);
    this.outputAdapter.pushBlackboardUpdate([...this.state.blackboard]);
  }

  /**
   * 获取用户最新发言
   */
  private getLastUserContent(): string | undefined {
    const userItems = this.state.blackboard.filter(b => b.authorId === 'user');
    if (userItems.length === 0) return undefined;
    return userItems[userItems.length - 1].content;
  }

  /**
   * 保存状态
   */
  private async saveState(): Promise<void> {
    if (this.storageAdapter) {
      await this.storageAdapter.saveMeetingState(this.state);
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取时间字符串
   */
  private getTimeString(): string {
    return new Date().toISOString();
  }
}
