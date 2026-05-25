// ============================================
// 飞书适配器 - 输出适配器实现
// ============================================

import type { OutputAdapter, MeetingState, BlackboardItem, Message } from '../core/types';

export interface FeishuAdapterConfig {
  userId: string;
  messageTool?: (params: any) => Promise<any>;
}

export class FeishuOutputAdapter implements OutputAdapter {
  private userId: string;
  private messageTool?: (params: any) => Promise<any>;

  constructor(config: FeishuAdapterConfig) {
    this.userId = config.userId;
    this.messageTool = config.messageTool;
  }

  pushMessage(message: Message): void {
    if (message.isSystem) {
      this.sendFeishuMessage(message.content);
    }
  }

  pushBlackboardUpdate(items: BlackboardItem[]): void {
    // 黑板更新不主动推送
  }

  pushStatusUpdate(status: MeetingState): void {
    if (status.status === 'finished') {
      this.sendFeishuMessage(`🎉 会议「${status.topic}」已结束，请仲裁者做出决策`);
    }
  }

  pushError(error: string): void {
    this.sendFeishuMessage(`⚠️ 会议出错: ${error}`);
  }

  private async sendFeishuMessage(content: string): Promise<void> {
    if (!this.messageTool) {
      console.log('[Feishu] Message tool not configured, skipping:', content);
      return;
    }

    try {
      await this.messageTool({
        action: 'send',
        channel: 'feishu',
        target: this.userId,
        message: content,
      });
    } catch (error) {
      console.error('[Feishu] Send failed:', error);
    }
  }
}

// 飞书消息模板
export const FeishuTemplates = {
  planConfirmation(taskName: string, projectPath: string, stepCount: number, steps: string[]): string {
    const stepsText = steps.map((s, i) => `【第${i + 1}步】${s}`).join('\n');
    return `🔧 [开发任务] 新任务待确认
━━━━━━━━━━━━━━━━━━
📋 任务：${taskName}
📁 项目：${projectPath}
⏱️ 预计：${stepCount} 步
━━━━━━━━━━━━━━━━━━
${stepsText}
━━━━━━━━━━━━━━━━━━
[确认方案] [修改方案]`;
  },

  stepCompleted(stepNum: number, summary: string, result: string): string {
    return `✅ [开发任务] 第 ${stepNum} 步完成
━━━━━━━━━━━━━━━━━━
📝 做了什么：${summary}
✅ 验证结果：${result}
━━━━━━━━━━━━━━━━━━
[继续下一步] [暂停]`;
  },

  stuck(stepNum: number, reason: string): string {
    return `⚠️ [开发任务] 第 ${stepNum} 步卡住
━━━━━━━━━━━━━━━━━━
🚫 状态：已超时/已中断
📝 原因：${reason}
━━━━━━━━━━━━━━━━━━
请选择：
① 继续等待
② 调整方案
③ 放弃此步`;
  },

  completed(taskName: string, totalSteps: number, changes: string, commitLink?: string): string {
    return `🎉 [开发任务] 全部完成
━━━━━━━━━━━━━━━━━━
📋 任务：${taskName}
✅ 完成 ${totalSteps} 步
📂 变更：${changes}
${commitLink ? `🔗 提交：${commitLink}` : ''}
━━━━━━━━━━━━━━━━━━`;
  },

  negotiationMessage(speakerName: string, content: string): string {
    return `💬 ${speakerName}：
${content}`;
  },

  negotiationFinished(topic: string): string {
    return `⚖️ 协商会议「${topic}」已结束
请仲裁者基于以上讨论做出决策`;
  },
};
