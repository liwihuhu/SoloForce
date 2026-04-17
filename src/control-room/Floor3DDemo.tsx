// ===========================================
// SF 3D楼层演示 - Three.js + React Three Fiber
// 展示单层楼的立体效果，办公桌/机柜/地板等
// ===========================================

import { useRef, useState, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ===========================================
// 全局状态（模块级，跨组件共享）
// ===========================================
let globalFloorIndex = 3;
let globalTargetY = -3; // 相机目标楼层Y
function setGlobalFloor(v: number) { globalFloorIndex = v; globalTargetY = -v * FLOOR_HEIGHT; }

// ===========================================
// 楼层配置
// ===========================================
const FLOORS = [
  { id: '1f', label: '1F 大厅',     color: '#38BDF8', floorColor: '#0c1a2e', wallColor: '#1e3a5f', glowColor: '#38BDF8' },
  { id: '2f', label: '2F 人事部',    color: '#4ADE80', floorColor: '#0c1e12', wallColor: '#1e4a2a', glowColor: '#4ADE80' },
  { id: '3f', label: '3F 项目组',    color: '#60A5FA', floorColor: '#0c0e1e', wallColor: '#1e2a4a', glowColor: '#60A5FA' },
  { id: '4f', label: '4F 任务大厅',  color: '#FBBF24', floorColor: '#1e1a0c', wallColor: '#4a4a1e', glowColor: '#FBBF24' },
  { id: '5f', label: '5F 档案中心',  color: '#A3E635', floorColor: '#0c1e0c', wallColor: '#2a4a1e', glowColor: '#A3E635' },
  { id: '6f', label: '6F OpenClaw机房', color: '#F472B6', floorColor: '#1e0c1e', wallColor: '#4a1e4a', glowColor: '#F472B6' },
];
const FLOOR_HEIGHT = 3;

// ===========================================
// 办公室桌
// ===========================================
function OfficeDesk({ position, color = '#1e3a5f' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      {[[-0.6, 0], [0.6, 0], [-0.6, -0.25], [0.6, -0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, -0.1]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#111122" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.76, -0.1]} castShadow>
        <boxGeometry args={[0.05, 0.12, 0.05]} />
        <meshStandardMaterial color="#333344" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ===========================================
// 前台接待台
// ===========================================
function ReceptionDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 台面 */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 0.8]} />
        <meshStandardMaterial color="#1a3a5f" roughness={0.2} metalness={0.6} emissive="#1a3a5f" emissiveIntensity={0.05} />
      </mesh>
      {/* 支撑柱 */}
      {[[-1.0, 0], [1.0, 0], [-1.0, -0.3], [1.0, -0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]} castShadow>
          <boxGeometry args={[0.06, 0.9, 0.06]} />
          <meshStandardMaterial color="#2a4a7a" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
      {/* 正面装饰板 */}
      <mesh position={[0, 0.6, -0.35]} castShadow>
        <boxGeometry args={[2.4, 1.2, 0.05]} />
        <meshStandardMaterial color="#0f2a4a" roughness={0.3} metalness={0.4} emissive="#38BDF8" emissiveIntensity={0.08} />
      </mesh>
      {/* LOGO 发光条 */}
      <mesh position={[0, 1.1, -0.37]}>
        <boxGeometry args={[0.8, 0.04, 0.02]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={2.0} />
      </mesh>
      {/* 访客屏幕 */}
      <mesh position={[0.6, 1.1, 0.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#111122" roughness={0.1} metalness={0.8} emissive="#38BDF8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ===========================================
// 巨型仪表盘屏幕（LED大屏风格）
// ===========================================
function DashboardScreen({ position }: { position: [number, number, number] }) {
  const screenRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      // 呼吸灯效果
      mat.emissiveIntensity = 0.25 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
    }
  });

  return (
    <group position={position}>
      {/* 屏幕框架 */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[7.2, 3.6, 0.12]} />
        <meshStandardMaterial color="#0a1a2e" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* 屏幕面板 */}
      <mesh ref={screenRef} position={[0, 0, 0]}>
        <boxGeometry args={[7.0, 3.4, 0.04]} />
        <meshStandardMaterial
          color="#001a2e"
          roughness={0.1}
          metalness={0.3}
          emissive="#38BDF8"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* 顶部标题条 */}
      <mesh position={[0, 1.55, 0.04]}>
        <boxGeometry args={[6.8, 0.28, 0.02]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.8} />
      </mesh>
      {/* 4个数据卡片 */}
      {[-2.8, -0.8, 1.2, 3.2].map((x, i) => (
        <group key={i} position={[x, 0.4, 0.04]}>
          <mesh>
            <boxGeometry args={[1.5, 1.1, 0.02]} />
            <meshStandardMaterial
              color="#011a2e"
              emissive={['#38BDF8', '#4ADE80', '#FBBF24', '#A78BFA'][i]}
              emissiveIntensity={0.4}
            />
          </mesh>
          {/* 模拟数据线 */}
          <mesh position={[0, -0.2, 0.03]}>
            <boxGeometry args={[1.2, 0.04, 0.01]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0, -0.35, 0.03]}>
            <boxGeometry args={[0.9, 0.04, 0.01]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0, -0.5, 0.03]}>
            <boxGeometry args={[1.4, 0.04, 0.01]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      {/* 底部状态条 */}
      <mesh position={[0, -1.3, 0.04]}>
        <boxGeometry args={[6.8, 0.18, 0.02]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.8} />
      </mesh>
      {/* 左右补光 */}
      <pointLight position={[-4.5, 0, 1]} intensity={0.4} color="#38BDF8" distance={4} />
      <pointLight position={[4.5, 0, 1]} intensity={0.4} color="#38BDF8" distance={4} />
    </group>
  );
}

// ===========================================
// 服务器机柜
// ===========================================
function ServerRack({ position, color = '#0f2847' }: { position: [number, number, number]; color?: string }) {
  const lightRef = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    if (lightRef.current) {
      (lightRef.current as any).intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.6, 2, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((y, i) => (
        <mesh key={i} position={[0.31, y, 0]}>
          <boxGeometry args={[0.02, 0.15, 0.02]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#22C55E' : '#3B82F6'}
            emissive={i % 2 === 0 ? '#22C55E' : '#3B82F6'}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      <pointLight ref={lightRef} position={[0.4, 0, 0]} color="#22C55E" intensity={0.5} distance={1} />
    </group>
  );
}

// ===========================================
// 圆桌
// ===========================================
function RoundTable({ position, color = '#2a4a7a' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.05, 32]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} emissive={color} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.72, 16]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ===========================================
// 办公椅
// ===========================================
function OfficeChair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.45, 0.08, 0.45]} />
        <meshStandardMaterial color="#1a2a3a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, -0.2]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#1a2a3a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.48, 8]} />
        <meshStandardMaterial color="#333344" roughness={0.3} metalness={0.6} />
      </mesh>
      {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.02, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#222233" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}



// ===========================================
// 动态文字屏幕（CanvasTexture 实现）
// ===========================================
function ScreenPlane({ width, height, text, subText, color, bgColor = '#000818' }: {
  width?: number; height?: number; text: string; subText?: string;
  color?: string; bgColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    return c;
  }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 256);
    // Make canvas transparent (alpha=0 for background areas)
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, 512, 256);
    // Top bar
    ctx.fillStyle = color || '#38BDF8';
    ctx.fillRect(0, 0, 512, 28);
    // Bottom bar
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 248, 512, 8);
    // Main text
    ctx.fillStyle = color || '#38BDF8';
    ctx.font = 'bold 56px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 130);
    // Sub text
    if (subText) {
      ctx.fillStyle = color ? `${color}aa` : '#38BDF866';
      ctx.font = '24px "SF Mono", monospace';
      ctx.fillText(subText, 256, 185);
    }
    // Data lines
    ctx.fillStyle = color || '#38BDF8';
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const w = 200 + Math.random() * 150;
      ctx.fillRect(256 - w / 2, 210 + i * 12, w, 6);
    }
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }, [text, subText, color, bgColor, canvas, texture]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width || 2, height || 1]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 软管连接（从核心到终端，自然下垂弧线）
// ===========================================
function SoftTube({ x, z, color }: { x: number; z: number; color: string }) {
  const geo = useMemo(() => {
    const start = new THREE.Vector3(0, 2.5, 0);
    const end = new THREE.Vector3(x, 0.6, z);
    const mx = x * 0.5;
    const mz = z * 0.5;
    const curve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(mx * 0.3, 2.2, mz * 0.3),
      new THREE.Vector3(mx * 0.8, 1.9, mz * 0.8),
      new THREE.Vector3(mx * 1.1, 2.1, mz * 1.1),
      end,
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.045, 6, false);
  }, [x, z]);

  const points = useMemo(() => {
    const start = new THREE.Vector3(0, 2.5, 0);
    const end = new THREE.Vector3(x, 0.6, z);
    const mx = x * 0.5;
    const mz = z * 0.5;
    const curve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(mx * 0.3, 2.2, mz * 0.3),
      new THREE.Vector3(mx * 0.8, 1.9, mz * 0.8),
      new THREE.Vector3(mx * 1.1, 2.1, mz * 1.1),
      end,
    ]);
    return curve.getPoints(16);
  }, [x, z]);

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#1a2a5a" roughness={0.2} metalness={0.9}
          emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {points.filter((_, i) => i % 4 === 0).map((pt, li) => (
        <mesh key={li} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
        </mesh>
      ))}
    </group>
  );
}

