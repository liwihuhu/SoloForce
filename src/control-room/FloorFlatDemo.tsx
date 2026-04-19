/**
 * FloorFlatDemo — Unified Canvas Floor + Zone Overlays
 *
 * Strategy:
 * - ONE canvas texture paints ALL zone colors onto ONE floor mesh
 * - NearestFilter avoids bilinear blurring at zone edges
 * - Oversized canvas coverage eliminates all boundary gaps
 * - Walls placed directly on the continuous floor
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

const WALL_H = 3.5;
const WALL_T = 0.18;

// ─────────────────────────────────────────────────────────────────
// STATIC DATA — 模块级常量，避免每次渲染重新创建
// ─────────────────────────────────────────────────────────────────
const LOBBY_VISITORS = Math.floor(Math.random() * 18) + 4; // 模块加载时固定值
const TEAM_NAMES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;
const TEAM_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EC4899'] as const;
const KPI_DATA = [
  { label: 'ACTIVE',    v: '12',  col: '#EF4444' },
  { label: 'RUNNING',  v: '5',   col: '#F59E0B' },
  { label: 'QUEUED',    v: '23',  col: '#60A5FA' },
  { label: 'COMPLETED', v: '847', col: '#22C55E' },
] as const;
const KPI_POSITIONS: [number, number, number][] = [[-6,-6,0],[-6,-10,0],[6,-6,0],[6,-10,0]];
const HR_AREA_COLORS = ['#3B82F6', '#4ADE80', '#FBBF24'] as const;
const CORE_NODES = [
  { l: 'ME',       k: 'ME',       col: '#E879F9' },
  { l: 'AGENTS',   k: 'AGENTS',   col: '#F472B6' },
  { l: 'GATEWAY',  k: 'GATEWAY',  col: '#A78BFA' },
  { l: 'TASKS',    k: 'TASKS',    col: '#60A5FA' },
  { l: 'MEMORY',   k: 'MEMORY',   col: '#4ADE80' },
  { l: 'SESSIONS', k: 'SESSIONS', col: '#38BDF8' },
  { l: 'SKILLS',   k: 'SKILLS',   col: '#FBBF24' },
  { l: 'MCP',      k: 'MCP',      col: '#FB923C' },
] as const;

const FLOORS = [
  { id: '1f', label: '1F 大厅',          color: '#38BDF8' },
  { id: '2f', label: '2F 人事部',         color: '#4ADE80' },
  { id: '3f', label: '3F 项目组',         color: '#60A5FA' },
  { id: '4f', label: '4F 任务大厅',       color: '#FBBF24' },
  { id: '5f', label: '5F 档案中心',       color: '#A3E635' },
  { id: '6f', label: '6F OpenClaw 机房',  color: '#F472B6' },
];

// ─────────────────────────────────────────────────────────────────
// Canvas texture — solid fills, NO transparency, NearestFilter
// ─────────────────────────────────────────────────────────────────
function buildFloorTexture(): HTMLCanvasElement {
  const W = 4096, H = 4096;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  // Map world coords to canvas pixels
  // World: X -30..30 → canvas 0..W, Z -55..30 → canvas 0..H
  const fx = (x: number) => ((x + 30) / 60) * W;
  const fz = (z: number) => ((z + 55) / 85) * H;

  // Dark base — fills entire canvas
  ctx.fillStyle = '#030810';
  ctx.fillRect(0, 0, W, H);

  // Draw each zone as solid fill + stroke (both opaque)
  function fillZone(pts: [number, number][], col: string, lineWidth = 4) {
    ctx.beginPath();
    ctx.moveTo(fx(pts[0][0]), fz(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(fx(pts[i][0]), fz(pts[i][1]));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  // ZONES — 新布局：4F+6F 占 55%，1F+5F 压缩
  // 1F Lobby — 压缩到 Z=30→-8（高22，占26%）
  fillZone([[-30, 30], [30, 30], [30, -8], [10, -8], [-10, -8]], '#0c1628', 5);
  // 2F HR — 左矩形 Z=-8→-18
  fillZone([[-30, -8], [-10, -8], [-10, -18], [-30, -18]], '#0c1e12', 4);
  // 3F Project — 右矩形 Z=-8→-18
  fillZone([[10, -8], [30, -8], [30, -18], [10, -18]], '#0c0e28', 4);
  // 4F Command — 扩展到 Z=-8→-35（高27，占32%）
  fillZone([[-10, -8], [10, -8], [10, -35], [-10, -35]], '#1a1a0c', 4);
  // 6F Core — 扩大 octagon R=18，中心 Z=-44（占高23+，约27%）
  const R = 18, CZ = -44;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const next = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(fx(Math.cos(a) * R), fz(CZ + Math.sin(a) * R));
    ctx.lineTo(fx(Math.cos(next) * R), fz(CZ + Math.sin(next) * R));
    ctx.strokeStyle = '#0e0818';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  // Core fill
  ctx.fillStyle = '#0e0818';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const x = fx(Math.cos(a) * R), z = fz(CZ + Math.sin(a) * R);
    i === 0 ? ctx.moveTo(x, z) : ctx.lineTo(x, z);
  }
  ctx.closePath(); ctx.fill();
  // 5F Archive — 压缩到 Z=-35→-55（高20，占24%）
  fillZone([[-28, -35], [28, -35], [28, -55], [-28, -55]], '#0c1e0c', 4);

  return cv;
}

const floorTex = buildFloorTexture();
const floorCanvasTex = new THREE.CanvasTexture(floorTex);
floorCanvasTex.magFilter = THREE.NearestFilter;
floorCanvasTex.minFilter = THREE.NearestFilter;
floorCanvasTex.generateMipmaps = false;

// ─────────────────────────────────────────────────────────────────
// Screen mesh
// ─────────────────────────────────────────────────────────────────
function ScreenMesh({ position, rotation, w, h, text, subText, color }: {
  position: [number, number, number]; rotation?: [number, number, number];
  w: number; h: number; text: string; subText?: string; color: string;
}) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#000c1a'; ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = color; ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 140);
    if (subText) { ctx.font = '20px monospace'; ctx.fillStyle = color + '99'; ctx.fillText(subText, 256, 210); }
    const t = new THREE.CanvasTexture(cv);
    setTex(t);
    return () => { t.dispose(); };
  }, [text, subText, color]);
  if (!tex) return null;
  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} roughness={0.1} metalness={0.3} transparent />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
// Wall
// ─────────────────────────────────────────────────────────────────
function Wall({ x1, z1, x2, z2, h = WALL_H }: {
  x1: number; z1: number; x2: number; z2: number; h?: number;
}) {
  const isH = Math.abs(z2 - z1) < 0.1;
  const len = isH ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const args: [number, number, number] = isH ? [len, h, WALL_T] : [WALL_T, h, len];
  return (
    <group>
      <mesh position={[cx, h / 2, cz]}>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#0f1f35" roughness={0.4} metalness={0.65} />
      </mesh>
      <mesh position={[cx, 0.06, cz]}>
        <boxGeometry args={isH ? [len, 0.1, 0.55] : [0.55, 0.1, len]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={1.2}
          roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 1F LOBBY
// ─────────────────────────────────────────────────────────────────
function ZoneLobby() {
  const c = FLOORS[0];
  const vis = LOBBY_VISITORS; // 模块级固定值，不再每次渲染变化

  return (
    <group>
      {[-20, -13, -6, 0, 6, 13, 20].map((x, i) => (
        <group key={i} position={[x, 0, 11]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.45, 3, 0.12]} />
            <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={2.5} roughness={0.15} metalness={0.85} />
          </mesh>
          <mesh position={[0, 3.05, 0]}>
            <boxGeometry args={[0.8, 0.2, 0.12]} />
            <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={3} roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.6, 3]}>
        <boxGeometry args={[16, 1.2, 2.2]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.25} metalness={0.75} emissive={c.color} emissiveIntensity={0.35} />
      </mesh>
      <ScreenMesh position={[0, 1.9, 2.2]} w={14} h={3.5}
        text="RECEPTION" subText={`VISITORS: ${vis}`} color={c.color} />
      <ScreenMesh position={[0, 4, 14]} rotation={[0, Math.PI, 0]} w={56} h={10}
        text="WELCOME TO SOLOFORCE" subText="数字孪生 · 智慧协同 · 创新未来" color={c.color} />
      <ScreenMesh position={[-2, 3.5, -5]} w={18} h={7}
        text="SOLOFORCE" subText="DIGITAL TWIN HQ" color={c.color} />
      {[[-24, 8], [-24, -4], [24, 8], [24, -4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.75, z]}>
          <cylinderGeometry args={[0.4, 0.4, 3.5, 12]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.8} emissive={c.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
      {[[-16, -1], [0, -1], [16, -1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <boxGeometry args={[6, 0.6, 1.4]} />
          <meshStandardMaterial color="#1a2a4a" roughness={0.35} metalness={0.7} emissive={c.color} emissiveIntensity={0.1} />
        </mesh>
      ))}
      <Text position={[0, 0.1, 13]} fontSize={1.1} color={c.color} anchorX="center" anchorY="middle">
        1F · 大厅
      </Text>
      <pointLight position={[0, 6, 5]}   color={c.color} intensity={4}  distance={40} />
      <pointLight position={[-20, 4, 12]} color={c.color} intensity={1.5} distance={16} />
      <pointLight position={[20,  4, 12]} color={c.color} intensity={1.5} distance={16} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 2F HR
// ─────────────────────────────────────────────────────────────────
interface Emp { id: string; name: string; type: string; status: string; roleName: string; }
const EMP_COLORS: Record<string, string> = {
  superadmin: '#FFD700', executor: '#FF4444', manager: '#3B82F6',
  developer: '#22C55E', designer: '#A78BFA', analyst: '#F59E0B',
  writer: '#EC4899', support: '#06B6D4', researcher: '#8B5CF6',
  qa: '#EF4444', sales: '#F97316',
};

function Station({ position, color, status }: { position: [number, number, number]; color: string; status: string }) {
  const sc = status === 'online' || status === 'active' ? '#22C55E' : status === 'busy' ? '#EF4444' : '#6B7280';
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.6, 0.3, 0.9]} />
        <meshStandardMaterial color="#1a2a4a" roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[0, 0.65, -0.22]}>
        <boxGeometry args={[1.2, 0.8, 0.06]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} roughness={0.18} metalness={0.82} />
      </mesh>
      <mesh position={[0.5, 1.1, -0.22]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

function ZoneHR() {
  const c = FLOORS[1];
  const [emps, setEmps] = useState<Emp[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('http://localhost:5301/api/employees', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (d.success) setEmps(d.data.items.slice(0, 12)); else setLoadError(true); })
      .catch(e => { if (e.name !== 'AbortError') setLoadError(true); });
    return () => controller.abort();
  }, []);

  const positions: [number, number, number][] = Array.from({ length: 12 }, (_, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    return [-24 + col * 5, 0, -5 - row * 5];
  });

  return (
    <group>
      <group position={[-19, 3.8, -13]}>
        <mesh position={[0, 0, -0.12]}>
          <boxGeometry args={[16, 8.5, 0.15]} />
          <meshStandardMaterial color="#0a1828" roughness={0.28} metalness={0.72} />
        </mesh>
        <ScreenMesh position={[0, 0, 0]} w={15} h={8}
          text={loadError ? 'HR DEPT — API ERROR' : 'HR DEPT'}
          subText={loadError ? '请检查后端服务' : `STAFF: ${emps.length}/12`} color={loadError ? '#EF4444' : c.color} />
      </group>
      {[-10, -13, -16].map((z, i) => (
        <mesh key={i} position={[-19, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 3.5]} />
          <meshStandardMaterial color={HR_AREA_COLORS[i]}
            transparent opacity={0.08} emissive={HR_AREA_COLORS[i]}
            emissiveIntensity={0.5} depthWrite={false} />
        </mesh>
      ))}
      {emps.slice(0, 12).map((emp, i) => (
        <Station key={emp.id} position={positions[i]}
          color={EMP_COLORS[emp.type] || c.color} status={emp.status} />
      ))}
      <Text position={[-19, 0.1, -8]} fontSize={0.9} color={c.color} anchorX="center" anchorY="middle">
        2F · 人事部
      </Text>
      <pointLight position={[-19, 5, -13]} color={c.color} intensity={3} distance={22} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 3F PROJECT
// ─────────────────────────────────────────────────────────────────
function ZoneProject() {
  const c = FLOORS[2];

  return (
    <group>
      <ScreenMesh position={[19, 3.8, -13]} rotation={[0, Math.PI, 0]} w={16} h={8}
        text="PROJECT TEAMS" subText="4 ACTIVE · AGILE" color={c.color} />
      {[[14, -9], [24, -9], [14, -16], [24, -16]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.4, 32]} />
            <meshStandardMaterial color="#1a2a4a" roughness={0.18} metalness={0.75}
              emissive={TEAM_COLORS[i]} emissiveIntensity={0.22} />
          </mesh>
          <mesh position={[0, 0.46, 0]}>
            <torusGeometry args={[1.4, 0.06, 8, 32]} />
            <meshStandardMaterial color={TEAM_COLORS[i]} emissive={TEAM_COLORS[i]}
              emissiveIntensity={2.2} roughness={0.15} metalness={0.85} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map(j => {
            const a = (j / 6) * Math.PI * 2;
            return (
              <group key={j} position={[Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2]}>
                <mesh position={[0, 0.28, 0]}>
                  <boxGeometry args={[0.5, 0.56, 0.5]} />
                  <meshStandardMaterial color="#0d1a2e" roughness={0.35} metalness={0.65} />
                </mesh>
                <mesh position={[0, 0.6, 0]}>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshStandardMaterial color={TEAM_COLORS[i]} emissive={TEAM_COLORS[i]} emissiveIntensity={3.2} />
                </mesh>
              </group>
            );
          })}
          <Text position={[0, 1.7, 0]} fontSize={0.45} color={TEAM_COLORS[i]} anchorX="center" anchorY="middle">
            TEAM {TEAM_NAMES[i]}
          </Text>
        </group>
      ))}
      <Text position={[19, 0.1, -1]} fontSize={0.9} color={c.color} anchorX="center" anchorY="middle">
        3F · 项目组
      </Text>
      <pointLight position={[19, 5, -10]} color={c.color} intensity={3} distance={22} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 4F COMMAND
// ─────────────────────────────────────────────────────────────────
function ZoneCommand() {
  const c = FLOORS[3];

  return (
    <group>
      <group position={[0, 4.5, -21]}>
        <mesh position={[0, 0, -0.15]}>
          <boxGeometry args={[20, 10, 0.2]} />
          <meshStandardMaterial color="#0a1a0a" roughness={0.18} metalness={0.75} />
        </mesh>
        <ScreenMesh position={[0, 0, 0]} w={19} h={9.5}
          text="COMMAND CENTER" subText="REAL-TIME MISSION CONTROL" color={c.color} />
        <mesh position={[0, 5.0, 0.01]}>
          <boxGeometry args={[19, 0.4, 0.02]} />
          <meshStandardMaterial color={c.color} emissive={c.color}
            emissiveIntensity={4} roughness={0.1} metalness={0.9} />
        </mesh>
      </group>
      {/* KPI 均匀分布在扩大的 command 区域 */}
      {KPI_DATA.map((k, i) => (
        <group key={k.label} position={[
          KPI_POSITIONS[i][0],
          KPI_POSITIONS[i][1],
          [-9, -20, -9, -20][i],
        ]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[4, 2.2, 0.12]} />
            <meshStandardMaterial color="#0a1828" roughness={0.25} metalness={0.75}
              emissive={k.col} emissiveIntensity={0.6} />
          </mesh>
          <Text position={[0, 1.8, 0.07]} fontSize={1.2} color={k.col} anchorX="center" anchorY="middle">
            {k.v}
          </Text>
          <Text position={[0, 0.6, 0.07]} fontSize={0.35} color={k.col} anchorX="center" anchorY="middle">
            {k.label}
          </Text>
        </group>
      ))}
      <mesh position={[0, 0.45, -28]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 48]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.18} metalness={0.75}
          emissive={c.color} emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 0.52, -28]}>
        <torusGeometry args={[3, 0.08, 8, 64]} />
        <meshStandardMaterial color={c.color} emissive={c.color}
          emissiveIntensity={3.5} roughness={0.1} metalness={0.9} />
      </mesh>
      <Text position={[0, 0.1, -35]} fontSize={1.0} color={c.color} anchorX="center" anchorY="middle">
        4F · 任务大厅
      </Text>
      <pointLight position={[0, 6, -20]} color={c.color} intensity={5} distance={35} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6F OPENCLAW CORE
