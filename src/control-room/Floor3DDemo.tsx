// ===========================================
// SF 3D楼层演示 - Three.js + React Three Fiber
// 展示单层楼的立体效果，办公桌/机柜/地板等
// ===========================================

import { useRef, useState, useMemo, useLayoutEffect, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';

// ===========================================
// 全局状态（模块级，跨组件共享）
// ===========================================
let globalFloorIndex = 3;
let globalTargetY = -3; // 相机目标楼层Y
function setGlobalFloor(v: number) { globalFloorIndex = v; globalTargetY = -v * FLOOR_HEIGHT; }

// 员工数据缓存（模块级）
interface FloorEmployee {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'offline';
  department?: string;
  roleName?: string;
  tasksCompleted?: number;
  efficiency?: number;
}
const floorEmployeesCache: { data: FloorEmployee[]; ts: number } = { data: [], ts: 0 };

// 派发员工选中事件（供外部监听跳转）
function dispatchEmployeeSelect(employeeId: string) {
  window.dispatchEvent(new CustomEvent('floor-employee-select', { detail: { employeeId } }));
}

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
// 大厅统计屏幕（团队/员工/任务概览）
// ===========================================
interface LobbyStats {
  teams: number;
  employees: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksRunning: number;
  tasksFailed: number;
  tasksPending: number;
}

function LobbyStatsScreen({ width = 10.5, height = 5.0, color = '#38BDF8', bgColor = '#000c1a' }: {
  width?: number; height?: number; color?: string; bgColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [stats, setStats] = useState<LobbyStats>({
    teams: 0, employees: 0,
    tasksTotal: 0, tasksCompleted: 0, tasksRunning: 0, tasksFailed: 0, tasksPending: 0,
  });

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    return c;
  }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  // 定时刷新数据
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5301/api/task-history/statistics');
      const result = await res.json();
      if (result.success) {
        const d = result.data;
        setStats({
          teams: d.teamCount || 0,
          employees: d.employeeCount || 12,
          tasksTotal: d.total || 0,
          tasksCompleted: d.completed || 0,
          tasksRunning: d.running || 0,
          tasksFailed: d.failed || 0,
          tasksPending: d.pending || 0,
        });
      }
    } catch (e) {
      // 静默失败，保持旧数据
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // 绘制统计内容
  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    const W = 1024, H = 512;
    ctx.clearRect(0, 0, W, H);

    // 背景
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // 顶部标题条
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, 48);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SOLOFORCE · 数字员工概览', W / 2, 24);

    // ===== 三大核心指标卡片 =====
    const cardW = 280, cardH = 160, cardY = 80;
    const cards = [
      { label: 'TEAMS', value: stats.teams, unit: '个', color: '#60A5FA', icon: '◈' },
      { label: 'DIGITAL WORKERS', value: stats.employees, unit: '人', color: '#4ADE80', icon: '◉' },
      { label: 'TASKS DONE', value: stats.tasksCompleted, unit: '项', color: '#FBBF24', icon: '◆' },
    ];
    cards.forEach((card, i) => {
      const cx = W / 2 - cardW * 1.5 + i * cardW + i * 20;
      // 卡片背景
      ctx.fillStyle = `${card.color}15`;
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
      // 顶角装饰
      ctx.fillStyle = card.color;
      ctx.fillRect(cx + 10, cardY - 1, 40, 3);
      // 图标
      ctx.fillStyle = card.color;
      ctx.font = '22px serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.icon, cx + 16, cardY + 28);
      // 标签
      ctx.fillStyle = `${card.color}cc`;
      ctx.font = '18px "SF Mono", monospace';
      ctx.fillText(card.label, cx + 16, cardY + 55);
      // 数值
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(card.value), cx + cardW / 2, cardY + 115);
      ctx.fillStyle = `${card.color}88`;
      ctx.font = '16px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? `共 ${stats.teams} 个团队` : i === 1 ? `在线 ${stats.employees} 名` : `已完成任务数`, cx + cardW / 2, cardY + 148);
    });

    // ===== 任务状态分布 =====
    const barY = 270;
    ctx.fillStyle = `${color}88`;
    ctx.font = '14px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TASK STATUS', 40, barY - 10);

    const taskData = [
      { label: '已完成', value: stats.tasksCompleted, color: '#22C55E' },
      { label: '进行中', value: stats.tasksRunning, color: '#3B82F6' },
      { label: '待执行', value: stats.tasksPending, color: '#F59E0B' },
      { label: '已失败', value: stats.tasksFailed, color: '#EF4444' },
    ];
    const total = stats.tasksTotal || 1;
    taskData.forEach((item, i) => {
      const bx = 40 + i * 240;
      const barW = (item.value / total) * 180;
      // 背景条
      ctx.fillStyle = `${item.color}22`;
      ctx.beginPath();
      ctx.roundRect(bx, barY, 200, 32, 6);
      ctx.fill();
      // 进度条
      if (barW > 0) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.roundRect(bx, barY, Math.max(barW, 6), 32, 6);
        ctx.fill();
      }
      // 标签+数值
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.label}  ${item.value}`, bx + 8, barY + 21);
    });

    // ===== 底部实时时间 =====
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, H - 36, W, 36);
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    ctx.fillStyle = '#000';
    ctx.font = '16px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LIVE · ${timeStr} · 数据每5秒刷新`, W / 2, H - 16);

    texture.needsUpdate = true;
  }, [stats, color, bgColor, canvas, texture]);

  // 每秒更新时间（不触发数据刷新，只更新时间）
  useEffect(() => {
    const interval = setInterval(() => {
      const ctx = canvas.getContext('2d')!;
      const H = 512;
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, H - 36, 1024, 36);
      ctx.fillStyle = '#000';
      ctx.font = '16px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LIVE · ${timeStr} · 数据每5秒刷新`, 1024 / 2, H - 16);
      texture.needsUpdate = true;
    }, 1000);
    return () => clearInterval(interval);
  }, [canvas, texture]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 前台访客小屏幕
