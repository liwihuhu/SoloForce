import { create } from 'zustand';
import type { 
  Node, 
  Edge, 
  Connection, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect 
} from '@xyflow/react';
import { 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges 
} from '@xyflow/react';
import type { Employee } from './types';
import { EMPLOYEE_AVATARS } from './types';

// 默认员工列表（当 API 不可用时使用）
const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp-0', name: '董事长', type: 'superadmin', avatar: EMPLOYEE_AVATARS.superadmin, description: '终极管理员', status: 'idle', roleName: '董事长', department: '管理层' },
  { id: 'emp-exec', name: 'OpenClaw执行官', type: 'executor', avatar: EMPLOYEE_AVATARS.executor, description: '汇总执行层输出', status: 'idle', roleName: '执行官', department: '技术部' },
  { id: 'emp-1', name: '张经理', type: 'manager', avatar: EMPLOYEE_AVATARS.manager, description: '团队负责人', status: 'idle', roleName: '团队经理', department: '产品研发部' },
  { id: 'emp-2', name: '陈开发', type: 'developer', avatar: EMPLOYEE_AVATARS.developer, description: '后端开发', status: 'idle', roleName: '后端开发工程师', department: '技术部' },
  { id: 'emp-3', name: '刘前端', type: 'developer', avatar: EMPLOYEE_AVATARS.developer, description: '前端开发', status: 'idle', roleName: '前端开发工程师', department: '技术部' },
  { id: 'emp-4', name: '林设计', type: 'designer', avatar: EMPLOYEE_AVATARS.designer, description: 'UI/UX设计师', status: 'idle', roleName: '设计师', department: '设计部' },
  { id: 'emp-5', name: '徐分析', type: 'analyst', avatar: EMPLOYEE_AVATARS.analyst, description: '数据分析师', status: 'idle', roleName: '数据分析师', department: '数据部' },
  { id: 'emp-6', name: '王文案', type: 'writer', avatar: EMPLOYEE_AVATARS.writer, description: '内容创作者', status: 'idle', roleName: '内容运营', department: '运营部' },
  { id: 'emp-7', name: '赵客服', type: 'support', avatar: EMPLOYEE_AVATARS.support, description: '客户支持', status: 'idle', roleName: '客户支持', department: '客服部' },
  { id: 'emp-8', name: '孙研究', type: 'researcher', avatar: EMPLOYEE_AVATARS.researcher, description: '技术研究员', status: 'idle', roleName: '技术研究员', department: '研发部' },
  { id: 'emp-9', name: '周测试', type: 'qa', avatar: EMPLOYEE_AVATARS.qa, description: '测试工程师', status: 'idle', roleName: '测试工程师', department: '质量部' },
  { id: 'emp-10', name: '吴销售', type: 'sales', avatar: EMPLOYEE_AVATARS.sales, description: '销售代表', status: 'idle', roleName: '销售代表', department: '销售部' },
];

// 从 API 加载员工数据
async function fetchEmployees(): Promise<Employee[]> {
  try {
    const response = await fetch('http://localhost:5301/api/employees');
    const result = await response.json();
    if (result.success) {
      return result.data.items;
    }
  } catch (error) {
    console.error('加载员工失败:', error);
  }
  return DEFAULT_EMPLOYEES;
}

// 获取当前使用的员工列表
function getEmployees(employees: Employee[]): Employee[] {
  return employees.length > 0 ? employees : DEFAULT_EMPLOYEES;
}

