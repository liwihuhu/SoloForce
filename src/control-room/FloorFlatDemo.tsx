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
  { id: '1f', label: '1F 大厅',     color: '#38BDF8', floorColor: '#0c1a2e', wallColor: '#1e3a5f', glowColor: '#38BDF8' },
  { id: '2f', label: '2F 人事部',    color: '#4ADE80', floorColor: '#0c1e12', wallColor: '#1e4a2a', glowColor: '#4ADE80' },
  { id: '3f', label: '3F 项目组',    color: '#60A5FA', floorColor: '#0c0e1e', wallColor: '#1e2a4a', glowColor: '#60A5FA' },
  { id: '4f', label: '4F 任务大厅',  color: '#FBBF24', floorColor: '#1e1a0c', wallColor: '#4a4a1e', glowColor: '#FBBF24' },
  { id: '5f', label: '5F 档案中心',  color: '#A3E635', floorColor: '#0c1e0c', wallColor: '#2a4a1e', glowColor: '#A3E635' },
  { id: '6f', label: '6F OpenClaw机房', color: '#F472B6', floorColor: '#1e0c1e', wallColor: '#4a1e4a', glowColor: '#F472B6' },
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

function ZoneLobby() {
  const c = FLOORS[0];
  return (
  <group position={[0, 0, 0]}>
    {/* 地板 */}
    <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.floorColor} roughness={0.25} metalness={0.4} emissive={c.glowColor} emissiveIntensity={0.04} />
    </mesh>
    {/* 大厅网格 */}
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.glowColor} transparent opacity={0.12} depthWrite={false} />
    </mesh>

    {/* ===== 中央巨型 SoloForce 品牌大屏 ===== */}
    <group position={[0, 3.2, -5.0]}>
      {/* 屏幕框架 */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[11.0, 5.5, 0.15]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 屏幕面板（团队/员工/任务统计概览） */}
      <LobbyStatsScreen
        width={10.5}
        height={5.0}
        color={c.glowColor}
        bgColor="#000c1a"
      />
      <pointLight position={[0, 0, 2]} intensity={0.8} color={c.glowColor} distance={8} />
    </group>

    {/* 屏幕顶部横梁 */}
    <mesh position={[0, 6.0, -5.0]}>
      <boxGeometry args={[11.8, 0.1, 0.12]} />
      <meshStandardMaterial color={c.wallColor} roughness={0.3} metalness={0.7} emissive={c.glowColor} emissiveIntensity={0.25} />
    </mesh>
    {/* 屏幕两侧立柱 */}
    {[-6.0, 6.0].map((x, i) => (
      <mesh key={i} position={[x, 3.0, -5.0]}>
        <boxGeometry args={[0.14, 6.0, 0.14]} />
        <meshStandardMaterial color={c.wallColor} roughness={0.3} metalness={0.6} emissive={c.glowColor} emissiveIntensity={0.1} />
      </mesh>
    ))}

    {/* ===== 大气前台接待台（朝向门口） ===== */}
    <group position={[0, 0, -2.8]} rotation={[0, Math.PI, 0]}>
      {/* 台面主体 */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.5, 0.1, 1.2]} />
        <meshStandardMaterial color="#1a3a5f" roughness={0.15} metalness={0.7} emissive={c.glowColor} emissiveIntensity={0.05} />
      </mesh>
      {/* 前台前面板 */}
      <mesh position={[0, 0.45, -0.58]} castShadow>
        <boxGeometry args={[7.5, 0.9, 0.06]} />
        <meshStandardMaterial color="#0a2040" roughness={0.3} metalness={0.5} emissive={c.glowColor} emissiveIntensity={0.06} />
      </mesh>
      {/* 前台顶部发光条 */}
      <mesh position={[0, 0.9, -0.58]}>
        <boxGeometry args={[7.2, 0.04, 0.04]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={2.0} />
      </mesh>
      {/* 前台底部踢脚灯 */}
      <mesh position={[0, 0.03, -0.58]}>
        <boxGeometry args={[7.2, 0.04, 0.04]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
      </mesh>
      {/* 接待台支撑柱 */}
      {[-3.5, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0]} castShadow>
          <boxGeometry args={[0.08, 0.85, 1.1]} />
          <meshStandardMaterial color="#1e3a6a" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}
      {/* 接待屏幕（动态访客统计） */}
      <ReceptionVisitorScreen position={[0, 1.35, 0.15]} color={c.glowColor} />

      {/* 员工工牌展示（台面左侧） */}
      <EmployeeBadge position={[-2.8, 0.92, 0.4]} color="#60A5FA" name="张经理" dept="产品研发" />
      <EmployeeBadge position={[-2.3, 0.92, 0.4]} color="#4ADE80" name="陈开发" dept="技术部" />
      <EmployeeBadge position={[-1.8, 0.92, 0.4]} color="#F472B6" name="刘前端" dept="技术部" />
      {/* 员工工牌展示（台面右侧） */}
      <EmployeeBadge position={[1.8, 0.92, 0.4]} color="#FBBF24" name="林设计" dept="设计部" />
      <EmployeeBadge position={[2.3, 0.92, 0.4]} color="#A78BFA" name="徐分析" dept="数据部" />
      <EmployeeBadge position={[2.8, 0.92, 0.4]} color="#38BDF8" name="王文案" dept="运营部" />
    </group>

    {/* ===== 闸机通道（进门处） ===== */}
    {[-3.0, 0, 3.0].map((x, i) => (
      <group key={i} position={[x, 0, 1.2]}>
        {/* 闸机支柱 */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.1, 1.0, 0.1]} />
          <meshStandardMaterial color="#1a2a4a" roughness={0.3} metalness={0.7} emissive={c.glowColor} emissiveIntensity={0.1} />
        </mesh>
        {/* 闸机顶部读卡器 */}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.28, 0.07, 0.16]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.5} />
        </mesh>
        {/* 闸机指示灯 */}
        <mesh position={[0, 1.11, 0.04]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={2.0} />
        </mesh>
        {/* 闸机翼板 */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.45]} />
          <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={0.6} />
        </mesh>
        <pointLight position={[0, 1.1, 0]} intensity={0.2} color="#22C55E" distance={1.2} />
        {/* 闸机通行计数器 */}
        <GateCounter position={[0, 1.6, 0.1]} color={c.glowColor} side="in" />
      </group>
    ))}
    {/* 闸机间分隔柱 */}
    {[-1.5, 1.5].map((x, i) => (
      <mesh key={i} position={[x, 0.65, 1.2]}>
        <boxGeometry args={[0.05, 1.3, 0.05]} />
        <meshStandardMaterial color={c.wallColor} roughness={0.3} metalness={0.6} emissive={c.glowColor} emissiveIntensity={0.12} />
      </mesh>
    ))}
    {/* 闸机区域地面灯带 */}
    <mesh position={[0, 0.02, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8.5, 0.1]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={0.5} transparent opacity={0.4} />
    </mesh>

    {/* 入口欢迎竖屏（左侧柱，门框外侧） */}
    <group position={[-5.5, 2.2, 5.2]}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[1.6, 3.1, 0.08]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      <EntranceWelcomeScreen position={[0, 0, 0.01]} color={c.glowColor} />
    </group>
    {/* 入口欢迎竖屏（右侧柱，门框外侧） */}
    <group position={[5.5, 2.2, 5.2]}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[1.6, 3.1, 0.08]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      <EntranceWelcomeScreen position={[0, 0, 0.01]} color={c.glowColor} />
    </group>

    {/* 入口雨棚灯带 */}
    <mesh position={[0, 4.0, 4.5]}>
      <boxGeometry args={[10.0, 0.05, 0.05]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={2.0} />
    </mesh>
    {/* 入口两侧装饰柱 */}
    {[-5.5, 5.5].map((x, i) => (
      <mesh key={i} position={[x, 1.5, 4.5]} castShadow>
        <boxGeometry args={[0.14, 3.0, 0.14]} />
        <meshStandardMaterial color={c.wallColor} roughness={0.3} metalness={0.6} emissive={c.glowColor} emissiveIntensity={0.1} />
      </mesh>
    ))}

    {/* 环境光照 */}
    <pointLight position={[0, 4.5, -2.5]} intensity={1.5} color={c.glowColor} distance={16} />
    <rectAreaLight position={[0, 5.0, -5.0]} rotation={[-Math.PI / 2, 0, 0]} width={12} height={5.5} intensity={0.8} color={c.glowColor} />
    <pointLight position={[0, 4.5, 4.5]} intensity={0.4} color={c.glowColor} distance={8} />
    <pointLight position={[-6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
    <pointLight position={[6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
  </group>
  );
}
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
