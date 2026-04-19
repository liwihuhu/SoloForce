/**
 * FloorFlatDemo — 楼层拼接平铺视图
 *
 * 策略：
 * - 6 个楼层的内容直接横向拼接，X 方向一字排开
 * - 正交俯视相机（orthographic），从上往下看
 * - 每个 Zone 内容保持原有 3D 结构，仅加 X 偏移
 * - OrbitControls 支持平移和缩放（锁定旋转）
 *
 * 布局（X 轴方向）：
 * 1F: x=0      (大厅)
 * 2F: x=80     (人事部)
 * 3F: x=160    (项目组)
 * 4F: x=240    (任务大厅)
 * 5F: x=310    (档案中心)
 * 6F: x=380    (OpenClaw 机房)
 */

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────
// 常量配置
// ─────────────────────────────────────────────────────────────────
const WALL_H = 3.5;
const WALL_T = 0.18;

// 楼层 X 轴偏移量（横向拼接）
const FLOOR_X: Record<string, number> = {
  '1f': 0,
  '2f': 80,
  '3f': 160,
  '4f': 240,
  '5f': 310,
  '6f': 380,
};

const FLOORS = [
  { id: '1f', label: '1F 大厅',          color: '#38BDF8' },
  { id: '2f', label: '2F 人事部',         color: '#4ADE80' },
  { id: '3f', label: '3F 项目组',         color: '#60A5FA' },
  { id: '4f', label: '4F 任务大厅',       color: '#FBBF24' },
  { id: '5f', label: '5F 档案中心',       color: '#A3E635' },
  { id: '6f', label: '6F OpenClaw 机房',  color: '#F472B6' },
];

// 模块级静态数据
const LOBBY_VISITORS = Math.floor(Math.random() * 18) + 4;
const TEAM_NAMES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;
const TEAM_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EC4899'] as const;
const KPI_DATA = [
  { label: 'ACTIVE',    v: '12',  col: '#EF4444' },
  { label: 'RUNNING',  v: '5',   col: '#F59E0B' },
  { label: 'QUEUED',    v: '23',  col: '#60A5FA' },
  { label: 'COMPLETED', v: '847', col: '#22C55E' },
] as const;
const KPI_POSITIONS: [number, number, number][] = [[-8,-8,0],[-8,-18,0],[8,-8,0],[8,-18,0]];
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

