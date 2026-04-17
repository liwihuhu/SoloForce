// ===========================================
// SF Control Room - 工作区标记组件（建筑标注风格）
// ===========================================

import { useState } from 'react';
import type { WorkZone, WorkZoneType } from './types';

interface WorkZoneMarkerProps {
  workZone: WorkZone;
  floorId?: string;
  employeeData?: any;
  isSelected: boolean;
  onClick: () => void;
}

// 获取工作区类型配置
const getWorkZoneConfig = (type: WorkZoneType): { marker: string; color: string } => {
  const configs: Record<WorkZoneType, { marker: string; color: string }> = {
    info: { marker: '○', color: '#94A3B8' },
    navigation: { marker: '◇', color: '#8B5CF6' },
    employee: { marker: '●', color: '#22C55E' },
    task: { marker: '□', color: '#F59E0B' },
    topology: { marker: '◈', color: '#3B82F6' },
    document: { marker: '▢', color: '#84CC16' },
    system: { marker: '◉', color: '#EC4899' },
  };
  return configs[type] || configs.info;
};

export default function WorkZoneMarker({
  workZone,
  employeeData,
  isSelected,
  onClick,
}: WorkZoneMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = getWorkZoneConfig(workZone.type);

  return (
    <div
      style={{
        position: 'absolute',
        left: workZone.anchor.x,
        top: workZone.anchor.y,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : 20,
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 主标记 */}
      <div
        style={{
          width: isSelected || isHovered ? 36 : 32,
          height: isSelected || isHovered ? 36 : 32,
          borderRadius: '50%',
          background: isSelected
            ? `${config.color}40`
            : 'rgba(15, 23, 42, 0.9)',
          border: `2px ${isSelected ? 'solid' : 'dashed'} ${config.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isSelected || isHovered ? 16 : 14,
          color: config.color,
          transition: 'all 0.2s ease',
          boxShadow: isSelected
            ? `0 0 15px ${config.color}50, 0 0 30px ${config.color}20`
            : 'none',
        }}
      >
        {workZone.type === 'employee' && employeeData ? (
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            {employeeData.name?.[0] || 'E'}
          </span>
        ) : (
          <span>{config.marker}</span>
        )}
      </div>

      {/* 标签 */}
      {(isHovered || isSelected) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.98)',
            border: `1px solid ${config.color}40`,
            borderRadius: '6px',
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: config.color,
              textAlign: 'center',
            }}
          >
            {workZone.label}
          </div>
          {employeeData && (
            <div
              style={{
                fontSize: '10px',
                color: '#94A3B8',
                marginTop: '2px',
                textAlign: 'center',
              }}
            >
              {employeeData.name}
            </div>
          )}
        </div>
      )}

      {/* 选中动画 */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            width: 48,
            height: 48,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1px solid ${config.color}`,
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            opacity: 0,
          }}
        />
      )}
    </div>
  );
}
