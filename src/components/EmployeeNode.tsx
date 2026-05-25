import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import type { Employee } from '../types';
import { EMPLOYEE_TYPE_CONFIG } from '../types';

interface EmployeeNodeData {
  employee?: Employee;
  status?: 'idle' | 'running' | 'completed';
  isExecuting?: boolean;
  taskResult?: string;
  isInRelationship?: boolean;
  isSelected?: boolean;
}

const defaultConfig = { color: 'var(--text-muted)', bgColor: 'var(--bg-card)' };

// 执行动画样式 - 更明显的效果（分开 animation 和 boxShadow）
const executingAnimations = {
  pulse: { animation: 'nodePulse 1s ease-in-out infinite', boxShadow: '0 0 30px var(--accent)' },
  glow: { animation: 'nodeGlow 1.5s ease-in-out infinite', boxShadow: '0 0 40px var(--accent)' },
  shimmer: { animation: 'nodeShimmer 1.5s ease-in-out infinite', boxShadow: '0 0 25px var(--accent)' },
  ring: { animation: 'nodeRing 1s ease-out infinite', boxShadow: '0 0 35px var(--accent)' },
};

function EmployeeNode({ data }: NodeProps) {
  const nodeData = (data || {}) as EmployeeNodeData;
  const employee = nodeData.employee;
  const isExecuting = nodeData.isExecuting;
  const taskResult = nodeData.taskResult;
  const isInRelationship = nodeData.isInRelationship;
  
  // 如果没有 employee 数据，显示占位符
  if (!employee) {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--border-default)',
          borderRadius: '12px',
          padding: '10px',
          minWidth: '130px',
          maxWidth: '150px',
          boxShadow: 'var(--shadow-card)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: 'var(--border-default)', width: '10px', height: '10px' }} />
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>?</div>
        <Handle type="source" position={Position.Bottom} style={{ background: 'var(--border-default)', width: '10px', height: '10px' }} />
      </div>
    );
  }

  const config = EMPLOYEE_TYPE_CONFIG[employee.type] || defaultConfig;
  const isSuperadmin = employee.type === 'superadmin';
  const isExecutor = employee.type === 'executor';

  // 特殊角色始终有颜色（不显示灰色）
  const isSpecial = isSuperadmin || isExecutor;

  // 根据员工ID生成不同的动画
  const getAnimation = (id: string) => {
    const index = parseInt(id.replace(/\D/g, '')) || 0;
    const animKeys = Object.keys(executingAnimations) as Array<keyof typeof executingAnimations>;
    return executingAnimations[animKeys[index % animKeys.length]];
  };

  // 确定边框颜色
  const getBorderColor = () => {
    if (!isInRelationship && !isSpecial) return 'var(--border-default)'; // 灰色边框：未参与关系
    if (isExecuting) return 'var(--accent)';
    if (isSuperadmin) return 'var(--warning)';
    if (isExecutor) return 'var(--danger)'; // 执行官红色
    return config.color;
  };

  // 确定背景
  const getBackground = () => {
    if (isSuperadmin) return 'linear-gradient(135deg, var(--warning-bg-strong) 0%, var(--warning-bg) 100%)';
    if (isExecutor) return 'linear-gradient(135deg, var(--danger-bg-strong) 0%, var(--danger-bg) 100%)';
    if (isExecuting) {
      return isInRelationship 
        ? 'linear-gradient(135deg, var(--accent-muted) 0%, var(--blue-bg) 100%)'
        : 'var(--bg-card)';
    }
    if (!isInRelationship && !isSpecial) return 'var(--bg-card-hover)';
    return 'var(--bg-card)';
  };

  return (
    <div
      style={{
        background: getBackground(),
        border: `2px solid ${getBorderColor()}`,
        borderRadius: '16px',
        padding: '14px',
        minWidth: '140px',
        maxWidth: '160px',
        boxShadow: isExecuting 
          ? `0 0 25px var(--accent-muted), var(--shadow-card)`
          : isSuperadmin 
            ? '0 0 25px var(--warning-bg-strong), var(--shadow-card)'
            : 'var(--shadow-card)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(12px)',
        ...(isExecuting && isInRelationship ? getAnimation(employee.id) : {}),
      }}
    >
      {/* 执行状态指示器 */}
      {isExecuting && isInRelationship && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'white',
          boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)',
        }}>
          ⟳
        </div>
      )}

      {/* 未参与关系的标记 - 特殊角色不显示 */}
      {!isInRelationship && !isSpecial && !isExecuting && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '14px',
          height: '14px',
          background: 'var(--border-default)',
          borderRadius: '50%',
          border: '2px solid var(--bg-secondary)',
        }} />
      )}

      {/* 输入连接点 - superadmin 不显示 */}
      {!isSuperadmin && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ 
            background: isExecuting && isInRelationship ? 'var(--accent)' : (!isInRelationship && !isExecutor ? 'var(--border-default)' : (isExecutor ? 'var(--danger)' : config.color)), 
            width: '12px', 
            height: '12px',
            border: '2px solid var(--bg-primary)'
          }}
        />
      )}

      {/* 节点内容 */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          margin: '0 auto 6px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          border: `2px solid ${config.color}`,
          boxShadow: 'var(--shadow-card)'
        }}>
          {employee.avatar && employee.avatar.startsWith('/') ? (
            <img 
              src={employee.avatar} 
              alt={employee.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: '28px', lineHeight: '52px', filter: 'drop-shadow(0 2px 4px var(--shadow))' }}>
              {employee.avatar}
            </div>
          )}
        </div>
        <div style={{ 
          fontWeight: 600, 
          fontSize: '14px', 
          color: 'var(--text-primary)', 
          marginBottom: '6px',
        }}>
          {employee.name}
        </div>
        <div style={{
          fontSize: '11px',
          color: isSuperadmin ? 'var(--warning)' : (isExecutor ? 'var(--danger)' : (isExecuting && isInRelationship ? 'var(--accent)' : (!isInRelationship ? 'var(--text-muted)' : config.color))),
          background: isSuperadmin ? 'var(--warning-bg-strong)' : (isExecutor ? 'var(--danger-bg-strong)' : (isExecuting && isInRelationship ? 'var(--accent-muted)' : (!isInRelationship ? 'var(--bg-hover)' : 'var(--accent-bg)'))),
          padding: '4px 10px',
          borderRadius: '12px',
          display: 'inline-block',
          border: `1px solid ${isSuperadmin ? 'var(--warning-bg-strong)' : (isExecutor ? 'var(--danger-bg-strong)' : (isExecuting && isInRelationship ? 'var(--accent-border)' : 'var(--border-default)'))}`,
        }}>
          {employee.type}
        </div>
      </div>

      {/* 任务结果展示 */}
      {taskResult && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          borderRadius: '10px',
          maxHeight: '50px',
          overflow: 'hidden',
        }}>
          <div style={{ 
            fontSize: '9px', 
            color: 'var(--success)', 
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            输出
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: 'var(--success)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {taskResult}
          </div>
        </div>
      )}

      {/* 输出连接点 - executor 不显示 */}
      {!isExecutor && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ 
            background: isExecuting && isInRelationship ? 'var(--accent)' : (isSuperadmin ? 'var(--warning)' : (!isInRelationship ? 'var(--border-default)' : config.color)), 
            width: '12px', 
            height: '12px',
            border: '2px solid var(--bg-primary)'
          }}
        />
      )}

      <style>{`
        @keyframes nodePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px var(--accent-muted); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px var(--accent); }
        }
        @keyframes nodeGlow {
          0%, 100% { box-shadow: 0 0 20px var(--accent-muted); }
          50% { box-shadow: 0 0 50px var(--accent), 0 0 80px var(--accent-muted); }
        }
        @keyframes nodeShimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); box-shadow: 0 0 30px var(--accent-muted); }
        }
        @keyframes nodeRing {
          0% { box-shadow: 0 0 20px var(--accent-muted); }
          50% { box-shadow: 0 0 45px var(--accent), 0 0 70px var(--accent-muted); }
          100% { box-shadow: 0 0 20px var(--accent-muted); }
        }
      `}</style>
    </div>
  );
}

export default memo(EmployeeNode);
