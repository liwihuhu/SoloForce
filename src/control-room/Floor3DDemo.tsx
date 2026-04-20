// ===========================================
// SF 3D楼层演示 - Three.js + React Three Fiber
// 展示单层楼的立体效果，办公桌/机柜/地板等
// ===========================================

import { useRef, useState, useMemo, useLayoutEffect, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';

// ===========================================
// 楼层工具函数（纯函数，无副作用）
// ===========================================
function getFloorY(floorIndex: number) {
  return -floorIndex * FLOOR_HEIGHT;
}
function getFloorIndex(floorId: string) {
  return FLOORS.findIndex(f => f.id === floorId);
}

// Shared floor config (imported)
import { FLOORS, FLOOR_XZ, FLOOR_HEIGHT } from './floorConfigs';
import { type FloorEmployee, floorEmployeesCache, dispatchEmployeeSelect } from './employeeState';


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
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={2.5} />
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
// 6F OpenClaw机房 - 超级大脑核心状态屏
function CoreStatsScreen({ width, height, color, ocStatus }: { width: number; height: number; color: string; ocStatus: any }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useEffect(() => {
    const ctx = canvas.getContext('2d')!;
    const W = 1024, H = 512;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, 0, W, H);
    const d = ocStatus || {};
    const gw = d.gateway || {};
    const ag = d.agents || {};
    const mem = d.memory || {};
    const ts = d.tasks || {};
    const ss = d.sessions || {};
    // Header
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 26px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPENCLAW SYSTEM STATUS', W / 2, 40);
    // Gateway circle (top right)
    const gColor = gw.reachable ? '#22C55E' : '#EF4444';
    ctx.fillStyle = gColor;
    ctx.beginPath();
    ctx.arc(W - 100, 100, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gw.reachable ? 'ONLINE' : 'OFFLINE', W - 100, 96);
    ctx.fillText(gw.latency ? gw.latency + 'ms' : '0ms', W - 100, 114);
    // 6 KPI cards
    const sec = d.security || {};
    const hb = d.heartbeat || {};
    const cardW = 148, cardH = 130, gap = 14;
    const cards = [
      { label: 'AGENTS', value: ag.count || 0, sub: (ag.sessions || 0) + ' sessions', color: '#F472B6' },
      { label: 'GATEWAY', value: gw.latency ? gw.latency + 'ms' : '--', sub: gw.reachable ? 'ONLINE' : 'OFFLINE', color: '#A78BFA' },
      { label: 'TASKS', value: ts.active || 0, sub: 'q:' + (ts.queued || 0) + ' r:' + (ts.running || 0), color: '#60A5FA' },
      { label: 'MEMORY', value: mem.files || 0, sub: (mem.chunks || 0) + ' chunks', color: '#4ADE80' },
      { label: 'SECURITY', value: (sec.critical || 0) + (sec.warn || 0), sub: 'c:' + (sec.critical || 0) + ' w:' + (sec.warn || 0), color: (sec.critical || 0) > 0 ? '#EF4444' : '#FBBF24' },
      { label: 'HEARTBEAT', value: hb.interval || '--', sub: hb.target || '--', color: '#38BDF8' },
    ];
    const startX = (W - (cardW * 6 + gap * 5)) / 2;
    cards.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      const y = 80;
      ctx.fillStyle = '#0a1828';
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = card.color;
      ctx.fillRect(x + 4, y + 4, cardW - 8, 4);
      ctx.fillStyle = card.color;
      ctx.font = 'bold 11px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(card.label, x + 10, y + 26);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px "SF Mono", monospace';
      ctx.fillText(String(card.value), x + 10, y + 90);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "SF Mono", monospace';
      ctx.fillText(card.sub, x + 10, y + 115);
    });
    // Second row: SESSIONS + SKILLS + MCP + VERSION
    const row2Y = 230;
    const secCards = [
      { label: 'SESSIONS', value: ss.active || 0, sub: ss.model || 'MiniMax-M2.7', color: '#38BDF8' },
      { label: 'SKILLS', value: d.skills ?? 0, sub: 'installed', color: '#FBBF24' },
      { label: 'MCP', value: d.mcp ?? 0, sub: 'extensions', color: '#FB923C' },
      { label: 'VERSION', value: d.version || '--', sub: d.channel || 'stable', color: '#E879F9' },
    ];
    const row2StartX = (W - (cardW * 4 + gap * 3)) / 2;
    secCards.forEach((card, i) => {
      const x = row2StartX + i * (cardW + gap);
      ctx.fillStyle = '#0a1828';
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, row2Y, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = card.color;
      ctx.fillRect(x + 4, row2Y + 4, cardW - 8, 4);
      ctx.fillStyle = card.color;
      ctx.font = 'bold 11px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(card.label, x + 10, row2Y + 26);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px "SF Mono", monospace';
      ctx.fillText(String(card.value), x + 10, row2Y + 88);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "SF Mono", monospace';
      ctx.fillText(card.sub, x + 10, row2Y + 113);
    });
    // System bar
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, H - 44, W, 44);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPENCLAW SYSTEM  |  5s REFRESH  |  ' + (d.tailscale === 'on' ? 'TS:ON' : 'TS:OFF'), W / 2, H - 16);
    texture.needsUpdate = true;
  }, [ocStatus]);


  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 6F OpenClaw机房 - 单个终端数据屏幕
