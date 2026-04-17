// ===========================================
// SF Control Room - 类型定义（简化版）
// ===========================================

// 地图元数据
export interface MapMeta {
  version: string;
  schema: string;
  baseResolution?: { width: number; height: number };
}

// 楼层信息
export interface Floor {
  id: string;
  label: string;
  labelEn: string;
  floorIndex: number;
  rooms: Room[];
}

// 房间信息
export interface Room {
  id: string;
  label: string;
  bounds: number[];
  workZones: WorkZone[];
}

// 工作区域/触发点
export interface WorkZone {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  type: WorkZoneType;
  radius: number;
  panel?: string;
  employeeId?: string;
  serverId?: string;
  targetFloor?: string;
  action?: string;
}

export type WorkZoneType = 
  | 'info'
  | 'navigation'
  | 'employee'
  | 'task'
  | 'topology'
  | 'document'
  | 'system';

// 面板类型
export interface PanelType {
  id: string;
  title: string;
  icon: string;
  dataSource: 'static' | 'api' | 'route';
  endpoint?: string;
  route?: string;
  refreshInterval?: number;
  description?: string;
  content?: {
    type: string;
    text?: string;
  };
}

// 角色状态
export type ActorState = 'idle' | 'moving' | 'working' | 'error' | 'resting';

// 控制室状态
export interface ControlRoomState {
  currentFloor: string;
  selectedWorkZone: WorkZone | null;
  isPanelOpen: boolean;
  actorPosition: { x: number; y: number };
  actorState: ActorState;
  isLoading: boolean;
}