// 初始化节点 - 树状图布局
function initializeTreeLayout(savedEdges: Edge[] = [], employees?: Employee[]): Node[] {
  const employeeList = employees || DEFAULT_EMPLOYEES;
  const centerX = 500;
  const centerY = 60;
  const horizontalSpacing = 300;
  const verticalSpacing = 220;
  
  // 找出所有参与关系的员工ID
  const relatedIds = new Set<string>();
  savedEdges.forEach(e => {
    relatedIds.add(e.source);
    relatedIds.add(e.target);
  });
  
  // 找出顶级节点（没有上级的）
  const topLevelIds = savedEdges
    .filter(e => !savedEdges.some(other => other.target === e.source))
    .map(e => e.source);
  
  // 如果没有顶级节点但有关系，取第一个
  if (topLevelIds.length === 0 && savedEdges.length > 0) {
    topLevelIds.push(savedEdges[0].source);
  }
  
  // 递归计算每层节点
  const getLevelNodes = (parentId: string, level: number, visited: Set<string>): string[] => {
    if (visited.has(parentId)) return [];
    visited.add(parentId);
    
    const children = savedEdges
      .filter(e => e.source === parentId)
      .map(e => e.target);
    
    return [parentId, ...children.flatMap(child => getLevelNodes(child, level + 1, visited))];
  };
  
  // 计算所有层级
  const allLevels: string[][] = [];
  const visited = new Set<string>();
  
  // 顶级节点放第一层
  if (topLevelIds.length > 0) {
    allLevels.push([...topLevelIds]);
    topLevelIds.forEach(id => visited.add(id));
  }
  
  // 递归获取剩余层级
  const getRemainingLevels = (parents: string[], level: number) => {
    if (parents.length === 0) return;
    
    const children: string[] = [];
    parents.forEach(parent => {
      const directChildren = savedEdges
        .filter(e => e.source === parent)
        .map(e => e.target)
        .filter(id => !visited.has(id));
      
      directChildren.forEach(id => {
        if (!visited.has(id)) {
          visited.add(id);
          children.push(id);
        }
      });
    });
    
    if (children.length > 0) {
      allLevels.push(children);
      getRemainingLevels(children, level + 1);
    }
  };
  
  getRemainingLevels(topLevelIds, 1);
  
  // 收集未参与关系的员工
  const unrelatedEmployees = employeeList.filter(e => !relatedIds.has(e.id));
  
  // 构建节点位置
  const nodes: Node[] = [];
  
  // 已参与关系的员工 - 树状布局
  allLevels.forEach((levelNodes, levelIndex) => {
    const levelWidth = levelNodes.length * horizontalSpacing;
    const startX = centerX - levelWidth / 2 + horizontalSpacing / 2;
    
    levelNodes.forEach((nodeId, nodeIndex) => {
      const emp = employeeList.find(e => e.id === nodeId);
      if (emp) {
        nodes.push({
          id: emp.id,
          type: 'employeeNode',
          position: {
            x: startX + nodeIndex * horizontalSpacing,
            y: centerY + levelIndex * verticalSpacing,
          },
          data: { employee: emp },
          draggable: true,
        });
      }
    });
  });
  
  // 未参与关系的员工 - 放在底部
  const maxLevel = allLevels.length > 0 ? allLevels.length - 1 : 0;
  const lowestY = centerY + maxLevel * verticalSpacing + 150;
  
  unrelatedEmployees.forEach((emp, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    nodes.push({
      id: emp.id,
      type: 'employeeNode',
      position: {
        x: centerX + (col - 1.5) * 200,
        y: lowestY + row * verticalSpacing,
      },
      data: { employee: emp },
      draggable: true,
    });
  });
  
  return nodes;
}

// 初始布局
const initialNodes = initializeTreeLayout();

// 关系数据结构
export interface Relationship {
  source: string;
  target: string;
}

interface Team {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  memberIds: string[];
  relationships: Relationship[];
  createdAt: string;
  updatedAt: string;
}

interface TopologyState {
  nodes: Node[];
  edges: Edge[];
  employees: Employee[];
  teams: Team[];
  currentTeamId: string | null;
  selectedEmployee: string | null;
  savedPath: string | null;
  
  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedEmployee: (id: string | null) => void;
  getSubordinates: (employeeId: string) => string[];
  getManager: (employeeId: string) => string | null;
  clearRelationships: () => void;
  saveRelationships: (path: string) => Promise<any>;
  loadRelationships: (relationships: Relationship[]) => void;
  loadFromServer: () => Promise<void>;
  reloadEmployees: () => Promise<void>;
  reloadTeams: () => Promise<void>;
  switchTeam: (team: Team) => void;
  getRelationships: () => Relationship[];
}