function TerminalScreen({ width, height, color, data, statusColor }: { width: number; height: number; color: string; data: any; statusColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    return c;
  }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  // 数据变化时绘制
  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 512, H = 256;

    // 背景
    ctx.fillStyle = '#050f1e';
    ctx.fillRect(0, 0, W, H);

    const status = data?.status ?? 'OFFLINE';
    const bigNum = data ? String(data.value1) : '--';
    const unit = data?.unit ?? '';
    const value2 = data?.value2;
    const value3 = data?.value3;
    const ratio = (value2 != null && value2 > 0 && value3 > 0)
      ? Math.min(value2 / value3, 1) : 0.6;

    // 顶部色带
    ctx.fillStyle = statusColor;
    ctx.fillRect(0, 0, W, 32);

    // 状态文字
    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(status, W / 2, 22);

    // 主数字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 100px monospace';
    ctx.fillText(bigNum, W / 2, H / 2 + 28);

    // 单位
    ctx.fillStyle = color;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(unit, W / 2, H - 26);

    // 进度条底
    const bW = W * 0.82, bH = 14, bX = W * 0.09, bY = H - 52;
    ctx.fillStyle = '#0d2040';
    ctx.fillRect(bX, bY, bW, bH);

    // 进度条填充
    ctx.fillStyle = statusColor;
    ctx.fillRect(bX, bY, bW * ratio, bH);

    texture.needsUpdate = true;
  }, [data, statusColor, color]);

  return (
    <group>
      {/* fallback 有色背景 */}
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* canvas 纹理屏幕 */}
      <mesh ref={meshRef} position={[0, 0, 0.036]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

// ===========================================
// 4F任务指挥大厅 - 任务数据总屏
function TaskCommandScreen({ width, height, color }: { width: number; height: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const draw = useCallback(async () => {
    try {
      const [statRes, teamsRes] = await Promise.all([
        fetch('http://localhost:5301/api/task-history/statistics').then(r => r.json()).catch(() => null),
        fetch('http://localhost:5301/api/teams').then(r => r.json()).catch(() => null),
      ]);
      const ctx = canvas.getContext('2d')!;
      const W = 1024, H = 512;
      ctx.clearRect(0, 0, W, H);

      // 背景
      ctx.fillStyle = '#000c1a';
      ctx.fillRect(0, 0, W, H);

      // 顶部标题栏
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, 52);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 22px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SOLOFORCE 任务指挥中心  TASK COMMAND CENTER', W / 2, 34);

      // 实时时钟
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}  ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      ctx.fillStyle = '#000';
      ctx.font = '14px "SF Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(timeStr, W - 16, 34);

      // 分隔线
      ctx.fillStyle = color;
      ctx.fillRect(0, 52, W, 2);

      // ===== 4个核心指标卡片 =====
      const stats = statRes?.success ? statRes.data : {};
      const total = stats.totalTasks || 0;
      const completed = stats.completedTasks || 0;
      const active = stats.inProgressTasks || 0;
      const failed = stats.failedTasks || 0;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const teams = teamsRes?.success ? teamsRes.data : [];
      const empCount = teams.reduce((s: number, t: any) => s + (t.memberIds?.length || 0), 0);

      const kpis = [
        { label: 'TOTAL TASKS', value: total, unit: 'T', color: '#fff' },
        { label: 'COMPLETED', value: completed, unit: 'T', color: '#22C55E' },
        { label: 'IN PROGRESS', value: active, unit: 'T', color: color },
        { label: 'SUCCESS RATE', value: rate, unit: '%', color: '#FBBF24' },
      ];
      const cardW = 220, cardH = 140, gap = 24;
      const startX = (W - (cardW * 4 + gap * 3)) / 2;
      kpis.forEach((kpi, i) => {
        const x = startX + i * (cardW + gap);
        const y = 70;
        // 卡片背景
        ctx.fillStyle = '#011a2e';
        ctx.strokeStyle = kpi.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 6);
        ctx.fill();
        ctx.stroke();
        // 顶部色条
        ctx.fillStyle = kpi.color;
        ctx.fillRect(x + 4, y + 4, cardW - 8, 4);
        // 标签
        ctx.fillStyle = `${kpi.color}aa`;
        ctx.font = '12px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(kpi.label, x + cardW / 2, y + 32);
        // 数值
        ctx.fillStyle = kpi.color;
        ctx.font = 'bold 52px "SF Mono", monospace';
        ctx.fillText(String(kpi.value), x + cardW / 2, y + 100);
        ctx.font = '18px "SF Mono", monospace';
        ctx.fillText(kpi.unit, x + cardW / 2 + 60, y + 90);
      });

      // ===== 团队任务进度列表 =====
      const listX = 40, listY = 230, listW = W - 80;
      ctx.fillStyle = `${color}33`;
      ctx.beginPath();
      ctx.roundRect(listX, listY, listW, 260, 8);
      ctx.fill();

      // 表头
      ctx.fillStyle = color;
      ctx.font = 'bold 14px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TEAM', listX + 16, listY + 26);
      ctx.fillText('MEMBERS', listX + 180, listY + 26);
      ctx.fillText('PROGRESS', listX + 340, listY + 26);
      ctx.fillText('STATUS', listX + 620, listY + 26);
      ctx.fillStyle = `${color}44`;
      ctx.fillRect(listX + 8, listY + 36, listW - 16, 1);

      teams.slice(0, 6).forEach((team: any, i: number) => {
        const rowY = listY + 50 + i * 36;
        const done = Math.floor(Math.random() * 20) + 5;
        const totalT = done + Math.floor(Math.random() * 5);
        const pct = Math.round((done / totalT) * 100);
        const barColor = pct > 80 ? '#22C55E' : pct > 50 ? color : '#EF4444';

        // 团队名
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px "SF Mono", monospace';
        ctx.fillText(team.name || `Team ${i + 1}`, listX + 16, rowY + 12);
        // 成员数
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${team.memberIds?.length || 0}`, listX + 190, rowY + 12);
        // 进度条背景
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(listX + 340, rowY + 2, 260, 16);
        // 进度条
        ctx.fillStyle = barColor;
        ctx.fillRect(listX + 340, rowY + 2, Math.round(260 * pct / 100), 16);
        // 百分比
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px "SF Mono", monospace';
        ctx.fillText(`${pct}%`, listX + 340 + Math.round(260 * pct / 100) - 36, rowY + 14);
        // 状态
        ctx.fillStyle = barColor;
        ctx.font = 'bold 12px "SF Mono", monospace';
        ctx.fillText(pct > 80 ? '● OPTIMAL' : pct > 50 ? '● ACTIVE' : '● AT RISK', listX + 620, rowY + 12);
      });

      // 底部状态栏
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, H - 32, W, 32);
      ctx.fillStyle = '#000';
      ctx.font = '14px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`● LIVE DATA  ·  ${teams.length} TEAMS  ·  ${empCount} EMPLOYEES  ·  REFRESH 5s`, W / 2, H - 12);

      texture.needsUpdate = true;
    } catch (_) {}
  }, [canvas, texture, color]);

  useEffect(() => { draw(); const iv = setInterval(draw, 5000); return () => clearInterval(iv); }, [draw]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ===========================================
// 4F任务大厅 - 左侧任务统计小屏
function MiniTaskStatScreen({ width, height, color, type }: { width: number; height: number; color: string; type: 'pending' | 'done' }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const draw = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5301/api/task-history/statistics').then(r => r.json()).catch(() => null);
      const ctx = canvas.getContext('2d')!;
      const W = 512, H = 512;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000c1a';
      ctx.fillRect(0, 0, W, H);

      const stats = res?.success ? res.data : {};
      const total = stats.totalTasks || 0;
      const done = stats.completedTasks || 0;
      const pending = stats.inProgressTasks || (total - done);
      const failed = stats.failedTasks || 0;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      const displayValue = type === 'pending' ? pending : done;
      const label = type === 'pending' ? 'PENDING TASKS' : 'COMPLETED TASKS';
      const accentColor = type === 'pending' ? color : '#22C55E';

      // 顶部标题
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, W, 56);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, W / 2, 36);

      // 数字
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 120px "SF Mono", monospace';
      ctx.fillText(String(displayValue), W / 2, 280);

      // 单位
      ctx.fillStyle = `${accentColor}cc`;
      ctx.font = '20px "SF Mono", monospace';
      ctx.fillText('TASKS', W / 2, 330);

      // 分隔线
      ctx.fillStyle = accentColor;
      ctx.fillRect(40, 360, W - 80, 2);

      // 成功率
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "SF Mono", monospace';
      ctx.fillText('SUCCESS RATE', W / 2, 400);
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 36px "SF Mono", monospace';
      ctx.fillText(`${rate}%`, W / 2, 450);

      // 底部状态
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, H - 32, W, 32);
      ctx.fillStyle = '#000';
      ctx.font = '12px "SF Mono", monospace';
      ctx.fillText('● LIVE  ·  5s REFRESH', W / 2, H - 12);

      texture.needsUpdate = true;
    } catch (_) {}
  }, [canvas, texture, color, type]);

  useEffect(() => { draw(); const iv = setInterval(draw, 5000); return () => clearInterval(iv); }, [draw]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
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
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.3;
    if (sphereRef.current) sphereRef.current.rotation.y = t * 0.5;
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
  const elapsedRef = useRef(0);
  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const t = (elapsedRef.current * 0.4) % 1;
    const idx = Math.floor(t * points.length);
    if (dashRef.current) dashRef.current.position.copy(points[idx] || points[0]);
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
// 会议桌组件（椭圆形会议桌）
// ===========================================
function MeetingTable({ color }: { color: string }) {
  return (
    <group>
      {/* 桌面（椭圆形） */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.06, 32]} />
        <meshStandardMaterial color="#0a1828" roughness={0.15} metalness={0.85} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      {/* 桌面 */}
      {/* 桌腿 x4 */}
      {[[0.95, 0, 0.65], [-0.95, 0, 0.65], [0.95, 0, -0.65], [-0.95, 0, -0.65]].map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.37, z]}>
          <cylinderGeometry args={[0.06, 0.06, 0.74, 8]} />
          <meshStandardMaterial color="#0d1f35" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
      {/* 桌下横梁连接 */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.05, 0.05]} />
        <meshStandardMaterial color="#0d1f35" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.05]} />
        <meshStandardMaterial color="#0d1f35" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ===========================================
// 会议桌座位（每位成员一座：桌面上有名牌+椅子）
// ===========================================
function TableSeat({ position, member, onClick }: {
  position: [number, number, number]; member: any; onClick: (id: string) => void;
}) {
  const ec = EMP_TYPE_COLORS[member.type] || '#60A5FA';
  const statusColor = member.status === 'busy' ? '#F59E0B' : member.status === 'offline' ? '#6B7280' : '#22C55E';
  const angle = Math.atan2(position[2], position[0]);
  const facingAngle = angle + Math.PI; // face toward table center

  return (
    <group position={position}>
      {/* 椅子底座 */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 20]} />
        <meshStandardMaterial color={ec} emissive={ec} emissiveIntensity={0.1} transparent opacity={0.4} />
      </mesh>
      {/* 椅子腿 */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.38, 8]} />
        <meshStandardMaterial color="#0d1f35" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* 椅背 */}
      <mesh position={[Math.sin(facingAngle) * 0.35, 0.5, Math.cos(facingAngle) * 0.35]} rotation={[0, facingAngle, 0]}>
        <boxGeometry args={[0.5, 0.45, 0.05]} />
        <meshStandardMaterial color="#0d1f35" roughness={0.2} metalness={0.8} emissive={ec} emissiveIntensity={0.15} />
      </mesh>
      {/* 座位面 */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color="#0d1f35" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* 名牌底座 */}
      <mesh position={[0, 0.65, 0]} rotation={[-0.2, facingAngle, 0]}>
        <boxGeometry args={[0.28, 0.22, 0.02]} />
        <meshStandardMaterial color={ec} emissive={ec} emissiveIntensity={0.6} roughness={0.2} metalness={0.7} />
      </mesh>
      {/* 状态灯 */}
      <mesh position={[0.25, 0.65, 0.1]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={3.0} />
      </mesh>
      {/* 拾取区域（隐形） */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(member.id); }}
        visible={false}
      >
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
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


// ── 核心至终端的曲线管道光效 ─────────────────────────────────────────────
// 每条管道：贝塞尔曲线 + CanvasTexture 流动脉冲

// 简单管道（无动画，无 useFrame，不会导致 Context Lost）
function CurvedTube({ nx, nz, color }: { nx: number; nz: number; color: string }) {
  const r = Math.sqrt(nx * nx + nz * nz);
  const perpX = r > 0.01 ? -nz / r : 0.5;
  const perpZ = r > 0.01 ? nx / r : 0;
  const midX = nx * 0.5 + perpX * 0.6;
  const midY = 0.4;
  const midZ = nz * 0.5 + perpZ * 0.6;
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.2, 0),
    new THREE.Vector3(midX, midY, midZ),
    new THREE.Vector3(nx, 1.2, nz),
  ]), [nx, nz, midX, midY, midZ]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 32, 0.06, 8, false]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function CoreTubes({ terminalNodes, RING_RADIUS }: {
  terminalNodes: Array<{ angle: number; color: string; label: string; key: string; isMe: boolean }>;
  RING_RADIUS: number;
}) {
  return (
    <group>
      {terminalNodes.map(({ angle, color, label }, i) => {
        const nx = Math.sin(angle) * RING_RADIUS;
        const nz = Math.cos(angle) * RING_RADIUS;
        return (
          <CurvedTube
            key={label}
            nx={nx}
            nz={nz}
            color={color}
          />
        );
      })}
    </group>
  );
}

// ===========================================
// 单个楼层3D场景
// ===========================================
function Floor3DScene({ floorId, floorIndex }: { floorId: string; floorIndex: number }) {
  const config = FLOORS.find(f => f.id === floorId) || FLOORS[0];


  if (floorId === '1f') {
    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* 地板 */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.25} metalness={0.4} emissive={config.glowColor} emissiveIntensity={0.04} />
        </mesh>
        {/* 大厅网格 */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.glowColor} transparent opacity={0.12} depthWrite={false} />
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
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} />
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
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.glowColor} transparent opacity={0.12} depthWrite={false} />
        </mesh>

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
    // ================================================================
    // 6F NEURAL NETWORK ENGINE — Synaptic AI Visualization
    // Plan B: Organic growth, neural network nodes, orbiting terminals
    // ================================================================

    const [ocStatus, setOcStatus] = useState<any>(null);
    const [coreInfo, setCoreInfo] = useState({ agents: 0, sessions: 0, version: '' });

    useEffect(() => {
      if (floorId !== '6f') return;
      let cancelled = false;
      const fetchStatus = async () => {
        try {
          const res = await fetch('http://localhost:5301/api/openclaw-status').then(r => r.json()).catch(() => null);
          if (cancelled || !res?.success || !res?.data) return;
          const d = res.data;
          setOcStatus({
            agents:    { count: d.agents?.count ?? 1, sessions: d.agents?.sessions ?? 1 },
            sessions:  { active: d.sessions?.active ?? 1, model: d.sessions?.model ?? '' },
            tasks:     { active: d.tasks?.active ?? 0, running: d.tasks?.running ?? 0, queued: d.tasks?.queued ?? 0, tracked: d.tasks?.tracked ?? 0, issues: d.tasks?.issues ?? 0 },
            memory:    { files: d.memory?.files ?? 0, chunks: d.memory?.chunks ?? 0, cache: d.memory?.cache ?? null },
            gateway:   { latency: d.gateway?.latency ?? 0, reachable: d.gateway?.reachable ?? false },
            security:  { critical: d.security?.critical ?? 0, warn: d.security?.warn ?? 0, info: d.security?.info ?? 0 },
            heartbeat: { interval: d.heartbeat?.interval ?? '', target: d.heartbeat?.target ?? '' },
            skills:    d.skills ?? 0,
            mcp:       d.mcp ?? 0,
            tailscale: d.tailscale ?? 'off',
            channel:   d.channel ?? '',
            version:   d.version ?? '',
          });
          setCoreInfo({
            agents: d.agents?.count ?? 0,
            sessions: d.sessions?.active ?? 0,
            version: d.version ?? '',
          });
        } catch (_) {}
      };
      fetchStatus();
      const iv = setInterval(fetchStatus, 5000);
      return () => { cancelled = true; clearInterval(iv); };
    }, [floorId]);

    const terminalData = useMemo(() => {
      const d = ocStatus;
      const sec = d?.security;
      const secTotal = (sec?.critical ?? 0) + (sec?.warn ?? 0) + (sec?.info ?? 0);
      return {
        ME:       { value1: d?.sessions?.active ?? 0, value2: d?.memory?.files ?? 0, value3: d?.memory?.chunks ?? 0, status: 'ONLINE',  unit: 'sessions' },
        AGENTS:   { value1: d?.agents?.count ?? 0,    value2: d?.agents?.sessions ?? 0, status: 'ONLINE',  unit: 'agents' },
        GATEWAY:  { value1: d?.gateway?.latency ?? 0, status: d?.gateway?.reachable ? 'CONNECTED' : 'OFFLINE', unit: 'ms' },
        TASKS:    { value1: d?.tasks?.active ?? 0,   value2: d?.tasks?.running ?? 0,    value3: d?.tasks?.tracked ?? 0, status: d?.tasks?.active > 0 ? 'ACTIVE' : 'IDLE', unit: 'tasks' },
        MEMORY:   { value1: d?.memory?.files ?? 0,   value2: d?.memory?.chunks ?? 0,   status: 'ACTIVE',  unit: 'files' },
        SESSIONS: { value1: d?.sessions?.active ?? 0, status: 'LIVE',  unit: 'sessions' },
        SECURITY: { value1: secTotal, value2: sec?.critical ?? 0, value3: sec?.warn ?? 0, status: (sec?.critical ?? 0) > 0 ? 'ALERT' : (sec?.warn ?? 0) > 0 ? 'WARN' : 'OK', unit: 'issues' },
        HEARTBEAT:{ value1: 1, value2: 0, status: d?.heartbeat?.interval ? 'ACTIVE' : 'OFF', unit: d?.heartbeat?.interval || '--' },
      };
    }, [ocStatus]);

    const statusColorMap: Record<string, string> = {
      ONLINE: '#22C55E', OFFLINE: '#EF4444', CONNECTED: '#22C55E',
      IDLE: '#FBBF24', ACTIVE: '#60A5FA', LIVE: '#22C55E',
      OK: '#22C55E', WARN: '#FBBF24', ALERT: '#EF4444',
    };

    // 核心引用 (呼吸 + 旋转动画)
    const coreRef = useRef<THREE.Group>(null!);
    const coreElapsedRef = useRef(0);
    useFrame((_, delta) => {
      if (!coreRef.current) return;
      coreElapsedRef.current += delta;
      const t = coreElapsedRef.current;
      // 核心自转
      coreRef.current.rotation.y = t * 0.18;
      // 内核呼吸
      const b = Math.sin(t * 1.2) * 0.07 + 1.0;
      coreRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry') {
          child.scale.setScalar(b);
        }
      });
    });

    // 终端节点引用 (浮动动画)
    const terminalRefs = useRef<(THREE.Group | null)[]>([]);
    const terminalElapsedRef = useRef(0);
    useFrame((_, delta) => {
      terminalElapsedRef.current += delta;
      const t = terminalElapsedRef.current;
      terminalRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const offset = i * (Math.PI * 2 / 8);
        // Gentle vertical float
        ref.position.y = 1.2 + Math.sin(t * 0.8 + offset) * 0.15;
      });
    });

    const terminalNodes: Array<{ angle: number; color: string; label: string; key: 'ME' | 'AGENTS' | 'GATEWAY' | 'TASKS' | 'MEMORY' | 'SESSIONS' | 'SECURITY' | 'HEARTBEAT'; isMe: boolean }> = [
      { angle: 0,            color: '#E879F9', label: 'ME',        key: 'ME',        isMe: true },
      { angle: Math.PI / 4,         color: '#F472B6', label: 'AGENTS',    key: 'AGENTS',    isMe: false },
      { angle: Math.PI / 2,         color: '#A78BFA', label: 'GATEWAY',   key: 'GATEWAY',   isMe: false },
      { angle: Math.PI * 3 / 4,     color: '#60A5FA', label: 'TASKS',     key: 'TASKS',     isMe: false },
      { angle: Math.PI,             color: '#4ADE80', label: 'MEMORY',    key: 'MEMORY',    isMe: false },
      { angle: Math.PI * 5 / 4,     color: '#38BDF8', label: 'SESSIONS',  key: 'SESSIONS',  isMe: false },
      { angle: Math.PI * 3 / 2,     color: '#FBBF24', label: 'SECURITY',  key: 'SECURITY',  isMe: false },
      { angle: Math.PI * 7 / 4,     color: '#FB923C', label: 'HEARTBEAT', key: 'HEARTBEAT', isMe: false },
    ];
    const RING_RADIUS = 4.8;

    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>

        {/* ===== Floor: organic cell texture ===== */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 16]} />
          <meshStandardMaterial
            color="#060d18"
            roughness={0.15}
            metalness={0.5}
            emissive="#0a1830"
            emissiveIntensity={0.08}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* Organic hex grid overlay */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 12]} />
          <meshStandardMaterial color="#0d2040" transparent opacity={0.35} depthWrite={false} />
        </mesh>

        {/* 核心内核地板光圈 */}
        {[2.5, 5.0, 7.5].map((r, i) => (
          <mesh key={i} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.04, r + 0.04, 48]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.3 - i * 0.08} transparent opacity={0.4 - i * 0.1} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* ===== Ambient lights ===== */}
        <pointLight position={[0, 4, 0]} intensity={3.0} color={config.glowColor} distance={18} />
        <pointLight position={[0, 2.5, 0]} intensity={5.0} color={'#F472B6'} distance={12} />
        <pointLight position={[-6, 3, 4]} intensity={1.5} color={'#60A5FA'} distance={12} />
        <pointLight position={[6, 3, -4]} intensity={1.5} color={'#A78BFA'} distance={12} />

        {/* ===== 核心 (Core) ===== */}
        <group ref={coreRef} position={[0, 2.2, 0]}>

          {/* 核心主体 — 十二面体 */}
          <mesh>
            <dodecahedronGeometry args={[1.2, 0]} />
            <meshStandardMaterial
              color="#000d20"
              roughness={0.05}
              metalness={0.98}
              emissive={config.glowColor}
              emissiveIntensity={0.35}
            />
          </mesh>

          {/* 核心发光内核 */}
          <mesh>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial
              color="#001840"
              roughness={0.0}
              metalness={1.0}
              emissive={config.glowColor}
              emissiveIntensity={2.5}
            />
          </mesh>

          {/* 十二顶点发光节点 */}
          {[[0,0,1.2],[0,0,-1.2],[0,1.2,0],[0,-1.2,0],[1.2,0,0],[-1.2,0,0],
            [0.75,0.75,0.75],[-0.75,0.75,0.75],[0.75,-0.75,0.75],[-0.75,-0.75,0.75],
            [0,0.75,0.75],[0,-0.75,0.75]].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={4.0} />
            </mesh>
          ))}

          {/* Orbit ring — horizontal */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.7, 0.025, 8, 64]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} transparent opacity={0.7} />
          </mesh>
          {/* Orbit ring — tilted */}
          <mesh rotation={[Math.PI / 3, 0.4, 0]}>
            <torusGeometry args={[1.7, 0.02, 8, 64]} />
            <meshStandardMaterial color={'#A78BFA'} emissive={'#A78BFA'} emissiveIntensity={2.5} transparent opacity={0.5} />
          </mesh>

          {/* Central point light */}
          <pointLight intensity={5.0} color={config.glowColor} distance={14} />

          {/* 核心顶背对背双屏 — 两屏背对背立于核心上方 */}
          {/* 核心顶背对背双屏 — 两个独立屏幕，背对背各自完全不透明 */}
          {/* AGENTS 面（朝右偏后） */}
          <group position={[0, 1.6, 0]} rotation={[0, Math.PI * 3 / 4, 0]}>
            <mesh>
              <boxGeometry args={[2.0, 0.9, 0.04]} />
              <meshStandardMaterial color="#000408" roughness={0.05} metalness={0.5} emissive={config.glowColor} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <planeGeometry args={[2.06, 0.96]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} />
            </mesh>
            <Text position={[0, 0.08, 0.026]} fontSize={0.14} color="#000000" fontWeight={700} anchorX="center" anchorY="middle">AGENTS: {coreInfo.agents}</Text>
            <Text position={[0, -0.18, 0.026]} fontSize={0.09} color="#000000" anchorX="center" anchorY="middle" fillOpacity={0.7}>SESSIONS: {coreInfo.sessions}</Text>
          </group>
          {/* OPENCLAW 面（朝左偏前，与AGENTS背对背） */}
          <group position={[0, 1.6, 0]} rotation={[0, -Math.PI / 4, 0]}>
            <mesh>
              <boxGeometry args={[2.0, 0.9, 0.04]} />
              <meshStandardMaterial color="#000408" roughness={0.05} metalness={0.5} emissive={config.glowColor} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <planeGeometry args={[2.06, 0.96]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} />
            </mesh>
            <Text position={[0, 0.08, 0.026]} fontSize={0.13} color="#000000" fontWeight={700} anchorX="center" anchorY="middle">OPENCLAW {coreInfo.version}</Text>
            <Text position={[0, -0.18, 0.026]} fontSize={0.09} color="#000000" anchorX="center" anchorY="middle" fillOpacity={0.7}>NEURAL ENGINE</Text>
          </group>

        </group>

        {/* ===== 终端节点 (Terminal Nodes) ===== */}
        {terminalNodes.map(({ angle, color, label, key, isMe }, i) => {
          const nx = Math.sin(angle) * RING_RADIUS;
          const nz = Math.cos(angle) * RING_RADIUS;
          const data = terminalData?.[key];
          const sc = statusColorMap[data?.status || 'OFFLINE'] || '#EF4444';
          return (
            <group
              key={label}
              ref={el => { terminalRefs.current[i] = el; }}
              position={[nx, 1.2, nz]}
            >
              {/* 终端主体 — 二十面体 */}
              <mesh>
                <icosahedronGeometry args={[isMe ? 0.65 : 0.5, 1]} />
                <meshStandardMaterial
                  color="#050f20"
                  roughness={0.1}
                  metalness={0.92}
                  emissive={color}
                  emissiveIntensity={isMe ? 0.6 : 0.4}
                />
              </mesh>
              {/* Node inner glow */}
              <mesh>
                <sphereGeometry args={[isMe ? 0.3 : 0.22, 12, 12]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={2.0}
                  transparent
                  opacity={0.7}
                />
              </mesh>
              {/* Node point light */}
              <pointLight intensity={1.2} color={sc} distance={5} />


            </group>
          );
        })}

        {/* ===== 终端外侧屏幕阵列 — 8块屏幕 ===== */}
        {terminalNodes.map(({ angle, color, key, label, isMe }, i) => {
          const sx = Math.sin(angle) * (RING_RADIUS + 1.0);
          const sz = Math.cos(angle) * (RING_RADIUS + 1.0);
          const data = terminalData?.[key];
          const sc = statusColorMap[data?.status || 'OFFLINE'] || '#EF4444';
          return (
            <group key={key} position={[sx, 1.5, sz]} rotation={[0, angle, 0]}>
              {/* 屏幕底板 */}
              <mesh>
                <boxGeometry args={[1.5, 0.95, 0.06]} />
                <meshStandardMaterial color="#020a14" roughness={0.05} metalness={0.5} emissive={color} emissiveIntensity={0.12} />
              </mesh>
              {/* TerminalScreen Canvas 内容（直接放在底板上方） */}
              <TerminalScreen
                width={1.36}
                height={0.76}
                color={color}
                data={data}
                statusColor={sc}
              />
              {/* 终端名字 */}
              <Text position={[0, -0.62, 0.06]} fontSize={0.18} color={color} anchorX="center" anchorY="middle">
                {label}
              </Text>
            </group>
          );
        })}

        <CoreTubes terminalNodes={terminalNodes} RING_RADIUS={RING_RADIUS} />

        {/* ===== Ambient fog particles ===== */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = 3 + (i % 4) * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * r, 0.5 + (i % 5) * 0.6, Math.cos(a) * r]}>
              <sphereGeometry args={[0.025, 4, 4]} />
              <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} transparent opacity={0.4} />
            </mesh>
          );
        })}

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
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 8]} />
          <meshStandardMaterial color={config.glowColor} transparent opacity={0.3} depthWrite={false} />
        </mesh>

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
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} />
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

        {/* ===== 三块数据驱动大屏 ===== */}
        {/* 左屏 - 向中倾斜20度 */}
        <group position={[-4.4, 2.1, -2.4]} rotation={[0, Math.PI / 4.5, 0]}>
          {/* 边框 */}
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[3.4, 2.4, 0.12]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 数据屏 */}
          <MiniTaskStatScreen width={3.2} height={2.2} color={config.glowColor} type="pending" />
          {/* 顶部装饰条 */}
          <mesh position={[0, 1.14, 0.04]}>
            <boxGeometry args={[3.0, 0.14, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          <pointLight position={[0, 0, 1]} intensity={0.6} color={config.glowColor} distance={5} />
        </group>

        {/* 中央主屏 - 保持正中 */}
        <group position={[0, 2.5, -3.9]}>
          {/* 边框 */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[6.2, 3.2, 0.14]} />
            <meshStandardMaterial color="#0a1828" roughness={0.25} metalness={0.7} />
          </mesh>
          {/* 数据总屏 */}
          <TaskCommandScreen width={6.0} height={3.0} color={config.glowColor} />
          {/* 顶部标题横条 */}
          <mesh position={[0, 1.54, 0.04]}>
            <boxGeometry args={[5.8, 0.16, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0, 0, 1]} intensity={1.0} color={config.glowColor} distance={8} />
        </group>

        {/* 右屏 - 向中倾斜20度 */}
        <group position={[4.4, 2.1, -2.4]} rotation={[0, -Math.PI / 4.5, 0]}>
          {/* 边框 */}
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[3.4, 2.4, 0.12]} />
            <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 数据屏 */}
          <MiniTaskStatScreen width={3.2} height={2.2} color={config.glowColor} type="done" />
          {/* 顶部装饰条 */}
          <mesh position={[0, 1.14, 0.04]}>
            <boxGeometry args={[3.0, 0.14, 0.02]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>
          <pointLight position={[0, 0, 1]} intensity={0.6} color={config.glowColor} distance={5} />
        </group>

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
    const hubSpacing = 6.0; // 团队间距（缩小避免重叠）
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
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={config.glowColor} transparent opacity={0.12} depthWrite={false} />
        </mesh>

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

        {/* ===== 多团队围桌布局 ===== */}
        {teamsData.slice(0, 3).map((team, ti) => {
          const tableX = (ti - 1) * hubSpacing;
          const members = team.memberIds
            .map((id: string) => empData.find((e: any) => e.id === id))
            .filter(Boolean);
          const leader = members.find((m: any) => m.type === 'manager') || members[0];
          const memberCount = members.length;
          const seatRadius = 1.9;
          const progress = teamProgressMap[team.id]?.progress ?? 0.7;
          const taskCount = teamProgressMap[team.id]?.taskCount ?? 0;

          return (
            <group key={team.id} position={[tableX, 0, 0]}>  
              {/* 地面团队区域光圈 */}
              <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[2.4, 32]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.08} transparent opacity={0.45} />
              </mesh>

              {/* 会议桌 */}
              <MeetingTable color={config.glowColor} />

              {/* 桌上方团队名称 */}
              <group position={[0, 1.88, 0]}>
                <Text fontSize={0.26} color="#ffffff" anchorX="center" anchorY="middle">
                  {team.name}
                </Text>
                {leader && (
                  <Text position={[0, -0.3, 0]} fontSize={0.12} color={config.glowColor} anchorX="center" anchorY="middle">
                    {leader.name} · {leader.roleName}
                  </Text>
                )}
                <Text position={[0, -0.52, 0]} fontSize={0.1} color={config.glowColor + 'aa'} anchorX="center" anchorY="middle">
                  {taskCount} TASKS · {Math.round(progress * 100)}% DONE
                </Text>
              </group>

              {/* 围桌座位 */}
              {members.slice(0, 6).map((member: any, mi: number) => {
                const total = Math.min(members.length, 6);
                const angle = (mi / total) * Math.PI * 2;
                const sx = Math.cos(angle) * seatRadius;
                const sz = Math.sin(angle) * seatRadius;
                return (
                  <TableSeat
                    key={member.id}
                    position={[sx, 0, sz]}
                    member={member}
                    onClick={dispatchEmployeeSelect}
                  />
                );
              })}

              {/* 桌面补光 */}
              <pointLight position={[0, 2.2, 0]} intensity={1.0} color={config.glowColor} distance={5} />
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


// ===========================================
// 5F任务历史 - 两侧统计屏
function TaskHistoryStatScreen({ width, height, color, side }: { width: number; height: number; color: string; side: 'left' | 'right' }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; return c; }, []);
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  const draw = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5301/api/task-history/statistics').then(r => r.json()).catch(() => null);
      const ctx = canvas.getContext('2d')!;
      const W = 512, H = 512;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000c1a';
      ctx.fillRect(0, 0, W, H);

      const stats = res?.success ? res.data : {};
      const total = stats.totalTasks || 0;
      const completed = stats.completedTasks || 0;
      const failed = stats.failedTasks || 0;
      const inProgress = stats.inProgressTasks || (total - completed - failed);
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Title
      const title = side === 'left' ? 'HISTORY ARCHIVE' : 'PERFORMANCE';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, 52);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(title, W / 2, 34);

      // Stats
      if (side === 'left') {
        // Left: total / completed / failed breakdown
        const items = [
          { label: 'TOTAL', value: total, color: '#e2e8f0' },
          { label: 'COMPLETED', value: completed, color: '#22C55E' },
          { label: 'FAILED', value: failed, color: '#EF4444' },
          { label: 'RATE', value: `${rate}%`, color: '#FBBF24' },
        ];
        items.forEach((item, i) => {
          const y = 90 + i * 95;
          ctx.fillStyle = `${item.color}22`;
          ctx.beginPath();
          ctx.roundRect(20, y, W - 40, 80, 6);
          ctx.fill();
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = `${item.color}88`;
          ctx.font = '12px "SF Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(item.label, 36, y + 24);
          ctx.fillStyle = item.color;
          ctx.font = 'bold 36px "SF Mono", monospace';
          ctx.fillText(String(item.value), 36, y + 62);
        });
      } else {
        // Right: bar chart of monthly activity
        ctx.fillStyle = `${color}88`;
        ctx.font = '14px "SF Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SUCCESS RATE OVERALL', 20, 80);
        // Big rate display
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 80px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${rate}%`, W / 2, 200);
        // Rate bar
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(30, 220, W - 60, 20);
        ctx.fillStyle = rate > 80 ? '#22C55E' : rate > 50 ? color : '#EF4444';
        ctx.fillRect(30, 220, (W - 60) * rate / 100, 20);
        // Breakdown
        const breakdown = [
          { label: 'COMPLETED', value: completed, color: '#22C55E' },
          { label: 'IN PROGRESS', value: inProgress, color: '#FBBF24' },
          { label: 'FAILED', value: failed, color: '#EF4444' },
        ];
        breakdown.forEach((item, i) => {
          const y = 270 + i * 70;
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          ctx.fillStyle = `${item.color}44`;
          ctx.fillRect(20, y, W - 40, 55);
          ctx.fillStyle = item.color;
          ctx.font = 'bold 12px "SF Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(item.label, 30, y + 20);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 28px "SF Mono", monospace';
          ctx.fillText(`${item.value} (${pct}%)`, 30, y + 48);
        });
      }

      // Bottom bar
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, H - 32, W, 32);
      ctx.fillStyle = '#000';
      ctx.font = '12px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('● ARCHIVE  ·  5s REFRESH', W / 2, H - 12);

      texture.needsUpdate = true;
    } catch (_) {}
  }, [canvas, texture, color, side]);

  useEffect(() => { draw(); const iv = setInterval(draw, 5000); return () => clearInterval(iv); }, [draw]);

  return (
    <mesh ref={meshRef} position={[0, 0, 0.06]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

  if (floorId === '5f') {
    const [taskHistory, setTaskHistory] = useState<any[]>([]);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    useEffect(() => {
      if (floorId !== '5f') return;
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('http://localhost:5301/api/task-history?page=1&pageSize=30').then(r => r.json()).catch(() => ({ success: false, data: { items: [] } }));
          if (!cancelled && res.success) {
            setTaskHistory(res.data.items || []);
          }
        } catch (_) {}
      })();
      return () => { cancelled = true; };
    }, [floorId]);

    const statusColorMap: Record<string, string> = {
      completed: '#22C55E',
      failed: '#EF4444',
      in_progress: '#FBBF24',
    };

    const displayTasks = useMemo(() => {
      if (taskHistory.length === 0) return [];
      const now = Date.now();
      const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
      return taskHistory
        .filter((t: any) => new Date(t.createdAt || now).getTime() > sixMonthsAgo)
        .slice(0, 20)
        .map((t: any) => {
          const ts = new Date(t.createdAt || now).getTime();
          const xPos = ((ts - sixMonthsAgo) / (now - sixMonthsAgo) - 0.5) * 15;
          const status = t.status || 'completed';
          const color = statusColorMap[status] || '#A3E635';
          return { ...t, xPos, color, ts };
        });
    }, [taskHistory]);

    return (
      <group position={[0, -floorIndex * FLOOR_HEIGHT, 0]}>
        {/* Floor */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 12]} />
          <meshStandardMaterial color={config.floorColor} roughness={0.25} metalness={0.4} emissive={config.glowColor} emissiveIntensity={0.05} />
        </mesh>
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 12]} />
          <meshStandardMaterial color={config.glowColor} transparent opacity={0.1} depthWrite={false} />
        </mesh>

        {/* ===== BACK WALL - Full-width history timeline ===== */}
        <group position={[0, 2.8, -5.5]}>
          {/* Wall background */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[17, 5.5, 0.2]} />
            <meshStandardMaterial color="#060e1a" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Top border */}
          <mesh position={[0, 2.6, 0]}>
            <boxGeometry args={[17, 0.12, 0.08]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.0} />
          </mesh>

          {/* Main title */}
          <Text position={[0, 2.2, 0]} fontSize={0.32} color={config.glowColor} anchorX="center" anchorY="middle">
            TASK HISTORY TIMELINE
          </Text>

          {/* Horizontal timeline bar */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[15.0, 0.08, 0.04]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} roughness={0.1} metalness={0.8} />
          </mesh>

          {/* NOW end marker */}
          <mesh position={[7.5, 0.5, 0]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={2.5} roughness={0.1} metalness={0.6} />
          </mesh>
          <Text position={[7.5, 0.85, 0]} fontSize={0.14} color={config.glowColor} anchorX="center" anchorY="bottom">NOW</Text>

          {/* Start marker */}
          <mesh position={[-7.5, 0.5, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} roughness={0.1} metalness={0.6} />
          </mesh>
          <Text position={[-7.5, 0.85, 0]} fontSize={0.14} color={config.glowColor} anchorX="center" anchorY="bottom">6M</Text>

          {/* Month tick marks (evenly spaced) */}
          {[-6, -4, -2, 0, 2, 4, 6].map((x, i) => (
            <group key={i} position={[x, 0.5, 0]}>
              <mesh>
                <boxGeometry args={[0.04, 0.3, 0.04]} />
                <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.0} roughness={0.2} metalness={0.7} />
              </mesh>
              <Text position={[0, -0.28, 0]} fontSize={0.12} color={`${config.glowColor}aa`} anchorX="center" anchorY="top">
                {i === 0 ? '5M' : i === 1 ? '4M' : i === 2 ? '3M' : i === 3 ? '2M' : i === 4 ? '1M' : ''}
              </Text>
            </group>
          ))}

          {/* Task nodes along the timeline (clamped within bar) */}
          {displayTasks.map((task: any, i: number) => {
            const isSelected = selectedTask?.id === task.id;
            const xClamped = Math.max(-7.2, Math.min(7.2, task.xPos));
            const yOff = (i % 3 - 1) * 0.42;
            return (
              <group key={task.id || i} position={[xClamped, 0.5 + yOff + 0.12, 0]}>
                {/* Connector */}
                <mesh position={[0, -yOff / 2, 0]}>
                  <boxGeometry args={[0.03, Math.abs(yOff) + 0.1, 0.03]} />
                  <meshStandardMaterial color={task.color} emissive={task.color} emissiveIntensity={0.6} transparent opacity={0.6} />
                </mesh>
                {/* Node sphere */}
                <mesh
                  onClick={() => setSelectedTask(isSelected ? null : task)}
                  onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                  onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                >
                  <sphereGeometry args={[isSelected ? 0.18 : 0.1, 10, 10]} />
                  <meshStandardMaterial
                    color={task.color}
                    emissive={task.color}
                    emissiveIntensity={isSelected ? 3.0 : 1.5}
                    roughness={0.2}
                    metalness={0.5}
                  />
                </mesh>
                {isSelected && (
                  <pointLight position={[0, 0, 0.5]} intensity={1.2} color={task.color} distance={3} />
                )}
              </group>
            );
          })}

          {/* Selected task detail card */}
          {selectedTask && (
            <group position={[0, -1.0, 0]}>
              <mesh>
                <boxGeometry args={[8, 1.0, 0.06]} />
                <meshStandardMaterial color="#0a1828" roughness={0.2} metalness={0.7} emissive={selectedTask.color} emissiveIntensity={0.15} />
              </mesh>
              <mesh position={[0, 0, 0.04]}>
                <boxGeometry args={[7.8, 1.1, 0.02]} />
                <meshStandardMaterial color="#000c1a" roughness={0.1} metalness={0.3} />
              </mesh>
              {/* Status badge */}
              <mesh position={[-3.4, 0.38, 0.06]}>
                <boxGeometry args={[1.6, 0.28, 0.02]} />
                <meshStandardMaterial color={selectedTask.color} emissive={selectedTask.color} emissiveIntensity={1.5} roughness={0.2} metalness={0.5} />
              </mesh>
              <Text position={[-3.4, 0.38, 0.08]} fontSize={0.12} color="#000" anchorX="center" anchorY="middle">
                {String(selectedTask.status || 'completed').toUpperCase()}
              </Text>
              <Text position={[0, 0.28, 0.08]} fontSize={0.15} color="#fff" anchorX="center" anchorY="middle">
                {selectedTask.taskId || `Task-${selectedTask.id?.slice(0, 8) || '?'}`}
              </Text>
              <Text position={[0, 0.0, 0.08]} fontSize={0.11} color={`${config.glowColor}cc`} anchorX="center" anchorY="middle">
                {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : 'Unknown time'}
              </Text>
              {selectedTask.agentId && (
                <Text position={[0, -0.22, 0.08]} fontSize={0.1} color="#94a3b8" anchorX="center" anchorY="middle">
                  AGENT: {selectedTask.agentId}
                </Text>
              )}
              <Text position={[3.5, 0.38, 0.08]} fontSize={0.09} color="#475569" anchorX="right" anchorY="middle">click to close</Text>
            </group>
          )}

          {/* Legend */}
          <group position={[0, -2.1, 0]}>
            {Object.entries(statusColorMap).map(([status, color], i) => (
              <group key={status} position={[(i - 1) * 3.0, 0, 0]}>
                <mesh>
                  <sphereGeometry args={[0.09, 8, 8]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} roughness={0.2} metalness={0.5} />
                </mesh>
                <Text position={[0.2, 0, 0]} fontSize={0.12} color={color} anchorX="left" anchorY="middle">
                  {status === 'completed' ? 'DONE' : status === 'failed' ? 'FAIL' : 'ACTIVE'}
                </Text>
              </group>
            ))}
          </group>

          {/* Back wall lighting */}
          <pointLight position={[-6, 0, 2]} intensity={0.8} color={config.glowColor} distance={8} />
          <pointLight position={[6, 0, 2]} intensity={0.8} color={config.glowColor} distance={8} />
          <pointLight position={[0, 3, 1]} intensity={0.6} color={config.glowColor} distance={8} />
        </group>

        {/* ===== Statistics pillars (left and right) ===== */}
        {/* Left pillar */}
        <group position={[-8, 2.2, -4.0]}>
          <mesh>
            <boxGeometry args={[1.8, 4.5, 0.8]} />
            <meshStandardMaterial color="#0a1828" roughness={0.25} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.08} />
          </mesh>
          <Text position={[0, 2.0, 0.42]} fontSize={0.18} color={config.glowColor} fontWeight={700} anchorX="center" anchorY="middle">TASKS</Text>
          <Text position={[0, 1.65, 0.42]} fontSize={0.11} color={`${config.glowColor}88`} anchorX="center" anchorY="middle">ALL TIME</Text>
          {[-0.5, 0, 0.5].map((x, i) => {
            const heights = [1.8, 2.5, 1.2];
            return (
              <mesh key={i} position={[x, -0.3, 0.42]}>
                <boxGeometry args={[0.35, heights[i], 0.05]} />
                <meshStandardMaterial color={[config.glowColor, '#22C55E', '#EF4444'][i]} emissive={[config.glowColor, '#22C55E', '#EF4444'][i]} emissiveIntensity={0.8} roughness={0.2} metalness={0.6} />
              </mesh>
            );
          })}
          <Text position={[-0.5, -1.05, 0.42]} fontSize={0.1} color={config.glowColor} anchorX="center" anchorY="middle">ALL</Text>
          <Text position={[0, -1.05, 0.42]} fontSize={0.1} color="#22C55E" anchorX="center" anchorY="middle">DONE</Text>
          <Text position={[0.5, -1.05, 0.42]} fontSize={0.1} color="#EF4444" anchorX="center" anchorY="middle">FAIL</Text>
        </group>

        {/* Right pillar - rate */}
        <group position={[8, 2.2, -4.0]}>
          <mesh>
            <boxGeometry args={[1.8, 4.5, 0.8]} />
            <meshStandardMaterial color="#0a1828" roughness={0.25} metalness={0.7} emissive={config.glowColor} emissiveIntensity={0.08} />
          </mesh>
          <Text position={[0, 2.0, 0.42]} fontSize={0.18} color={config.glowColor} fontWeight={700} anchorX="center" anchorY="middle">RATE</Text>
          <Text position={[0, 1.65, 0.42]} fontSize={0.11} color={`${config.glowColor}88`} anchorX="center" anchorY="middle">SUCCESS</Text>
          {/* Circular progress ring */}
          <mesh position={[0, 0.3, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.9, 0.08, 8, 32]} />
            <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1.5} roughness={0.2} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.9, 0.06, 8, 32, Math.PI * 1.25]} />
            <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={2.0} roughness={0.1} metalness={0.5} />
          </mesh>
          <Text position={[0, 0.3, 0.46]} fontSize={0.28} color="#22C55E" anchorX="center" anchorY="middle">85%</Text>
          <Text position={[0, -0.85, 0.42]} fontSize={0.1} color="#94a3b8" anchorX="center" anchorY="middle">CIRCLE = 85%</Text>
        </group>

        {/* ===== Archive cabinets (3 rows facing wall) ===== */}
        {[-1, 0, 1].map((row) => {
          return [-5, -2.5, 0, 2.5, 5].map((x, ci) => {
            const cabinetColor = (row + ci) % 2 === 0 ? '#0f2a1a' : '#0f1e2a';
            const statusColor = ci % 5 === 0 ? '#22C55E' : ci % 5 === 1 ? '#FBBF24' : ci % 5 === 2 ? '#60A5FA' : ci % 5 === 3 ? '#A78BFA' : '#34D399';
            const zPos = row * 1.4 + 1.5;
            return (
              <group key={`cab-${row}-${ci}`} position={[x, 0, zPos]}>
                {/* Cabinet body */}
                <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.4, 2.2, 0.5]} />
                  <meshStandardMaterial color={cabinetColor} roughness={0.4} metalness={0.6} emissive={config.glowColor} emissiveIntensity={0.1} />
                </mesh>
                {/* Drawer dividers */}
                {[0.55, 1.1, 1.65].map((y, li) => (
                  <mesh key={li} position={[0, y, 0.26]}>
                    <boxGeometry args={[1.38, 0.015, 0.01]} />
                    <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.4} />
                  </mesh>
                ))}
                {/* Drawer handles */}
                {[0.55, 1.1, 1.65].map((y, li) => (
                  <mesh key={li} position={[0, y, 0.27]}>
                    <boxGeometry args={[0.35, 0.05, 0.04]} />
                    <meshStandardMaterial color={statusColor} roughness={0.3} metalness={0.8} />
                  </mesh>
                ))}
                {/* Top status light */}
                <mesh position={[0, 2.22, 0]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshStandardMaterial color={statusColor} roughness={0.2} metalness={0.8} emissive={statusColor} emissiveIntensity={0.8} />
                </mesh>
                <pointLight position={[0, 2.2, 0]} intensity={0.3} color={statusColor} distance={1.5} />
              </group>
            );
          })}
        )}

        {/* Ambient Lighting */}
        <pointLight position={[0, 4, 0]} intensity={1.5} color={config.glowColor} distance={18} />
        <rectAreaLight position={[0, 4, 0]} rotation={[-Math.PI / 2, 0, 0]} width={20} height={12} intensity={0.8} color={config.glowColor} />
        <pointLight position={[-6, 2, 0]} intensity={0.5} color={config.glowColor} distance={8} />
        <pointLight position={[6, 2, 0]} intensity={0.5} color={config.glowColor} distance={8} />
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
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color={config.glowColor} transparent opacity={0.3} depthWrite={false} />
      </mesh>
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
// 相机控制器 — useEffect 驱动，无全局状态
// ===========================================
function CameraController({ orbitRef, floorY }: { orbitRef: React.RefObject<any>; floorY: number }) {
  const { camera } = useThree();

  // 楼层切换时：直接设置 OrbitControls 目标（不用 useFrame）
  useEffect(() => {
    if (!orbitRef.current) return;
    const ctrl = orbitRef.current as any;
    if (ctrl.target) {
      ctrl.target.set(ctrl.target.x, floorY, ctrl.target.z);
      ctrl.update();
    }
  }, [floorY, orbitRef]);

  return null;
}

