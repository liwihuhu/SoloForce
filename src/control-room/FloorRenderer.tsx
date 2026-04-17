// ===========================================
// SF Control Room - 楼层渲染组件（精致数字孪生风格）
// ===========================================

import { useState, useEffect } from 'react';

interface FloorRendererProps {
  floorId: string;
}

// 楼层配置
const FLOOR_CONFIG: Record<string, {
  label: string;
  color: string;
  texture: string;
}> = {
  '1f': { label: '1F 大厅',      color: '#94A3B8', texture: '/textures/floors/1f-lobby.png' },
  '2f': { label: '2F 人事部',    color: '#22C55E', texture: '/textures/floors/2f-hr.png' },
  '3f': { label: '3F 运营部',    color: '#3B82F6', texture: '/textures/floors/3f-ops.png' },
  '4f': { label: '4F 指挥中心',  color: '#F59E0B', texture: '/textures/floors/4f-command.png' },
  '5f': { label: '5F 档案中心',  color: '#84CC16', texture: '/textures/floors/5f-archive.png' },
  '6f': { label: '6F 服务器机房', color: '#EC4899', texture: '/textures/floors/6f-server.png' },
};

// 楼层数据
const FLOORS = [
  { id: '6f', label: '6F', color: '#EC4899' },
  { id: '5f', label: '5F', color: '#84CC16' },
  { id: '4f', label: '4F', color: '#F59E0B' },
  { id: '3f', label: '3F', color: '#3B82F6' },
  { id: '2f', label: '2F', color: '#22C55E' },
  { id: '1f', label: '1F', color: '#94A3B8' },
];

