// ===========================================
// SF Control Room - 主组件（简洁线条风）
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import type { Floor, WorkZone } from './types';
import FloorRenderer from './FloorRenderer';
import WorkZoneMarker from './WorkZone';
import InfoPanel from './InfoPanel';
import FloorSelector from './FloorSelector';

import mapLogicData from './map.logic.json';

// 断言类型
const mapLogic = mapLogicData as { floors: Floor[] };

// API 基础地址
const API_BASE = 'http://localhost:5301';

interface ControlRoomProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ControlRoom({ className, style }: ControlRoomProps) {
  // 状态
  const [currentFloor, setCurrentFloor] = useState<string>('1f');
  const [selectedWorkZone, setSelectedWorkZone] = useState<WorkZone | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [employeeData, setEmployeeData] = useState<Record<string, any>>({});
  const [taskData, setTaskData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前楼层数据
  const currentFloorData: Floor | undefined = mapLogic.floors.find(f => f.id === currentFloor);

  // 加载外部数据
  const loadData = useCallback(async () => {
    try {
      const empRes = await fetch(`${API_BASE}/api/status`);
      const empResult = await empRes.json();
      if (empResult.success && empResult.data.employees) {
        const empMap: Record<string, any> = {};
        empResult.data.employees.forEach((emp: any) => {
          empMap[emp.id] = emp;
        });
        setEmployeeData(empMap);
      }

      const taskRes = await fetch(`${API_BASE}/api/task-history/statistics`);
      const taskResult = await taskRes.json();
      if (taskResult.success) {
        setTaskData(taskResult.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    setIsLoading(false);
  }, [loadData]);

  // 处理工作区点击
  const handleWorkZoneClick = useCallback((workZone: WorkZone) => {
    setSelectedWorkZone(workZone);

    if (workZone.type === 'navigation') {
      if (workZone.action === 'floor_select') {
        return;
      }
    }

    setIsPanelOpen(true);
  }, []);

  // 关闭面板
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedWorkZone(null);
  }, []);

  // 楼层切换
  const handleFloorChange = useCallback((floorId: string) => {
    setCurrentFloor(floorId);
    setIsPanelOpen(false);
    setSelectedWorkZone(null);
  }, []);

  // 获取面板数据
  const getPanelData = useCallback((): any => {
    if (!selectedWorkZone) return null;

    if (selectedWorkZone.employeeId) {
      return employeeData[selectedWorkZone.employeeId] || null;
    }

    if (selectedWorkZone.panel === 'task_center' || selectedWorkZone.panel === 'task_input') {
      return taskData;
    }

    return null;
  }, [selectedWorkZone, employeeData, taskData]);

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F172A',
          color: '#E2E8F0',
          fontSize: '18px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>◇</div>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0F172A',
        ...style,
      }}
    >
      {/* 楼层标签 */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 100,
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px', fontFamily: 'monospace' }}>
          CURRENT
        </div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          {currentFloorData?.label || currentFloor}
        </div>
      </div>

      {/* 楼层渲染 */}
      <FloorRenderer floorId={currentFloor} />

      {/* 工作区标记 */}
      {currentFloorData?.rooms.flatMap(room =>
        room.workZones.map(workZone => (
          <WorkZoneMarker
            key={`${currentFloor}-${workZone.id}`}
            workZone={workZone}
            floorId={currentFloor}
            employeeData={workZone.employeeId ? employeeData[workZone.employeeId] : undefined}
            isSelected={selectedWorkZone?.id === workZone.id}
            onClick={() => handleWorkZoneClick(workZone)}
          />
        ))
      )}

      {/* 楼层选择器 */}
      <FloorSelector
        currentFloor={currentFloor}
        floors={mapLogic.floors}
        onFloorChange={handleFloorChange}
      />

      {/* 信息面板 */}
      {isPanelOpen && selectedWorkZone && (
        <InfoPanel
          workZone={selectedWorkZone}
          panelConfig={null}
          data={getPanelData()}
          onClose={handleClosePanel}
          employeeData={employeeData}
        />
      )}

      {/* 导航提示 */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          padding: '8px 20px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '20px',
          backdropFilter: 'blur(8px)',
          fontSize: '12px',
          color: '#64748B',
          fontFamily: 'monospace',
        }}
      >
        ◇ 点击区域查看详情 | ◇ 右上角切换楼层
      </div>
    </div>
  );
}