// ===========================================
function ReceptionVisitorScreen({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5301/api/task-history/statistics');
      const r = await res.json();
      if (r.success) {
        const ctx = canvas.getContext('2d')!;
        const W = 256, H = 256;
        ctx.clearRect(0, 0, W, H);
        // 背景
        ctx.fillStyle = '#000c1a';
        ctx.fillRect(0, 0, W, H);
        // 顶部条
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, 36);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('今日访客', W / 2, 24);
        // 访客数
        const visitors = r.data.employeeCount || 12;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 80px "SF Mono", monospace';
        ctx.fillText(String(visitors), W / 2, 160);
        // 单位
        ctx.fillStyle = `${color}cc`;
        ctx.font = '18px "SF Mono", monospace';
        ctx.fillText('DIGITAL VISITORS', W / 2, 200);
        // 任务数小标签
        const tasks = r.data.total || 0;
        ctx.fillStyle = `${color}33`;
        ctx.fillRect(20, 218, W - 40, 28);
        ctx.fillStyle = color;
        ctx.font = 'bold 14px "SF Mono", monospace';
        ctx.fillText(`今日任务 ${tasks}`, W / 2, 237);
        texture.needsUpdate = true;
      }
    } catch (_) {}
  }, [canvas, texture, color]);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 5000); return () => clearInterval(iv); }, [fetchData]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 入口竖向欢迎屏
// ===========================================
function EntranceWelcomeScreen({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5301/api/task-history/statistics');
      const r = await res.json();
      if (r.success) {
        const ctx = canvas.getContext('2d')!;
        const W = 256, H = 512;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#000c1a';
        ctx.fillRect(0, 0, W, H);
        // 顶部标题
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, 60);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SOLOFORCE', W / 2, 38);
        // 欢迎语
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "SF Mono", monospace';
        ctx.fillText('WELCOME', W / 2, 130);
        ctx.font = '22px "SF Mono", monospace';
        ctx.fillStyle = `${color}cc`;
        ctx.fillText('SOLOFORCE', W / 2, 175);
        // 分隔线
        ctx.fillStyle = color;
        ctx.fillRect(30, 200, W - 60, 2);
        // 在线人数
        const online = r.data.employeeCount || 12;
        ctx.fillStyle = color;
        ctx.font = 'bold 14px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ONLINE NOW', W / 2, 240);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px "SF Mono", monospace';
        ctx.fillText(String(online), W / 2, 330);
        ctx.fillStyle = `${color}88`;
        ctx.font = '16px "SF Mono", monospace';
        ctx.fillText('DIGITAL WORKERS', W / 2, 375);
        // 底部状态
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(0, H - 36, W, 36);
        ctx.fillStyle = '#000';
        ctx.font = '14px "SF Mono", monospace';
        ctx.fillText('● SYSTEM ONLINE', W / 2, H - 14);
        texture.needsUpdate = true;
      }
    } catch (_) {}
  }, [canvas, texture, color]);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 5000); return () => clearInterval(iv); }, [fetchData]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1.5, 3.0]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 闸机通行计数器
