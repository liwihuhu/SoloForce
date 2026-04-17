// ===========================================
// SF Control Room - 信息面板组件（简洁线条风）
// ===========================================

import { useState, useEffect } from 'react';
import type { WorkZone, PanelType } from './types';

interface InfoPanelProps {
  workZone: WorkZone;
  panelConfig: PanelType | null;
  data: any;
  onClose: () => void;
  employeeData?: Record<string, any>;
}

export default function InfoPanel({
  workZone,
  panelConfig,
  data,
  onClose,
}: InfoPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const panelColor = panelConfig?.icon ? getColorForIcon(panelConfig.icon) : '#94A3B8';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '360px',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.98)',
        borderLeft: `1px solid ${panelColor}30`,
        backdropFilter: 'blur(20px)',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '24px',
          borderBottom: `1px solid ${panelColor}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 装饰线 */}
          <div
            style={{
              width: '4px',
              height: '32px',
              background: panelColor,
              borderRadius: '2px',
            }}
          />
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#F1F5F9',
              }}
            >
              {panelConfig?.title || workZone.label || '信息'}
            </div>
            {panelConfig?.description && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                  marginTop: '4px',
                }}
              >
                {panelConfig.description}
              </div>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'transparent',
            border: `1px solid ${panelColor}30`,
            color: '#94A3B8',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${panelColor}20`;
            e.currentTarget.style.borderColor = `${panelColor}50`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = `${panelColor}30`;
          }}
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        {/* 员工信息 */}
        {workZone.type === 'employee' && data && (
          <EmployeeInfo data={data} color={panelColor} />
        )}

        {/* 任务统计 */}
        {workZone.panel === 'task_center' && data && (
          <TaskStats data={data} color={panelColor} />
        )}

        {/* 默认内容 */}
        {!data && !workZone.employeeId && (
          <DefaultContent workZone={workZone} color={panelColor} />
        )}

        {/* 面板静态内容 */}
        {panelConfig?.content?.text && (
          <div
            style={{
              fontSize: '13px',
              color: '#94A3B8',
              lineHeight: 1.8,
              fontFamily: 'monospace',
            }}
          >
            {panelConfig.content.text.split('\n').map((line, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {panelConfig?.route && (
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${panelColor}20`,
          }}
        >
          <a
            href={panelConfig.route}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              background: `${panelColor}15`,
              border: `1px solid ${panelColor}40`,
              borderRadius: '8px',
              color: panelColor,
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            打开完整页面 →
          </a>
        </div>
      )}
    </div>
  );
}

// 员工信息组件
function EmployeeInfo({ data, color }: { data: any; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 基本信息卡片 */}
      <div
        style={{
          padding: '16px',
          background: `${color}08`,
          border: `1px solid ${color}20`,
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* 头像占位 */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: `${color}20`,
              border: `2px solid ${color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: color,
            }}
          >
            {data.name?.[0] || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#F1F5F9' }}>
              {data.name}
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
              {data.roleName || data.description}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                padding: '4px 10px',
                background: `${getStatusColor(data.status)}20`,
                borderRadius: '12px',
                fontSize: '11px',
                color: getStatusColor(data.status),
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: getStatusColor(data.status),
                }}
              />
              {data.status === 'idle' ? '空闲' : data.status === 'busy' ? '忙碌' : '离线'}
            </div>
          </div>
        </div>
      </div>

      {/* 技能标签 */}
      {data.expertise && data.expertise.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '10px' }}>
            擅长技能
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.expertise.map((skill: string, i: number) => (
              <span
                key={i}
                style={{
                  padding: '4px 10px',
                  background: `${color}10`,
                  border: `1px solid ${color}30`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: color,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 统计数据 */}
      {data.stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            padding: '12px',
            background: `${color}08`,
            borderRadius: '8px',
          }}
        >
          <StatItem label="完成任务" value={data.stats.tasksCompleted || 0} />
          <StatItem label="效率" value={`${data.stats.efficiency || 0}%`} />
        </div>
      )}
    </div>
  );
}

// 任务统计组件
function TaskStats({ data, color }: { data: any; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        <StatCard label="总数" value={data.total || 0} color={color} />
        <StatCard label="进行中" value={data.running || 0} color="#3B82F6" />
        <StatCard label="已完成" value={data.completed || 0} color="#22C55E" />
        <StatCard label="失败" value={data.failed || 0} color="#EF4444" />
      </div>

      {data.successRate !== undefined && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
            成功率
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(148, 163, 184, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${data.successRate}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color} 0%, #22C55E 100%)`,
                borderRadius: '3px',
              }}
            />
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              marginTop: '4px',
              textAlign: 'right',
            }}
          >
            {data.successRate}%
          </div>
        </div>
      )}
    </div>
  );
}

// 默认内容
function DefaultContent({ workZone, color }: { workZone: WorkZone; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: 0.5,
        }}
      >
        ◇
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#F1F5F9', marginBottom: '8px' }}>
        {workZone.label}
      </div>
      <div style={{ fontSize: '12px', color: '#64748B' }}>
        点击查看详情
      </div>
    </div>
  );
}

// 统计项
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#E2E8F0' }}>
        {value}
      </div>
    </div>
  );
}

// 统计卡片
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '12px 8px',
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

// 状态颜色
function getStatusColor(status?: string): string {
  const colors: Record<string, string> = {
    idle: '#22C55E',
    busy: '#F59E0B',
    offline: '#6B7280',
  };
  return colors[status || 'idle'] || colors.idle;
}

// 图标对应颜色
function getColorForIcon(icon: string): string {
  const colors: Record<string, string> = {
    building: '#94A3B8',
    bulletin: '#F59E0B',
    hr: '#22C55E',
    meeting: '#8B5CF6',
    topology: '#3B82F6',
    task: '#F59E0B',
    comms: '#06B6D4',
    server: '#EC4899',
    edit: '#22C55E',
    tasks: '#3B82F6',
    zap: '#F59E0B',
    target: '#8B5CF6',
    folder: '#84CC16',
    'file-text': '#84CC16',
    lock: '#EC4899',
    archive: '#84CC16',
    power: '#F59E0B',
    monitor: '#06B6D4',
    terminal: '#94A3B8',
    thermometer: '#06B6D4',
    user: '#22C55E',
  };
  return colors[icon] || '#94A3B8';
}
