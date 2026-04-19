// ===========================================
// SF Control Room - 角色组件
// ===========================================

import { useState, useEffect, useRef } from 'react';
import type { ActorState } from './types';
import sceneArtJson from '../data/scene-art.manifest.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const artData = sceneArtJson as unknown as any;

interface ModeInfo {
  mode: string;
  path?: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}

interface ActorProps {
  position: { x: number; y: number };
  state: ActorState;
  floorId: string;
}

// 状态对应的动画配置
const getAnimationConfig = (s: ActorState) => {
  const configs: Record<string, { frames: number; fps: number }> = {
    idle: { frames: 6, fps: 6 },
    moving: { frames: 8, fps: 10 },
    working: { frames: 6, fps: 6 },
    error: { frames: 4, fps: 4 },
    resting: { frames: 4, fps: 4 },
  };
  return configs[s] || configs.idle;
};

export default function Actor({ position, state }: ActorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const actorConfig = artData.actor;

  // 动画逻辑
  useEffect(() => {
    const config = getAnimationConfig(state);
    let frame = 0;
    
    const animate = () => {
      frame = (frame + 1) % config.frames;
      setCurrentFrame(frame);
      animationRef.current = window.setTimeout(animate, 1000 / config.fps);
    };

    // 初始延迟
    animationRef.current = window.setTimeout(animate, 1000 / config.fps);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [state]);

  // 获取当前变体
  const variant = actorConfig.variants.find((v: any) => v.id === actorConfig.defaultVariantId);
  
  // 获取当前模式
  const getCurrentMode = () => {
    const modeMap: Record<ActorState, string> = {
      idle: 'idle',
      moving: 'moving',
      working: 'working',
      error: 'error',
      resting: 'idle',
    };
    const modeId = modeMap[state] || 'idle';
    return variant?.modes.find((m: any) => m.mode === modeId);
  };

  const currentMode = getCurrentMode();
  const { frameWidth = 128 } = currentMode || {};

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%)`,
        zIndex: 40,
        pointerEvents: 'none',
        transition: state === 'moving' ? 'none' : 'all 0.3s ease',
      }}
    >
      {/* 阴影 */}
      <div
        style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${actorConfig.shadow.width}px`,
          height: `${actorConfig.shadow.height}px`,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
          opacity: actorConfig.shadow.alpha,
        }}
      />

      {/* 角色精灵 */}
      <div
        style={{
          width: actorConfig.displaySize.width,
          height: actorConfig.displaySize.height,
          backgroundImage: currentMode?.path ? `url(${currentMode.path})` : 'none',
          backgroundSize: 'auto',
          backgroundPosition: `-${currentFrame * frameWidth}px 0`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          filter: state === 'error' ? 'sepia(0.5) hue-rotate(-50deg)' : 'none',
          animation: state === 'working' ? 'work-shake 0.5s ease-in-out infinite' : 'none',
        }}
      />

      {/* 状态指示 */}
      {state === 'resting' && (
        <div
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-16px',
            fontSize: '16px',
            animation: 'bounce 1s ease infinite',
          }}
        >
          💭
        </div>
      )}

      {/* 工作指示 */}
      {state === 'working' && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          ⚡
        </div>
      )}
    </div>
  );
}