// ===========================================
function GateCounter({ position, color, side }: { position: [number, number, number]; color: string; side: 'in' | 'out' }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [count, setCount] = useState(Math.floor(Math.random() * 50) + 20);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const draw = useCallback((c: number) => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 18);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(side === 'in' ? 'IN' : 'OUT', 64, 13);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "SF Mono", monospace';
    ctx.fillText(String(c), 64, 50);
    texture.needsUpdate = true;
  }, [canvas, texture, color, side]);

  useEffect(() => { draw(count); }, [count, draw]);
  useEffect(() => {
    const iv = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3)), 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[0.9, 0.45]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 接待台员工工牌展示
// ===========================================
function EmployeeBadge({ position, color, name, dept }: { position: [number, number, number]; color: string; name: string; dept: string }) {
  return (
    <group position={position}>
      {/* 工牌底座 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.5, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* 头像区域 */}
      <mesh position={[0, 0.1, 0.015]}>
        <boxGeometry args={[0.22, 0.22, 0.01]} />
        <meshStandardMaterial color="#001830" roughness={0.1} metalness={0.5} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      {/* 姓名 */}
      <mesh position={[0, -0.1, 0.015]}>
        <boxGeometry args={[0.28, 0.06, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ===========================================
// 员工工位（带屏幕、状态灯，可点击）
// ===========================================
// 岗位类型 → 颜色映射
const EMP_TYPE_COLORS: Record<string, string> = {
  superadmin: '#F59E0B', executor: '#DC2626', manager: '#7C3AED',
  developer: '#3B82F6', designer: '#DB2777', analyst: '#059669',
  writer: '#D97706', support: '#0891B2', researcher: '#7C3AED',
  qa: '#DC2626', devops: '#4B5563', sales: '#EA580C',
};

function EmployeeStation({
  position, employee, stationColor, onClick
}: {
  position: [number, number, number];
  employee: FloorEmployee;
  stationColor: string;
  onClick: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Group>(null!);
  const screenRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const statusColor = employee.status === 'busy' ? '#F59E0B' : employee.status === 'offline' ? '#6B7280' : '#22C55E';

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    const W = 256, H = 256;
    ctx.clearRect(0, 0, W, H);
    // 背景
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, 0, W, H);
    // 顶部色条
    ctx.fillStyle = stationColor;
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(employee.roleName || employee.type, W / 2, 21);
    // 头像占位圆
    ctx.beginPath();
    ctx.arc(W / 2, 90, 38, 0, Math.PI * 2);
    ctx.fillStyle = `${stationColor}33`;
    ctx.fill();
    ctx.strokeStyle = stationColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = stationColor;
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(employee.name.slice(0, 1), W / 2, 90);
    // 姓名
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "SF Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(employee.name, W / 2, 148);
    // 部门
    ctx.fillStyle = `${stationColor}cc`;
    ctx.font = '13px "SF Mono", monospace';
    ctx.fillText(employee.department || '', W / 2, 172);
    // 分隔线
    ctx.fillStyle = `${stationColor}44`;
    ctx.fillRect(20, 188, W - 40, 1);
    // 完成任务数
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TASKS', 20, 210);
    ctx.textAlign = 'right';
    ctx.fillText(String(employee.tasksCompleted || 0), W - 20, 210);
    // 效率
    ctx.fillStyle = `${stationColor}88`;
    ctx.textAlign = 'left';
    ctx.fillText('EFFI', 20, 230);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((employee.efficiency || 0) * 100)}%`, W - 20, 230);
    texture.needsUpdate = true;
  }, [employee, stationColor, canvas, texture]);

  return (
    <group ref={meshRef} position={position} onClick={() => onClick(employee.id)}>
      {/* 工位桌面 */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* 桌腿 */}
      {[[-0.6, 0], [0.6, 0], [-0.6, -0.25], [0.6, -0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* 屏幕背景框 */}
      <mesh position={[0, 1.35, 0.12]}>
        <boxGeometry args={[0.9, 0.75, 0.03]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 屏幕面板 */}
      <mesh ref={screenRef} position={[0, 1.35, 0.14]}>
        <planeGeometry args={[0.85, 0.7]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* 状态指示灯 */}
      <mesh position={[0.55, 1.3, 0.14]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2.0} />
      </mesh>
      {/* 底座装饰 */}
      <mesh position={[0, 0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshStandardMaterial color={stationColor} emissive={stationColor} emissiveIntensity={0.05} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ===========================================
// 员工总览大屏（2F 背景墙）
// ===========================================
function EmployeeOverviewScreen({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);
  const [empData, setEmpData] = useState<FloorEmployee[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, statRes] = await Promise.all([
        fetch('http://localhost:5301/api/employees').then(r => r.json()).catch(() => ({ success: false })),
        fetch('http://localhost:5301/api/task-history/statistics').then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (!empRes.success) return;
      const employees: FloorEmployee[] = empRes.data.items.map((e: any) => ({
        id: e.id, name: e.name, type: e.type,
        status: e.status || 'idle', department: e.department || '',
        roleName: e.roleName || e.type, tasksCompleted: 0, efficiency: Math.random() * 0.4 + 0.6,
      }));
      if (statRes.success) {
        const empStats = statRes.data.employeeStats || {};
        employees.forEach(e => {
          if (empStats[e.id]) {
            e.tasksCompleted = empStats[e.id].tasksCompleted || 0;
            e.efficiency = empStats[e.id].efficiency || 0.8;
          }
        });
      }
      setEmpData(employees);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 5000); return () => clearInterval(iv); }, [fetchData]);

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    const W = 1024, H = 512;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, 0, W, H);

    // 顶部标题条
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, 48);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DIGITAL WORKFORCE · 数字员工总览', W / 2, 24);

    // ===== 四格统计卡片 =====
    const totalEmp = empData.length || 12;
    const onlineEmp = empData.filter(e => e.status !== 'offline').length;
    const busyEmp = empData.filter(e => e.status === 'busy').length;
    const totalTasks = empData.reduce((s, e) => s + (e.tasksCompleted || 0), 0);
    const cards = [
      { label: 'DIGITAL WORKERS', value: totalEmp, color: '#3B82F6' },
      { label: 'ONLINE', value: onlineEmp, color: '#22C55E' },
      { label: 'BUSY', value: busyEmp, color: '#F59E0B' },
      { label: 'TOTAL TASKS', value: totalTasks, color: '#F472B6' },
    ];
    cards.forEach((card, i) => {
      const cx = 40 + i * 242;
      ctx.fillStyle = `${card.color}15`;
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, 68, 222, 110, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = card.color;
      ctx.fillRect(cx + 10, 68, 36, 3);
      ctx.fillStyle = `${card.color}cc`;
      ctx.font = '15px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(card.label, cx + 14, 98);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 44px "SF Mono", monospace';
      ctx.fillText(String(card.value), cx + 14, 155);
    });

    // ===== 员工列表 =====
    const listY = 200;
    ctx.fillStyle = `${color}88`;
    ctx.font = '14px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WORKFORCE ROSTER', 40, listY - 10);

    // 表头
    const cols = [
      { x: 40, label: 'NAME', w: 160 },
      { x: 210, label: 'ROLE', w: 160 },
      { x: 380, label: 'DEPT', w: 160 },
      { x: 550, label: 'STATUS', w: 100 },
      { x: 660, label: 'TASKS', w: 80 },
      { x: 750, label: 'EFFI', w: 80 },
    ];
    ctx.fillStyle = `${color}44`;
    ctx.beginPath();
    ctx.roundRect(36, listY, 820, 28, 6);
    ctx.fill();
    cols.forEach(col => {
      ctx.fillStyle = `${color}bb`;
      ctx.font = 'bold 12px "SF Mono", monospace';
      ctx.fillText(col.label, col.x + 8, listY + 19);
    });

    // 员工行
    const rowH = 28;
    empData.slice(0, 9).forEach((emp, i) => {
      const ry = listY + 28 + i * rowH;
      const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
      ctx.fillStyle = rowBg;
      ctx.beginPath();
      ctx.roundRect(36, ry, 820, rowH - 2, 4);
      ctx.fill();
      const ec = EMP_TYPE_COLORS[emp.type] || color;
      const statusColor = emp.status === 'busy' ? '#F59E0B' : emp.status === 'offline' ? '#6B7280' : '#22C55E';
      ctx.fillStyle = '#fff';
      ctx.font = '13px "SF Mono", monospace';
      ctx.fillText(emp.name, 46, ry + 18);
      ctx.fillStyle = `${ec}cc`;
      ctx.fillText(emp.roleName || emp.type, 216, ry + 18);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(emp.department || '-', 386, ry + 18);
      // 状态点
      ctx.beginPath();
      ctx.arc(596, ry + 14, 5, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '12px "SF Mono", monospace';
      ctx.fillText(emp.status === 'idle' ? '在线' : emp.status === 'busy' ? '忙碌' : '离线', 606, ry + 18);
      ctx.fillText(String(emp.tasksCompleted || 0), 666, ry + 18);
      ctx.fillStyle = `${ec}aa`;
      ctx.fillText(`${Math.round((emp.efficiency || 0) * 100)}%`, 756, ry + 18);
    });

    // 底部状态条
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, H - 36, W, 36);
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    ctx.fillStyle = '#000';
    ctx.font = '15px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LIVE · ${timeStr} · 数字员工人事墙 · 每5秒刷新`, W / 2, H - 14);

    texture.needsUpdate = true;
  }, [empData, color, canvas, texture]);

  // 每秒更新时间
  useEffect(() => {
    const iv = setInterval(() => {
      const ctx = canvas.getContext('2d')!;
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, 512 - 36, 1024, 36);
      ctx.fillStyle = '#000';
      ctx.font = '15px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LIVE · ${timeStr} · 数字员工人事墙 · 每5秒刷新`, 512, 512 - 14);
      texture.needsUpdate = true;
    }, 1000);
    return () => clearInterval(iv);
  }, [canvas, texture]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[12, 6]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 多团队总览大屏（3F 背景墙）
// ===========================================
function TeamOverviewScreen({ width = 12, height = 6, color = '#60A5FA', teams = [] }: {
  width?: number; height?: number; color?: string; teams: any[];
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    const W = 1024, H = 512;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, 48);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROJECT TEAMS · 项目团队总览', W / 2, 24);
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((s: number, t: any) => s + t.memberIds.length, 0);
    const totalTasks = teams.reduce((s: number, t: any) => s + Math.floor(Math.random() * 20) + 5, 0);
    const topCards = [
      { label: 'TEAMS', value: totalTeams, color: '#60A5FA' },
      { label: 'MEMBERS', value: totalMembers, color: '#4ADE80' },
      { label: 'TOTAL TASKS', value: totalTasks, color: '#FBBF24' },
      { label: 'COMPLETED', value: Math.floor(totalTasks * 0.7), color: '#22C55E' },
    ];
    topCards.forEach((card, i) => {
      const cx = 40 + i * 242;
      ctx.fillStyle = `${card.color}15`;
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, 68, 222, 100, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = card.color;
      ctx.fillRect(cx + 10, 68, 36, 3);
      ctx.fillStyle = `${card.color}cc`;
      ctx.font = '15px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(card.label, cx + 14, 98);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px "SF Mono", monospace';
      ctx.fillText(String(card.value), cx + 14, 148);
    });
    const listY = 195;
    ctx.fillStyle = `${color}88`;
    ctx.font = '14px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TEAM ROSTER', 40, listY - 10);
    const cardW = 280, cardH = 130, cardGap = 20;
    const startX = 40;
    teams.slice(0, 3).forEach((team: any, ti) => {
      const cx = startX + ti * (cardW + cardGap);
      const progress = Math.random() * 0.5 + 0.3;
      const tc = ['#60A5FA', '#4ADE80', '#FBBF24'][ti];
      ctx.fillStyle = `${tc}10`;
      ctx.strokeStyle = tc;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, listY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = tc;
      ctx.fillRect(cx + 12, listY + 12, 32, 3);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(team.name, cx + 14, listY + 40);
      ctx.fillStyle = `${tc}cc`;
      ctx.font = '13px "SF Mono", monospace';
      ctx.fillText(`👤  ${team.memberIds.length} 人`, cx + 14, listY + 62);
      ctx.fillStyle = `${tc}22`;
      ctx.beginPath();
      ctx.roundRect(cx + 14, listY + 80, cardW - 28, 16, 4);
      ctx.fill();
      ctx.fillStyle = tc;
      ctx.beginPath();
      ctx.roundRect(cx + 14, listY + 80, (cardW - 28) * progress, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(progress * 100)}% 完成`, cx + cardW / 2, listY + 92);
    });
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, H - 36, W, 36);
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    ctx.fillStyle = '#000';
    ctx.font = '15px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LIVE · ${timeStr} · 项目团队看板 · 每5秒刷新`, W / 2, H - 14);
    texture.needsUpdate = true;
  }, [teams, color, canvas, texture]);

  useEffect(() => {
    const iv = setInterval(() => {
      const ctx = canvas.getContext('2d')!;
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, 512 - 36, 1024, 36);
      ctx.fillStyle = '#000';
      ctx.font = '15px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LIVE · ${timeStr} · 项目团队看板 · 每5秒刷新`, 512, 512 - 14);
      texture.needsUpdate = true;
    }, 1000);
    return () => clearInterval(iv);
  }, [canvas, texture]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 团队进度环（带动画）