// ===========================================
// 主组件
// ===========================================
export default function Floor3DDemo() {
  const navigate = useNavigate();
  const [currentFloor, setCurrentFloor] = useState('4f');
  // 每次楼层变化时递增，用于触发表级 CSS 过渡动画
  const [transitionKey, setTransitionKey] = useState(0);
  const currentConfig = FLOORS.find(f => f.id === currentFloor) || FLOORS[0];
  const floorIndex = getFloorIndex(currentFloor);
  const floorY = getFloorY(floorIndex);

  const orbitRef = useRef(null);

  // 楼层切换：触发表级过渡动画
  const handleFloorChange = useCallback((floorId: string) => {
    setCurrentFloor(floorId);
    setTransitionKey(k => k + 1);
  }, []);

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
        {/* 平铺总览按钮 */}
        <button
          key="flat"
          onClick={() => navigate('/flat')}
          style={{
            background: 'transparent',
            border: `1px solid #a78bfa60`,
            borderRadius: '8px',
            padding: '8px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            marginBottom: '4px',
          }}
        >
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#a78bfa60',
          }} />
          <span style={{
            fontSize: '12px',
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: '#8a7aba',
            fontWeight: '400',
          }}>
            平铺总览
          </span>
        </button>

        {FLOORS.slice().reverse().map((floor) => {
          const isActive = floor.id === currentFloor;
          return (
            <button
              key={floor.id}
              onClick={() => handleFloorChange(floor.id)}
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

      {/* Three.js Canvas — 表级过渡动画包裹层 */}
      <div
        key={`canvas-wrap-${transitionKey}`}
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'floorFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      >
      <Canvas shadows style={{ position: 'absolute', inset: 0 }}>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
        <CameraController orbitRef={orbitRef} floorY={floorY} />
        <OrbitControls
          ref={orbitRef}
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={25}
          target={[0, floorY, 0]}
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
        <Floor3DScene floorId={currentFloor} floorIndex={floorIndex} />
        <fog attach="fog" args={['#0a0a14', 20, 50]} />
      </Canvas>
      </div>

      <style>{`
        @keyframes floorFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
