// ============================================
// 协商会议路由 - 使用协商服务
// ============================================

import { Router } from 'express';
import { createNegotiationEngine } from '../services/negotiation/index.js';
import type { Speaker } from '../services/negotiation/types.js';

const router = Router();

// 存储活跃的协商引擎实例
const activeEngines = new Map<string, any>();

// OpenClaw 配置（从环境变量）
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_TOKEN || 'a9b2a391cf24f37e397718bfdae0ff2302a1133f0fe2b3f2';

// 创建协商会话
router.post('/create', async (req, res) => {
  try {
    const { meetingId, topic, participants, maxRounds = 99 } = req.body;

    // 自动生成 meetingId 如果没有提供
    const finalMeetingId = meetingId || `meeting-${Date.now()}`;

    if (!topic || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必要参数' }
      });
    }

    // 创建协商引擎
    const engine = createNegotiationEngine({
      meetingId: finalMeetingId,
      topic,
      participants: participants as Speaker[],
      maxRounds,
      userAsArbitrator: true,
      openClaw: {
        baseUrl: OPENCLAW_URL,
        apiToken: OPENCLAW_TOKEN,
        defaultAgentId: 'main',
      },
      callbacks: {
        onMessage: (message) => {
          // 广播消息（通过 WebSocket 或存储）
          console.log(`[协商] ${message.senderName}: ${message.content.slice(0, 50)}...`);
        },
        onBlackboardUpdate: (items) => {
          console.log(`[协商] 黑板更新: ${items.length} 条`);
        },
        onStatusUpdate: (status) => {
          console.log(`[协商] 状态: ${status.status}, 轮次: ${status.currentRound}`);
        },
      },
    });

    // 存储引擎
    activeEngines.set(finalMeetingId, engine);

    res.json({
      success: true,
      data: {
        meetingId: finalMeetingId,
        status: 'created',
        participants: participants.length,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : '创建失败'
      }
    });
  }
});

// 开始协商
router.post('/:meetingId/start', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    // 异步启动，不阻塞
    engine.start().catch(console.error);

    res.json({
      success: true,
      data: { meetingId, status: 'started' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'START_FAILED',
        message: error instanceof Error ? error.message : '启动失败'
      }
    });
  }
});

// 用户发言
router.post('/:meetingId/speak', (req, res) => {
  try {
    const { meetingId } = req.params;
    const { content, mentionedIds } = req.body;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '内容不能为空' }
      });
    }

    engine.userSpeak(content, mentionedIds);

    res.json({
      success: true,
      data: { meetingId, message: '已添加到黑板' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SPEAK_FAILED',
        message: error instanceof Error ? error.message : '发言失败'
      }
    });
  }
});

// 获取协商状态
router.get('/:meetingId/status', (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    const state = engine.getState();

    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATUS_FAILED',
        message: error instanceof Error ? error.message : '获取状态失败'
      }
    });
  }
});

// 暂停协商
router.post('/:meetingId/pause', (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    engine.pause();

    res.json({
      success: true,
      data: { meetingId, status: 'paused' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PAUSE_FAILED',
        message: error instanceof Error ? error.message : '暂停失败'
      }
    });
  }
});

// 继续协商（推进下一轮）
router.post('/:meetingId/resume', (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    engine.resume();

    res.json({
      success: true,
      data: { meetingId, status: 'resumed' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_FAILED',
        message: error instanceof Error ? error.message : '继续失败'
      }
    });
  }
});

// 推进到下一轮（用户手动控制）
router.post('/:meetingId/next-round', (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    engine.advanceToNextRound();

    res.json({
      success: true,
      data: { meetingId, status: 'next_round_started' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'NEXT_ROUND_FAILED',
        message: error instanceof Error ? error.message : '推进失败'
      }
    });
  }
});

// 结束协商
router.post('/:meetingId/stop', (req, res) => {
  try {
    const { meetingId } = req.params;
    const engine = activeEngines.get(meetingId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '协商会话不存在' }
      });
    }

    engine.stop();
    activeEngines.delete(meetingId);

    res.json({
      success: true,
      data: { meetingId, status: 'finished' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STOP_FAILED',
        message: error instanceof Error ? error.message : '停止失败'
      }
    });
  }
});

export default router;