// ===========================================
// 单个楼层3D场景
// ===========================================
function Floor3DScene({ floorId }: { floorId: string }) {
  const config = FLOORS.find(f => f.id === floorId) || FLOORS[0];
  const floorIndex = FLOORS.findIndex(f => f.id === floorId);
  setGlobalFloor(floorIndex);


  if (floorId === '1f') {
    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.25} metalness={0.4} emissive={config.glowColor} emissiveIntensity={0.04} />
        </mesh>
        {/* 大厅网格 */}
        <gridHelper args={[16, 24, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.12} transparent />

        {/* ===== 中央巨型 SoloForce 品牌大屏 ===== */}
        <group position={[0, 3.2, -5.0]}>
          {/* 屏幕框架 */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[11.0, 5.5, 0.15]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 屏幕面板（动态 SoloForce 文字） */}
          <ScreenPlane
            width={10.5}
            height={5.0}
            text="SOLOFORCE"
            subText="DIGITAL WORKFORCE PLATFORM"
            color={config.glowColor}
            bgColor="#000c1a"
          />
          {/* 顶部 SOLOFORCE 品牌条 */}
          <mesh position={[0, 2.2, 0.04]}>
            <boxGeometry args={[10.0, 0.45, 0.03]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          {/* 中部大标题 */}
          <mesh position={[0, 0.5, 0.04]}>
            <boxGeometry args={[9.0, 0.7, 0.03]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.3} />
          </mesh>
          <mesh position={[0, -0.1, 0.04]}>
            <boxGeometry args={[7.0, 0.4, 0.03]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.8} />
          </mesh>
          {/* 底部状态条 */}
          <mesh position={[0, -2.2, 0.04]}>
            <boxGeometry args={[10.0, 0.28, 0.03]} />
            <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.5} />
          </mesh>
          {/* 底部辅助数据 */}
          {[-3.5, -1.2, 1.2, 3.5].map((x, i) => (
            <mesh key={i} position={[x, -1.5, 0.04]}>
              <boxGeometry args={[1.4, 0.06, 0.02]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.6} />
            </mesh>
          ))}
          <pointLight position={[0, 0, 2]} intensity={0.8} color={config.glowColor} distance={8} />
        </group>

        {/* 屏幕顶部横梁 */}
        <mesh position={[0, 6.0, -5.0]}>
          <boxGeometry args={[11.8, 0.1, 0.12]} />
          <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.25} />
        </mesh>
        {/* 屏幕两侧立柱 */}
        {[-6.0, 6.0].map((x, i) => (
          <mesh key={i} position={[x, 3.0, -5.0]}>
            <boxGeometry args={[0.14, 6.0, 0.14]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.6} emissive={config.glowColor} emissiveIntensity={0.1} />
          </mesh>
        ))}

        {/* ===== 大气前台接待台（朝向门口） ===== */}
        <group position={[0, 0, -2.8]} rotation={[0, Math.PI, 0]}>
          {/* 台面主体 */}
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.5, 0.1, 1.2]} />
            <meshStandardMaterial color="#1a3a5f" roughness={0.15} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.05} />
          </mesh>
          {/* 前台前面板 */}
          <mesh position={[0, 0.45, -0.58]} castShadow>
            <boxGeometry args={[7.5, 0.9, 0.06]} />
            <meshStandardMaterial color="#0a2040" roughness={0.3} metalness={0.5} emissive={config.glowColor} emissiveIntensity={0.06} />
          </mesh>
          {/* 前台顶部发光条 */}
          <mesh position={[0, 0.9, -0.58]}>
            <boxGeometry args={[7.2, 0.04, 0.04]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          {/* 前台底部踢脚灯 */}
          <mesh position={[0, 0.03, -0.58]}>
            <boxGeometry args={[7.2, 0.04, 0.04]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.2} />
          </mesh>
          {/* 接待台支撑柱 */}
          {[-3.5, 3.5].map((x, i) => (
            <mesh key={i} position={[x, 0.42, 0]} castShadow>
              <boxGeometry args={[0.08, 0.85, 1.1]} />
              <meshStandardMaterial color="#1e3a6a" roughness={0.2} metalness={0.6} />
            </mesh>
          ))}
          {/* 接待屏幕 ×2 */}
          {[-1.8, 1.8].map((x, i) => (
            <mesh key={i} position={[x, 1.2, 0.15]} rotation={[-0.12, 0, 0]}>
              <boxGeometry args={[0.9, 0.55, 0.02]} />
              <meshStandardMaterial color="#111122" roughness={0.05} metalness={0.8} emissive={config.glowColor} emissiveIntensity={0.3} />
            </mesh>
          ))}
        </group>

        {/* ===== 闸机通道（进门处） ===== */}
        {[-3.0, 0, 3.0].map((x, i) => (
          <group key={i} position={[x, 0, 1.2]}>
            {/* 闸机支柱 */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 1.0, 0.1]} />
              <meshStandardMaterial color="#1a2a4a" roughness={0.3} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.1} />
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
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.6} />
            </mesh>
            <pointLight position={[0, 1.1, 0]} intensity={0.2} color="#22C55E" distance={1.2} />
          </group>
        ))}
        {/* 闸机间分隔柱 */}
        {[-1.5, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 0.65, 1.2]}>
            <boxGeometry args={[0.05, 1.3, 0.05]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.6} emissive={config.glowColor} emissiveIntensity={0.12} />
          </mesh>
        ))}
        {/* 闸机区域地面灯带 */}
        <mesh position={[0, 0.02, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8.5, 0.1]} />
          <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.5} transparent opacity={0.4} />
        </mesh>

        {/* 入口雨棚灯带 */}
        <mesh position={[0, 4.0, 4.5]}>
          <boxGeometry args={[10.0, 0.05, 0.05]} />
          <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
        </mesh>
        {/* 入口两侧装饰柱 */}
        {[-5.5, 5.5].map((x, i) => (
          <mesh key={i} position={[x, 1.5, 4.5]} castShadow>
            <boxGeometry args={[0.14, 3.0, 0.14]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.6} emissive={config.glowColor} emissiveIntensity={0.1} />
          </mesh>
        ))}

        {/* 环境光照 */}
        <pointLight position={[0, 4.5, -2.5]} intensity={1.5} color={config.glowColor} distance={16} />
        <rectAreaLight position={[0, 5.0, -5.0]} rotation={[-Math.PI / 2, 0, 0]} width={12} height={5.5} intensity={0.8} color={config.glowColor} />
        <pointLight position={[0, 4.5, 4.5]} intensity={0.4} color={config.glowColor} distance={8} />
        <pointLight position={[-6, 2, -1]} intensity={0.3} color={config.glowColor} distance={8} />
        <pointLight position={[6, 2, -1]} intensity={0.3} color={config.glowColor} distance={8} />
      </group>
    );
  }


  if (floorId === '6f') {
    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.2} metalness={0.6}
            emissive={config.glowColor} emissiveIntensity={0.06} />
        </mesh>
        <gridHelper args={[16, 24, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.25} transparent />

        {/* ===== 超级大脑核心（悬空） ===== */}
        <group position={[0, 2.5, 0]}>
          {/* 外层轨道环 × 3 */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[2.2, 0.03, 8, 64]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0} transparent opacity={0.5} />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[2.2, 0.03, 8, 64]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0} transparent opacity={0.5} />
          </mesh>
          <mesh rotation={[Math.PI / 3 * 2, 0, 0]}>
            <torusGeometry args={[2.2, 0.03, 8, 64]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0} transparent opacity={0.5} />
          </mesh>
          {/* 主球体 */}
          <mesh>
            <sphereGeometry args={[1.4, 32, 32]} />
            <meshStandardMaterial color="#000818" roughness={0.05} metalness={0.95}
              emissive={config.glowColor} emissiveIntensity={0.4} />
          </mesh>
          {/* 球面格栅纹 */}
          {[-0.7, 0, 0.7].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.39, 0.015, 4, 32]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.8} transparent opacity={0.6} />
            </mesh>
          ))}
          {/* 内核 */}
          <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#001830" roughness={0.0} metalness={1.0}
              emissive={config.glowColor} emissiveIntensity={1.5} />
          </mesh>
          {/* 内层能量环 */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.7, 0.05, 8, 32]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.7, 0.05, 8, 32]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          {/* 顶部尖顶 */}
          <mesh position={[0, 1.45, 0]}>
            <coneGeometry args={[0.15, 0.5, 8]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={3.0} />
          </mesh>
          {/* 核心点光源 */}
          <pointLight position={[0, 0, 0]} intensity={3.0} color={config.glowColor} distance={12} />
          <pointLight position={[0, 1.5, 0]} intensity={1.5} color={config.glowColor} distance={8} />
          <pointLight position={[0, -1.5, 0]} intensity={1.0} color={config.glowColor} distance={8} />

          {/* ===== 核心屏幕 ===== */}
          <group position={[0, 0.3, 1.5]} rotation={[-0.25, 0, 0]}>
            <mesh position={[0, 0, -0.04]}>
              <boxGeometry args={[2.2, 1.4, 0.08]} />
              <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh>
              <boxGeometry args={[2.0, 1.2, 0.04]} />
              <meshStandardMaterial color="#001018" roughness={0.05} metalness={0.3}
                emissive={config.glowColor} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 0.52, 0.04]}>
              <boxGeometry args={[1.8, 0.12, 0.02]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
            </mesh>
            {[0.3, 0.15, 0, -0.15].map((y, li) => (
              <mesh key={li} position={[0, y, 0.04]}>
                <boxGeometry args={[1.5, 0.06, 0.01]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.7 - li * 0.15} />
              </mesh>
            ))}
            <mesh position={[0, -0.52, 0.04]}>
              <boxGeometry args={[1.8, 0.08, 0.02]} />
              <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.5} />
            </mesh>
          </group>
        </group>

        {/* ===== 软管连接 ===== */}
        {[
          { x:  5.5, z:  0   },
          { x:  0,   z:  5.5 },
          { x: -5.5, z:  0   },
          { x:  0,   z: -5.5 },
          { x:  3.9, z:  3.9 },
          { x: -3.9, z:  3.9 },
          { x:  3.9, z: -3.9 },
          { x: -3.9, z: -3.9 },
        ].map(({ x, z }, i) => (
          <SoftTube key={i} x={x} z={z} color={config.glowColor} />
        ))}

        {/* ===== 8个终端处理站 ===== */}
        {[
          { x:  5.5, z:  0,   color: '#F472B6', label: 'AGENTS'   },
          { x:  0,   z:  5.5, color: '#60A5FA', label: 'TASKS'     },
          { x: -5.5, z:  0,   color: '#FBBF24', label: 'SKILLS'   },
          { x:  0,   z: -5.5, color: '#A78BFA', label: 'GATEWAY'  },
          { x:  3.9, z:  3.9, color: '#4ADE80', label: 'MEMORY'   },
          { x: -3.9, z:  3.9, color: '#34D399', label: 'MCP'       },
          { x:  3.9, z: -3.9, color: '#FB923C', label: 'LOGS'      },
          { x: -3.9, z: -3.9, color: '#38BDF8', label: 'SCHEDULE' },
        ].map(({ x, z, color, label }) => (
          <group key={label} position={[x, 0, z]}>
            {/* 接收盘底座 */}
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.6, 0.9, 32]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.6, 32]} />
              <meshStandardMaterial color="#050a18" roughness={0.2} metalness={0.9}
                emissive={color} emissiveIntensity={0.1} />
            </mesh>
            {/* 终端主体 */}
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.55, 0.65, 0.7, 16]} />
              <meshStandardMaterial color="#080f20" roughness={0.15} metalness={0.9}
                emissive={color} emissiveIntensity={0.1} />
            </mesh>
            {/* 终端顶部指示灯 */}
            <mesh position={[0, 0.78, 0]}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
            </mesh>
            {/* 接收环 */}
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.5, 0.03, 8, 24]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
            </mesh>

            {/* 终端屏幕（顶部支架） */}
            <mesh position={[0, 1.05, 0.3]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.04, 0.4, 0.04]} />
              <meshStandardMaterial color="#1a2a4a" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, 1.3, 0.38]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.85, 0.55, 0.04]} />
              <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 1.3, 0.40]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.75, 0.45, 0.02]} />
              <meshStandardMaterial color="#001018" roughness={0.05} metalness={0.3}
                emissive={color} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 1.53, 0.41]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.65, 0.08, 0.01]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
            </mesh>
            {[0.12, 0.0, -0.12].map((dy, li) => (
              <mesh key={li} position={[0, 1.3 + dy, 0.41]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.55, 0.04, 0.01]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6 - li * 0.15} />
              </mesh>
            ))}
            <mesh position={[0, 1.18, 0.41]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.65, 0.06, 0.01]} />
              <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.0} />
            </mesh>

            <pointLight position={[0, 0.8, 0]} intensity={0.5} color={color} distance={3} />
          </group>
        ))}

        {/* 环境光照 */}
        <pointLight position={[0, 4.0, 0]} intensity={2.0} color={config.glowColor} distance={18} />
        <rectAreaLight position={[0, 5.0, 0]} rotation={[-Math.PI / 2, 0, 0]} width={16} height={12} intensity={1.2} color={config.glowColor} />
        <pointLight position={[-6, 2, 0]} intensity={0.6} color={config.glowColor} distance={8} />
        <pointLight position={[6, 2, 0]} intensity={0.6} color={config.glowColor} distance={8} />
      </group>
    );
  }


  if (floorId === '4f') {
    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 8]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.4} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.08} />
        </mesh>
        <gridHelper args={[12, 20, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.3} transparent />

        {/* ===== 主控台（面向屏幕的操控席） ===== */}
        {/* 中央操控台 */}
        <mesh position={[0, 0.7, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[4.5, 0.06, 0.9]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.2} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.06} />
        </mesh>
        {/* 中央台面屏幕 */}
        <mesh position={[0, 1.0, 2.2]}>
          <boxGeometry args={[3.8, 0.4, 0.03]} />
          <meshStandardMaterial color="#0a1520" roughness={0.1} metalness={0.5} emissive={config.glowColor} emissiveIntensity={0.3} />
        </mesh>
        {/* 屏幕数据线 */}
        {[-1.2, -0.6, 0, 0.6, 1.2].map((x, i) => (
          <mesh key={i} position={[x, 1.1, 2.21]}>
            <boxGeometry args={[0.4, 0.03, 0.01]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={i === 2 ? 2.0 : 0.8} />
          </mesh>
        ))}

        {/* 左右两组操控席 */}
        {[-3.5, 3.5].map((x, si) => (
          <group key={si} position={[x, 0, 1.8]}>
            <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.06, 0.8]} />
              <meshStandardMaterial color="#1a2a3a" roughness={0.2} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.06} />
            </mesh>
            <mesh position={[0, 1.0, 0]}>
              <boxGeometry args={[1.4, 0.3, 0.03]} />
              <meshStandardMaterial color="#0a1520" roughness={0.1} metalness={0.5} emissive={config.glowColor} emissiveIntensity={0.3} />
            </mesh>
            {/* 数据条 */}
            {[-0.4, 0, 0.4].map((dx, j) => (
              <mesh key={j} position={[dx, 1.1, 0.01]}>
                <boxGeometry args={[0.25, 0.03, 0.01]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.2} />
              </mesh>
            ))}
            {/* 操作员椅子 */}
            <OfficeChair position={[0, 0, -0.9]} rotation={0} />
          </group>
        ))}

        {/* 指挥席椅子（中央台） */}
        {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
          <OfficeChair key={i} position={[x, 0, 3.0]} rotation={Math.PI} />
        ))}

        {/* ===== 三块大屏幕 ===== */}
        {/* 左屏 */}
        <group position={[-2.8, 2.0, -3.7]}>
          <mesh position={[0, 0, -0.07]}>
            <boxGeometry args={[3.2, 2.2, 0.1]} />
            <meshStandardMaterial color="#0a1020" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh>
            <boxGeometry args={[3.0, 2.0, 0.04]} />
            <meshStandardMaterial color="#001018" roughness={0.05} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.2} />
          </mesh>
          {/* 顶部标题条 */}
          <mesh position={[0, 0.95, 0.04]}>
            <boxGeometry args={[2.8, 0.2, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
          </mesh>
          {/* 数据图表行 */}
          {[-0.2, -0.4, -0.6].map((y, j) => (
            <mesh key={j} position={[0, y, 0.04]}>
              <boxGeometry args={[2.4, 0.06, 0.02]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0 - j * 0.25} />
            </mesh>
          ))}
          {/* 屏幕补光 */}
          <pointLight position={[0, 0, 1]} intensity={0.5} color={config.glowColor} distance={4} />
        </group>

        {/* 中央主屏（最大） */}
        <group position={[0, 2.5, -3.9]}>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[4.5, 2.8, 0.12]} />
            <meshStandardMaterial color="#0a1020" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh>
            <boxGeometry args={[4.2, 2.5, 0.05]} />
            <meshStandardMaterial color="#001018" roughness={0.05} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.25} />
          </mesh>
          {/* 顶部大标题条 */}
          <mesh position={[0, 1.15, 0.05]}>
            <boxGeometry args={[4.0, 0.24, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          {/* 主屏数据卡片（3列） */}
          {[-1.4, 0, 1.4].map((x, i) => (
            <group key={i} position={[x, 0.3, 0.05]}>
              <mesh>
                <boxGeometry args={[1.1, 1.2, 0.02]} />
                <meshStandardMaterial color="#001018" emissive={config.glowColor} emissiveIntensity={0.35} />
              </mesh>
              {/* 顶部状态条 */}
              <mesh position={[0, 0.55, 0.04]}>
                <boxGeometry args={[0.9, 0.08, 0.01]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.8} />
              </mesh>
              {/* 数据行 */}
              {[-0.1, -0.25, -0.4].map((dy, j) => (
                <mesh key={j} position={[0, dy, 0.04]}>
                  <boxGeometry args={[0.8, 0.05, 0.01]} />
                  <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.9 - j * 0.2} />
                </mesh>
              ))}
            </group>
          ))}
          {/* 底部状态栏 */}
          <mesh position={[0, -1.05, 0.05]}>
            <boxGeometry args={[4.0, 0.16, 0.02]} />
            <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 0, 1]} intensity={0.8} color={config.glowColor} distance={6} />
        </group>

        {/* 右屏 */}
        <group position={[2.8, 2.0, -3.7]}>
          <mesh position={[0, 0, -0.07]}>
            <boxGeometry args={[3.2, 2.2, 0.1]} />
            <meshStandardMaterial color="#0a1020" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh>
            <boxGeometry args={[3.0, 2.0, 0.04]} />
            <meshStandardMaterial color="#001018" roughness={0.05} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, 0.95, 0.04]}>
            <boxGeometry args={[2.8, 0.2, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
          </mesh>
          {[-0.2, -0.4, -0.6].map((y, j) => (
            <mesh key={j} position={[0, y, 0.04]}>
              <boxGeometry args={[2.4, 0.06, 0.02]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0 - j * 0.25} />
            </mesh>
          ))}
          <pointLight position={[0, 0, 1]} intensity={0.5} color={config.glowColor} distance={4} />
        </group>

        {/* 屏幕顶部横梁 */}
        <mesh position={[-0.5, 4.3, -3.8]}>
          <boxGeometry args={[8.5, 0.08, 0.08]} />
          <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.5} />
        </mesh>
        {/* 侧面支撑柱 */}
        {[-5, 5].map((x, i) => (
          <mesh key={i} position={[x, 1.5, -3.8]}>
            <boxGeometry args={[0.1, 3.0, 0.1]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.6} emissive={config.glowColor} emissiveIntensity={0.2} />
          </mesh>
        ))}

        {/* 环境光照 */}
        <pointLight position={[0, 2.5, -2]} intensity={1.5} color={config.glowColor} distance={12} />
        <rectAreaLight position={[0, 3.5, -3.8]} rotation={[-Math.PI / 2, 0, 0]} width={8} height={2.5} intensity={1.2} color={config.glowColor} />
        <pointLight position={[-4, 1, 0]} intensity={0.6} color={config.glowColor} distance={8} />
        <pointLight position={[4, 1, 0]} intensity={0.6} color={config.glowColor} distance={8} />
      </group>
    );
  }

  if (floorId === '5f') {
    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 10]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.4} metalness={0.3}
            emissive={config.glowColor} emissiveIntensity={0.05} />
        </mesh>
        <gridHelper args={[14, 22, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.2} transparent />

        {/* ===== 档案柜（3排×5列）===== */}
        {[-3, 0, 3].map((rowZ, ri) =>
          [-4, -2, 0, 2, 4].map((colX, ci) => {
            const cabinetColor = (ri + ci) % 2 === 0 ? '#0f2a1a' : '#0f1e2a';
            const statusColor = ci === 0 ? '#22C55E' : ci === 1 ? '#FBBF24' : ci === 2 ? '#60A5FA' : ci === 3 ? '#A78BFA' : '#34D399';
            return (
              <group key={`${ri}-${ci}`} position={[colX, 0, rowZ]}>
                {/* 柜体（底部贴地 y=0） */}
                <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.4, 2.2, 0.5]} />
                  <meshStandardMaterial color={cabinetColor} roughness={0.4} metalness={0.6}
                    emissive={config.glowColor} emissiveIntensity={0.1} />
                </mesh>
                {/* 抽屉格线（3条，y=0.55/1.1/1.65） */}
                {[0.55, 1.1, 1.65].map((y, li) => (
                  <mesh key={li} position={[0, y, 0.26]}>
                    <boxGeometry args={[1.38, 0.015, 0.01]} />
                    <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.4} />
                  </mesh>
                ))}
                {/* 抽屉把手（对应每格位置） */}
                {[0.55, 1.1, 1.65].map((y, li) => (
                  <mesh key={li} position={[0, y, 0.27]}>
                    <boxGeometry args={[0.35, 0.05, 0.04]} />
                    <meshStandardMaterial color={statusColor} roughness={0.3} metalness={0.8} />
                  </mesh>
                ))}
                {/* 顶部状态灯点（不发光，只着色） */}
                <mesh position={[0, 2.2, 0]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshStandardMaterial color={statusColor} roughness={0.2} metalness={0.8} />
                </mesh>
              </group>
            );
          })
        )}

        {/* 走廊（中间通道留空地面） */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 10]} />
          <meshStandardMaterial color={config.glowColor} emissive={config.glowColor}
            emissiveIntensity={0.04} transparent opacity={0.06} />
        </mesh>

        {/* 入口指示墙 */}
        <mesh position={[5.8, 1.0, 0]} castShadow>
          <boxGeometry args={[0.06, 2.0, 8]} />
          <meshStandardMaterial color={config.wallColor} roughness={0.4} metalness={0.5}
            emissive={config.glowColor} emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[5.8, 2.0, 0]}>
          <boxGeometry args={[0.05, 0.04, 6.0]} />
          <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
        </mesh>

        {/* 墙面监控面板 */}
        <group position={[0, 2.5, -4.5]}>
          <mesh>
            <boxGeometry args={[4.0, 1.4, 0.06]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.3} metalness={0.6}
              emissive={config.glowColor} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[3.7, 1.2, 0.03]} />
            <meshStandardMaterial color="#001018" roughness={0.1} metalness={0.3}
              emissive={config.glowColor} emissiveIntensity={0.25} />
          </mesh>
          {[-1.2, 0, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 0.2, 0.06]}>
              <boxGeometry args={[0.7, 0.06, 0.02]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0} />
            </mesh>
          ))}
          <mesh position={[0, -0.4, 0.06]}>
            <boxGeometry args={[3.3, 0.05, 0.02]} />
            <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.0} />
          </mesh>
        </group>

        <pointLight position={[0, 3.5, 0]} intensity={1.2} color={config.glowColor} distance={16} />
        <rectAreaLight position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} width={14} height={10} intensity={1.0} color={config.glowColor} />
        <pointLight position={[-5, 2, 0]} intensity={0.5} color={config.glowColor} distance={8} />
        <pointLight position={[5, 2, 0]} intensity={0.5} color={config.glowColor} distance={8} />
      </group>
    );
  }


  // 默认办公室布局
  return (
    <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
      <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color={config.floorColor} roughness={0.6} metalness={0.2} emissive={config.glowColor} emissiveIntensity={0.06} />
      </mesh>
      <gridHelper args={[12, 20, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.3} transparent />
      {[-2.5, 0, 2.5].map((z, zi) =>
        [-3.5, -1.5, 0.5, 2.5].map((x, xi) => (
          <group key={`${zi}-${xi}`}>
            <OfficeDesk position={[x, 0, z]} color="#1e3a5f" />
            <OfficeChair position={[x, 0, z + 0.7]} rotation={Math.PI} />
          </group>
        ))
      )}
      <mesh position={[-5.8, 0.6, 0]} castShadow>
        <boxGeometry args={[0.1, 1.2, 8]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.5} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[5.8, 0.6, 0]} castShadow>
        <boxGeometry args={[0.1, 1.2, 8]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.5} metalness={0.3} emissive={config.glowColor} emissiveIntensity={0.05} />
      </mesh>
      <pointLight position={[0, 2.8, 0]} intensity={1.0} color={config.glowColor} distance={12} />
      <rectAreaLight position={[0, 2.9, 0]} rotation={[-Math.PI / 2, 0, 0]} width={12} height={8} intensity={0.8} color={config.glowColor} />
      <pointLight position={[-4, 1, 0]} intensity={0.4} color={config.glowColor} distance={8} />
      <pointLight position={[4, 1, 0]} intensity={0.4} color={config.glowColor} distance={8} />
    </group>
  );
}

