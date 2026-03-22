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

const defaultConfig = { color: '#64748B', bgColor: 'rgba(30, 41, 59, 0.8)' };

// 执行动画样式 - 更明显的效果
const executingAnimations = {
  pulse: `animation: nodePulse 1s ease-in-out infinite; box-shadow: 0 0 30px rgba(6, 182, 212, 0.6);`,
  glow: `animation: nodeGlow 1.5s ease-in-out infinite; box-shadow: 0 0 40px rgba(6, 182, 212, 0.8);`,
  shimmer: `animation: nodeShimmer 1.5s ease-in-out infinite; box-shadow: 0 0 25px rgba(6, 182, 212, 0.5);`,
  ring: `animation: nodeRing 1s ease-out infinite; box-shadow: 0 0 35px rgba(6, 182, 212, 0.7);`,
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
          background: 'rgba(30, 41, 59, 0.9)',
          border: '2px solid #475569',
          borderRadius: '12px',
          padding: '10px',
          minWidth: '130px',
          maxWidth: '150px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: '#475569', width: '10px', height: '10px' }} />
        <div style={{ textAlign: 'center', color: '#64748B' }}>?</div>
        <Handle type="source" position={Position.Bottom} style={{ background: '#475569', width: '10px', height: '10px' }} />
      </div>
    );
  }

  const config = EMPLOYEE_TYPE_CONFIG[employee.type] || defaultConfig;
  const isSuperadmin = employee.type === 'superadmin';
  const isExecutor = employee.type === 'executor';

  // 特殊角色始终有颜色（不显示灰色）
  const isSpecial = isSuperadmin || isExecutor;

  // 根据员工ID生成不同的动画
  const getAnimation = (id: string): string => {
    const index = parseInt(id.replace(/\D/g, '')) || 0;
    const animKeys = Object.keys(executingAnimations) as Array<keyof typeof executingAnimations>;
    return executingAnimations[animKeys[index % animKeys.length]];
  };

  // 确定边框颜色
  const getBorderColor = () => {
    if (!isInRelationship && !isSpecial) return '#475569'; // 灰色边框：未参与关系
    if (isExecuting) return '#06B6D4';
    if (isSuperadmin) return '#F59E0B';
    if (isExecutor) return '#EF4444'; // 执行官红色
    return config.color;
  };

  // 确定背景
  const getBackground = () => {
    if (isSuperadmin) return 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(253, 230, 138, 0.1) 100%)';
    if (isExecutor) return 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(254, 202, 202, 0.1) 100%)';
    if (isExecuting) {
      return isInRelationship 
        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)'
        : 'rgba(30, 41, 59, 0.8)';
    }
    if (!isInRelationship && !isSpecial) return 'rgba(30, 41, 59, 0.6)';
    return 'rgba(30, 41, 59, 0.9)';
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
          ? `0 0 25px rgba(6, 182, 212, 0.4), 0 8px 32px rgba(0, 0, 0, 0.4)`
          : isSuperadmin 
            ? '0 0 25px rgba(245, 158, 11, 0.3), 0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(12px)',
        ...(isExecuting && isInRelationship ? { 
          animation: getAnimation(employee.id),
        } : {}),
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
          background: '#475569',
          borderRadius: '50%',
          border: '2px solid #1E293B',
        }} />
      )}

      {/* 输入连接点 - superadmin 不显示 */}
      {!isSuperadmin && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ 
            background: isExecuting && isInRelationship ? '#06B6D4' : (!isInRelationship && !isExecutor ? '#475569' : (isExecutor ? '#EF4444' : config.color)), 
            width: '12px', 
            height: '12px',
            border: '2px solid #0F172A'
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
          background: '#1E293B',
          border: `2px solid ${config.color}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {employee.avatar && employee.avatar.startsWith('/') ? (
            <img 
              src={employee.avatar} 
              alt={employee.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: '28px', lineHeight: '52px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
              {employee.avatar}
            </div>
          )}
        </div>
        <div style={{ 
          fontWeight: 600, 
          fontSize: '14px', 
          color: '#F1F5F9', 
          marginBottom: '6px',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          {employee.name}
        </div>
        <div style={{
          fontSize: '11px',
          color: isSuperadmin ? '#FBBF24' : (isExecutor ? '#F87171' : (isExecuting && isInRelationship ? '#22D3EE' : (!isInRelationship ? '#64748B' : config.color))),
          background: isSuperadmin ? 'rgba(245, 158, 11, 0.2)' : (isExecutor ? 'rgba(239, 68, 68, 0.2)' : (isExecuting && isInRelationship ? 'rgba(6, 182, 212, 0.2)' : (!isInRelationship ? 'rgba(71, 85, 105, 0.5)' : 'rgba(6, 182, 212, 0.1)'))),
          padding: '4px 10px',
          borderRadius: '12px',
          display: 'inline-block',
          border: `1px solid ${isSuperadmin ? 'rgba(245, 158, 11, 0.3)' : (isExecutor ? 'rgba(239, 68, 68, 0.3)' : (isExecuting && isInRelationship ? 'rgba(6, 182, 212, 0.3)' : 'rgba(71, 85, 105, 0.3)'))}`,
        }}>
          {employee.type}
        </div>
      </div>

      {/* 任务结果展示 */}
      {taskResult && (isInRelationship || isExecutor) && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          maxHeight: '50px',
          overflow: 'hidden',
        }}>
          <div style={{ 
            fontSize: '9px', 
            color: '#34D399', 
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            输出
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#6EE7B7',
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
            background: isExecuting && isInRelationship ? '#06B6D4' : (isSuperadmin ? '#F59E0B' : (!isInRelationship ? '#475569' : config.color)), 
            width: '12px', 
            height: '12px',
            border: '2px solid #0F172A'
          }}
        />
      )}

      <style>{`
        @keyframes nodePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(6, 182, 212, 0.6); }
        }
        @keyframes nodeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 50px rgba(6, 182, 212, 0.8), 0 0 80px rgba(6, 182, 212, 0.4); }
        }
        @keyframes nodeShimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); box-shadow: 0 0 30px rgba(6, 182, 212, 0.5); }
        }
        @keyframes nodeRing {
          0% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 45px rgba(6, 182, 212, 0.7), 0 0 70px rgba(6, 182, 212, 0.3); }
          100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
        }
      `}</style>
    </div>
  );
}

export default memo(EmployeeNode);
