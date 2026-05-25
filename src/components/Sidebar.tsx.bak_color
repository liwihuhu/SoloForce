import { useTopologyStore } from '../store';
import { EMPLOYEE_TYPE_CONFIG, DEFAULT_EMPLOYEES } from '../types';

// 页面导航配置
const NAV_ITEMS = [
  { path: '/topology', label: '拓扑图', icon: '/icon-network.png' },
  { path: '/employees', label: '员工管理', icon: '/icon-team.png' },
  { path: '/teams', label: '团队管理', icon: '/icon-team.png' },
  { path: '/tasks', label: '任务中心', icon: '/icon-task.png' },
];

export default function Sidebar() {
  const { edges, selectedEmployee, employees, teams, currentTeamId, switchTeam, setSelectedEmployee, getSubordinates, getManager } = useTopologyStore();

  // 使用 store 中的员工列表，如果没有则用默认列表
  const employeeList = employees.length > 0 ? employees : DEFAULT_EMPLOYEES;

  // 获取员工信息
  const getEmployee = (id: string) => employeeList.find(e => e.id === id);

  // 当前选中的员工
  const selected = selectedEmployee ? getEmployee(selectedEmployee) : null;
  const manager = selectedEmployee ? getManager(selectedEmployee) : null;
  const subordinates = selectedEmployee ? getSubordinates(selectedEmployee) : [];

  return (
    <div style={{
      width: '300px',
      height: 'calc(100vh - 50px)',
      background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
      borderRight: '1px solid rgba(6, 182, 212, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
    }}>
      {/* 头部 */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1 }}>
          {/* 团队选择器 */}
          <select
            value={currentTeamId || ''}
            onChange={(e) => {
              const team = teams.find(t => t.id === e.target.value);
              if (team) {
                switchTeam(team);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              color: '#F1F5F9',
              cursor: 'pointer',
              outline: 'none',
              marginBottom: '8px',
            }}
          >
            <option value="" style={{ background: '#1E293B' }}>选择团队...</option>
            {teams.map(team => (
              <option key={team.id} value={team.id} style={{ background: '#1E293B' }}>
                {team.name}
              </option>
            ))}
          </select>
          
          <h1 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            员工列表
          </h1>
          <p style={{ 
            fontSize: '11px', 
            color: '#64748B', 
            margin: '4px 0 0 0' 
          }}>
            点击查看详情
          </p>
        </div>
        {/* 董事长隐藏按钮（仅董事长可见） */}
        {selectedEmployee === 'emp-0' && (
          <button
            onClick={() => {
              if (confirm('确定要隐藏董事长吗？（从列表中移除）')) {
                setSelectedEmployee(null);
              }
            }}
            style={{
              padding: '4px 10px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            隐藏
          </button>
        )}
      </div>

      {/* 操作按钮已移除，请使用顶部编辑模式 */}

      {/* 员工列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        <h3 style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748B',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          📋 员工列表
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {employeeList.map(emp => {
            const isSelected = selectedEmployee === emp.id;
            const config = EMPLOYEE_TYPE_CONFIG[emp.type];
            const hasSubordinates = edges.some(e => e.source === emp.id);
            const hasManager = edges.some(e => e.target === emp.id);

            return (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployee(isSelected ? null : emp.id)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
                    : 'rgba(30, 41, 59, 0.5)',
                  border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.4)' : 'transparent'}`,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {emp.avatar && emp.avatar.startsWith('/') ? (
                    <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '20px' }}>{emp.avatar}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#F1F5F9',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {emp.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: config.color,
                    background: `${config.color}20`,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    display: 'inline-block',
                    marginTop: '4px',
                  }}>
                    {emp.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {hasManager && (
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>⬆️</span>
                  )}
                  {hasSubordinates && (
                    <span style={{ 
                      fontSize: '11px', 
                      background: 'rgba(6, 182, 212, 0.2)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      color: '#06B6D4'
                    }}>
                      {edges.filter(e => e.source === emp.id).length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中员工详情 */}
      {selected && (
        <div style={{
          borderTop: '1px solid rgba(6, 182, 212, 0.2)',
          padding: '20px',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          maxHeight: '45%',
          overflowY: 'auto',
        }}>
          <h3 style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748B',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            ✨ 选中员工详情
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#1E293B',
              border: '2px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              {selected.avatar && selected.avatar.startsWith('/') ? (
                <img src={selected.avatar} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{selected.avatar}</div>
              )}
            </div>
            <div>
              <div style={{ 
                fontWeight: 600, 
                color: '#F1F5F9',
                fontSize: '18px'
              }}>
                {selected.name}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: EMPLOYEE_TYPE_CONFIG[selected.type].color,
                background: `${EMPLOYEE_TYPE_CONFIG[selected.type].color}20`,
                padding: '4px 12px',
                borderRadius: '20px',
                display: 'inline-block',
                marginTop: '6px',
                border: `1px solid ${EMPLOYEE_TYPE_CONFIG[selected.type].color}30`,
              }}>
                {selected.type}
              </div>
            </div>
          </div>

          <p style={{
            fontSize: '13px',
            color: '#94A3B8',
            marginBottom: '20px',
            lineHeight: 1.6,
          }}>
            {selected.description}
          </p>

          {/* 关系信息 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 上级 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '10px',
              border: '1px solid rgba(6, 182, 212, 0.1)',
            }}>
              <span style={{ color: '#64748B' }}>⬆️ 上级:</span>
              {manager ? (
                <span style={{ 
                  color: '#06B6D4', 
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '2px 10px',
                  borderRadius: '6px',
                }}
                onClick={() => setSelectedEmployee(manager)}
                >
                  {getEmployee(manager)?.name}
                </span>
              ) : (
                <span style={{ color: '#475569' }}>（无）</span>
              )}
            </div>

            {/* 下属 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '10px',
              border: '1px solid rgba(6, 182, 212, 0.1)',
            }}>
              <span style={{ color: '#64748B', minWidth: '45px' }}>⬇️ 下属:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subordinates.length > 0 ? (
                  subordinates.map(subId => (
                    <span 
                      key={subId}
                      style={{ 
                        color: '#06B6D4', 
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: 'rgba(6, 182, 212, 0.1)',
                        padding: '2px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      onClick={() => setSelectedEmployee(subId)}
                    >
                      {getEmployee(subId)?.name}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#475569' }}>（无）</span>
                )}
              </div>
            </div>

            {/* 角色判定 */}
            <div style={{
              marginTop: '4px',
              padding: '12px 16px',
              background: subordinates.length > 0 
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
                : 'rgba(30, 41, 59, 0.6)',
              borderRadius: '12px',
              fontSize: '12px',
              border: `1px solid ${subordinates.length > 0 ? 'rgba(6, 182, 212, 0.2)' : 'rgba(148, 163, 184, 0.1)'}`,
            }}>
              {subordinates.length > 0 ? (
                <span style={{ color: '#06B6D4', fontWeight: 500 }}>
                  🔹 管理者（有 {subordinates.length} 名下属）
                </span>
              ) : (
                <span style={{ color: '#64748B' }}>
                  🔸 执行者（无下属）
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 统计 */}
      <div style={{
        padding: '14px 20px',
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
          👥 员工: {employeeList.length}
        </span>
        <span style={{ 
          background: 'rgba(139, 92, 246, 0.1)', 
          padding: '4px 12px', 
          borderRadius: '20px',
          color: '#8B5CF6'
        }}>
          关系: {edges.length}
        </span>
      </div>
    </div>
  );
}
