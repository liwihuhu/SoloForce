/**
 * FloorFlatDemo — 楼层平铺总览
 * 6层横向平铺，每层彩色地板+名称，透视俯视
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────
const FLOORS = [
  { id: '1f', label: '1F 大厅',     color: '#1a3a5f', emissive: '#1a6090' },
  { id: '2f', label: '2F 人事部',    color: '#1e4d3b', emissive: '#1e7d5b' },
  { id: '3f', label: '3F 项目组',    color: '#3b1e5d', emissive: '#6b3e8d' },
  { id: '4f', label: '4F 任务大厅',  color: '#4a2d1a', emissive: '#8a5d4a' },
  { id: '5f', label: '5F 档案中心',  color: '#1a3d5c', emissive: '#2a6d8c' },
  { id: '6f', label: '6F OpenClaw', color: '#2d1a4a', emissive: '#5d4a7a' },
];

// 每个楼层的 X,Z 位置（紧凑布局，相邻地板间距10）
const FLOOR_XZ: Record<string, [number, number]> = {
  '1f': [  0,  25],  // 1F 大厅
  '2f': [ 30,   0],  // 2F 人事部
  '3f': [-30,   0],  // 3F 项目组
  '4f': [  0,   0],  // 4F 任务大厅
  '5f': [  0, -55],  // 5F 档案中心
  '6f': [  0, -25],  // 6F OpenClaw
};

// ─────────────────────────────────────────────────────────────────
// Zone 组件
// ─────────────────────────────────────────────────────────────────
function FloorPlane({ color, emissive, label }: { color: string; emissive: string; label: string }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.3}
          emissive={emissive}
          emissiveIntensity={0.25}
        />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={1.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}

function ZoneLobby()   { const f = FLOORS[0]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }
function ZoneHR()      { const f = FLOORS[1]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }
function ZoneProject() { const f = FLOORS[2]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }
function ZoneCommand()  { const f = FLOORS[3]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }
function ZoneArchive() { const f = FLOORS[4]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }
function ZoneCore()    { const f = FLOORS[5]; return <FloorPlane color={f.color} emissive={f.emissive} label={f.label} />; }

// ─────────────────────────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[55, 80, 0]} intensity={1.2} color="#d8e8f8" />
      <pointLight position={[55, 50, 0]} intensity={2} color="#ffffff" distance={600} />

      <group position={[FLOOR_XZ['1f'][0], 0, FLOOR_XZ['1f'][1]]}><ZoneLobby /></group>
      <group position={[FLOOR_XZ['2f'][0], 0, FLOOR_XZ['2f'][1]]}><ZoneHR /></group>
      <group position={[FLOOR_XZ['3f'][0], 0, FLOOR_XZ['3f'][1]]}><ZoneProject /></group>
      <group position={[FLOOR_XZ['4f'][0], 0, FLOOR_XZ['4f'][1]]}><ZoneCommand /></group>
      <group position={[FLOOR_XZ['5f'][0], 0, FLOOR_XZ['5f'][1]]}><ZoneArchive /></group>
      <group position={[FLOOR_XZ['6f'][0], 0, FLOOR_XZ['6f'][1]]}><ZoneCore /></group>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        minDistance={30}
        maxDistance={400}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// UI Overlay
// ─────────────────────────────────────────────────────────────────
function UIOverlay({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', fontFamily: "'Space Mono', monospace" }}>
      <div style={{ position: 'absolute', top: 16, left: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          ← 地图
        </button>
        <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 14px', color: '#fff', fontSize: 12 }}>
          🗺️ 平铺总览
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 根组件
// ─────────────────────────────────────────────────────────────────
export default function FloorFlatDemo() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030810' }}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.setClearColor('#030810'); }}
      >
        <PerspectiveCamera makeDefault position={[0, 60, 120]} fov={55} near={0.1} far={1000} />
        <Scene />
      </Canvas>
      <UIOverlay onBack={() => navigate('/control-room')} />
    </div>
  );
}