// ─────────────────────────────────────────────────────────────────
interface OC {
  agents?: { count: number; sessions: number };
  tasks?: { active: number; queued: number; running: number; tracked: number };
  gateway?: { reachable: boolean; latency: number };
  memory?: { files: number; chunks: number };
  sessions?: { active: number };
}

function ZoneCore({ oc }: { oc: OC | null }) {
  const c = FLOORS[5];
  const coreRef = useRef<THREE.Group>(null!);
  const ring1   = useRef<THREE.Mesh>(null!);
  const ring2   = useRef<THREE.Mesh>(null!);
  const ring3   = useRef<THREE.Mesh>(null!);
  const elapsed = useRef(0);

  useFrame((_, rawDelta) => {
    // 防止 tab 切换后 delta 跳变（最多累积 100ms）
    const delta = Math.min(rawDelta, 0.1);
    elapsed.current += delta;
    const t = elapsed.current;
    if (coreRef.current) {
      const s = 1 + Math.sin(t * 1.5) * 0.13;
      coreRef.current.scale.set(s, s, s);
      coreRef.current.rotation.y = t * 0.28;
    }
    if (ring1.current) ring1.current.rotation.z = t * 0.4;
    if (ring2.current) ring2.current.rotation.x = t * 0.22;
    if (ring3.current) ring3.current.rotation.y = t * 0.15;
  });

  const nodes = CORE_NODES;

  const getVal = (k: string) => {
    if (!oc) return '—';
    switch (k) {
      case 'ME':       return String(oc.sessions?.active ?? '—');
      case 'AGENTS':   return String(oc.agents?.count ?? '—');
      case 'GATEWAY':  return oc.gateway?.reachable ? `${oc.gateway.latency}ms` : 'OFFLINE';
      case 'TASKS':    return String(oc.tasks?.active ?? 0);
      case 'MEMORY':   return String(oc.memory?.files ?? 0);
      case 'SESSIONS': return String(oc.sessions?.active ?? 0);
      case 'SKILLS':   return '12';
      case 'MCP':      return '8';
      default:         return '—';
    }
  };

  return (
    <group>
      <group ref={coreRef} position={[0, 2.5, -44]}>
        <mesh>
          <icosahedronGeometry args={[1.4, 3]} />
          <meshStandardMaterial color={c.color} emissive={c.color}
            emissiveIntensity={5} roughness={0.05} metalness={0.97} transparent opacity={0.88} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.85, 20, 20]} />
          <meshStandardMaterial color={c.color} emissive={c.color}
            emissiveIntensity={12} transparent opacity={0.7} />
        </mesh>
      </group>
      <group position={[0, 2.5, -44]}>
        <mesh ref={ring1} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[5, 0.07, 10, 80]} />
          <meshStandardMaterial color={c.color} emissive={c.color}
            emissiveIntensity={4} roughness={0.05} metalness={0.97} />
        </mesh>
        <mesh ref={ring2} rotation={[Math.PI / 2, 0.4, 0]}>
          <torusGeometry args={[9, 0.07, 10, 80]} />
          <meshStandardMaterial color={c.color} emissive={c.color}
            emissiveIntensity={3} roughness={0.05} metalness={0.97} />
        </mesh>
        <mesh ref={ring3} rotation={[Math.PI / 5, 0.8, 0]}>
          <torusGeometry args={[13, 0.05, 10, 80]} />
          <meshStandardMaterial color="#E879F9" emissive="#E879F9"
            emissiveIntensity={2} roughness={0.05} metalness={0.97} />
        </mesh>
      </group>
      {nodes.map((n, i) => {
        const a = (i / 8) * Math.PI * 2;
        const R = 14;
        return (
          <group key={n.k} position={[Math.sin(a) * R, 0.7, -44 + Math.cos(a) * R * 0.7]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.4, 0.45, 0.8, 10]} />
              <meshStandardMaterial color="#1a0a2e" roughness={0.25} metalness={0.85} />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <boxGeometry args={[2.6, 1.6, 0.12]} />
              <meshStandardMaterial color={n.col} emissive={n.col}
                emissiveIntensity={1.2} roughness={0.1} metalness={0.9} />
            </mesh>
            <Text position={[0, 2.75, 0]} fontSize={0.28} color={n.col} anchorX="center" anchorY="middle">
              {n.l}
            </Text>
            <Text position={[0, 2.1, 0.07]} fontSize={0.5} color={n.col} anchorX="center" anchorY="middle">
              {getVal(n.k)}
            </Text>
          </group>
        );
      })}
      <group position={[0, 4.5, -48.5]}>
        <mesh position={[0, 0, -0.15]}>
          <boxGeometry args={[28, 10, 0.18]} />
          <meshStandardMaterial color="#0a051a" roughness={0.18} metalness={0.75} />
        </mesh>
        <ScreenMesh position={[0, 0, 0]} w={27} h={9.5}
          text="OPENCLAW CORE"
          subText={oc ? `GW: ${oc.gateway?.reachable ? 'ONLINE · ' + oc.gateway.latency + 'ms' : 'OFFLINE'} · MEM: ${oc.memory?.files ?? 0}` : 'CONNECTING...'}
          color={c.color} />
      </group>
      <Text position={[0, 0.1, -44]} fontSize={1.1} color={c.color} anchorX="center" anchorY="middle">
        6F · OpenClaw 机房
      </Text>
      <pointLight position={[0, 7, -44]}  color={c.color} intensity={6} distance={42} />
      <pointLight position={[0, 4, -51]}  color="#E879F9" intensity={2.5} distance={20} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// 5F ARCHIVE