export default function FloorRenderer({ floorId }: FloorRendererProps) {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [floorId]);

  const config = FLOOR_CONFIG[floorId] || FLOOR_CONFIG['1f'];
  const currentIndex = FLOORS.findIndex(f => f.id === floorId);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0a0a14 60%, #050508 100%)',
      overflow: 'hidden',
    }}>
      {/* 背景网格 - 淡淡的透视网格 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: 'perspective(500px) rotateX(30deg) scale(2)',
        transformOrigin: 'center 30%',
      }} />

      {/* 建筑主体 */}
      <div
        key={animationKey}
        style={{
          position: 'absolute',
          left: '50%',
          top: '45%',
          transform: 'translate(-50%, -50%)',
          animation: 'fadeScaleIn 0.8s ease-out',
        }}
      >
        <svg
          width="900"
          height="500"
          viewBox="-50 -30 900 500"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* 发光滤镜 */}
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* 柔和高光 */}
            <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* 楼层面板 */}
          {FLOORS.map((floor, index) => {
            const isActive = floor.id === floorId;
            const isPast = index > currentIndex;
            const isFuture = index < currentIndex;
            const y = index * 55;
            const opacity = isActive ? 1 : isPast ? 0.3 : 0.15;
            const cfg = FLOOR_CONFIG[floor.id];

            return (
              <g key={floor.id} style={{
                animation: `floorAppear 0.5s ease-out ${index * 0.06}s both`,
              }}>
                {/* 贴图底色层 */}
                <rect
                  x="0"
                  y={y}
                  width="800"
                  height="50"
                  rx="3"
                  fill={isActive ? '#0a0a1a' : floor.color}
                  fillOpacity={isActive ? 0.55 : 0.06}
                  stroke={floor.color}
                  strokeWidth={isActive ? 2 : 1}
                  strokeOpacity={opacity}
                />

                {/* 贴图图案（仅当前层全显） */}
                {isActive && (
                  <image
                    href={cfg.texture}
                    x="2"
                    y={y + 2}
                    width="796"
                    height="46"
                    preserveAspectRatio="xMidYMid slice"
                    opacity="0.35"
                    clipPath="url(#floorClip)"
                  />
                )}

                {/* 高光层 */}
                <rect
                  x="0"
                  y={y}
                  width="800"
                  height="25"
                  rx="3"
                  fill="url(#highlight)"
                  opacity={isActive ? 0.5 : 0.2}
                />

                {/* 内部结构线 */}
                {isActive && (
                  <g stroke={floor.color} strokeWidth="0.5" strokeOpacity="0.3">
                    <line x1="200" y1={y + 8} x2="200" y2={y + 42}/>
                    <line x1="400" y1={y + 8} x2="400" y2={y + 42}/>
                    <line x1="600" y1={y + 8} x2="600" y2={y + 42}/>
                    <line x1="10" y1={y + 25} x2="190" y2={y + 25} strokeDasharray="4,4"/>
                    <line x1="210" y1={y + 25} x2="390" y2={y + 25} strokeDasharray="4,4"/>
                    <line x1="410" y1={y + 25} x2="590" y2={y + 25} strokeDasharray="4,4"/>
                    <line x1="610" y1={y + 25} x2="790" y2={y + 25} strokeDasharray="4,4"/>
                  </g>
                )}

                {/* 楼层标签 */}
                <text
                  x="400"
                  y={y + 30}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isActive ? "16" : "12"}
                  fontFamily="'SF Mono', 'Fira Code', monospace"
                  fontWeight={isActive ? "600" : "400"}
                  opacity={isActive ? 1 : 0.5}
                >
                  {floor.label}
                </text>

                {/* 当前楼层高亮边框 */}
                {isActive && (
                  <rect
                    x="-2"
                    y={y - 2}
                    width="804"
                    height="54"
                    rx="5"
                    fill="none"
                    stroke={floor.color}
                    strokeWidth="2"
                    opacity="0.6"
                    filter="url(#glow)"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.6;0.9;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* 状态指示灯 */}
                <circle
                  cx="770"
                  cy={y + 25}
                  r="4"
                  fill={isActive ? '#22C55E' : '#374151'}
                  opacity={isActive ? 1 : 0.3}
                >
                  {isActive && (
                    <animate
                      attributeName="opacity"
                      values="1;0.4;1"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              </g>
            );
          })}

          {/* 裁剪路径 */}
          <defs>
            <clipPath id="floorClip">
              <rect x="0" y="0" width="800" height="50" rx="3"/>
            </clipPath>
          </defs>

          {/* 地面投影 */}
          <ellipse
            cx="400"
            cy="360"
            rx="380"
            ry="25"
            fill={config.color}
            opacity="0.08"
          />

          {/* 标题 */}
          <text
            x="400"
            y="400"
            textAnchor="middle"
            fill={config.color}
            fontSize="11"
            fontFamily="'SF Mono', 'Fira Code', monospace"
            opacity="0.4"
            letterSpacing="4"
          >
            SOLOFORCE · DIGITAL TWIN SYSTEM
          </text>
        </svg>
      </div>

      {/* 左侧楼层指示器 */}
      <div style={{
        position: 'absolute',
        left: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 12px',
        background: 'rgba(10, 10, 20, 0.8)',
        border: `1px solid ${config.color}30`,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}>
        {FLOORS.slice().reverse().map((floor) => {
          const isActive = floor.id === floorId;
          return (
            <div
              key={floor.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* 状态灯 */}
              <div
                style={{
                  width: isActive ? '10px' : '6px',
                  height: isActive ? '10px' : '6px',
                  borderRadius: '50%',
                  background: isActive ? floor.color : `${floor.color}40`,
                  boxShadow: isActive ? `0 0 12px ${floor.color}` : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {/* 楼层名 */}
              <span style={{
                fontSize: isActive ? '13px' : '11px',
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: isActive ? floor.color : '#64748B',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.3s ease',
              }}>
                {floor.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 右下角装饰 */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        padding: '12px 16px',
        background: 'rgba(10, 10, 20, 0.8)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '10px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: '10px',
          color: '#64748B',
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          marginBottom: '4px',
          letterSpacing: '2px',
        }}>
          STATUS
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 8px #22C55E',
          }}/>
          <span style={{
            fontSize: '12px',
            color: '#22C55E',
            fontFamily: "'SF Mono', 'Fira Code', monospace",
          }}>
            ONLINE
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes floorAppear {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