// ===========================================
// 多楼层堆叠
// ===========================================
function AllFloorsStack({ currentFloor }: { currentFloor: string }) {
  const currentIndex = FLOORS.findIndex(f => f.id === currentFloor);
  return (
    <>
      {FLOORS.map((floor, index) => {
        const isActive = index === currentIndex;
        const isAbove = index < currentIndex;
        return (
          <group key={floor.id} position={[0, -index * FLOOR_HEIGHT, 0]}>
            <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[12, 8]} />
              <meshStandardMaterial
                color={floor.color}
                transparent
                opacity={isActive ? 0.35 : isAbove ? 0.12 : 0.06}
                roughness={0.7}
                metalness={0.3}
                emissive={floor.color}
                emissiveIntensity={isActive ? 0.2 : 0.05}
              />
            </mesh>
            <lineSegments position={[0, 0, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(12, 0.1, 8)]} />
              <lineBasicMaterial color={floor.color} transparent opacity={isActive ? 1.0 : 0.4} />
            </lineSegments>
            {index < FLOORS.length - 1 && (
              <mesh position={[0, FLOOR_HEIGHT * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 8]} />
                <meshStandardMaterial color={FLOORS[index + 1].color} transparent opacity={isActive ? 0.15 : 0.06} emissive={FLOORS[index + 1].color} emissiveIntensity={0.1} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

// ===========================================
// 相机控制器
// ===========================================
function CameraController({ orbitRef }: { orbitRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const prevFloorRef = useRef(-3);

  useFrame(() => {
    const targetFloorY = globalTargetY;
    // 只在楼层变化时更新 OrbitControls 目标
    if (orbitRef.current && prevFloorRef.current !== targetFloorY) {
      const currentTarget = orbitRef.current.target as THREE.Vector3;
      currentTarget.y = targetFloorY;
      orbitRef.current.update();
      prevFloorRef.current = targetFloorY;
    }
  });

  return null;
}

// ===========================================
// 主组件
// ===========================================
export default function Floor3DDemo() {
  const [currentFloor, setCurrentFloor] = useState('4f');
  const currentConfig = FLOORS.find(f => f.id === currentFloor) || FLOORS[0];

  const orbitRef = useRef(null);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 50%, #0a0a14 100%)',
      position: 'relative',
    }}>
      {/* 标题 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#4a6a8a', fontFamily: "'SF Mono', 'Fira Code', monospace", marginBottom: '6px' }}>
          SOLOFORCE · 3D DIGITAL TWIN
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          color: currentConfig.color,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          textShadow: `0 0 20px ${currentConfig.color}80`,
        }}>
          {currentConfig.label}
        </div>
      </div>

      {/* 左侧楼层选择器 */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(10, 10, 20, 0.85)',
        padding: '16px 12px',
        borderRadius: '14px',
        border: `1px solid ${currentConfig.color}30`,
        backdropFilter: 'blur(10px)',
      }}>
        {FLOORS.slice().reverse().map((floor) => {
          const isActive = floor.id === currentFloor;
          return (
            <button
              key={floor.id}
              onClick={() => setCurrentFloor(floor.id)}
              style={{
                background: isActive ? `${floor.color}20` : 'transparent',
                border: `1px solid ${isActive ? floor.color : 'transparent'}`,
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? `0 0 12px ${floor.color}40` : 'none',
              }}
            >
              <div style={{
                width: isActive ? '10px' : '6px',
                height: isActive ? '10px' : '6px',
                borderRadius: '50%',
                background: isActive ? floor.color : `${floor.color}40`,
                boxShadow: isActive ? `0 0 8px ${floor.color}` : 'none',
                transition: 'all 0.2s ease',
              }} />
              <span style={{
                fontSize: '12px',
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: isActive ? floor.color : '#4a6a8a',
                fontWeight: isActive ? '600' : '400',
              }}>
                {floor.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 右侧控制面板 */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '80px',
        zIndex: 10,
        background: 'rgba(10, 10, 20, 0.85)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(74, 106, 138, 0.2)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontSize: '10px', color: '#4a6a8a', letterSpacing: '2px', marginBottom: '8px' }}>CONTROLS</div>
        <div style={{ fontSize: '11px', color: '#6a8aaa', fontFamily: "'SF Mono', 'Fira Code', monospace", lineHeight: '1.8', marginBottom: '12px' }}>
          🖱️ 左键拖动 - 旋转视角<br />
          🖱️ 右键拖动 - 平移<br />
          🖱️ 滚轮 - 缩放
        </div>

      </div>

      {/* 底部状态栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: 'rgba(10, 10, 20, 0.85)',
        padding: '12px 24px',
        borderRadius: '20px',
        border: '1px solid rgba(74, 106, 138, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
        <span style={{ fontSize: '12px', color: '#22C55E', fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '2px' }}>
          ONLINE · {FLOORS.length} FLOORS ACTIVE
        </span>
      </div>

      {/* Three.js Canvas */}
      <Canvas shadows style={{ position: 'absolute', inset: 0 }}>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
        <CameraController orbitRef={orbitRef} />
        <OrbitControls
          ref={orbitRef}
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={25}
          target={[0, -globalFloorIndex * FLOOR_HEIGHT, 0]}
        />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.8} color="#4a6a9a" />
        <Floor3DScene floorId={currentFloor} />
        <AllFloorsStack currentFloor={currentFloor} />
        <fog attach="fog" args={['#0a0a14', 20, 50]} />
      </Canvas>
    </div>
  );
}