// ─────────────────────────────────────────────────────────────────
function ZoneArchive() {
  const c = FLOORS[4];
  const rows = [
    { l: 'RESEARCH DOCS', col: '#A78BFA' },
    { l: 'HR FILES',       col: '#4ADE80' },
    { l: 'PROJECT DOCS',   col: '#60A5FA' },
    { l: 'SYSTEM DOCS',    col: '#FBBF24' },
  ];

  return (
    <group>
      <ScreenMesh position={[0, 3.8, -43]} w={50} h={7}
        text="ARCHIVE CENTER" subText="DOCUMENT REPOSITORY · KNOWLEDGE MANAGEMENT" color={c.color} />
      {rows.map((row, ri) => {
        const z = -38 - ri * 4;
        return (
          <group key={ri} position={[0, 0, z]}>
            <Text position={[-22, 2.8, 0]} fontSize={0.45} color={row.col} anchorX="left" anchorY="middle">
              {row.l}
            </Text>
            {Array.from({ length: 5 }).map((_, ci) => {
              const x = -16 + ci * 8;
              return (
                <group key={ci} position={[x, 0, 0]}>
                  <mesh position={[0, 1.3, 0]}>
                    <boxGeometry args={[5, 2.6, 0.9]} />
                    <meshStandardMaterial color="#1a2a1a" roughness={0.35} metalness={0.65}
                      emissive={row.col} emissiveIntensity={0.14} />
                  </mesh>
                  {[0.3, 0.9, 1.5].map((y, di) => (
                    <mesh key={di} position={[0, y, 0.46]}>
                      <boxGeometry args={[4.4, 0.07, 0.02]} />
                      <meshStandardMaterial color={row.col} emissive={row.col}
                        emissiveIntensity={di === 0 ? 3.5 : 0.8} roughness={0.18} metalness={0.82} />
                    </mesh>
                  ))}
                  <mesh position={[1.8, 2.5, 0]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshStandardMaterial color={row.col} emissive={row.col} emissiveIntensity={5} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
      <Text position={[0, 0.1, -43]} fontSize={1.0} color={c.color} anchorX="center" anchorY="middle">
        5F · 档案中心
      </Text>
      <pointLight position={[0, 5, -48]} color={c.color} intensity={3} distance={28} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// ALL WALLS
// ─────────────────────────────────────────────────────────────────
function AllWalls() {
  return (
    <group>
      {/* 外墙 */}
      <Wall x1={-30} z1={30}  x2={30}  z2={30}  />
      <Wall x1={-30} z1={30}  x2={-30} z2={-55} />
      <Wall x1={30}  z1={30}  x2={30}  z2={-55} />
      <Wall x1={-30} z1={-55} x2={30}  z2={-55} />
      {/* Lobby 与下层区域的分隔 */}
      <Wall x1={-30} z1={-8}  x2={30}  z2={-8}  />
      {/* HR/Project 与 Command 的分隔 */}
      <Wall x1={-30} z1={-18} x2={-10} z2={-18} />
      <Wall x1={10}  z1={-18} x2={30}  z2={-18} />
      {/* Command 与 Archive 的分隔 */}
      <Wall x1={-30} z1={-35} x2={30}  z2={-35} />
      {/* X 方向分隔墙：HR | Command | Project */}
      <Wall x1={-10} z1={-8}  x2={-10} z2={-35} />
      <Wall x1={10}  z1={-8}  x2={10}  z2={-35} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// CAMPUS FLOOR — one continuous canvas-textured mesh
// ─────────────────────────────────────────────────────────────────
function CampusFloor() {
  return (
    <mesh position={[0, 0, -12]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 85]} />
      <meshStandardMaterial
        map={floorCanvasTex}
        roughness={0.5}
        metalness={0.85}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────────
function Scene({ oc }: { oc: OC | null }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[0, 50, 0]} intensity={0.6} color="#d8e8f8" />

      <CampusFloor />

      <ZoneLobby />
      <ZoneHR />
      <ZoneProject />
      <ZoneCommand />
      <ZoneCore oc={oc} />
      <ZoneArchive />

      <AllWalls />

      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={15} maxDistance={150}
        minPolarAngle={0.05} maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────
function UIOverlay({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', fontFamily: "'Space Mono', monospace" }}>
      <div style={{
        position: 'absolute', top: 16, left: 20, right: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'auto',
      }}>
        <div>
          <div style={{ color: '#F472B6', fontSize: 22, fontWeight: 'bold', letterSpacing: 3 }}>SOLOFORCE · DIGITAL TWIN</div>
          <div style={{ color: '#60A5FA', fontSize: 13, marginTop: 4 }}>无缝底板 · 数字孪生 · 连续建筑</div>
        </div>
        <button onClick={onBack} style={{
          background: 'rgba(15,25,45,0.85)', border: '1px solid #38BDF8', color: '#38BDF8',
          padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, letterSpacing: 1,
        }}>
          ← 返回楼层
        </button>
      </div>
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        background: 'rgba(5,10,25,0.88)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '12px 16px', pointerEvents: 'auto',
      }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 8, letterSpacing: 2 }}>FLOOR MAP</div>
        {FLOORS.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, boxShadow: `0 0 6px ${f.color}` }} />
            <span style={{ color: f.color, fontSize: 11 }}>{f.label}</span>
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        background: 'rgba(5,10,25,0.7)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '10px 16px', color: '#666', fontSize: 11, pointerEvents: 'auto',
      }}>
        🖱️ 左键拖拽旋转 · 滚轮缩放 · 右键平移
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────
export default function FloorFlatDemo() {
  const navigate = useNavigate();
  const [oc, setOc] = useState<OC | null>(null);
  const [ocError, setOcError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchOC = () => {
      fetch('http://localhost:5301/api/openclaw-status', { signal: controller.signal })
        .then(r => r.json())
        .then(d => {
          if (d.success) { setOc(d.data); setOcError(false); }
          else setOcError(true);
        })
        .catch(e => { if (e.name !== 'AbortError') setOcError(true); })
        .finally(() => setIsLoading(false));
    };
    fetchOC();
    const iv = setInterval(fetchOC, 5000);
    return () => { controller.abort(); clearInterval(iv); };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030810', position: 'relative' }}>
      {/* 加载中骨架 */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#030810', gap: 16,
        }}>
          <div style={{ fontSize: 48, opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }}>◈</div>
          <div style={{ color: '#4a6a8a', fontSize: 13, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>
            LOADING SOLOFORCE...
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }`}</style>
        </div>
      )}
      {/* API 错误 Banner */}
      {ocError && !isLoading && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, padding: '8px 20px',
          background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444',
          borderRadius: 8, color: '#EF4444', fontSize: 12,
          fontFamily: "'Space Mono', monospace", whiteSpace: 'nowrap',
        }}>
          ⚠ OPENCLAW API 离线 — 显示模拟数据
        </div>
      )}
      <Canvas
        camera={{ position: [0, 70, 85], fov: 48 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.setClearColor('#030810'); }}
      >
        <Scene oc={oc} />
      </Canvas>
      <UIOverlay onBack={() => navigate('/')} />
    </div>
  );
}
