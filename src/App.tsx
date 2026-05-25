import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EmployeeNode from './components/EmployeeNode';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import TeamTopology from './pages/TeamTopology';
import TeamManagement from './pages/TeamManagement';
import MeetingRoom from './pages/MeetingRoom';
import EmployeeManagement from './pages/EmployeeManagement';
import TaskCenter from './pages/TaskCenter';
import Settings from './pages/Settings';

import Floor3DDemo from './control-room/Floor3DDemo';
import FloorFlatDemo from './control-room/FloorFlatDemo';
import { useTopologyStore } from './store';

const nodeTypes = {
  employeeNode: EmployeeNode,
};

interface TaskResult {
  employee: { id: string; name: string; type: string; avatar: string };
  result: string;
  subResults?: TaskResult[];
  // 新格式字段
  nodeResponses?: Array<{
    employee_id: string;
    employee_name: string;
    task_assigned: string;
    response: string;
  }>;
  finalCommand?: string;
  rawJson?: {
    task_analysis: string;
    node_responses: Array<{
      employee_id: string;
      employee_name: string;
      task_assigned: string;
      response: string;
    }>;
    final_command: string;
  };
}

// 收集所有员工的结果
function collectEmployeeResults(result: TaskResult): Record<string, string> {
  const results: Record<string, string> = {};
  
  // 处理新的扁平格式 (nodeResponses)
  if (result.nodeResponses && Array.isArray(result.nodeResponses)) {
    result.nodeResponses.forEach(node => {
      results[node.employee_id] = node.response;
    });
  }
  
  // 处理旧的树状格式 (subResults)
  if (result.subResults) {
    result.subResults.forEach(sub => {
      Object.assign(results, collectEmployeeResults(sub));
    });
  }
  
  // 如果都没有，使用默认结果
  if (Object.keys(results).length === 0) {
    results[result.employee.id] = result.result;
  }
  
  return results;
}

