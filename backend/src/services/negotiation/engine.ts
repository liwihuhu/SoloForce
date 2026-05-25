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
  private hasSummarized: boolean = false; // 防止重复生成总结

  /** 看门狗定时器引用（用于取消） */
  private roundWatchdogTimer?: ReturnType<typeof setTimeout>;
  private roundWatchdogMs: number;

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
    },
    watchdog?: {
      roundTimeoutMs?: number; // 单轮看门狗超时（毫秒），默认 120000（2分钟）
    }
  ) {
    this.inputAdapter = adapters.input;
    this.outputAdapter = adapters.output;
    this.storageAdapter = adapters.storage;
    this.roundWatchdogMs = watchdog?.roundTimeoutMs ?? 120000; // 默认 2 分钟

    this.state = {
      meetingId: config.meetingId,
      topic: config.topic,
      status: 'setup',
      currentRound: 0,
      maxRounds: config.maxRounds || 99,
      messages: [],
      blackboard: [],
      participants: config.participants,
      userAsArbitrator: config.userAsArbitrator ?? true
    };
    this.hasSummarized = false;
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
   * 生成会议总结
   * 提取黑板内容，调用 LLM 生成结构化总结
   * 防止重复生成
   */
  async summarize(): Promise<{
    summary: string;
    decisions: string[];
    keyPoints: string[];
    unresolved: string[];
    actionItems: Array<{ task: string; owner?: string; deadline?: string }>;
  }> {
    // 防止重复生成
    if (this.hasSummarized) {
      console.log('[Engine] 总结已生成，跳过');
      const existing = this.state.blackboard.filter(b => b.type === 'summary');
      if (existing.length > 0) {
        return {
          summary: '总结已生成',
          decisions: [],
          keyPoints: [],
          unresolved: [],
          actionItems: [],
        };
      }
    }

    console.log('[Engine] 生成会议总结...');
    this.hasSummarized = true;

    // 提取黑板内容
    const opinions = this.state.blackboard.filter(b => b.type === 'opinion');
    const questions = this.state.blackboard.filter(b => b.type === 'question');
    const decisions = this.state.blackboard.filter(b => b.type === 'decision');
    const toolResults = this.state.blackboard.filter(b => b.type === 'tool_result');

    // 调用 LLM 生成总结
    const result = await this.inputAdapter.sendSummaryRequest(
      this.state.topic,
      [...opinions, ...questions, ...decisions, ...toolResults],
      this.state.participants
    );

    // 将总结写入黑板
    const summaryContent = [
      `📋 **会议总结**`,
      ``,
      `**议题**：${this.state.topic}`,
      ``,
      `**概要**：${result.summary}`,
    ];

    if (result.decisions.length > 0) {
      summaryContent.push(``, `**✅ 决议事项**：`);
      result.decisions.forEach((d, i) => {
        summaryContent.push(`${i + 1}. ${d}`);
      });
    }

    if (result.keyPoints.length > 0) {
      summaryContent.push(``, `**💡 关键观点**：`);
      result.keyPoints.forEach((p, i) => {
        summaryContent.push(`${i + 1}. ${p}`);
      });
    }

    if (result.unresolved.length > 0) {
      summaryContent.push(``, `**⚠️ 未解决分歧**：`);
      result.unresolved.forEach((u, i) => {
        summaryContent.push(`${i + 1}. ${u}`);
      });
    }

    if (result.actionItems.length > 0) {
      summaryContent.push(``, `**📌 待办事项**：`);
      result.actionItems.forEach((item, i) => {
        let taskLine = `${i + 1}. ${item.task}`;
        if (item.owner) taskLine += `（负责人：${item.owner}）`;
        if (item.deadline) taskLine += ` - ${item.deadline}`;
        summaryContent.push(taskLine);
      });
    }

    // 添加到黑板
    this.addToBlackboard({
      authorId: 'system',
      authorName: '会议记录员',
      authorType: 'system',
      type: 'summary',
      content: summaryContent.join('\n'),
    });

    // 添加系统消息
    this.addSystemMessage(`📋 会议总结已生成`);

    return result;
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
   * 含看门狗保护：单轮超时则强制暂停并通知前端
   */
  private async runRoundSequence(): Promise<void> {
    // 启动看门狗
    this.startRoundWatchdog();

    try {
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

      // 本轮正常结束，取消看门狗
      this.cancelRoundWatchdog();

      if (!this.isRunning) return;

      // 检查是否已达到最大轮次
      if (this.state.currentRound >= this.state.maxRounds) {
        this.addSystemMessage(`⚖️ 所有轮次已完成，请仲裁者做出最终决策`);
        this.state.status = 'finished';
        this.isRunning = false;
        // 自动生成会议总结
        await this.summarize();
        this.outputAdapter.pushStatusUpdate(this.state);
        await this.saveState();
        return;
      }

      // 还有下一轮，暂停等待用户决定
      this.addSystemMessage(`📋 第 ${this.state.currentRound} 轮讨论结束，请决定是否继续下一轮`);
      this.isPaused = true;
      this.state.status = 'waiting_next_round';
      this.outputAdapter.pushStatusUpdate(this.state);

    } catch (err) {
      this.cancelRoundWatchdog();
      console.error('[Engine] 轮次执行异常:', err);
      this.addSystemMessage(`⚠️ 第 ${this.state.currentRound} 轮执行异常: ${err instanceof Error ? err.message : String(err)}，已暂停`);
      this.isPaused = true;
      this.state.status = 'paused';
      this.outputAdapter.pushStatusUpdate(this.state);
    }
  }

  /**
   * 结束会议（自动生成总结）
   * 即使会议已结束（maxRounds 到达），也会生成总结
   */
  async stop(): Promise<void> {
    // 如果会议未在运行，检查是否是有效状态
    if (!this.isRunning) {
      // 如果会议已经结束（可能是 maxRounds 到达），仍然生成总结
      if (this.state.status === 'finished') {
        await this.summarize();
        await this.saveState();
        return;
      }
      // 如果是其他无效状态，直接返回
      if (this.state.status !== 'waiting_next_round') {
        return;
      }
    }

    this.isRunning = false;
    this.isPaused = false;
    this.cancelRoundWatchdog();
    
    // 生成会议总结
    await this.summarize();
    
    this.state.status = 'finished';
    this.outputAdapter.pushStatusUpdate(this.state);
    await this.saveState();
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

  // ==================== 看门狗保护 ====================

  /**
   * 启动单轮看门狗
   * 如果本轮在 roundWatchdogMs 内未完成，强制暂停并通知前端
   */
  private startRoundWatchdog(): void {
    this.cancelRoundWatchdog(); // 先取消旧的

    console.log(`[Engine] 看门狗启动，单轮超时: ${this.roundWatchdogMs}ms`);

    this.roundWatchdogTimer = setTimeout(() => {
      if (!this.isRunning) return;

      console.warn(`[Engine] ⚠️ 看门狗触发！本轮执行超过 ${this.roundWatchdogMs}ms，强制暂停`);

      // 强制停止发言序列
      this.isRunning = false;
      this.isPaused = true;

      // 添加系统警告消息
      this.addSystemMessage(
        `⏰ 第 ${this.state.currentRound} 轮执行超时（>${this.roundWatchdogMs / 1000}s），已被系统强制暂停。请检查网络或模型响应后，手动继续或结束会议。`
      );

      this.state.status = 'paused';
      this.outputAdapter.pushStatusUpdate(this.state);
    }, this.roundWatchdogMs);
  }

  /**
   * 取消看门狗（正常结束时调用）
   */
  private cancelRoundWatchdog(): void {
    if (this.roundWatchdogTimer) {
      clearTimeout(this.roundWatchdogTimer);
      this.roundWatchdogTimer = undefined;
      console.log('[Engine] 看门狗已取消');
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