export const useTopologyStore = create<TopologyState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  employees: [],
  teams: [],
  currentTeamId: null,
  selectedEmployee: null,
  savedPath: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    if (connection.source === connection.target) return;

    const targetNode = get().nodes.find(n => n.id === connection.target);
    const targetEmployee = targetNode?.data?.employee as { type: string } | undefined;
    const sourceNode = get().nodes.find(n => n.id === connection.source);
    const sourceEmployee = sourceNode?.data?.employee as { type: string } | undefined;
    
    // superadmin 不能有上级
    if (targetEmployee?.type === 'superadmin') {
      console.warn('⚠️ 终极管理员不能有上级');
      return;
    }
    
    // executor 只能作为叶子节点（只能被连接，不能连接别人）
    if (sourceEmployee?.type === 'executor') {
      console.warn('⚠️ OpenClaw执行官不能向下链接');
      return;
    }
    
    // executor 可以有多个下属，其他员工只能有一个上级
    const isExecutorTarget = targetEmployee?.type === 'executor';
    const existingEdge = !isExecutorTarget && get().edges.find(e => e.target === connection.target);
    
    if (existingEdge) {
      set({
        edges: [
          ...get().edges.filter(e => e.target !== connection.target),
          {
            ...connection,
            id: `edge-${connection.source}-${connection.target}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366F1', strokeWidth: 2 },
          } as Edge,
        ],
      });
    } else {
      set({
        edges: addEdge({
          ...connection,
          id: `edge-${connection.source}-${connection.target}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366F1', strokeWidth: 2 },
        }, get().edges),
      });
    }
    
    // 重新布局节点（使用当前团队成员）
    setTimeout(() => {
      const newEdges = get().edges;
      const currentEmployees = get().employees;
      console.log('🔄 重新布局节点，当前成员:', currentEmployees.map(e => e.name));
      const newNodes = initializeTreeLayout(newEdges, currentEmployees);
      set({ nodes: newNodes });
    }, 100);
  },

  setSelectedEmployee: (id) => {
    set({ selectedEmployee: id });
  },

  getSubordinates: (employeeId: string) => {
    return get()
      .edges.filter(e => e.source === employeeId)
      .map(e => e.target);
  },

  getManager: (employeeId: string) => {
    const edge = get().edges.find(e => e.target === employeeId);
    return edge?.source || null;
  },

  clearRelationships: () => {
    set({ edges: [] });
    // 重新布局（所有节点都会变成未参与关系），使用当前团队成员
    setTimeout(() => {
      const currentEmployees = get().employees;
      const newNodes = initializeTreeLayout([], currentEmployees);
      set({ nodes: newNodes });
    }, 100);
  },

  saveRelationships: async (filename: string = 'relationships.json') => {
    const relationships = get().getRelationships();
    const currentTeamId = get().currentTeamId;
    
    // 保存到文件（兼容旧逻辑）
    const data = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      relationships,
      employees: DEFAULT_EMPLOYEES,
    };
    
    try {
      const response = await fetch('http://localhost:5301/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data }),
      });
      const result = await response.json();
      if (result.success) {
        console.log('✅ 关系已保存到:', result.path);
      }
      set({ savedPath: filename });
      
      // 如果有选中的团队，同时更新团队数据
      if (currentTeamId) {
        try {
          await fetch(`http://localhost:5301/api/teams/${currentTeamId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relationships }),
          });
          console.log('✅ 团队关系已同步更新');
        } catch (e) {
          console.error('团队关系同步失败:', e);
        }
      }
      
      return result;
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  },

  loadRelationships: (relationships: Relationship[]) => {
    const edges: Edge[] = relationships.map((rel, index) => ({
      id: `edge-${rel.source}-${rel.target}-${index}`,
      source: rel.source,
      target: rel.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
    }));
    set({ edges });
    
    // 根据关系重新布局，使用当前团队成员
    const currentEmployees = get().employees;
    const newNodes = initializeTreeLayout(edges, currentEmployees);
    set({ nodes: newNodes });
  },

  loadFromServer: async () => {
    const currentTeamId = get().currentTeamId;
    
    try {
      // 加载团队列表
      const teamsResponse = await fetch('http://localhost:5301/api/teams');
      const teamsResult = await teamsResponse.json();
      if (teamsResult.success) {
        set({ teams: teamsResult.data });
        
        // 检查 localStorage 是否有保存的团队，或者当前已有团队
        const savedTeamId = currentTeamId || localStorage.getItem('tw-current-team-id');
        if (savedTeamId) {
          const savedTeam = teamsResult.data.find((t: Team) => t.id === savedTeamId);
          if (savedTeam) {
            // 使用团队成员
            const teamEmpList = DEFAULT_EMPLOYEES.filter(e => savedTeam.memberIds.includes(e.id));
            
            const edges: Edge[] = savedTeam.relationships.map((rel: Relationship, index: number) => ({
              id: `edge-${rel.source}-${rel.target}-${index}`,
              source: rel.source,
              target: rel.target,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366F1', strokeWidth: 2 },
            }));
            
            const newNodes = initializeTreeLayout(edges, teamEmpList);
            set({ 
              employees: teamEmpList,
              edges, 
              nodes: newNodes,
              currentTeamId: savedTeam.id 
            });
            console.log('✅ 已自动加载团队:', savedTeam.name);
            return;
          }
        }
      }
      
      // 加载员工列表（当没有团队时）
      const employees = await fetchEmployees();
      set({ employees });
      
      // 如果没有保存的团队，加载拓扑关系
      const response = await fetch('http://localhost:5301/api/status');
      const result = await response.json();
      if (result.success && result.data.loaded) {
        const edges: Edge[] = result.data.relationships.map((rel: Relationship, index: number) => ({
          id: `edge-${rel.source}-${rel.target}-${index}`,
          source: rel.source,
          target: rel.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366F1', strokeWidth: 2 },
        }));
        set({ edges });
        
        // 根据保存的关系布局（使用最新员工列表）
        const newNodes = initializeTreeLayout(edges, employees);
        set({ nodes: newNodes });
        
        console.log('✅ 已从服务器加载拓扑关系和员工列表');
      }
    } catch (error) {
      console.error('加载失败:', error);
    }
  },

  // 重新加载员工列表（供员工管理页面使用）
  reloadEmployees: async () => {
    const employees = await fetchEmployees();
    set({ employees });
    console.log('✅ 已刷新员工列表:', employees.length, '人');
  },

  // 重新加载团队列表
  reloadTeams: async () => {
    try {
      const response = await fetch('http://localhost:5301/api/teams');
      const result = await response.json();
      if (result.success) {
        set({ teams: result.data });
        console.log('✅ 已刷新团队列表:', result.data.length, '个团队');
      }
    } catch (error) {
      console.error('加载团队失败:', error);
    }
  },

  // 切换团队
  switchTeam: (team: Team) => {
    // 始终使用 DEFAULT_EMPLOYEES 来过滤团队成员，确保数据完整
    const employees = DEFAULT_EMPLOYEES.filter(e => team.memberIds.includes(e.id));
    console.log('🔍 团队成员:', team.name, '→', employees.map(e => e.name));
    
    // 转换关系为 Edge 格式
    const edges: Edge[] = team.relationships.map((rel, index) => ({
      id: `edge-${rel.source}-${rel.target}-${index}`,
      source: rel.source,
      target: rel.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
    }));
    
    // 重新布局节点
    const newNodes = initializeTreeLayout(edges, employees);
    
    // 保存到 localStorage
    localStorage.setItem('tw-current-team-id', team.id);
    
    set({ 
      employees,
      edges, 
      nodes: newNodes,
      currentTeamId: team.id 
    });
    console.log('✅ 已切换到团队:', team.name, '，成员数:', employees.length);
  },

  getRelationships: () => {
    return get().edges.map(edge => ({
      source: edge.source,
      target: edge.target,
    }));
  },
}));
