import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5301';

interface TaskHistory {
  id: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  teamId?: string;
  teamName?: string;
  result?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface Statistics {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  successRate: number;
  teamStats: Record<string, { total: number; completed: number; failed: number }>;
  dateStats: Record<string, { completed: number; failed: number }>;
  employeeCount: number;
  teamCount: number;
}

export default function TaskCenter() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [tasks, setTasks] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/task-history/statistics`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/task-history?pageSize=50`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.items);
      }
    } catch (error) {
      console.error('加载任务历史失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    fetchTasks();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      case 'running': return '#3B82F6';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'running': return '进行中';
      case 'pending': return '等待中';
      default: return '未知';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}分钟`;
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  };

  const statCardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto', background: 'var(--bg-primary)' }}>
      {/* 核心指标卡片 */}
      {stats && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px',
          }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>员工数量</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>{stats.employeeCount}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>团队数量</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>{stats.teamCount}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>任务总数</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>{stats.total}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>成功率</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--success)' }}>{stats.successRate}%</div>
            </div>
          </div>

          {/* 任务状态分布 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '16px',
            marginTop: '16px'
          }}>
            <div style={{ ...statCardStyle, borderLeft: '3px solid #10B981' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--success)' }}>{stats.completed}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>已完成</div>
            </div>
            <div style={{ ...statCardStyle, borderLeft: '3px solid #EF4444' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--danger)' }}>{stats.failed}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>失败</div>
            </div>
            <div style={{ ...statCardStyle, borderLeft: '3px solid #3B82F6' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--blue)' }}>{stats.running}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>进行中</div>
            </div>
            <div style={{ ...statCardStyle, borderLeft: '3px solid #F59E0B' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--warning)' }}>{stats.pending}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>等待中</div>
            </div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* 团队任务分布 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>团队任务分布</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats.teamStats).slice(0, 5).map(([team, data]) => {
                const successRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                return (
                  <div key={team} style={{ 
                    background: 'var(--bg-primary)', 
                    borderRadius: '8px', 
                    padding: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{team}</span>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{data.total} 任务</span>
                    </div>
                    <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${successRate}%`,
                        background: '#3B82F6',
                        borderRadius: '3px',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--success)' }}>完成 {data.completed}</span>
                      <span style={{ color: 'var(--danger)' }}>失败 {data.failed}</span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.teamStats).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  暂无数据
                </div>
              )}
            </div>
          </div>

          {/* 最近7天趋势 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>最近7天趋势</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
              {Object.entries(stats.dateStats).map(([date, data]) => {
                const total = data.completed + data.failed;
                const max = Math.max(...Object.values(stats.dateStats).map(d => d.completed + d.failed), 1);
                const completedHeight = max > 0 ? (data.completed / max) * 100 : 0;
                const failedHeight = max > 0 ? (data.failed / max) * 100 : 0;
                return (
                  <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '2px' }}>
                      {failedHeight > 0 && (
                        <div style={{ width: '100%', height: `${failedHeight}%`, background: '#EF4444', borderRadius: '2px', minHeight: '2px' }} />
                      )}
                      {completedHeight > 0 ? (
                        <div style={{ width: '100%', height: `${completedHeight}%`, background: '#3B82F6', borderRadius: '2px', minHeight: '2px' }} />
                      ) : total === 0 ? (
                        <div style={{ width: '100%', height: '2px', background: '#334155', borderRadius: '2px' }} />
                      ) : null}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{date.slice(5)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>完成</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>失败</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 任务历史 */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>任务历史</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', ...cardStyle }}>
            暂无任务记录
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>任务</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>团队</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>状态</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>耗时</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.id} style={{ 
                    borderTop: '1px solid #334155',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg-primary)',
                  }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.task}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {task.teamName || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: getStatusColor(task.status) + '20',
                        color: getStatusColor(task.status),
                      }}>
                        {getStatusText(task.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatDuration(task.duration)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatTime(task.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
