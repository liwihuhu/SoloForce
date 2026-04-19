/**
 * floorConfigs.ts — 楼层配置（共享）
 * 所有楼层共享同一份 FLOORS 和 FLOOR_XZ 配置
 */

export const FLOORS = [
  { id: '1f', label: '1F 大厅',     color: '#38BDF8', floorColor: '#0c1a2e', wallColor: '#1e3a5f', glowColor: '#38BDF8' },
  { id: '2f', label: '2F 人事部',    color: '#4ADE80', floorColor: '#0c1e12', wallColor: '#1e4a2a', glowColor: '#4ADE80' },
  { id: '3f', label: '3F 项目组',    color: '#60A5FA', floorColor: '#0c0e1e', wallColor: '#1e2a4a', glowColor: '#60A5FA' },
  { id: '4f', label: '4F 任务大厅',  color: '#FBBF24', floorColor: '#1e1a0c', wallColor: '#4a4a1e', glowColor: '#FBBF24' },
  { id: '5f', label: '5F 档案中心',  color: '#A3E635', floorColor: '#0c1e0c', wallColor: '#2a4a1e', glowColor: '#A3E635' },
  { id: '6f', label: '6F OpenClaw机房', color: '#F472B6', floorColor: '#1e0c1e', wallColor: '#4a1e4a', glowColor: '#F472B6' },
];

// 每个楼层的 X,Z 位置（紧凑布局，相邻地板间距10）
export const FLOOR_XZ: Record<string, [number, number]> = {
  '1f': [  0,  25],  // 1F 大厅
  '2f': [ 30,   0],  // 2F 人事部
  '3f': [-30,   0],  // 3F 项目组
  '4f': [  0,   0],  // 4F 任务大厅
  '5f': [  0, -60],  // 5F 档案中心
  '6f': [  0, -32],  // 6F OpenClaw
};

// 楼层高度（地图模式）
export const FLOOR_HEIGHT = 3;
