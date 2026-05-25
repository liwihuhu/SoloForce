// ============================================
// 核心类型定义 - 平台无关
// ============================================

/**
 * 发言角色类型
 */
export type RoleType = 
  | 'manager' 
  | 'developer' 
  | 'designer' 
  | 'analyst' 
  | 'writer' 
  | 'qa' 
  | 'support'
  | 'researcher'
  | 'custom';

/**
 * 发言者
 */
export interface Speaker {
  id: string;
  name: string;
  role: RoleType;
  roleName: string;
  avatar?: string;
  expertise?: string[];          // 专长领域
  openClawAgentId?: string;        // 对应的 OpenClaw Agent ID
  availableTools?: string[];       // 该角色可用的工具列表
  personality?: 'balanced' | 'challenger' | 'supporter' | 'cautious' | 'innovator';  // 发言风格
}

/**
 * 黑板项目类型
 */
export type BlackboardItemType = 
  | 'opinion'      // 观点
  | 'question'      // 问题
  | 'decision'      // 决策
  | 'pending'       // 待处理
  | 'summary'       // 总结
  | 'tool_result';  // 工具执行结果

/**
 * 黑板条目
 */
export interface BlackboardItem {
  id: string;
  authorId: string;
  authorName: string;
  authorType: string;  // speaker/system/user
  type: BlackboardItemType;
  content: string;
  targetId?: string;       // 回应谁
  targetName?: string;     // 回应谁的名字
  toolName?: string;        // 工具名（tool_result 类型）
  toolOutput?: string;      // 工具输出（tool_result 类型）
  timestamp: string;
}

/**
 * 消息类型
 */
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderType: string;  // role type
  content: string;
  timestamp: string;
  isAI?: boolean;
  isUser?: boolean;
  isSystem?: boolean;
  mentionedIds?: string[];  // @ 提及的人
}

/**
 * 协商请求
 */
export interface NegotiationRequest {
  meetingId: string;
  speaker: Speaker;
  topic: string;
  blackboard: BlackboardItem[];      // 历史黑板内容
  userPriorityContent?: string;     // 用户最新发言（仲裁者指示）
}

/**
 * 协商响应
 */
export interface NegotiationResponse {
  success: boolean;
  content: string;                   // 发言文本
  toolCalls?: ToolCall[];            // 工具调用请求
  error?: string;
}

/**
 * 工具调用请求
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * 会议配置
 */
export interface MeetingConfig {
  meetingId: string;
  topic: string;
  participants: Speaker[];
  maxRounds: number;        // 最大轮次
  userAsArbitrator: boolean; // 用户作为仲裁者
}

/**
 * 会议状态
 */
export interface MeetingState {
  meetingId: string;
  topic: string;
  status: 'setup' | 'active' | 'paused' | 'finished' | 'waiting_next_round';
  currentRound: number;
  maxRounds: number;
  messages: Message[];
  blackboard: BlackboardItem[];
  participants: Speaker[];
  userAsArbitrator: boolean;
}

/**
 * 输入适配器接口（平台无关）
 */
export interface InputAdapter {
  /**
   * 发送协商请求到 LLM
   */
  sendNegotiationRequest(request: NegotiationRequest): Promise<NegotiationResponse>;
  
  /**
   * 执行工具调用
   */
  executeToolCall(toolCall: ToolCall): Promise<ToolResult>;
}

/**
 * 输出适配器接口（平台无关）
 */
export interface OutputAdapter {
  /**
   * 推送新消息
   */
  pushMessage(message: Message): void;
  
  /**
   * 推送黑板更新
   */
  pushBlackboardUpdate(items: BlackboardItem[]): void;
  
  /**
   * 推送状态更新
   */
  pushStatusUpdate(status: MeetingState): void;
  
  /**
   * 推送错误
   */
  pushError(error: string): void;
}

/**
 * 存储适配器接口（平台无关）
 */
export interface StorageAdapter {
  /**
   * 保存会议状态
   */
  saveMeetingState(state: MeetingState): Promise<void>;
  
  /**
   * 加载会议状态
   */
  loadMeetingState(meetingId: string): Promise<MeetingState | null>;
  
  /**
   * 保存黑板快照
   */
  saveBlackboardSnapshot(meetingId: string, blackboard: BlackboardItem[]): Promise<void>;
  
  /**
   * 清理过期数据
   */
  cleanupOldMeetings(ttlDays: number): Promise<void>;
}
