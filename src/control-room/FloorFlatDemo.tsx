/**
 * FloorFlatDemo — 楼层平铺总览
 * 6层横向平铺，每层彩色地板+名称，透视俯视
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────
const FLOORS = [
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

interface LobbyStats {
  teams: number;
  employees: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksRunning: number;
  tasksFailed: number;
  tasksPending: number;
}



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


const EMP_TYPE_COLORS: Record<string, string> = {
  superadmin: '#F59E0B', executor: '#DC2626', manager: '#7C3AED',
  developer: '#3B82F6', designer: '#DB2777', analyst: '#059669',
  writer: '#D97706', support: '#0891B2', researcher: '#7C3AED',
  qa: '#DC2626', devops: '#4B5563', sales: '#EA580C',
};



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

    {/* ===== 地板发光边框 ===== */}
    {/* 底边 */}
    <mesh position={[0, 0.003, -6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    {/* 顶边 */}
    <mesh position={[0, 0.003, 6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    {/* 左边 */}
    <mesh position={[-8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    {/* 右边 */}
    <mesh position={[8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
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
function ZoneHR() {
  const c = FLOORS[1];
  // 本地状态存储员工数据（楼层切换时重新请求）
      const [empData, setEmpData] = useState<FloorEmployee[]>([]);

      useEffect(() => {
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
      }, []);

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
  <group position={[0, 0, 0]}>
    {/* 地板 */}
    <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.floorColor} roughness={0.25} metalness={0.4} emissive={c.glowColor} emissiveIntensity={0.04} />
    </mesh>
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.glowColor} transparent opacity={0.12} depthWrite={false} />
    </mesh>

    {/* ===== 地板发光边框 ===== */}
    <mesh position={[0, 0.003, -6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 0.003, 6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[-8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>

    {/* ===== 背景墙员工总览大屏 ===== */}
    <group position={[0, 3.2, -5.7]}>
      {/* 屏幕框架 */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[12.4, 6.4, 0.12]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 主屏幕 */}
      <EmployeeOverviewScreen position={[0, 0, 0]} color={c.glowColor} />
      {/* 顶部装饰条 */}
      <mesh position={[0, 3.2, 0.01]}>
        <boxGeometry args={[12.0, 0.35, 0.02]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.5} />
      </mesh>
      {/* 左右补光 */}
      <pointLight position={[-7, 0, 1]} intensity={0.5} color={c.glowColor} distance={6} />
      <pointLight position={[7, 0, 1]} intensity={0.5} color={c.glowColor} distance={6} />
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
        stationColor={EMP_TYPE_COLORS[emp.type] || c.glowColor}
        onClick={dispatchEmployeeSelect}
      />
    ))}

    {/* 环境光 */}
    <pointLight position={[0, 5, 0]} intensity={1.5} color={c.glowColor} distance={18} />
    <rectAreaLight position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} width={16} height={12} intensity={0.8} color={c.glowColor} />
    <pointLight position={[0, 4.5, 4.5]} intensity={0.4} color={c.glowColor} distance={8} />
    <pointLight position={[-6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
    <pointLight position={[6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
  </group>
  );
}
function ZoneProject() {
  const c = FLOORS[2];
  // 获取团队数据
      const [teamsData, setTeamsData] = useState<any[]>([]);
      const [empData, setEmpData] = useState<any[]>([]);

      useEffect(() => {
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
      }, []);

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
  <group position={[0, 0, 0]}>
    {/* 地板 */}
    <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.floorColor} roughness={0.25} metalness={0.4} emissive={c.glowColor} emissiveIntensity={0.04} />
    </mesh>
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color={c.glowColor} transparent opacity={0.12} depthWrite={false} />
    </mesh>

    {/* ===== 地板发光边框 ===== */}
    <mesh position={[0, 0.003, -6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 0.003, 6.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[-8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[8.0, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[12, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
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
        color={c.glowColor}
        teams={teamsData}
      />
      <mesh position={[0, 3.0, 0.01]}>
        <boxGeometry args={[12.0, 0.3, 0.02]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[-7, 0, 1]} intensity={0.5} color={c.glowColor} distance={6} />
      <pointLight position={[7, 0, 1]} intensity={0.5} color={c.glowColor} distance={6} />
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
            <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={0.08} transparent opacity={0.45} />
          </mesh>

          {/* 会议桌 */}
          <MeetingTable color={c.glowColor} />

          {/* 桌上方团队名称 */}
          <group position={[0, 1.88, 0]}>
            <Text fontSize={0.26} color="#ffffff" anchorX="center" anchorY="middle">
              {team.name}
            </Text>
            {leader && (
              <Text position={[0, -0.3, 0]} fontSize={0.12} color={c.glowColor} anchorX="center" anchorY="middle">
                {leader.name} · {leader.roleName}
              </Text>
            )}
            <Text position={[0, -0.52, 0]} fontSize={0.1} color={c.glowColor + 'aa'} anchorX="center" anchorY="middle">
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
          <pointLight position={[0, 2.2, 0]} intensity={1.0} color={c.glowColor} distance={5} />
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
    <pointLight position={[0, 5, 0]} intensity={1.5} color={c.glowColor} distance={18} />
    <rectAreaLight position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} width={16} height={12} intensity={0.8} color={c.glowColor} />
    <pointLight position={[0, 4.5, 4.5]} intensity={0.4} color={c.glowColor} distance={8} />
    <pointLight position={[-6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
    <pointLight position={[6, 2, -1]} intensity={0.3} color={c.glowColor} distance={8} />
  </group>
  );
}
function ZoneCommand() {
  const c = FLOORS[3];
  return (
  <group position={[0, 0, 0]}>
    {/* 地板 */}
    <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[27, 21]} />
      <meshStandardMaterial color={c.floorColor} roughness={0.4} metalness={0.3} emissive={c.glowColor} emissiveIntensity={0.08} />
    </mesh>
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[27, 21]} />
      <meshStandardMaterial color={c.glowColor} transparent opacity={0.3} depthWrite={false} />
    </mesh>

    {/* ===== 地板发光边框 ===== */}
    <mesh position={[0, 0.003, -10.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[27, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 0.003, 10.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[27, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[-13.5, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[21, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[13.5, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[21, 0.08]} />
      <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
    </mesh>

    {/* ===== 主控台 ===== */}
    <mesh position={[0, 0.7, 5.7]} castShadow receiveShadow>
      <boxGeometry args={[10.5, 0.06, 2.1]} />
      <meshStandardMaterial color="#1a2a3a" roughness={0.2} metalness={0.7} emissive={c.glowColor} emissiveIntensity={0.06} />
    </mesh>
    <mesh position={[0, 1.0, 5.7]}>
      <boxGeometry args={[9.0, 0.83, 0.06]} />
      <meshStandardMaterial color="#0a1520" roughness={0.1} metalness={0.5} emissive={c.glowColor} emissiveIntensity={0.3} />
    </mesh>
    {[-2.85, -1.43, 0, 1.43, 2.85].map((x, i) => (
      <mesh key={i} position={[x, 1.3, 5.73]}>
        <boxGeometry args={[0.83, 0.07, 0.01]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={i === 2 ? 2.0 : 0.8} />
      </mesh>
    ))}

    {/* 左右两组操控席 */}
    {[-8.25, 8.25].map((x, si) => (
      <group key={si} position={[x, 0, 4.5]}>
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.06, 1.8]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.2} metalness={0.7} emissive={c.glowColor} emissiveIntensity={0.06} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[3.3, 0.6, 0.06]} />
          <meshStandardMaterial color="#0a1520" roughness={0.1} metalness={0.5} emissive={c.glowColor} emissiveIntensity={0.3} />
        </mesh>
        {[-0.75, 0, 0.75].map((dx, j) => (
          <mesh key={j} position={[dx, 1.18, 0.01]}>
            <boxGeometry args={[0.53, 0.06, 0.01]} />
            <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={1.2} />
          </mesh>
        ))}
        <OfficeChair position={[0, 0, -2.1]} rotation={0} />
      </group>
    ))}

    {/* 指挥席椅子 */}
    {[-3.3, -1.13, 1.13, 3.3].map((x, i) => (
      <OfficeChair key={i} position={[x, 0, 7.2]} rotation={Math.PI} />
    ))}

    {/* ===== 三块数据驱动大屏 ===== */}
    {/* 左屏 */}
    <group position={[-10.5, 3.6, -5.7]} rotation={[0, Math.PI / 4.5, 0]}>
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[7.5, 5.4, 0.23]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      <MiniTaskStatScreen width={7.2} height={5.0} color={c.glowColor} type="pending" />
      <mesh position={[0, 2.48, 0.07]}>
        <boxGeometry args={[6.9, 0.27, 0.03]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={2.0} />
      </mesh>
      <pointLight position={[0, 0, 1]} intensity={0.6} color={c.glowColor} distance={8} />
    </group>

    {/* 中央主屏 */}
    <group position={[0, 4.2, -9.0]}>
      <mesh position={[0, 0, -0.18]}>
        <boxGeometry args={[14.3, 7.2, 0.27]} />
        <meshStandardMaterial color="#0a1828" roughness={0.25} metalness={0.7} />
      </mesh>
      <TaskCommandScreen width={13.8} height={6.8} color={c.glowColor} />
      <mesh position={[0, 3.38, 0.07]}>
        <boxGeometry args={[13.5, 0.33, 0.03]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[0, 0, 1]} intensity={1.0} color={c.glowColor} distance={12} />
    </group>

    {/* 右屏 */}
    <group position={[10.5, 3.6, -5.7]} rotation={[0, -Math.PI / 4.5, 0]}>
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[7.5, 5.4, 0.23]} />
        <meshStandardMaterial color="#0a1828" roughness={0.3} metalness={0.7} />
      </mesh>
      <MiniTaskStatScreen width={7.2} height={5.0} color={c.glowColor} type="done" />
      <mesh position={[0, 2.48, 0.07]}>
        <boxGeometry args={[6.9, 0.27, 0.03]} />
        <meshStandardMaterial color={c.glowColor} emissive={c.glowColor} emissiveIntensity={2.0} />
      </mesh>
      <pointLight position={[0, 0, 1]} intensity={0.6} color={c.glowColor} distance={8} />
    </group>

    {/* 环境光照 */}
    <pointLight position={[0, 4.5, -3]} intensity={2.5} color={c.glowColor} distance={20} />
    <rectAreaLight position={[0, 6, -6.8]} rotation={[-Math.PI / 2, 0, 0]} width={18} height={5.3} intensity={2.0} color={c.glowColor} />
    <pointLight position={[-9, 1.8, 0]} intensity={1.0} color={c.glowColor} distance={13} />
    <pointLight position={[9, 1.8, 0]} intensity={1.0} color={c.glowColor} distance={13} />
  </group>
  );
}
function ZoneArchive() { const f = FLOORS[4]; return <FloorPlane color={f.color} emissive={f.glowColor} label={f.label} />; }
function ZoneCore()    { const f = FLOORS[5]; return <FloorPlane color={f.color} emissive={f.glowColor} label={f.label} />; }

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
