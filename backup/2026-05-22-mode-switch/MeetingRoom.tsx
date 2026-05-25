// 会议室页面 - 协商版（复用 ODW 协商服务）
// UI 适配 SF 风格，逻辑复用 ODW

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTopologyStore } from '../store';

const API_BASE = '/api';

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '请求失败');
  return data;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderType: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
  isUser?: boolean;
  isSystem?: boolean;
}

interface BlackBoardItem {
  id: string;
  authorId: string;
  authorName: string;
  authorType: string;
  type: 'opinion' | 'question' | 'decision' | 'pending' | 'summary';
  content: string;
  timestamp: string;
}

// ========== 主组件 ==========
export default function MeetingRoom() {
  const { employees, teams, currentTeamId, switchTeam } = useTopologyStore();
  const queryClient = useQueryClient();

  // 状态
  const [meetingId, setMeetingId] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'idle' | 'active' | 'paused' | 'finished' | 'waiting_next_round'>('idle');
  const [currentRound, setCurrentRound] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAtPicker, setShowAtPicker] = useState(false); // @ 提及选择器
  const [atPickerPosition, setAtPickerPosition] = useState({ x: 0, y: 0 });
  const [mentionedIds, setMentionedIds] = useState<string[]>([]); // 当前已 @ 的人
  const [autoRound, setAutoRound] = useState(true); // 自动轮次开关
  const [pendingSpeakerId, setPendingSpeakerId] = useState<string | null>(null);
  // 当前正在思考/生成中的参与者（mutation触发时设，新消息到达时清）
  const [currentThinkingId, setCurrentThinkingId] = useState<string | null>(null);
  const [dotFrame, setDotFrame] = useState(0);
  const [showBlackboard, setShowBlackboard] = useState(true);
  const [detailEmployee, setDetailEmployee] = useState<(typeof participants)[0] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // mutation 开始时的消息数量，用来判断"真正的新消息"是否已到达
  const mutationStartMsgCount = useRef(0);
  // mutation 触发时记录目标发言者，等其回复到达才清除动画
  const thinkingTargetId = useRef<string | null>(null);

  // 当前团队
  const currentTeam = teams.find(t => t.id === currentTeamId);

  // 参会人员（当前团队的成员，排除总裁和执行官）
  const participants = currentTeam
    ? employees.filter(e =>
        currentTeam.memberIds.includes(e.id) &&
        e.type !== 'superadmin' &&
        e.type !== 'executor'
      ).map(e => ({
        id: e.id,
        name: e.name,
        role: e.type,
        roleName: e.roleName || e.type,
        avatar: e.avatar,
        expertise: e.expertise || [],
        personalities: e.personalities || [],
      }))
    : [];


  // 当前团队

  // 轮询协商状态
  const { data: meetingStatus } = useQuery({
    queryKey: ['meeting-status', meetingId],
    queryFn: () => meetingId ? fetchJson(`${API_BASE}/negotiation/${meetingId}/status`) : null,
    enabled: !!meetingId && status !== 'idle',
    refetchInterval: 3000, // 3秒轮询
  });

  // 更新状态从 meetingStatus
  useEffect(() => {
    if (meetingStatus?.data) {
      const d = meetingStatus.data;
      setStatus(d.status || 'idle');
      setCurrentRound(d.currentRound || 0);
    }
  }, [meetingStatus]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meetingStatus?.data?.messages]);

  // 等待动画
  useEffect(() => {
    if (!pendingSpeakerId) return;
    const interval = setInterval(() => setDotFrame(f => (f + 1) % 3), 300);
    return () => clearInterval(interval);
  }, [pendingSpeakerId]);

  // 检测正在等待的参与者
  useEffect(() => {
    if (status === 'idle' || status === 'finished') {
      setPendingSpeakerId(null);
      setCurrentThinkingId(null);
      return;
    }
    const msgs = meetingStatus?.data?.messages || [];
    const newMsgArrived = msgs.length > mutationStartMsgCount.current;

    // 新消息到达 → 检查是否来自"正在等待的发言者"
    if (newMsgArrived && thinkingTargetId.current) {
      const latestMsg = msgs[msgs.length - 1];
      if (latestMsg?.senderId === thinkingTargetId.current) {
        thinkingTargetId.current = null;
        setCurrentThinkingId(null);
      }
    }

    // pendingSpeakerId 用于 UI 高亮左边栏的参与者
    // 优先用 currentThinkingId（mutation进行中），否则基于消息时间推导
    if (currentThinkingId) {
      setPendingSpeakerId(currentThinkingId);
      return;
    }

    if (msgs.length === 0) { setPendingSpeakerId(null); return; }
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg?.timestamp) { setPendingSpeakerId(null); return; }

    // 基于时间推算下一个发言者（fallback 逻辑）
    const elapsed = Date.now() - new Date(lastMsg.timestamp).getTime();
    if (lastMsg.isAI && elapsed < 10000 && lastMsg.senderId !== 'user' && lastMsg.senderId !== 'system') {
      const idx = participants.findIndex(p => p.id === lastMsg.senderId);
      const nextIdx = (idx + 1) % participants.length;
      if (participants[nextIdx]) { setPendingSpeakerId(participants[nextIdx].id); return; }
    }
    if (lastMsg.isUser && elapsed >= 2000 && elapsed < 8000) {
      if (participants.length > 0) { setPendingSpeakerId(participants[0].id); return; }
    }

    setPendingSpeakerId(null);
  }, [meetingStatus, status, participants.map(p => p.id)]);

  // 自动下一轮
  useEffect(() => {
    if (status === 'waiting_next_round' && autoRound) {
      const timer = setTimeout(() => nextRoundMutation.mutate(), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, autoRound]);

  // ========== mutations ==========
  const createMutation = useMutation({
    mutationFn: async (firstMessage: string) => {
      const mid = `meeting-${Date.now()}`;
      await fetchJson(`${API_BASE}/negotiation/create`, {
        method: 'POST',
        body: JSON.stringify({ meetingId: mid, topic: firstMessage, participants }),
      });
      return { meetingId: mid, firstMessage };
    },
    onSuccess: (data) => {
      setMeetingId(data.meetingId);
      setTopic(data.firstMessage);
      startMutation.mutate({ meetingId: data.meetingId, firstMessage: data.firstMessage });
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ meetingId: mid, firstMessage }: { meetingId: string; firstMessage: string }) => {
      fetchJson(`${API_BASE}/negotiation/${mid}/start`, { method: 'POST' });
      if (firstMessage) fetchJson(`${API_BASE}/negotiation/${mid}/speak`, {
        method: 'POST',
        body: JSON.stringify({ content: firstMessage }),
      });
      return Promise.resolve();
    },
    onMutate: () => {
      mutationStartMsgCount.current = (meetingStatus?.data?.messages || []).length;
      // 第一轮：第一个参与者发言
      if (participants.length > 0) {
        const targetId = participants[0].id;
        thinkingTargetId.current = targetId;
        setCurrentThinkingId(targetId);
      }
    },
    onSuccess: () => { setStatus('active'); setUserInput(''); queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] }); },
  });

  const speakMutation = useMutation({
    mutationFn: ({ content, mentioned }: { content: string; mentioned?: string[] }) =>
      fetchJson(`${API_BASE}/negotiation/${meetingId}/speak`, {
        method: 'POST',
        body: JSON.stringify({ content, mentionedIds: mentioned }),
      }),
    onMutate: () => {
      // 记录当前消息数量，用于判断新消息是否到达
      mutationStartMsgCount.current = (meetingStatus?.data?.messages || []).length;
      // 找到下一个发言者（round-robin），显示其思考动画
      const msgs = meetingStatus?.data?.messages || [];
      if (msgs.length > 0 && participants.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const lastIdx = participants.findIndex(p => p.id === lastMsg?.senderId);
        const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % participants.length : 0;
        const targetId = participants[nextIdx]?.id || null;
        thinkingTargetId.current = targetId;
        setCurrentThinkingId(targetId);
      }
    },
    onSuccess: () => { setMentionedIds([]); queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] }); },
  });

  const nextRoundMutation = useMutation({
    mutationFn: () => fetchJson(`${API_BASE}/negotiation/${meetingId}/next-round`, { method: 'POST' }),
    onSuccess: () => { setStatus('active'); queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] }); },
  });

  const stopMutation = useMutation({
    mutationFn: () => fetchJson(`${API_BASE}/negotiation/${meetingId}/stop`, { method: 'POST' }),
    onSuccess: () => { setStatus('finished'); queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] }); },
  });

  const pauseMutation = useMutation({
    mutationFn: () => fetchJson(`${API_BASE}/negotiation/${meetingId}/pause`, { method: 'POST' }),
    onSuccess: () => {
      setStatus('paused');
      queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => fetchJson(`${API_BASE}/negotiation/${meetingId}/resume`, { method: 'POST' }),
    onSuccess: () => {
      setStatus('active');
      queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] });
    },
  });

  const handleSend = () => {
    if (!userInput.trim()) return;
    const text = userInput.trim();
    if (!meetingId) {
      createMutation.mutate(text);
    } else if (status === 'idle') {
      startMutation.mutate({ meetingId, firstMessage: text });
    } else {
      speakMutation.mutate({ content: text, mentioned: mentionedIds.length > 0 ? mentionedIds : undefined });
    }
    setUserInput('');
  };

  // 获取消息和黑板（类型标注避免隐式any）
  const messages: Message[] = meetingStatus?.data?.messages || [];
  const blackboard: BlackBoardItem[] = meetingStatus?.data?.blackboard || [];

  // 等待动画显示
  const pendingSpeaker = pendingSpeakerId ? participants.find(p => p.id === pendingSpeakerId) : null;

  // ========== JSX return ==========
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
    }}>
      {/* ========== 顶部导航栏 ========== */}
      <div style={{
        height: '56px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏛️</span>
          <span>会议室</span>
        </div>

        <select
          value={currentTeamId || ''}
          onChange={(e) => { const team = teams.find(t => t.id === e.target.value); if (team) switchTeam(team); }}
          disabled={!!meetingId && status !== 'idle'}
          style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--accent-border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary)' }}
        >
          <option value="">选择团队</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {meetingId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {status === 'active' ? '🔵 进行中' : status === 'waiting_next_round' ? '⏸️ 等待下一轮' : status === 'finished' ? '🏁 已结束' : '⏳ 空闲'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>第 {currentRound} 轮</span>
          </div>
        )}

        {status === 'active' && (
          <button onClick={() => pauseMutation.mutate()} style={{ padding: '6px 12px', background: 'var(--warning-bg-strong)', border: '1px solid var(--warning)', borderRadius: '6px', color: 'var(--warning)', fontSize: '12px', cursor: 'pointer' }}>
            ⏸ 暂停
          </button>
        )}

        {status === 'paused' && (
          <button onClick={() => resumeMutation.mutate()} style={{ padding: '6px 12px', background: 'var(--success-bg-strong)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', fontSize: '12px', cursor: 'pointer' }}>
            ▶ 继续
          </button>
        )}

        {status !== 'idle' && status !== 'finished' && (
          <button onClick={() => stopMutation.mutate()} style={{ padding: '6px 12px', background: 'var(--danger-bg-strong)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}>
            ⏹ 结束
          </button>
        )}

        <button onClick={() => setShowBlackboard(!showBlackboard)} style={{ padding: '6px 12px', background: 'var(--accent-muted)', border: '1px solid var(--accent-border)', borderRadius: '6px', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer' }}>
          📋 黑板 {showBlackboard ? '隐藏' : '显示'}
        </button>
      </div>

      {/* ========== 主内容区 ========== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：参与人列表 */}
        <div style={{ width: '200px', background: 'var(--bg-card)', borderRight: '1px solid var(--border-default)', padding: '16px', overflowY: 'auto' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            参与人 ({participants.length})
          </div>
          {participants.map(p => (
            <div key={p.id} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${p.id === pendingSpeakerId ? 'var(--accent)' : 'transparent'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontSize: '20px' }}>
                  {p.avatar?.startsWith('/') ? (
                    <img src={p.avatar} alt={p.name} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                  ) : p.avatar}
                </div>
                <button
                  onClick={() => setDetailEmployee(p)}
                  style={{
                    padding: '2px 6px', fontSize: '10px', background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)', borderRadius: '4px',
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                  title="查看详情"
                >
                  &bull;&bull;&bull;
                </button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.roleName}</div>
            </div>
          ))}
          {participants.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
              请先选择团队
            </div>
          )}
        </div>

        {/* 中间：消息区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 消息列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {messages.length === 0 && status === 'idle' && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
                <div style={{ fontSize: '16px' }}>选择团队，输入议题开始协商</div>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={msg.id || i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isUser || msg.isSystem ? 'flex-end' : 'flex-start',
                marginBottom: '16px',
              }}>
                {msg.isSystem ? (
                  <div style={{ padding: '8px 16px', background: 'var(--accent-bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent)' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: msg.isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', maxWidth: '80%' }}>
                    <div style={{ fontSize: '28px' }}>
                      {msg.senderAvatar?.startsWith('/') ? (
                        <img src={msg.senderAvatar} alt={msg.senderName} style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
                      ) : msg.senderAvatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: msg.isUser ? 'right' : 'left' }}>
                        {msg.senderName}
                      </div>
                      <div style={{
                        padding: '10px 14px',
                        background: msg.isUser ? 'var(--accent-hover)' : 'var(--bg-card)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        borderBottomLeftRadius: msg.isUser ? '12px' : '4px',
                        borderBottomRightRadius: msg.isUser ? '4px' : '12px',
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textAlign: msg.isUser ? 'right' : 'left' }}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 等待动画 */}
            {pendingSpeaker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '24px' }}>
                  {pendingSpeaker.avatar?.startsWith('/') ? (
                    <img src={pendingSpeaker.avatar} alt={pendingSpeaker.name} style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                  ) : pendingSpeaker.avatar}
                </span>
                <span>{pendingSpeaker.name} 发言中</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ opacity: dotFrame === 0 ? 1 : 0.3 }}>●</span>
                  <span style={{ opacity: dotFrame === 1 ? 1 : 0.3 }}>●</span>
                  <span style={{ opacity: dotFrame === 2 ? 1 : 0.3 }}>●</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)' }}>
            {/* @ 提及标签 */}
            {mentionedIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {mentionedIds.map(id => {
                  const p = participants.find(x => x.id === id);
                  return p ? (
                    <span key={id} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', background: 'var(--blue-bg)', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      @{p.name}
                      <button onClick={() => setMentionedIds(mentionedIds.filter(x => x !== id))} style={{ cursor: 'pointer', color: 'var(--blue)', background: 'none', border: 'none', padding: '0 2px' }}>×</button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserInput(val);
                    // 检测 @ 触发
                    const atIndex = val.lastIndexOf('@');
                    if (atIndex >= 0 && (atIndex === 0 || val[atIndex - 1] === ' ')) {
                      const searchText = val.slice(atIndex + 1);
                      if (!searchText.includes(' ')) {
                        setShowAtPicker(true);
                      } else {
                        setShowAtPicker(false);
                      }
                    } else {
                      setShowAtPicker(false);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={!meetingId ? "输入第一条消息作为议题..." : status === 'idle' ? "输入消息..." : status === 'waiting_next_round' ? "输入发言继续..." : status === 'finished' ? "输入最终决策..." : "作为仲裁者发言...（@某人指定回复）"}
                  disabled={status === 'finished'}
                  style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-input)', border: '1px solid var(--accent-border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}
                />
                {/* @ 提及选择器 */}
                {showAtPicker && participants.length > 0 && (
                  <div style={{ position: 'absolute', left: '0', bottom: '100%', marginBottom: '4px', width: '200px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--accent-border)', boxShadow: '0 4px 12px var(--shadow)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                    {participants.filter(p => !mentionedIds.includes(p.id)).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setMentionedIds([...mentionedIds, p.id]); setShowAtPicker(false); }}
                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '13px', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {p.avatar?.startsWith('/') ? <img src={p.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px' }} /> : <span>{p.avatar}</span>}
                        <span>{p.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.roleName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!userInput.trim() || status === 'finished'}
                style={{
                  padding: '12px 20px',
                  background: userInput.trim() && status !== 'finished' ? 'var(--accent-hover)' : 'transparent',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '10px',
                  color: userInput.trim() && status !== 'finished' ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '14px',
                  cursor: userInput.trim() && status !== 'finished' ? 'pointer' : 'not-allowed',
                }}
              >
                发送
              </button>
              {meetingId && status !== 'idle' && (
                <button
                  onClick={() => setAutoRound(!autoRound)}
                  style={{
                    padding: '12px 16px',
                    background: autoRound ? 'var(--success-bg-strong)' : 'var(--bg-hover)',
                    border: '1px solid var(--success-border)',
                    borderRadius: '10px',
                    color: autoRound ? 'var(--success)' : 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: autoRound ? 'var(--success)' : 'var(--text-muted)' }} />
                  自动
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：共享黑板 */}
        {showBlackboard && (
          <div style={{ width: '280px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📋 共享黑板 ({blackboard.length})</span>
              <button
                onClick={() => {
                  if (blackboard.length === 0) return;
                  const lines = [`# ${topic}\n`, '---'];
                  blackboard.forEach(item => {
                    const emoji = item.type === 'opinion' ? '💬' : item.type === 'question' ? '❓' : item.type === 'decision' ? '✅' : item.type === 'pending' ? '⏳' : '📋';
                    lines.push(`${emoji} **${item.authorName}** (${item.type})`);
                    lines.push(item.content);
                    lines.push('');
                  });
                  const text = lines.join('\n');
                  const blob = new Blob([text], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `会议黑板_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ padding: '4px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
              >
                📥 导出
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {blackboard.map((item, i) => (
                <div key={item.id || i} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.authorName}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: item.type === 'opinion' ? 'var(--accent-muted)' : item.type === 'question' ? 'var(--danger-bg-strong)' : item.type === 'decision' ? 'var(--success-bg-strong)' : 'var(--warning-bg-strong)', color: item.type === 'opinion' ? 'var(--accent)' : item.type === 'question' ? 'var(--danger)' : item.type === 'decision' ? 'var(--success)' : 'var(--warning)' }}>
                      {item.type === 'opinion' ? '💬' : item.type === 'question' ? '❓' : item.type === 'decision' ? '✅' : item.type === 'pending' ? '⏳' : '📋'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item.content}</div>
                </div>
              ))}
              {blackboard.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '40px' }}>
                  黑板为空
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 参与人详情弹窗 */}
      {detailEmployee && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDetailEmployee(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)', borderRadius: '16px', padding: '24px',
              width: '380px', maxHeight: '85vh', overflowY: 'auto',
              border: '1px solid var(--border-default)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>👤 人员档案</div>
              <button
                onClick={() => setDetailEmployee(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* 基本信息卡片 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-hover)', borderRadius: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '44px' }}>
                {detailEmployee.avatar?.startsWith('/') ? (
                  <img src={detailEmployee.avatar} alt={detailEmployee.name} style={{ width: '52px', height: '52px', borderRadius: '10px' }} />
                ) : detailEmployee.avatar}
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{detailEmployee.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{detailEmployee.roleName}</div>
              </div>
            </div>

            {/* 擅长技能 */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>🎯 擅长技能</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detailEmployee.expertise && detailEmployee.expertise.length > 0 ? (
                  detailEmployee.expertise.map((skill, i) => (
                    <span key={i} style={{
                      padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
                      background: 'rgba(14, 165, 233, 0.15)', color: '#38BDF8',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>暂无技能信息</span>
                )}
              </div>
            </div>

            {/* 性格标签 */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>🧠 性格特征</div>
              {detailEmployee.personalities && detailEmployee.personalities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailEmployee.personalities.map((tag, i) => {
                    const TAG_MAP: Record<string, { label: string; desc: string; color: string }> = {
                      analytical: { label: '🔍 分析型', desc: '注重数据与逻辑，决策谨慎', color: '#3B82F6' },
                      creative: { label: '💡 创意型', desc: '思维活跃，善于提出新想法', color: '#8B5CF6' },
                      pragmatic: { label: '⚡ 实干型', desc: '注重落地执行，关注可行性', color: '#F59E0B' },
                      diplomatic: { label: '🤝 协调型', desc: '擅长沟通调解，平衡各方利益', color: '#10B981' },
                      bold: { label: '🚀 进取型', desc: '敢于冒险，追求快速增长', color: '#EF4444' },
                      cautious: { label: '🛡️ 稳健型', desc: '风险意识强，决策保守', color: '#6366F1' },
                      empathetic: { label: '❤️ 共情型', desc: '关注人的感受，重视团队氛围', color: '#EC4899' },
                      critical: { label: '❄️ 批判型', desc: '善于发现问题，质疑现状', color: '#14B8A6' },
                      optimistic: { label: '☀️ 乐观型', desc: '积极正面，相信问题都能解决', color: '#F97316' },
                      pessimistic: { label: '🌧️ 谨慎型', desc: '习惯考虑 worst case，防患未然', color: '#64748B' },
                      leadership: { label: '👑 主导型', desc: '喜欢掌控节奏，引导讨论方向', color: '#FBBF24' },
                      supportive: { label: '🌿 支持型', desc: '配合他人，补充细节与信息', color: '#84CC16' },
                    };
                    const info = TAG_MAP[tag] || { label: tag, desc: '', color: '#A78BFA' };
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', background: 'var(--bg-secondary)',
                        borderRadius: '8px', fontSize: '12px',
                      }}>
                        <span style={{ color: info.color, fontWeight: 600 }}>{info.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{info.desc}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>暂无性格标签</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
