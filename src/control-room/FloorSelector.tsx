// ===========================================
// SF Control Room - 楼层选择器组件（常显版）
// ===========================================

import { useCallback } from 'react';
import type { Floor } from './types';

// 楼层颜色配置
const FLOOR_COLORS: Record<string, string> = {
  '1f': '#94A3B8',
  '2f': '#22C55E',
  '3f': '#3B82F6',
  '4f': '#F59E0B',
  '5f': '#84CC16',
  '6f': '#EC4899',
};

export default function FloorSelector({
  currentFloor,
  floors,
  onFloorChange,
}: FloorSelectorProps) {
  const currentColor = FLOOR_COLORS[currentFloor] || '#94A3B8';

  const handleFloorSelect = useCallback((floorId: string) => {
    onFloorChange(floorId);
  }, [onFloorChange]);

  const sortedFloors = [...floors].sort((a, b) => a.floorIndex - b.floorIndex);

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${currentColor}30`,
        borderRadius: '12px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          fontSize: '10px',
          color: '#64748B',
          fontFamily: 'monospace',
          textAlign: 'center',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}
      >
        ◇ FLOOR ◇
      </div>

      {/* 楼层按钮列表 */}
      {sortedFloors.map((floor) => {
        const isActive = floor.id === currentFloor;
        const floorColor = FLOOR_COLORS[floor.id] || '#94A3B8';

        return (
          <button
            key={floor.id}
            onClick={() => handleFloorSelect(floor.id)}
            style={{
              width: '48px',
              height: '48px',
              background: isActive
                ? `linear-gradient(135deg, ${floorColor} 0%, ${floorColor}80 100%)`
                : 'rgba(148, 163, 184, 0.05)',
              border: isActive
                ? `2px solid ${floorColor}`
                : '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.2s ease',
              boxShadow: isActive
                ? `0 0 20px ${floorColor}40, 0 4px 12px rgba(0,0,0,0.3)`
                : 'none',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = `${floorColor}15`;
                e.currentTarget.style.borderColor = `${floorColor}40`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              }
            }}
          >
            {/* 楼层号 */}
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: isActive ? 'white' : floorColor,
                fontFamily: 'monospace',
              }}
            >
              {floor.floorIndex}F
            </div>

            {/* 中文功能名 */}
            <div
              style={{
                fontSize: '8px',
                color: isActive ? 'rgba(255,255,255,0.8)' : '#64748B',
                fontFamily: 'monospace',
                maxWidth: '44px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {floor.label.replace(/\d+F\s*/, '').split(' ')[0] || floor.label}
            </div>
          </button>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px var(--color) 40%; }
          50% { box-shadow: 0 0 30px var(--color) 60%; }
        }
      `}</style>
    </div>
  );
}

interface FloorSelectorProps {
  currentFloor: string;
  floors: Floor[];
  onFloorChange: (floorId: string) => void;
}