// ===========================================
function TeamProgressRing({ centerX, centerY, progress, color, taskCount = 0 }: {
  centerX: number; centerY: number; progress: number; color: string; taskCount?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#000c1a';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(taskCount), 64, 64);
    ctx.fillStyle = color + '88';
    ctx.font = '14px monospace';
    ctx.fillText('TASKS', 64, 88);
    texture.needsUpdate = true;
  }, [taskCount, color, canvas, texture]);

  useFrame(({ clock }) => {
    if (ringRef.current) ringRef.current.rotation.z = clock.elapsedTime * 0.3;
    if (sphereRef.current) sphereRef.current.rotation.y = clock.elapsedTime * 0.5;
  });
  return (
    <group position={[centerX, centerY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.06, 8, 32]} />
        <meshStandardMaterial color={color + '33'} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.08, 8, 32, progress * Math.PI * 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
      </mesh>
      <mesh ref={sphereRef} position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial map={texture} emissive={color} emissiveIntensity={0.3} roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ===========================================
// 流动连线（Hub → 成员）
// ===========================================
function AnimatedFlowLine({ start, end, color }: {
  start: [number, number, number]; end: [number, number, number]; color: string;
}) {
  const geo = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5);
    mid.y += 0.3;
    const curve = new THREE.CatmullRomCurve3([
      s, s.clone().lerp(mid, 0.5), mid, mid.clone().lerp(e, 0.5), e
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.025, 6, false);
  }, [start, end]);

  const points = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5);
    mid.y += 0.3;
    const curve = new THREE.CatmullRomCurve3([s, s.clone().lerp(mid, 0.5), mid, mid.clone().lerp(e, 0.5), e]);
    return curve.getPoints(24);
  }, [start, end]);

  const dashRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (dashRef.current) {
      const t = (clock.elapsedTime * 0.4) % 1;
      const idx = Math.floor(t * points.length);
      dashRef.current.position.copy(points[idx] || points[0]);
    }
  });

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color={`${color}44`} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh ref={dashRef} position={start}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} />
      </mesh>
    </group>
  );
}