function MainView() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);  // 编辑模式
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);  // 未保存的更改
  
  const { 
    nodes, 
    edges, 
    selectedEmployee,
    currentTeamId,
    teams,
    switchTeam,
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedEmployee,
    loadFromServer,
    saveRelationships,
    clearRelationships,
  } = useTopologyStore();

  // 初始化加载员工和关系数据
  useEffect(() => {
    loadFromServer();
  }, []);

  // 跟踪边的变化，标记为未保存
  useEffect(() => {
    if (isEditMode) {
      setHasUnsavedChanges(true);
    }
  }, [edges, isEditMode]);

  const handleTaskComplete = (result: TaskResult) => {
    const results = collectEmployeeResults(result);
    console.log('[DEBUG] handleTaskComplete called');
    console.log('[DEBUG] result.nodeResponses count:', result.nodeResponses?.length || 0);
    console.log('[DEBUG] collected results keys:', Object.keys(results));
    console.log('[DEBUG] employeeResults:', results);
    setEmployeeResults(prev => ({ ...prev, ...results }));
  };

  const handleTaskExecute = (executing: boolean, result?: TaskResult) => {
    setIsExecuting(executing);
    if (!executing && result) {
      handleTaskComplete(result);
    }
  };

  // 更新节点状态
  const relatedEmployeeIds = new Set<string>();
  edges.forEach(edge => {
    relatedEmployeeIds.add(edge.source);
    relatedEmployeeIds.add(edge.target);
  });
  
  const nodesWithStatus = nodes.map(node => {
    const employee = node.data?.employee as { type: string } | undefined;
    const isSpecial = employee?.type === 'superadmin' || employee?.type === 'executor';
    const isSelected = selectedEmployee === node.id;
    const hasResult = !!employeeResults[node.id];
    
    if (hasResult) {
      console.log('[DEBUG] Node', node.id, 'has result:', employeeResults[node.id]?.substring(0, 30));
    }
    
    return {
      ...node,
      selected: isSelected,
      data: {
        ...node.data,
        isExecuting,
        taskResult: employeeResults[node.id] || undefined,
        isInRelationship: isSpecial || relatedEmployeeIds.has(node.id),
        isSelected,
      },
    };
  });

  const getNodeColor = (type: string, isExec: boolean) => {
    const colors: Record<string, string> = {
      superadmin: '#F59E0B',
      executor: '#DC2626',
      manager: '#7C3AED',
      developer: '#2563EB',
      designer: '#DB2777',
      analyst: '#059669',
      writer: '#D97706',
      support: '#0891B2',
      researcher: '#7C3AED',
      qa: '#DC2626',
      devops: '#4B5563',
      sales: '#EA580C',
    };
    if (isExec) return '#3B82F6';
    return colors[type] || '#6B7280';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {showSidebar && <Sidebar />}
      
      <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            padding: '8px 14px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--accent-border)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--shadow)',
          }}
        >
          {showSidebar ? '隐藏' : '显示'}
        </button>

        {/* 编辑模式按钮 */}
        {!isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            style={{
              position: 'absolute',
              top: '16px',
              left: '86px',
              zIndex: 10,
              padding: '8px 14px',
              background: 'linear-gradient(135deg, var(--accent) 0%, #0891B2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px var(--accent-muted)',
              fontWeight: 500,
            }}
          >
            编辑关系
          </button>
        ) : (
          <>
            <button
              onClick={async () => {
                await saveRelationships();
                setHasUnsavedChanges(false);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                left: '86px',
                zIndex: 10,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--accent-muted)',
                fontWeight: 500,
              }}
            >
              保存
            </button>
            <button
              onClick={() => {
                if (confirm('确定要清空所有关系吗？')) {
                  clearRelationships();
                  setHasUnsavedChanges(true);
                }
              }}
              style={{
                position: 'absolute',
                top: '16px',
                left: '156px',
                zIndex: 10,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, var(--warning) 0%, #D97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--warning-bg)',
                fontWeight: 500,
              }}
            >
              重置
            </button>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('有未保存的更改，确定要退出吗？')) {
                    setIsEditMode(false);
                    setHasUnsavedChanges(false);
                    loadFromServer(); // 重新加载以撤销更改
                  }
                } else {
                  setIsEditMode(false);
                }
              }}
              style={{
                position: 'absolute',
                top: '16px',
                left: '226px',
                zIndex: 10,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, var(--danger) 0%, #DC2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--danger-bg)',
                fontWeight: 500,
              }}
            >
              退出
            </button>
          </>
        )}

        {/* 董事长命令中心显示/隐藏 */}
        <button
          onClick={() => setShowChatPanel(!showChatPanel)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            padding: '8px 14px',
            background: showChatPanel 
              ? 'linear-gradient(135deg, var(--warning) 0%, var(--warning) 100%)'
              : 'var(--bg-card)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--warning)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--shadow)',
            fontWeight: 500,
          }}
        >
          {showChatPanel ? '隐藏' : '显示'}
        </button>

        {currentTeamId ? (
          <ReactFlow
            nodes={nodesWithStatus}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedEmployee(node.id)}
            onPaneClick={() => setSelectedEmployee(null)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            nodesDraggable={isEditMode}
            nodesConnectable={isEditMode}
            style={{ 
              background: `
                linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 100%),
                url('/bg-main.png')
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--accent-muted)" />
            <Controls 
              style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-default)',
                bottom: '80px',
              }} 
            />
            <MiniMap 
              style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-default)',
                bottom: '80px',
              }}
              nodeColor={(node) => {
                const data = node.data as { employee: { type: string }, isExecuting?: boolean };
                return getNodeColor(data?.employee?.type || '', !!data?.isExecuting);
              }}
              maskColor="var(--accent-bg)"
            />
          </ReactFlow>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ 
              fontSize: '80px', 
              marginBottom: '24px',
              filter: 'grayscale(0.5)',
              opacity: 0.6
            }}>👥</div>
            <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-primary)' }}>
              请先选择团队
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              在右上角选择团队，或前往"团队管理"创建新团队
            </div>
          </div>
        )}

        {isExecuting && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            padding: '8px 16px',
            background: '#3B82F6',
            color: 'white',
            borderRadius: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            任务执行中...
          </div>
        )}
      </div>

      {showChatPanel && <ChatPanel onTaskExecute={handleTaskExecute} />}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reloadEmployees, reloadTeams, teams, currentTeamId, switchTeam, setSelectedEmployee } = useTopologyStore();

  const currentPage = location.pathname;

  // 当路由变化时刷新团队数据，但只在没有选中团队时刷新员工
  useEffect(() => {
    reloadTeams();
    if (!currentTeamId) {
      reloadEmployees();
    }
  }, [location.pathname, currentTeamId]);

  // 监听 3D 楼层点击员工，跳转到员工详情
  useEffect(() => {
    const handler = (e: Event) => {
      const { employeeId } = (e as CustomEvent).detail;
      navigate('/employees');
      // 延迟设置选中员工，确保页面已切换
      setTimeout(() => {
        setSelectedEmployee(employeeId);
      }, 100);
    };
    window.addEventListener('navigate-to-employee', handler);
    return () => window.removeEventListener('navigate-to-employee', handler);
  }, [navigate, setSelectedEmployee]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* 顶部导航栏 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'linear-gradient(90deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        zIndex: 100,
        boxShadow: '0 4px 20px var(--shadow)',
      }}>
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            marginRight: '50px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Logo 图标 */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px var(--accent-muted)',
              fontSize: '18px',
            }}>
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: 'var(--text-primary)',
                letterSpacing: '1px',
              }}>
                SoloForce
              </span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 400,
                color: 'var(--text-muted)',
                letterSpacing: '2px',
              }}>
                AI WORKFLOW ORCHESTRATOR
              </span>
            </div>
          </div>
        </div>

        {/* 导航链接 */}
        <NavLink
          active={currentPage === '/'}
          onClick={() => navigate('/')}
        >
          🗺️ 公司地图
        </NavLink>
        <NavLink 
          active={currentPage === '/topology'} 
          onClick={() => navigate('/topology')}
        >
          命令链路
        </NavLink>
        <NavLink 
          active={currentPage === '/meeting'} 
          onClick={() => navigate('/meeting')}
        >
          会议室
        </NavLink>
        <NavLink 
          active={currentPage === '/teams'} 
          onClick={() => navigate('/teams')}
        >
          团队管理
        </NavLink>
        <NavLink 
          active={currentPage === '/employees'} 
          onClick={() => navigate('/employees')}
        >
          员工管理
        </NavLink>
        <NavLink
          active={currentPage === '/tasks'}
          onClick={() => navigate('/tasks')}
        >
          任务中心
        </NavLink>
        
        {/* 主题切换按钮 */}
        <button
          onClick={() => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('sf-theme', newTheme);
            const btn = document.getElementById('theme-toggle');
            if (btn) btn.textContent = newTheme === 'light' ? '🌙' : '☀️';
          }}
          id="theme-toggle"
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ☀️
        </button>

        {/* 设置按钮 */}
        <button
          onClick={() => navigate('/settings')}
          style={{
            marginLeft: '12px',
            padding: '8px 16px',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ⚙️
        </button>
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, height: 'calc(100vh - 56px)', marginTop: '56px', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Floor3DDemo />} />
          <Route path="/flat" element={<FloorFlatDemo />} />
          <Route path="/topology" element={<MainView />} />
          <Route path="/meeting" element={<MeetingRoom />} />
          <Route path="/teams" element={<TeamManagement />} />
          <Route path="/employees" element={<EmployeeManagement />} />
          <Route path="/tasks" element={<TaskCenter />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 18px',
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-muted)' : 'transparent',
        borderRadius: '10px',
        cursor: 'pointer',
        marginRight: '12px',
        transition: 'all 0.2s ease',
        border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
      }}
    >
      {children}
    </div>
  );
}