// ─────────────────────────────────────────────────────────────────
// ScreenMesh — 通用屏幕
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
// Wall — 隔墙（支持任意两点定义）
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
  const vis = LOBBY_VISITORS;
  return (
    <group>
      {[-20, -13, -6, 0, 6, 13, 20].map((x, i) => (
        <group key={i} position={[x, 0, 14]}>
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
      <mesh position={[0, 0.6, 6]}>
        <boxGeometry args={[16, 1.2, 2.2]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.25} metalness={0.75} emissive={c.color} emissiveIntensity={0.35} />
      </mesh>
      <ScreenMesh position={[0, 1.9, 5.2]} w={14} h={3.5}
        text="RECEPTION" subText={`VISITORS: ${vis}`} color={c.color} />
      <ScreenMesh position={[0, 4, 18]} rotation={[0, Math.PI, 0]} w={56} h={10}
        text="WELCOME TO SOLOFORCE" subText="数字孪生 · 智慧协同 · 创新未来" color={c.color} />
      <ScreenMesh position={[-2, 3.5, -1]} w={18} h={7}
        text="SOLOFORCE" subText="DIGITAL TWIN HQ" color={c.color} />
      {[[-24, 10], [-24, 0], [24, 10], [24, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.75, z]}>
          <cylinderGeometry args={[0.4, 0.4, 3.5, 12]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.8} emissive={c.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
      {[[-16, 3], [0, 3], [16, 3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <boxGeometry args={[6, 0.6, 1.4]} />
          <meshStandardMaterial color="#1a2a4a" roughness={0.35} metalness={0.7} emissive={c.color} emissiveIntensity={0.1} />
        </mesh>
      ))}
      <Text position={[0, 0.1, 20]} fontSize={1.1} color={c.color} anchorX="center" anchorY="middle">
        1F · 大厅
      </Text>
      <pointLight position={[0, 6, 8]}   color={c.color} intensity={4}  distance={40} />
      <pointLight position={[-20, 4, 14]} color={c.color} intensity={1.5} distance={16} />
      <pointLight position={[20,  4, 14]} color={c.color} intensity={1.5} distance={16} />
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
          <meshStandardMaterial color={['#3B82F6', '#4ADE80', '#FBBF24'][i]}
            transparent opacity={0.08} emissive={['#3B82F6', '#4ADE80', '#FBBF24'][i]}
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
      <Text position={[19, 0.1, -8]} fontSize={0.9} color={c.color} anchorX="center" anchorY="middle">
        3F · 项目组
      </Text>
      <pointLight position={[19, 5, -13]} color={c.color} intensity={3} distance={22} />
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
      {KPI_DATA.map((k, i) => (
        <group key={k.label} position={[KPI_POSITIONS[i][0], KPI_POSITIONS[i][1], [-9,-20,-9,-20][i]]}>
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
      <group ref={coreRef} position={[0, 2.5, -22]}>
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
      <group position={[0, 2.5, -22]}>
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
          <group key={n.k} position={[Math.sin(a) * R, 0.7, -22 + Math.cos(a) * R * 0.7]}>
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
      <group position={[0, 4.5, -31]}>
        <mesh position={[0, 0, -0.15]}>
          <boxGeometry args={[28, 10, 0.18]} />
          <meshStandardMaterial color="#0a051a" roughness={0.18} metalness={0.75} />
        </mesh>
        <ScreenMesh position={[0, 0, 0]} w={27} h={9.5}
          text="OPENCLAW CORE"
          subText={oc ? `GW: ${oc.gateway?.reachable ? 'ONLINE · ' + oc.gateway.latency + 'ms' : 'OFFLINE'} · MEM: ${oc.memory?.files ?? 0}` : 'CONNECTING...'}
          color={c.color} />
      </group>
      <Text position={[0, 0.1, -22]} fontSize={1.1} color={c.color} anchorX="center" anchorY="middle">
        6F · OpenClaw 机房
      </Text>
      <pointLight position={[0, 7, -22]}  color={c.color} intensity={6} distance={42} />
      <pointLight position={[0, 4, -31]}  color="#E879F9" intensity={2.5} distance={20} />
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
      <ScreenMesh position={[0, 3.8, -15]} w={50} h={7}
        text="ARCHIVE CENTER" subText="DOCUMENT REPOSITORY · KNOWLEDGE MANAGEMENT" color={c.color} />
      {rows.map((row, ri) => {
        const z = -18 - ri * 4;
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
      <Text position={[0, 0.1, -15]} fontSize={1.0} color={c.color} anchorX="center" anchorY="middle">
        5F · 档案中心
      </Text>
      <pointLight position={[0, 5, -18]} color={c.color} intensity={3} distance={28} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// CAMPUS FLOOR — 6 个楼层各自的地面（拼接）
// ─────────────────────────────────────────────────────────────────
function CampusFloor() {
  return (
    <>
      {FLOORS.map(f => (
        <mesh key={f.id} position={[FLOOR_X[f.id], 0, -12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color={f.color}
            roughness={0.5}
            metalness={0.85}
            emissive={f.color}
            emissiveIntensity={0.04}
          />
        </mesh>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCENE — 6 楼层横向拼接
// ─────────────────────────────────────────────────────────────────
function Scene({ oc }: { oc: OC | null }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[0, 50, 0]} intensity={0.6} color="#d8e8f8" />

      <CampusFloor />

      {/* 1F Lobby (x=0) */}
      <group position={[FLOOR_X['1f'], 0, 0]}>
        <ZoneLobby />
        {/* 1F 外墙 */}
        <Wall x1={-30} z1={25} x2={30}  z2={25}  />
        <Wall x1={-30} z1={25} x2={-30} z2={-55} />
        <Wall x1={30}  z1={25} x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
      </group>

      {/* 2F HR (x=80) */}
      <group position={[FLOOR_X['2f'], 0, 0]}>
        <ZoneHR />
        <Wall x1={-30} z1={5}  x2={30}  z2={5}  />
        <Wall x1={-30} z1={5}  x2={-30} z2={-55} />
        <Wall x1={30}  z1={5}  x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
        <Wall x1={-10} z1={5}  x2={-10} z2={-55} />
      </group>

      {/* 3F Project (x=160) */}
      <group position={[FLOOR_X['3f'], 0, 0]}>
        <ZoneProject />
        <Wall x1={-30} z1={5}  x2={30}  z2={5}  />
        <Wall x1={-30} z1={5}  x2={-30} z2={-55} />
        <Wall x1={30}  z1={5}  x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
        <Wall x1={10}  z1={5}  x2={10}  z2={-55} />
      </group>

      {/* 4F Command (x=240) */}
      <group position={[FLOOR_X['4f'], 0, 0]}>
        <ZoneCommand />
        <Wall x1={-30} z1={5}  x2={30}  z2={5}  />
        <Wall x1={-30} z1={5}  x2={-30} z2={-55} />
        <Wall x1={30}  z1={5}  x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
        <Wall x1={-10} z1={5}  x2={-10} z2={-55} />
        <Wall x1={10}  z1={5}  x2={10}  z2={-55} />
      </group>

      {/* 5F Archive (x=310) */}
      <group position={[FLOOR_X['5f'], 0, 0]}>
        <ZoneArchive />
        <Wall x1={-30} z1={5}  x2={30}  z2={5}  />
        <Wall x1={-30} z1={5}  x2={-30} z2={-55} />
        <Wall x1={30}  z1={5}  x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
      </group>

      {/* 6F Core (x=380) */}
      <group position={[FLOOR_X['6f'], 0, 0]}>
        <ZoneCore oc={oc} />
        <Wall x1={-30} z1={5}  x2={30}  z2={5}  />
        <Wall x1={-30} z1={5}  x2={-30} z2={-55} />
        <Wall x1={30}  z1={5}  x2={30}  z2={-55} />
        <Wall x1={-30} z1={-55} x2={30} z2={-55} />
      </group>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        minDistance={50}
        maxDistance={600}
        target={[205, 0, -15]}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// UI OVERLAY
// ─────────────────────────────────────────────────────────────────
function UIOverlay({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', fontFamily: "'Space Mono', monospace" }}>
      <div style={{
        position: 'absolute', top: 16, left: 20, right: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(5,10,25,0.7)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 16px', color: '#4a6a8a',
            cursor: 'pointer', fontSize: 11, pointerEvents: 'auto',
            fontFamily: "'Space Mono', monospace",
          }}
        >
          ← 返回 3D 视图
        </button>
        <div style={{
          background: 'rgba(5,10,25,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '8px 16px', color: '#4a6a8a', fontSize: 11,
        }}>
          <div style={{ marginBottom: 6, letterSpacing: 2 }}>SOLOFORCE · 楼层总览</div>
          {FLOORS.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, boxShadow: `0 0 6px ${f.color}` }} />
              <span style={{ color: f.color, fontSize: 11 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(5,10,25,0.7)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '10px 24px', color: '#666', fontSize: 11,
        pointerEvents: 'auto', whiteSpace: 'nowrap',
      }}>
        🖱️ 拖拽平移 · 滚轮缩放 · 点击区域查看详情
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
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#030810', gap: 16,
        }}>
          <div style={{ fontSize: 48, opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }}>◈</div>
          <div style={{ color: '#4a6a8a', fontSize: 13, letterSpacing: 2 }}>
            LOADING SOLOFORCE...
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }`}</style>
        </div>
      )}
      {ocError && !isLoading && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, padding: '8px 20px',
          background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444',
          borderRadius: 8, color: '#EF4444', fontSize: 12,
          whiteSpace: 'nowrap',
        }}>
          ⚠ OPENCLAW API 离线 — 显示模拟数据
        </div>
      )}
      <Canvas
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.setClearColor('#030810'); }}
      >
        <PerspectiveCamera
          makeDefault
          position={[205, 280, 0.5]}
          fov={55}
          near={0.1}
          far={1000}
        />
        />
        <Scene oc={oc} />
      </Canvas>
      <UIOverlay onBack={() => navigate('/')} />
    </div>
  );
}