// ===========================================
// 团队成员节点
// ===========================================
function TeamMemberNode({ position, member, onClick }: {
  position: [number, number, number]; member: any; onClick: (id: string) => void;
}) {
  const ec = EMP_TYPE_COLORS[member.type] || '#60A5FA';
  const statusColor = member.status === 'busy' ? '#F59E0B' : member.status === 'offline' ? '#6B7280' : '#22C55E';
  return (
    <group position={position} onClick={() => onClick(member.id)}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshStandardMaterial color={ec} emissive={ec} emissiveIntensity={0.1} transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.03, 8, 24]} />
        <meshStandardMaterial color={ec} emissive={ec} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.7, 12]} />
        <meshStandardMaterial color="#080f20" roughness={0.15} metalness={0.9} emissive={ec} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 16]} />
        <meshStandardMaterial color={ec} emissive={ec} emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0.4, 0.7, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} intensity={0.4} color={ec} distance={2.5} />
    </group>
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
          {/* 屏幕面板（团队/员工/任务统计概览） */}
          <LobbyStatsScreen
            width={10.5}
            height={5.0}
            color={config.glowColor}
            bgColor="#000c1a"
          />
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
          {/* 接待屏幕（动态访客统计） */}
          <ReceptionVisitorScreen position={[0, 1.35, 0.15]} color={config.glowColor} />

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
            {/* 闸机通行计数器 */}
            <GateCounter position={[0, 1.6, 0.1]} color={config.glowColor} side="in" />
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

        {/* 入口欢迎竖屏（左侧柱，门框外侧） */}
        <group position={[-5.5, 2.2, 5.2]}>
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[1.6, 3.1, 0.08]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          <EntranceWelcomeScreen position={[0, 0, 0.01]} color={config.glowColor} />
        </group>
        {/* 入口欢迎竖屏（右侧柱，门框外侧） */}
        <group position={[5.5, 2.2, 5.2]}>
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[1.6, 3.1, 0.08]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          <EntranceWelcomeScreen position={[0, 0, 0.01]} color={config.glowColor} />
        </group>

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


  if (floorId === '2f') {
    // 本地状态存储员工数据（楼层切换时重新请求）
    const [empData, setEmpData] = useState<FloorEmployee[]>([]);

    useEffect(() => {
      if (floorId !== '2f') return;
      let cancelled = false;
      (async () => {
        try {
          const [empRes, statRes] = await Promise.all([
            fetch('http://localhost:5301/api/employees').then(r => r.json()).catch(() => ({ success: false })),
            fetch('http://localhost:5301/api/task-history/statistics').then(r => r.json()).catch(() => ({ success: false })),
          ]);
          if (cancelled) return;
          const employees: FloorEmployee[] = empRes.success
            ? empRes.data.items.map((e: any) => ({
                id: e.id, name: e.name, type: e.type,
                status: e.status || 'idle',
                department: e.department || '',
                roleName: e.roleName || e.type,
                tasksCompleted: 0, efficiency: Math.random() * 0.4 + 0.6,
              }))
            : [];
          if (statRes.success) {
            const empStats = statRes.data.employeeStats || {};
            employees.forEach(e => {
              if (empStats[e.id]) {
                e.tasksCompleted = empStats[e.id].tasksCompleted || 0;
                e.efficiency = empStats[e.id].efficiency || Math.random() * 0.4 + 0.6;
              }
            });
          }
          setEmpData(employees);
        } catch (_) {}
      })();
      return () => { cancelled = true; };
    }, [floorId]);

    // 12个员工按顺序排列（4×3网格），位置与部门对应
    const rowColors = ['#3B82F6', '#4ADE80', '#FBBF24'];
    const rowLabels = ['技术研发部', '运营分析部', '管理支持部'];
    const stationPositions: [number, number, number][] = [
      // 第1排（技术）
      [-4.2, 0, -1.5], [-1.4, 0, -1.5], [1.4, 0, -1.5], [4.2, 0, -1.5],
      // 第2排（运营）
      [-4.2, 0, 0.5],   [-1.4, 0, 0.5],   [1.4, 0, 0.5],   [4.2, 0, 0.5],
      // 第3排（管理）
      [-4.2, 0, 2.5],   [-1.4, 0, 2.5],   [1.4, 0, 2.5],   [4.2, 0, 2.5],
    ];

    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.25} metalness={0.4} emissive={config.glowColor} emissiveIntensity={0.04} />
        </mesh>
        <gridHelper args={[16, 24, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.12} transparent />

        {/* ===== 背景墙员工总览大屏 ===== */}
        <group position={[0, 3.2, -5.7]}>
          {/* 屏幕框架 */}
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[12.4, 6.4, 0.12]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 主屏幕 */}
          <EmployeeOverviewScreen position={[0, 0, 0]} color={config.glowColor} />
          {/* 顶部装饰条 */}
          <mesh position={[0, 3.2, 0.01]}>
            <boxGeometry args={[12.0, 0.35, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
          </mesh>
          {/* 左右补光 */}
          <pointLight position={[-7, 0, 1]} intensity={0.5} color={config.glowColor} distance={6} />
          <pointLight position={[7, 0, 1]} intensity={0.5} color={config.glowColor} distance={6} />
        </group>

        {/* 三排部门分区地面标签 */}
        {[-1.5, 0.5, 2.5].map((z, ri) => (
          <mesh key={ri} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 1.4]} />
            <meshStandardMaterial color={rowColors[ri]} emissive={rowColors[ri]} emissiveIntensity={0.04} transparent opacity={0.25} />
          </mesh>
        ))}

        {/* 12个员工工位 */}
        {empData.slice(0, 12).map((emp, i) => (
          <EmployeeStation
            key={emp.id}
            position={stationPositions[i]}
            employee={emp}
            stationColor={EMP_TYPE_COLORS[emp.type] || config.glowColor}
            onClick={dispatchEmployeeSelect}
          />
        ))}

        {/* 环境光 */}
        <pointLight position={[0, 5, 0]} intensity={1.5} color={config.glowColor} distance={18} />
        <rectAreaLight position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} width={16} height={12} intensity={0.8} color={config.glowColor} />
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

  if (floorId === '3f') {
    // 获取团队数据
    const [teamsData, setTeamsData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);

    useEffect(() => {
      if (floorId !== '3f') return;
      let cancelled = false;
      (async () => {
        try {
          const [teamsRes, empRes] = await Promise.all([
            fetch('http://localhost:5301/api/teams').then(r => r.json()).catch(() => ({ success: false })),
            fetch('http://localhost:5301/api/employees').then(r => r.json()).catch(() => ({ success: false })),
          ]);
          if (cancelled) return;
          setTeamsData(teamsRes.success ? teamsRes.data : []);
          setEmpData(empRes.success ? empRes.data.items : []);
        } catch (_) {}
      })();
      return () => { cancelled = true; };
    }, [floorId]);

    // 背景大屏尺寸
    const screenW = 12, screenH = 5.5;
    // 团队 Hub 布局参数
    const hubRadius = 2.8; // Hub 到成员的半径
    const hubSpacing = 5.5; // 团队 Hub 之间的间距
    const hubY = 0; // Hub 的 y 坐标（地面）

    // 稳定的模拟数据（避免每次渲染随机闪烁）
    const teamProgressMap = useMemo(() => {
      const map: Record<string, {progress: number, taskCount: number}> = {};
      teamsData.forEach((t: any) => {
        map[t.id] = { progress: Math.random() * 0.4 + 0.5, taskCount: Math.floor(Math.random() * 20) + 5 };
      });
      return map;
    }, [teamsData]);

    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.25} metalness={0.4} emissive={config.glowColor} emissiveIntensity={0.04} />
        </mesh>
        <gridHelper args={[16, 24, config.glowColor, config.glowColor]} position={[0, 0.01, 0]} opacity={0.12} transparent />

        {/* ===== 背景墙多团队总览大屏 ===== */}
        <group position={[0, 3.2, -5.7]}>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[12.4, 6.4, 0.12]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          <TeamOverviewScreen
            width={12}
            height={6}
            color={config.glowColor}
            teams={teamsData}
          />
          <mesh position={[0, 3.0, 0.01]}>
            <boxGeometry args={[12.0, 0.3, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[-7, 0, 1]} intensity={0.5} color={config.glowColor} distance={6} />
          <pointLight position={[7, 0, 1]} intensity={0.5} color={config.glowColor} distance={6} />
        </group>

        {/* ===== 多团队 Hub + 成员辐射布局 ===== */}
        {teamsData.slice(0, 3).map((team, ti) => {
          const hubX = (ti - 1) * hubSpacing;
          const members = team.memberIds
            .map((id: string) => empData.find((e: any) => e.id === id))
            .filter(Boolean);
          const leader = members.find((m: any) => m.type === 'manager') || members[0];
          const memberCount = members.length;
          const taskCount = Math.floor(Math.random() * 20) + 5; // 模拟

          return (
            <group key={team.id} position={[hubX, 0, 0]}>
              {/* HUB GLOW BASE */}
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.2, 32]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.15} transparent opacity={0.6} />
              </mesh>
              {/* SPIN RING */}
              <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.2, 0.03, 8, 32]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} />
              </mesh>

              {/* TEAM NAME PLATE with 3D text */}
              <group position={[0, 2.0, 0]}>
                <mesh>
                  <boxGeometry args={[2.2, 0.6, 0.06]} />
                  <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.8} roughness={0.3} metalness={0.5} />
                </mesh>
                <Text
                  position={[0, 0.04, 0.07]}
                  fontSize={0.26}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                >
                  {team.name}
                </Text>
                <mesh position={[0, 0.1, 0.07]}>
                  <boxGeometry args={[1.8, 0.06, 0.01]} />
                  <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
                </mesh>
                {leader && (
                  <Text
                    position={[0, -0.22, 0.07]}
                    fontSize={0.12}
                    color={config.glowColor}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {leader.name}
                  </Text>
                )}
              </group>

              {/* PROGRESS RING */}
              <TeamProgressRing centerX={0} centerY={1.0} progress={teamProgressMap[team.id]?.progress ?? 0.7} color={config.glowColor} taskCount={taskCount} />

              {/* FLOW LINES */}
              {members.slice(0, 6).map((member: any, mi: number) => {
                const angle = (mi / Math.min(members.length, 6)) * Math.PI * 2 - Math.PI / 2;
                const mx = Math.cos(angle) * hubRadius;
                const mz = Math.sin(angle) * hubRadius;
                return (
                  <group key={member.id}>
                    <AnimatedFlowLine
                      start={[0, 1.0, 0]}
                      end={[mx, 0.5, mz]}
                      color={config.glowColor}
                    />
                    <TeamMemberNode
                      position={[mx, 0, mz]}
                      member={member}
                      onClick={dispatchEmployeeSelect}
                    />
                  </group>
                )}
              )}

              {/* HUB LIGHT */}
              <pointLight position={[0, 2, 0]} intensity={0.8} color={config.glowColor} distance={5} />
            </group>
          );
        })}

        {/* NO TEAMS HINT */}
        {teamsData.length === 0 && (
          <group position={[0, 1.5, 0]}>
            <mesh>
              <boxGeometry args={[6, 1.5, 0.1]} />
              <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <planeGeometry args={[5.8, 1.3]} />
              <meshBasicMaterial color="#000c1a" />
            </mesh>
          </group>
        )}

        {/* 环境光 */}
        <pointLight position={[0, 5, 0]} intensity={1.5} color={config.glowColor} distance={18} />
        <rectAreaLight position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} width={16} height={12} intensity={0.8} color={config.glowColor} />
        <pointLight position={[0, 4.5, 4.5]} intensity={0.4} color={config.glowColor} distance={8} />
        <pointLight position={[-6, 2, -1]} intensity={0.3} color={config.glowColor} distance={8} />
        <pointLight position={[6, 2, -1]} intensity={0.3} color={config.glowColor} distance={8} />
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

  // 监听员工选中事件，跳转到员工详情
  useEffect(() => {
    const handler = (e: Event) => {
      const { employeeId } = (e as CustomEvent).detail;
      // 尝试跳转到员工管理界面并选中对应员工
      window.dispatchEvent(new CustomEvent('navigate-to-employee', { detail: { employeeId } }));
    };
    window.addEventListener('floor-employee-select', handler);
    return () => window.removeEventListener('floor-employee-select', handler);
  }, []);

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
