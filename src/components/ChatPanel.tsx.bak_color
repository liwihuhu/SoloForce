import { useState, useEffect, useRef } from 'react';
import { useTopologyStore } from '../store';
import { PRESET_EMPLOYEES } from '../types';

interface TaskResult {
  employee: { id: string; name: string; type: string; avatar: string };
  result: string;
  subResults?: TaskResult[];
}

interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: string;
  result?: TaskResult;
}

// 提取执行官的命令
function findExecutorCommand(result: TaskResult): string | null {
  // 如果当前节点就是执行官，返回其结果
  if (result.employee.type === 'executor') {
    return result.result;
  }
  // 递归查找子节点中的执行官
  if (result.subResults) {
    for (const sub of result.subResults) {
      const cmd = findExecutorCommand(sub);
      if (cmd) return cmd;
    }
  }
  return null;
}

// 将树形结果展平为列表
function flattenTaskResults(result: TaskResult, order: number): Array<{ order: number; data: TaskResult }> {
  const list: Array<{ order: number; data: TaskResult }> = [{ order, data: result }];
  if (result.subResults) {
    result.subResults.forEach((sub, idx) => {
      list.push(...flattenTaskResults(sub, order + idx + 1));
    });
  }
  return list;
}

export default function ChatPanel({ 
  onTaskExecute,
}: { 
  onTaskExecute: (executing: boolean, result?: TaskResult) => void;
}) {
  const { edges, selectedEmployee, employees, teams, setSelectedEmployee } = useTopologyStore();
  const [taskInput, setTaskInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [highlightedEmployee, setHighlightedEmployee] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<Record<string, HTMLDivElement>>({});
  
  // 命令编辑对话框状态
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [finalCommand, setFinalCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  // 使用 store 中的员工列表
  const employeeList = employees.length > 0 ? employees : PRESET_EMPLOYEES;
  
  // 董事长ID
  const superadmin = employeeList.find(e => e.type === 'superadmin');

  // 监听选中的员工变化
  useEffect(() => {
    if (selectedEmployee) {
      setHighlightedEmployee(selectedEmployee);
      // 滚动到对应的结果区域
      setTimeout(() => {
        const element = resultRefs.current[selectedEmployee];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedEmployee]);

  // 自动滚动到底部（仅在有新消息时）
  useEffect(() => {
    if (messages.length > 0) {
      // 延迟滚动，确保 DOM 更新完成
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 100);
    }
  }, [messages.length]);

  // 执行任务
  const handleExecuteTask = async () => {
    if (!taskInput.trim() || !superadmin) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: taskInput,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setTaskInput('');
    setIsExecuting(true);
    setHighlightedEmployee(null);
    onTaskExecute(true, undefined);

    try {
      const response = await fetch('http://localhost:5301/api/distribute-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task: userMessage.content,
          startEmployeeId: superadmin.id
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        const systemMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: `任务 "${userMessage.content}" 执行完成`,
          timestamp: new Date().toISOString(),
          result: data.data.result,
        };
        setMessages(prev => [...prev, systemMessage]);
        // 传递结果给父组件
        onTaskExecute(false, data.data.result);
        
        // 提取执行官的命令并显示在对话框中
        const executorResult = findExecutorCommand(data.data.result);
        if (executorResult) {
          // 将原始任务和执行官命令合并显示
          const combinedCommand = `【核心任务】\n${userMessage.content}\n\n【任务要求】\n${executorResult}`;
          setFinalCommand(combinedCommand);
          setCommandResult('');
          setShowCommandDialog(true);
        }
        
        // 记录任务历史
        try {
          await fetch('http://localhost:5301/api/task-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              task: userMessage.content,
              teamId: localStorage.getItem('tw-current-team-id') || 'default',
              teamName: teams.find(t => t.id === localStorage.getItem('tw-current-team-id'))?.name || '默认团队'
            }),
          });
          // 更新任务状态为完成
          const historyRes = await fetch('http://localhost:5301/api/task-history');
          const historyData = await historyRes.json();
          if (historyData.success && historyData.data.items.length > 0) {
            const taskId = historyData.data.items[0].id;
            await fetch(`http://localhost:5301/api/task-history/${taskId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed', result: JSON.stringify(data.data.result).slice(0, 500) }),
            });
          }
        } catch (e) {
          console.error('记录任务历史失败:', e);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsExecuting(false);
      onTaskExecute(false, undefined);
    }
  };

  // 发送到 OpenClaw 执行
  const sendToOpenClaw = async () => {
    if (!finalCommand.trim()) return;

    setIsSendingCommand(true);
    setCommandResult('');

    // 提取核心任务
    const coreTaskMatch = finalCommand.match(/【核心任务】\s*([\s\S]*?)【任务要求】/);
    const coreTask = coreTaskMatch ? coreTaskMatch[1].trim() : finalCommand;

    try {
      // 先保存命令历史（状态为pending）
      const historyRes = await fetch('http://localhost:5301/api/command-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: coreTask,
          command: finalCommand,
          status: 'pending',
          teamId: localStorage.getItem('tw-current-team-id') || 'default',
          teamName: teams.find(t => t.id === localStorage.getItem('tw-current-team-id'))?.name || '默认团队',
        }),
      });
      const historyData = await historyRes.json();
      const commandId = historyData.data?.id;

      // 使用后端代理接口，避免跨域问题
      const response = await fetch('http://localhost:5301/api/openclaw/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: finalCommand,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.output?.[0]?.content || '执行完成（无返回内容）';
        setCommandResult(content);
        
        // 更新命令历史为成功
        if (commandId) {
          await fetch(`http://localhost:5301/api/command-history/${commandId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: content, status: 'success' }),
          });
        }
      } else {
        const errorData = await response.json();
        setCommandResult(`执行失败：${errorData.error?.message || response.statusText}`);
        
        // 更新命令历史为失败
        if (commandId) {
          await fetch(`http://localhost:5301/api/command-history/${commandId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: errorData.error?.message || response.statusText, status: 'failed' }),
          });
        }
      }
    } catch (error: any) {
      setCommandResult(`执行失败：${error.message || '网络错误'}`);
    }

    setIsSendingCommand(false);
  };

  // 渲染任务结果列表
  const renderTaskResults = (result?: TaskResult) => {
    if (!result) return null;

    const flatList = flattenTaskResults(result, 0);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {flatList.map((item, index) => {
          const isHighlighted = highlightedEmployee === item.data.employee.id;
          const isManager = item.data.subResults && item.data.subResults.length > 0;
          
          return (
            <div 
              key={`${item.data.employee.id}-${index}`}
              ref={(el) => { if (el) resultRefs.current[item.data.employee.id] = el; }}
              style={{
                padding: '16px 18px',
                background: isHighlighted 
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)'
                  : (isManager 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(167, 139, 250, 0.08) 100%)'
                    : 'rgba(30, 41, 59, 0.6)'),
                borderRadius: '14px',
                border: `2px solid ${isHighlighted ? '#F59E0B' : (isManager ? '#8B5CF6' : 'rgba(148, 163, 184, 0.2)')}`,
                boxShadow: isHighlighted ? '0 8px 24px rgba(245, 158, 11, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => setSelectedEmployee(item.data.employee.id)}
            >
              {/* 头部：员工信息 + 序号 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#1E293B',
                  border: '2px solid rgba(6, 182, 212, 0.3)',
                }}>
                  {item.data.employee.avatar && item.data.employee.avatar.startsWith('/') ? (
                    <img 
                      src={item.data.employee.avatar} 
                      alt={item.data.employee.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{item.data.employee.avatar}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#F1F5F9' }}>
                    {item.data.employee.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: isManager ? '#A78BFA' : '#94A3B8',
                    background: isManager ? 'rgba(139, 92, 246, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                    padding: '2px 10px',
                    borderRadius: '10px',
                    display: 'inline-block',
                    marginTop: '4px',
                  }}>
                    {item.data.employee.type}
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748B',
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}>
                  #{item.order + 1}
                </div>
                {isManager && (
                  <span style={{ fontSize: '16px' }}>👑</span>
                )}
              </div>
              
              {/* 结果内容 - 完整显示 */}
              <div style={{ 
                fontSize: '13px', 
                color: '#CBD5E1', 
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}>
                {item.data.result}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      width: '420px',
      height: 'calc(100vh - 50px)',
      background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
      borderLeft: '1px solid rgba(6, 182, 212, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
    }}>
      {/* 头部 */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
      }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0 
        }}>
          董事长命令中心
        </h1>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '6px 0 0 0' }}>
          输入任务指令，AI 自动分配执行
        </p>
      </div>

      {/* 对话消息区域 */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '20px',
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 30px',
            color: '#475569' 
          }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px',
              filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))',
              animation: 'float 3s ease-in-out infinite'
            }}>🎯</div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 500, 
              marginBottom: '12px', 
              color: '#E2E8F0' 
            }}>
              欢迎使用任务分发系统
            </div>
            <div style={{ 
              fontSize: '13px', 
              lineHeight: 1.8, 
              color: '#64748B',
              maxWidth: '280px',
              margin: '0 auto'
            }}>
              在下方输入任务，AI 将自动分解并分配给合适的员工执行
            </div>
            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
            `}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.type === 'user' ? (
                  // 用户消息
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '90%',
                      padding: '14px 18px',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                      color: 'white',
                      borderRadius: '18px 18px 6px 18px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  // 系统消息（任务结果列表）
                  <div>
                    <div style={{
                      padding: '14px 18px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      color: '#E2E8F0',
                      borderRadius: '18px 18px 18px 6px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      backdropFilter: 'blur(8px)',
                    }}>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>✅</span>
                      <span>{msg.content}</span>
                    </div>
                    {msg.result && renderTaskResults(msg.result)}
                  </div>
                )}
              </div>
            ))}
            {isExecuting && (
              <div style={{ 
                padding: '18px 20px', 
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(6, 182, 212, 0.3)',
                  borderTopColor: '#06B6D4',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>AI 正在分析任务并分配给员工...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid rgba(6, 182, 212, 0.2)',
        background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
      }}>
        <textarea
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleExecuteTask();
            }
          }}
          placeholder="输入任务指令，按 Enter 发送..."
          rows={3}
          disabled={isExecuting}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '14px',
            fontSize: '14px',
            resize: 'none',
            fontFamily: 'inherit',
            outline: 'none',
            background: 'rgba(30, 41, 59, 0.8)',
            color: '#F1F5F9',
            backdropFilter: 'blur(8px)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#06B6D4';
            e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleExecuteTask}
          disabled={!taskInput.trim() || isExecuting}
          style={{
            width: '100%',
            marginTop: '14px',
            padding: '14px',
            background: isExecuting 
              ? 'rgba(71, 85, 105, 0.5)' 
              : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            boxShadow: isExecuting ? 'none' : '0 4px 16px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {isExecuting ? '执行中...' : '发送任务'}
        </button>
      </div>

      {/* 统计 */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid rgba(6, 182, 212, 0.2)',
        background: 'rgba(15, 23, 42, 0.8)',
        fontSize: '12px',
        color: '#64748B',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span style={{ 
          background: 'rgba(6, 182, 212, 0.1)', 
          padding: '4px 12px', 
          borderRadius: '20px',
          color: '#06B6D4'
        }}>
          员工: {PRESET_EMPLOYEES.length}
        </span>
        <span style={{ 
          background: 'rgba(139, 92, 246, 0.1)', 
          padding: '4px 12px', 
          borderRadius: '20px',
          color: '#8B5CF6'
        }}>
          关系: {edges.length}
        </span>
        <span style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          padding: '4px 12px', 
          borderRadius: '20px',
          color: '#F59E0B'
        }}>
          消息: {messages.length}
        </span>
      </div>

      {/* 命令编辑对话框 */}
      {showCommandDialog && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 400px)',
          maxWidth: '800px',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px' 
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: '#F59E0B',
              margin: 0 
            }}>
              执行命令确认
            </h3>
            <button
              onClick={() => setShowCommandDialog(false)}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: '#94A3B8',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              X
            </button>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>
              执行官整理的执行命令（可编辑）：
            </label>
            <textarea
              value={finalCommand}
              onChange={(e) => setFinalCommand(e.target.value)}
              rows={25}
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#F1F5F9',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'monospace',
                lineHeight: '1.6',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={sendToOpenClaw}
              disabled={isSendingCommand}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: isSendingCommand 
                  ? 'rgba(100, 116, 139, 0.3)' 
                  : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isSendingCommand ? 'not-allowed' : 'pointer',
                boxShadow: isSendingCommand ? 'none' : '0 4px 16px rgba(245, 158, 11, 0.3)',
              }}
            >
              {isSendingCommand ? '执行中...' : '发送到OpenClaw执行'}
            </button>
            <button
              onClick={() => setShowCommandDialog(false)}
              style={{
                padding: '12px 20px',
                background: 'rgba(71, 85, 105, 0.3)',
                color: '#94A3B8',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>

          {/* 执行结果 */}
          {commandResult && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
            }}>
              <div style={{ fontSize: '14px', color: '#10B981', marginBottom: '10px', fontWeight: 600 }}>
                执行结果：
              </div>
              <div style={{ fontSize: '14px', color: '#E2E8F0', whiteSpace: 'pre-wrap', maxHeight: '250px', overflow: 'auto', lineHeight: '1.6' }}>
                {commandResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
