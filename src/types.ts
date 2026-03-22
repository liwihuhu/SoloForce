// 员工类型定义
export type EmployeeType = 
  | 'superadmin'   // 终极管理员（权限最高，无上级）
  | 'executor'     // OpenClaw 执行官（汇总执行层，优化输出）
  | 'manager'      // 经理
  | 'developer'    // 开发工程师
  | 'designer'     // 设计师
  | 'analyst'      // 数据分析师
  | 'writer'       // 内容创作者
  | 'support'      // 客服支持
  | 'researcher'   // 研究员
  | 'qa'           // 测试工程师
  | 'devops'       // 运维工程师
  | 'sales';       // 销售

// 员工状态
export type EmployeeStatus = 'idle' | 'busy' | 'offline';

// 员工节点数据（扩展版）
export interface Employee {
  id: string;
  name: string;
  nickname?: string;
  type: EmployeeType;
  roleName?: string;
  avatar: string;
  description: string;
  department?: string;
  status: EmployeeStatus;
  
  // 档案信息
  profile?: {
    age?: number;
    yearsOfService?: number;
    joinDate?: string;
    location?: string;
    email?: string;
    phone?: string;
  };
  
  // 擅长技能
  expertise?: string[];
  
  // 职责描述
  responsibilities?: string[];
  
  // 统计信息
  stats?: {
    tasksCompleted: number;
    uptime: number;
    lastActive: string;
    efficiency: number;
  };
  
  createdAt?: string;
  updatedAt?: string;
}

// 员工头像映射（图片优先，emoji备用）
export const EMPLOYEE_AVATARS: Record<EmployeeType, string> = {
  superadmin: '/avatars/superadmin.png',
  executor: '/avatars/executor.png',
  manager: '/avatars/manager.png',
  developer: '/avatars/developer.png',
  designer: '/avatars/designer.png',
  analyst: '/avatars/analyst.png',
  writer: '/avatars/writer.png',
  support: '/avatars/support.png',
  researcher: '/avatars/researcher.png',
  qa: '/avatars/qa.png',
  devops: '/avatars/developer.png', // 复用开发者头像
  sales: '/avatars/sales.png',
};

// 12种预设员工（第一个是终极管理员，第二个是OpenClaw执行官）
export const PRESET_EMPLOYEES: Employee[] = [
  { 
    id: 'emp-0', 
    name: '董事长', 
    type: 'superadmin', 
    avatar: EMPLOYEE_AVATARS.superadmin,
    description: '终极管理员，权限最高，不存在上级'
  },
  { 
    id: 'emp-exec', 
    name: 'OpenClaw执行官', 
    type: 'executor', 
    avatar: EMPLOYEE_AVATARS.executor,
    description: '汇总执行层输出，优化任务，形成可执行命令'
  },
  { 
    id: 'emp-1', 
    name: '张经理', 
    type: 'manager', 
    avatar: EMPLOYEE_AVATARS.manager,
    description: '团队负责人，负责整体协调和决策'
  },
  { 
    id: 'emp-2', 
    name: '陈开发', 
    type: 'developer', 
    avatar: EMPLOYEE_AVATARS.developer,
    description: '后端开发，擅长 Java/Go'
  },
  { 
    id: 'emp-3', 
    name: '刘前端', 
    type: 'developer', 
    avatar: EMPLOYEE_AVATARS.developer,
    description: '前端开发，擅长 React/Vue'
  },
  { 
    id: 'emp-4', 
    name: '林设计', 
    type: 'designer', 
    avatar: EMPLOYEE_AVATARS.designer,
    description: 'UI/UX 设计师'
  },
  { 
    id: 'emp-5', 
    name: '徐分析', 
    type: 'analyst', 
    avatar: EMPLOYEE_AVATARS.analyst,
    description: '数据分析师'
  },
  { 
    id: 'emp-6', 
    name: '王文案', 
    type: 'writer', 
    avatar: EMPLOYEE_AVATARS.writer,
    description: '内容创作者'
  },
  { 
    id: 'emp-7', 
    name: '赵客服', 
    type: 'support', 
    avatar: EMPLOYEE_AVATARS.support,
    description: '客户支持'
  },
  { 
    id: 'emp-8', 
    name: '孙研究', 
    type: 'researcher', 
    avatar: EMPLOYEE_AVATARS.researcher,
    description: '技术研究员'
  },
  { 
    id: 'emp-9', 
    name: '周测试', 
    type: 'qa', 
    avatar: EMPLOYEE_AVATARS.qa,
    description: '测试工程师'
  },
  { 
    id: 'emp-10', 
    name: '吴销售', 
    type: 'sales', 
    avatar: EMPLOYEE_AVATARS.sales,
    description: '销售代表'
  },
];

// 默认员工列表（与 PRESET_EMPLOYEES 相同，用于 store 中的默认值）
export const DEFAULT_EMPLOYEES = PRESET_EMPLOYEES;

// 员工类型的颜色配置
export const EMPLOYEE_TYPE_CONFIG: Record<EmployeeType, { color: string; bgColor: string }> = {
  superadmin: { color: '#F59E0B', bgColor: '#FEF3C7' },
  executor: { color: '#DC2626', bgColor: '#FEE2E2' },
  manager: { color: '#7C3AED', bgColor: '#EDE9FE' },
  developer: { color: '#2563EB', bgColor: '#DBEAFE' },
  designer: { color: '#DB2777', bgColor: '#FCE7F3' },
  analyst: { color: '#059669', bgColor: '#D1FAE5' },
  writer: { color: '#D97706', bgColor: '#FEF3C7' },
  support: { color: '#0891B2', bgColor: '#CFFAFE' },
  researcher: { color: '#7C3AED', bgColor: '#EDE9FE' },
  qa: { color: '#DC2626', bgColor: '#FEE2E2' },
  devops: { color: '#4B5563', bgColor: '#F3F4F6' },
  sales: { color: '#EA580C', bgColor: '#FFEDD5' },
};
