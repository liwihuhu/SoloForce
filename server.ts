import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5301;

// 硅基流动API配置
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '请在 .env 文件中配置 OPENAI_API_KEY';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'qwen2.5-7b-instruct';

// 员工类型
type EmployeeType = 
  | 'superadmin' | 'executor' | 'manager' | 'developer' | 'designer'
  | 'analyst' | 'writer' | 'support' | 'researcher' | 'qa' | 'devops' | 'sales';

// 员工头像映射
const EMPLOYEE_AVATARS: Record<EmployeeType, string> = {
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
  devops: '/avatars/developer.png',
  sales: '/avatars/sales.png',
};

// 员工状态
type EmployeeStatus = 'idle' | 'busy' | 'offline';

// 扩展的员工接口
interface Employee {
  id: string;
  name: string;
  nickname?: string;
  type: EmployeeType;
  roleName?: string;
  avatar: string;
  description: string;
  department?: string;
  status: EmployeeStatus;
  profile?: {
    age?: number;
    yearsOfService?: number;
    joinDate?: string;
    location?: string;
    email?: string;
    phone?: string;
  };
  expertise?: string[];
  responsibilities?: string[];
  stats?: {
    tasksCompleted: number;
    uptime: number;
    lastActive: string;
    efficiency: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Relationship {
  source: string;
  target: string;
}

// 任务状态
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// 任务历史记录
interface TaskHistory {
  id: string;
  task: string;  // 任务内容
  status: TaskStatus;  // 任务状态
  teamId?: string;  // 团队ID
  teamName?: string;  // 团队名称
  result?: string;  // 任务结果
  startTime: string;  // 开始时间
  endTime?: string;  // 结束时间
  duration?: number;  // 耗时（毫秒）
}

// 团队接口
interface Team {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  memberIds: string[];  // 团队成员ID列表（必须包含 emp-0 和 emp-exec）
  relationships: Relationship[];  // 该团队的拓扑关系
  createdAt: string;
  updatedAt: string;
}

// 预设员工列表（完整版）
const PRESET_EMPLOYEES: Employee[] = [
  { id: 'emp-0', name: '董事长', type: 'superadmin', avatar: EMPLOYEE_AVATARS.superadmin, description: '终极管理员，权限最高，不存在上级', status: 'idle', roleName: '董事长', department: '管理层', expertise: ['战略规划', '决策管理', '资源调配'], responsibilities: ['制定公司战略', '任命高管', '审批重大决策'] },
  { id: 'emp-exec', name: 'OpenClaw执行官', type: 'executor', avatar: EMPLOYEE_AVATARS.executor, description: '汇总执行层输出，优化任务，形成可执行命令', status: 'idle', roleName: 'OpenClaw执行官', department: '技术部', expertise: ['任务分析', '代码生成', '系统优化'], responsibilities: ['汇总执行结果', '优化任务方案', '生成可执行命令'] },
  { id: 'emp-1', name: '张经理', type: 'manager', avatar: EMPLOYEE_AVATARS.manager, description: '团队负责人，负责整体协调和决策', status: 'idle', roleName: '团队经理', department: '产品研发部', expertise: ['项目管理', '团队协调', '需求分析'], responsibilities: ['团队管理', '需求评审', '进度把控'] },
  { id: 'emp-2', name: '陈开发', type: 'developer', avatar: EMPLOYEE_AVATARS.developer, description: '后端开发，擅长 Java/Go', status: 'idle', roleName: '后端开发工程师', department: '技术部', expertise: ['Java', 'Go', '数据库设计', 'API开发'], responsibilities: ['后端开发', '接口实现', '性能优化'] },
  { id: 'emp-3', name: '刘前端', type: 'developer', avatar: EMPLOYEE_AVATARS.developer, description: '前端开发，擅长 React/Vue', status: 'idle', roleName: '前端开发工程师', department: '技术部', expertise: ['React', 'Vue', 'TypeScript', 'UI实现'], responsibilities: ['前端开发', '组件封装', '用户体验优化'] },
  { id: 'emp-4', name: '林设计', type: 'designer', avatar: EMPLOYEE_AVATARS.designer, description: 'UI/UX 设计师', status: 'idle', roleName: 'UI/UX设计师', department: '设计部', expertise: ['UI设计', 'UX优化', 'Figma', '原型制作'], responsibilities: ['界面设计', '交互优化', '设计规范制定'] },
  { id: 'emp-5', name: '徐分析', type: 'analyst', avatar: EMPLOYEE_AVATARS.analyst, description: '数据分析师', status: 'idle', roleName: '数据分析师', department: '数据部', expertise: ['数据分析', 'SQL', 'Python', '可视化'], responsibilities: ['数据分析', '报告产出', '数据监控'] },
  { id: 'emp-6', name: '王文案', type: 'writer', avatar: EMPLOYEE_AVATARS.writer, description: '内容创作者', status: 'idle', roleName: '内容运营', department: '运营部', expertise: ['文案撰写', '内容策划', 'SEO优化'], responsibilities: ['内容创作', '文案撰写', '品牌宣传'] },
  { id: 'emp-7', name: '赵客服', type: 'support', avatar: EMPLOYEE_AVATARS.support, description: '客户支持', status: 'idle', roleName: '客户支持', department: '客服部', expertise: ['客户服务', '问题解决', '沟通协调'], responsibilities: ['客户咨询', '问题处理', '满意度回访'] },
  { id: 'emp-8', name: '孙研究', type: 'researcher', avatar: EMPLOYEE_AVATARS.researcher, description: '技术研究员', status: 'idle', roleName: '技术研究员', department: '研发部', expertise: ['算法研究', '论文阅读', '技术调研'], responsibilities: ['技术研究', '可行性分析', '技术选型'] },
  { id: 'emp-9', name: '周测试', type: 'qa', avatar: EMPLOYEE_AVATARS.qa, description: '测试工程师', status: 'idle', roleName: '测试工程师', department: '质量部', expertise: ['测试用例', '自动化测试', 'Bug分析'], responsibilities: ['功能测试', '测试报告', '质量把控'] },
  { id: 'emp-10', name: '吴销售', type: 'sales', avatar: EMPLOYEE_AVATARS.sales, description: '销售代表', status: 'idle', roleName: '销售代表', department: '销售部', expertise: ['客户开发', '商务谈判', '产品销售'], responsibilities: ['客户开发', '合同签订', '业绩目标'] },
];

// 确保 data 目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 员工数据文件路径
const EMPLOYEES_FILE = path.join(dataDir, 'employees.json');
const MODELS_FILE = path.join(dataDir, 'models.json');

// 模型配置接口
interface ModelConfig {
  id: string;
  name: string;
  type: 'llm' | 'image';  // llm = 语言模型, image = 文生图模型
  provider: string;       // 提供商
  model: string;          // 模型名称
  apiKey?: string;       // API Key（可选）
  baseUrl?: string;      // 基础 URL（可选）
  enabled: boolean;       // 是否启用
  isDefault: boolean;    // 是否为默认模型
  createdAt: string;
  updatedAt: string;
}

// 加载模型配置
function loadModels(): ModelConfig[] {
  if (fs.existsSync(MODELS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(MODELS_FILE, 'utf-8'));
      console.log('✅ 已从文件加载模型配置');
      return data;
    } catch (error) {
      console.error('❌ 加载模型配置失败:', error);
    }
  }
  // 默认配置
  return [
    {
      id: 'llm-default',
      name: 'Qwen2.5-7B',
      type: 'llm',
      provider: '硅基流动',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      enabled: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'image-default',
      name: 'FLUX.1-schnell',
      type: 'image',
      provider: '硅基流动',
      model: 'black-forest-labs/FLUX.1-schnell',
      enabled: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// 保存模型配置
function saveModels(data: ModelConfig[]): void {
  fs.writeFileSync(MODELS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化模型配置
let models: ModelConfig[] = loadModels();

// 加载员工数据（优先从文件加载，否则使用预设）
function loadEmployees(): Employee[] {
  if (fs.existsSync(EMPLOYEES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8'));
      console.log('✅ 已从文件加载员工数据');
      return data;
    } catch (error) {
      console.error('❌ 加载员工数据失败:', error);
    }
  }
  return PRESET_EMPLOYEES;
}

// 保存员工数据到文件
function saveEmployees(data: Employee[]): void {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化员工数据
let employees: Employee[] = loadEmployees();
let relationships: Relationship[] = [];

// 员工计数器（用于生成ID）
let employeeCounter = employees.length;

// 团队数据文件路径
const TEAMS_FILE = path.join(dataDir, 'teams.json');

// 加载团队数据
function loadTeams(): Team[] {
  if (fs.existsSync(TEAMS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));
      console.log('✅ 已从文件加载团队数据');
      return data;
    } catch (error) {
      console.error('❌ 加载团队数据失败:', error);
    }
  }
  return [];
}

// 保存团队数据
function saveTeams(data: Team[]): void {
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化团队数据
let teams: Team[] = loadTeams();

// 任务历史数据文件路径
const TASK_HISTORY_FILE = path.join(dataDir, 'task-history.json');
const COMMAND_HISTORY_FILE = path.join(dataDir, 'command-history.json');

// 命令历史接口
interface CommandHistory {
  id: string;
  task: string;           // 核心任务
  command: string;         // 发送给OpenClaw的命令
  result?: string;         // 执行结果
  status: 'pending' | 'success' | 'failed';
  teamId: string;
  teamName: string;
  createdAt: string;
  updatedAt: string;
}

// 加载命令历史
function loadCommandHistory(): CommandHistory[] {
  if (fs.existsSync(COMMAND_HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(COMMAND_HISTORY_FILE, 'utf-8'));
      return data;
    } catch (error) {
      console.error('❌ 加载命令历史失败:', error);
    }
  }
  return [];
}

// 保存命令历史
function saveCommandHistory(data: CommandHistory[]): void {
  fs.writeFileSync(COMMAND_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化命令历史
let commandHistory: CommandHistory[] = loadCommandHistory();

// 加载任务历史
function loadTaskHistory(): TaskHistory[] {
  if (fs.existsSync(TASK_HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TASK_HISTORY_FILE, 'utf-8'));
      return data;
    } catch (error) {
      console.error('❌ 加载任务历史失败:', error);
    }
  }
  return [];
}

// 保存任务历史
function saveTaskHistory(data: TaskHistory[]): void {
  fs.writeFileSync(TASK_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化任务历史
let taskHistory: TaskHistory[] = loadTaskHistory();

// 自动加载保存的关系
function loadSavedRelationships() {
  const filePath = path.join(dataDir, 'relationships.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      // 只加载关系，不加载员工（始终使用预设列表）
      relationships = data.relationships || [];
      console.log('✅ 已自动加载保存的拓扑关系');
      console.log(`   员工数: ${employees.length}, 关系数: ${relationships.length}`);
    } catch (error) {
      console.error('❌ 自动加载失败:', error);
    }
  }
}

// 启动时加载
loadSavedRelationships();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== 员工管理 API ==========

// 获取所有员工
app.get('/api/employees', (req, res) => {
  const { search, type, status, page = '1', pageSize = '20' } = req.query;
  
  let result = [...employees];
  
  // 搜索过滤
  if (search) {
    const query = (search as string).toLowerCase();
    result = result.filter(e => 
      e.name.toLowerCase().includes(query) ||
      e.roleName?.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query)
    );
  }
  
  // 类型过滤
  if (type) {
    result = result.filter(e => e.type === type);
  }
  
  // 状态过滤
  if (status) {
    result = result.filter(e => e.status === status);
  }
  
  // 分页
  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(pageSize as string);
  const total = result.length;
  const paginatedResult = result.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum);
  
  res.json({
    success: true,
    data: {
      items: paginatedResult,
      total,
      page: pageNum,
      pageSize: pageSizeNum
    }
  });
});

// 获取单个员工
app.get('/api/employees/:id', (req, res) => {
  const employee = employees.find(e => e.id === req.params.id);
  
  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '员工不存在' } });
  }
  
  res.json({ success: true, data: employee });
});

// 创建员工
app.post('/api/employees', (req, res) => {
  const { name, type, avatar, description, roleName, department, expertise, responsibilities } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '姓名和类型不能为空' } });
  }
  
  const newEmployee: Employee = {
    id: `emp-${Date.now()}`,
    name,
    type,
    avatar: avatar || '👤',
    description: description || '',
    status: 'idle',
    roleName: roleName || name,
    department: department || '未分配',
    expertise: expertise || [],
    responsibilities: responsibilities || [],
    stats: {
      tasksCompleted: 0,
      uptime: 0,
      lastActive: new Date().toISOString(),
      efficiency: 100
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  employees.push(newEmployee);
  saveEmployees(employees);
  
  res.status(201).json({ success: true, data: newEmployee });
});

// 更新员工
app.patch('/api/employees/:id', (req, res) => {
  const index = employees.findIndex(e => e.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '员工不存在' } });
  }
  
  employees[index] = {
    ...employees[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  saveEmployees(employees);
  res.json({ success: true, data: employees[index] });
});

// 更新员工状态
app.patch('/api/employees/:id/status', (req, res) => {
  const { status } = req.body;
  const employee = employees.find(e => e.id === req.params.id);
  
  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '员工不存在' } });
  }
  
  employee.status = status;
  if (employee.stats) {
    employee.stats.lastActive = new Date().toISOString();
  }
  employee.updatedAt = new Date().toISOString();
  
  saveEmployees(employees);
  res.json({ success: true, data: employee });
});

// 删除员工
app.delete('/api/employees/:id', (req, res) => {
  const index = employees.findIndex(e => e.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '员工不存在' } });
  }
  
  // 不能删除董事长和执行官
  if (employees[index].id === 'emp-0' || employees[index].id === 'emp-exec') {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: '预设员工不能删除' } });
  }
  
  employees.splice(index, 1);
  saveEmployees(employees);
  
  res.status(204).send();
});

// 获取员工类型选项
app.get('/api/employees/types/options', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'superadmin', label: '董事长', color: '#F59E0B' },
      { value: 'executor', label: 'OpenClaw执行官', color: '#DC2626' },
      { value: 'manager', label: '经理', color: '#7C3AED' },
      { value: 'developer', label: '开发工程师', color: '#2563EB' },
      { value: 'designer', label: '设计师', color: '#DB2777' },
      { value: 'analyst', label: '数据分析师', color: '#059669' },
      { value: 'writer', label: '内容创作者', color: '#D97706' },
      { value: 'support', label: '客户支持', color: '#0891B2' },
      { value: 'researcher', label: '技术研究员', color: '#7C3AED' },
      { value: 'qa', label: '测试工程师', color: '#DC2626' },
      { value: 'devops', label: '运维工程师', color: '#4B5563' },
      { value: 'sales', label: '销售', color: '#EA580C' },
    ]
  });
});

// 获取员工状态选项
app.get('/api/employees/status/options', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'idle', label: '空闲', color: '#10B981' },
      { value: 'busy', label: '工作中', color: '#F59E0B' },
      { value: 'offline', label: '离线', color: '#6B7280' },
    ]
  });
});

// 获取统计信息
app.get('/api/employees/statistics/overview', (req, res) => {
  const roleStats: Record<string, number> = {};
  const statusStats: Record<string, number> = {};
  
  employees.forEach(e => {
    roleStats[e.type] = (roleStats[e.type] || 0) + 1;
    statusStats[e.status] = (statusStats[e.status] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: {
      byRole: roleStats,
      byStatus: statusStats,
      total: employees.length
    }
  });
});

// ========== 团队管理 API ==========

// 获取所有团队
app.get('/api/teams', (req, res) => {
  res.json({
    success: true,
    data: teams
  });
});

// 获取单个团队
app.get('/api/teams/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  
  if (!team) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '团队不存在' } });
  }
  
  res.json({ success: true, data: team });
});

// 创建团队
app.post('/api/teams', (req, res) => {
  const { name, description, memberIds, relationships: teamRelationships } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '团队名称不能为空' } });
  }
  
  // 确保包含董事长和执行官
  const members = [...new Set(['emp-0', 'emp-exec', ...(memberIds || [])])];
  
  const newTeam: Team = {
    id: `team-${Date.now()}`,
    name,
    description: description || '',
    memberIds: members,
    relationships: teamRelationships || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  teams.push(newTeam);
  saveTeams(teams);
  
  res.status(201).json({ success: true, data: newTeam });
});

// 更新团队
app.patch('/api/teams/:id', (req, res) => {
  const index = teams.findIndex(t => t.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '团队不存在' } });
  }
  
  const { name, description, memberIds, relationships: teamRelationships } = req.body;
  
  // 确保包含董事长和执行官
  const members = memberIds 
    ? [...new Set(['emp-0', 'emp-exec', ...memberIds])]
    : teams[index].memberIds;
  
  teams[index] = {
    ...teams[index],
    name: name || teams[index].name,
    description: description !== undefined ? description : teams[index].description,
    memberIds: members,
    relationships: teamRelationships || teams[index].relationships,
    updatedAt: new Date().toISOString()
  };
  
  saveTeams(teams);
  res.json({ success: true, data: teams[index] });
});

// 删除团队
app.delete('/api/teams/:id', (req, res) => {
  const index = teams.findIndex(t => t.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '团队不存在' } });
  }
  
  // 不允许删除默认团队
  if (teams[index].name === '默认团队') {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: '默认团队不能删除' } });
  }
  
  teams.splice(index, 1);
  saveTeams(teams);
  
  res.status(204).send();
});

// ========== 任务历史 API ==========

// 获取任务历史
app.get('/api/task-history', (req, res) => {
  const { page = '1', pageSize = '20', status, teamId } = req.query;
  
  let result = [...taskHistory];
  
  // 状态筛选
  if (status) {
    result = result.filter(t => t.status === status);
  }
  
  // 团队筛选
  if (teamId) {
    result = result.filter(t => t.teamId === teamId);
  }
  
  // 按时间倒序
  result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  // 分页
  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(pageSize as string);
  const total = result.length;
  const paginatedResult = result.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum);
  
  res.json({
    success: true,
    data: {
      items: paginatedResult,
      total,
      page: pageNum,
      pageSize: pageSizeNum
    }
  });
});

// 获取统计数据
app.get('/api/task-history/statistics', (req, res) => {
  const total = taskHistory.length;
  const completed = taskHistory.filter(t => t.status === 'completed').length;
  const failed = taskHistory.filter(t => t.status === 'failed').length;
  const running = taskHistory.filter(t => t.status === 'running').length;
  const pending = taskHistory.filter(t => t.status === 'pending').length;
  
  // 按团队统计
  const teamStats: Record<string, { total: number; completed: number; failed: number }> = {};
  taskHistory.forEach(t => {
    const teamName = t.teamName || '未知团队';
    if (!teamStats[teamName]) {
      teamStats[teamName] = { total: 0, completed: 0, failed: 0 };
    }
    teamStats[teamName].total++;
    if (t.status === 'completed') teamStats[teamName].completed++;
    if (t.status === 'failed') teamStats[teamName].failed++;
  });
  
  // 按日期统计（最近7天）
  const dateStats: Record<string, { completed: number; failed: number }> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dateStats[dateStr] = { completed: 0, failed: 0 };
  }
  taskHistory.forEach(t => {
    const dateStr = t.startTime.split('T')[0];
    if (dateStats[dateStr]) {
      if (t.status === 'completed') dateStats[dateStr].completed++;
      if (t.status === 'failed') dateStats[dateStr].failed++;
    }
  });
  
  res.json({
    success: true,
    data: {
      total,
      completed,
      failed,
      running,
      pending,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      teamStats,
      dateStats,
      employeeCount: employees.length,
      teamCount: teams.length,
    }
  });
});

// 添加任务历史记录
app.post('/api/task-history', (req, res) => {
  const { task, teamId, teamName } = req.body;
  
  if (!task) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '任务内容不能为空' } });
  }
  
  const newTask: TaskHistory = {
    id: `task-${Date.now()}`,
    task,
    status: 'pending',
    teamId,
    teamName,
    startTime: new Date().toISOString(),
  };
  
  taskHistory.unshift(newTask);
  // 只保留最近1000条记录
  if (taskHistory.length > 1000) {
    taskHistory = taskHistory.slice(0, 1000);
  }
  saveTaskHistory(taskHistory);
  
  res.status(201).json({ success: true, data: newTask });
});

// 更新任务状态
app.patch('/api/task-history/:id', (req, res) => {
  const { status, result } = req.body;
  const task = taskHistory.find(t => t.id === req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
  }
  
  task.status = status;
  if (result) task.result = result;
  task.endTime = new Date().toISOString();
  task.duration = new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
  
  saveTaskHistory(taskHistory);
  res.json({ success: true, data: task });
});

// ========== 模型配置 API ==========

// 获取所有模型配置
app.get('/api/models', (req, res) => {
  res.json({ success: true, data: models });
});

// 添加模型配置
app.post('/api/models', (req, res) => {
  const { name, type, provider, model, apiKey, baseUrl, enabled, isDefault } = req.body;
  
  const newModel: ModelConfig = {
    id: `model-${Date.now()}`,
    name,
    type,
    provider,
    model,
    apiKey,
    baseUrl,
    enabled: enabled ?? true,
    isDefault: isDefault ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // 如果设为默认，取消其他同类型默认
  if (isDefault) {
    models = models.map(m => ({
      ...m,
      isDefault: m.type === type ? false : m.isDefault,
    }));
  }
  
  models.push(newModel);
  saveModels(models);
  
  res.json({ success: true, data: newModel });
});

// 更新模型配置
app.patch('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = models.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: '模型不存在' });
  }
  
  // 如果设为默认，取消其他同类型默认
  if (updates.isDefault) {
    const modelType = models[index].type;
    models = models.map(m => ({
      ...m,
      isDefault: m.type === modelType ? false : m.isDefault,
    }));
  }
  
  models[index] = {
    ...models[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveModels(models);
  res.json({ success: true, data: models[index] });
});

// 删除模型配置
app.delete('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const index = models.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: '模型不存在' });
  }
  
  models.splice(index, 1);
  saveModels(models);
  
  res.json({ success: true });
});

// ========== 关系管理 API ==========

// 获取当前关系状态（供前端加载）
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      employees,
      relationships,
      loaded: employees.length > 0 || relationships.length > 0
    }
  });
});

// 保存关系
app.post('/api/save', (req, res) => {
  const { filename, data } = req.body;
  
  if (!filename || !data) {
    return res.status(400).json({ error: '缺少文件名或数据' });
  }

  const filePath = path.join(dataDir, filename);
  
  try {
    // 更新内存中的数据
    employees = data.employees || [];
    relationships = data.relationships || [];
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

// 加载关系
app.post('/api/load', (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const filePath = path.join(dataDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    employees = data.employees || [];
    relationships = data.relationships || [];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: '读取失败' });
  }
});

// 列出文件
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ error: '读取失败' });
  }
});

// 调用大模型
async function callLLM(messages: { role: string; content: string }[]): Promise<string> {
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    throw new Error('LLM响应格式错误');
  } catch (error) {
    console.error('LLM调用失败:', error);
    throw error;
  }
}

// 获取某员工的所有下属
function getSubordinates(employeeId: string): string[] {
  return relationships
    .filter(r => r.source === employeeId)
    .map(r => r.target);
}

// 获取某员工的上级
function getManager(employeeId: string): string | null {
  const rel = relationships.find(r => r.target === employeeId);
  return rel?.source || null;
}

// 获取员工信息
function getEmployee(id: string): Employee | undefined {
  return employees.find(e => e.id === id);
}

// 递归分发任务
async function distributeTask(
  currentEmployeeId: string, 
  task: string,
  depth: number = 0
): Promise<{ employee: Employee; result: string; subResults?: any[] }> {
  
  const employee = getEmployee(currentEmployeeId);
  if (!employee) {
    throw new Error(`员工不存在: ${currentEmployeeId}`);
  }

  const subordinates = getSubordinates(currentEmployeeId);
  const indent = '  '.repeat(depth);

  // 过滤掉 executor（执行官单独处理，不参与正常的任务分发）
  const nonExecutorSubordinates = subordinates.filter((id: string) => {
    const sub = getEmployee(id);
    return sub?.type !== 'executor';
  });

  console.log(`${indent}👤 处理任务: ${employee.name} (${employee.type})`);
  console.log(`${indent}📋 任务: ${task.substring(0, 50)}...`);
  console.log(`${indent}⬇️ 下属数量: ${subordinates.length}（非执行官: ${nonExecutorSubordinates.length})`);

  // 如果有下属（排除executor后），是管理者角色，需要分解任务并分发给下属
  if (nonExecutorSubordinates.length > 0) {
    // 调用LLM分析任务并分解
    const subordinatesInfo = nonExecutorSubordinates.map(id => {
      const sub = getEmployee(id);
      return `- ${sub?.name} (${sub?.type}): ${sub?.description || ''}`;
    }).join('\n');

    const prompt = `你是 "${employee.name}"，你是 "${employee.type}" 类型。

${employee.description ? `你的描述：${employee.description}\n` : ''} ${employee.expertise?.length ? `你的专长：${employee.expertise.join('、')}\n` : ''} ${employee.responsibilities?.length ? `你的职责：${employee.responsibilities.join('、')}\n` : ''}
你的下属信息（注意：必须使用下属的员工ID，不要使用角色名！）：
${subordinatesInfo}

下属员工ID对应关系：
${nonExecutorSubordinates.map(id => {
  const sub = getEmployee(id);
  return `- ID: ${id} = ${sub?.name} (${sub?.type})`;
}).join('\n')}

你需要完成的任务：
"${task}"

请分析这个任务，将其分解为适合分配给下属的子任务。
每个子任务必须分配下属的员工ID（如 emp-1, emp-2 等）。

请以JSON格式返回，格式如下：
{
  "analysis": "任务分析（50字以内）",
  "taskBreakdown": [
    {"assignedTo": "下属的员工ID（如emp-1）", "subTask": "子任务描述", "priority": 1}
  ]
}`;

    try {
      console.log(`${indent}🤖 正在调用LLM...`);
      const llmResponse = await callLLM([
        { role: 'system', content: '你是一个任务分解专家。请分析任务并合理分配给下属。' },
        { role: 'user', content: prompt }
      ]);
      console.log(`${indent}📨 LLM响应: ${llmResponse.substring(0, 200)}...`);

      // 解析LLM响应
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`${indent}🤖 AI分解: ${parsed.analysis}`);
        console.log(`${indent}📦 任务分解: ${JSON.stringify(parsed.taskBreakdown)}`);

        // 执行子任务 - 添加角色到ID的映射
        const subResults = [];
        for (const breakdown of parsed.taskBreakdown || []) {
          let subEmployeeId = breakdown.assignedTo;
          
          // 如果返回的是角色名，尝试映射到实际ID
          if (subEmployeeId && !subordinates.includes(subEmployeeId)) {
            const roleMap: Record<string, string> = {};
            subordinates.forEach(id => {
              const sub = getEmployee(id);
              if (sub) {
                roleMap[sub.type] = id;
                roleMap[sub.type.toLowerCase()] = id;
                roleMap[sub.name] = id;
              }
            });
            const mappedId = roleMap[subEmployeeId.toLowerCase()] || roleMap[subEmployeeId];
            if (mappedId) {
              console.log(`${indent}  🔄 角色映射: ${subEmployeeId} -> ${mappedId}`);
              subEmployeeId = mappedId;
            }
          }
          
          console.log(`${indent}  → 分发给: ${subEmployeeId}, 任务: ${breakdown.subTask.substring(0, 30)}...`);
          if (subEmployeeId && subordinates.includes(subEmployeeId)) {
            const subResult = await distributeTask(subEmployeeId, breakdown.subTask, depth + 1);
            subResults.push(subResult);
          } else {
            console.log(`${indent}  ⚠️ 下属ID不匹配或不存在: ${subEmployeeId}`);
          }
        }

        return {
          employee: { ...employee, id: employee.id },
          result: parsed.analysis,
          subResults
        };
      }
    } catch (error) {
      console.error(`${indent}❌ LLM调用失败，使用备用方案`);
    }

    // 备用方案：简单平均分配
    const taskParts = task.split('。').filter(t => t.trim());
    const subResults = [];
    for (let i = 0; i < nonExecutorSubordinates.length; i++) {
      const subTask = taskParts[i] || `协助完成：${task}`;
      const subResult = await distributeTask(nonExecutorSubordinates[i], subTask, depth + 1);
      subResults.push(subResult);
    }

    return {
      employee: { ...employee, id: employee.id },
      result: '任务已分配给下属执行',
      subResults
    };
  } else {
    // 没有下属，是执行者，需要完成任务
    const prompt = `你是 "${employee.name}"，你是 "${employee.type}" 类型。
你的职责是：${employee.description}\n专长：${employee.expertise?.join('、') || '无'}\n职责：${employee.responsibilities?.join('、') || '无'}

你需要完成的任务：
"${task}"

请直接输出你的工作计划和执行结果。保持简洁专业。`;

    try {
      const result = await callLLM([
        { role: 'system', content: '你是一个专业的员工，负责完成分配的任务。' },
        { role: 'user', content: prompt }
      ]);

      return {
        employee: { ...employee, id: employee.id },
        result
      };
    } catch (error) {
      return {
        employee: { ...employee, id: employee.id },
        result: `（模拟）已收到任务：${task}，将按计划执行。`
      };
    }
  }
}

// 任务分发API
app.post('/api/distribute-task', async (req, res) => {
  const { task, startEmployeeId } = req.body;

  if (!task) {
    return res.status(400).json({ error: '任务不能为空' });
  }

  // 如果没有指定起始员工，查找董事长
  let startId = startEmployeeId;
  if (!startId) {
    const superadmin = employees.find(e => e.type === 'superadmin');
    startId = superadmin?.id;
  }

  if (!startId) {
    return res.status(400).json({ error: '未找到董事长，请先保存员工关系' });
  }

  // 收集所有叶子节点（没有下属的员工）的结果
function collectLeafResults(result: any): any[] {
  const leafResults: any[] = [];
  
  // 如果没有子节点，自己就是叶子
  if (!result.subResults || result.subResults.length === 0) {
    // 排除 executor 本身
    if (result.employee.type !== 'executor') {
      leafResults.push(result);
    }
  } else {
    // 递归收集子节点
    result.subResults.forEach((sub: any) => {
      leafResults.push(...collectLeafResults(sub));
    });
  }
  
  return leafResults;
}

try {
    console.log('\n🚀 开始任务分发...');
    console.log(`📌 起始员工: ${getEmployee(startId)?.name}`);
    console.log(`📋 任务: ${task}\n`);

    let result = await distributeTask(startId, task, 0);

    // 检查是否有 executor 类型的员工
    const executor = employees.find(e => e.type === 'executor');
    console.log(`🔍 执行官信息: ${JSON.stringify(executor)}`);
    console.log(`🔍 关系列表: ${JSON.stringify(relationships)}`);
    
    const executorInRelationship = relationships.some(r => r.target === executor?.id);
    console.log(`🔍 执行官是否在关系中: ${executorInRelationship}`);
    
    // 如果 executor 在关系中，且有执行层结果，则汇总
    if (executor && executorInRelationship) {
      console.log(`\n🤖 检测到 OpenClaw执行官，准备汇总执行层结果...`);
      
      // 收集所有叶子节点的结果
      const leafResults = collectLeafResults(result);
      console.log(`📊 收集到 ${leafResults.length} 个执行层结果`);
      
      // 让 executor 汇总并优化
      const executionOutputs = leafResults.map(r => 
        `- ${r.employee.name} (${r.employee.type}): ${r.result}`
      ).join('\n');

      const executorPrompt = `你是 "OpenClaw执行官"，你的任务是从各执行者的输出中，提取出可以直接执行的、技术层面的具体命令。

原始任务：${task}

各执行者输出：
${executionOutputs}

请严格按照以下规则提取命令：
1. 只提取需要"动手做"的技术操作，如：写代码、创建文件、运行命令、调用API、发送请求、安装包等
2. 禁止提取以下类型的输出：
   - 会议、沟通、讨论、协商等人与人交互的活动
   - 检查、核对、确认、审核等监督类活动
   - 计划、建议、分析、研究等思考类活动
3. 每条命令必须是具体的、可直接执行的技术动作
4. 命令格式：动词+具体操作对象，如"用Python写一个排序算法"、"调用硅基流动API生成图片"、"创建一个Hello World网页"等

只输出命令，每行一条，不要有任何解释和文字说明：
`;

      try {
        const summaryResult = await callLLM([
          { role: 'system', content: '你是命令过滤专家。你的任务是从文本中只提取技术层面的可执行命令，过滤掉所有非技术操作。只输出命令，每行一条。' },
          { role: 'user', content: executorPrompt }
        ]);
        
        console.log(`✅ 执行官汇总完成`);
        
        // 将汇总结果添加到 executor 节点
        result = {
          ...result,
          subResults: [
            ...(result.subResults || []),
            {
              employee: { ...executor, id: executor.id },
              result: summaryResult,
              subResults: []
            }
          ]
        };
      } catch (error) {
        console.error('❌ 执行官汇总失败:', error);
      }
    }

    res.json({ 
      success: true, 
      data: {
        task,
        startEmployee: getEmployee(startId),
        result
      }
    });
  } catch (error) {
    console.error('任务执行失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: '任务执行失败', details: errorMessage });
  }
});

// OpenClaw 代理接口
app.post('/api/openclaw/execute', async (req, res) => {
  const { input, model = 'openclaw' } = req.body;
  
  const openclawUrl = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
  const openclawToken = process.env.OPENCLAW_TOKEN || '';
  const agentId = process.env.OPENCLAW_AGENT_ID || 'main';

  try {
    const response = await fetch(`${openclawUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openclawToken}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      },
      body: JSON.stringify({
        model,
        input,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('OpenClaw API 调用失败:', error);
    res.status(500).json({ error: 'OpenClaw API 调用失败' });
  }
});

// ========== 命令历史 API ==========

// 获取命令历史
app.get('/api/command-history', (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const start = (Number(page) - 1) * Number(pageSize);
  const items = commandHistory.slice(start, start + Number(pageSize));
  
  res.json({
    success: true,
    data: {
      items,
      total: commandHistory.length,
      page: Number(page),
      pageSize: Number(pageSize),
    }
  });
});

// 添加命令历史
app.post('/api/command-history', (req, res) => {
  const { task, command, result, status = 'pending', teamId, teamName } = req.body;
  
  const newCommand: CommandHistory = {
    id: `cmd-${Date.now()}`,
    task,
    command,
    result,
    status,
    teamId: teamId || 'default',
    teamName: teamName || '默认团队',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  commandHistory.unshift(newCommand);
  saveCommandHistory(commandHistory);
  
  res.json({ success: true, data: newCommand });
});

// 更新命令历史（添加结果）
app.patch('/api/command-history/:id', (req, res) => {
  const { id } = req.params;
  const { result, status } = req.body;
  
  const index = commandHistory.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: '命令记录不存在' });
  }
  
  commandHistory[index] = {
    ...commandHistory[index],
    result,
    status,
    updatedAt: new Date().toISOString(),
  };
  
  saveCommandHistory(commandHistory);
  res.json({ success: true, data: commandHistory[index] });
});

// 删除命令历史
app.delete('/api/command-history/:id', (req, res) => {
  const { id } = req.params;
  const index = commandHistory.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: '命令记录不存在' });
  }
  
  commandHistory.splice(index, 1);
  saveCommandHistory(commandHistory);
  
  res.json({ success: true });
});

// ========== 数据导出/导入 API ==========

// 导出所有数据
app.get('/api/export', (req, res) => {
  const exportData = {
    employees: employees,
    teams: teams,
    relationships: relationships,
    taskHistory: taskHistory,
    commandHistory: commandHistory,
    models: models,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=tw-project-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.json(exportData);
});

// 导入数据
app.post('/api/import', (req, res) => {
  const { employees: importedEmployees, teams: importedTeams, relationships: importedRelationships } = req.body;
  
  try {
    if (importedEmployees) {
      employees = importedEmployees;
      saveEmployees(employees);
    }
    
    if (importedTeams) {
      teams = importedTeams;
      saveTeams(teams);
    }
    
    if (importedRelationships) {
      relationships = importedRelationships;
      saveRelationships(relationships);
    }
    
    res.json({ success: true, message: '数据导入成功，请重启服务' });
  } catch (error) {
    res.status(500).json({ success: false, error: '数据导入失败' });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   💾 文件服务    http://localhost:${PORT}   ║
║   🤖 任务分发服务已启用              ║
╚═══════════════════════════════════════╝
  `);
});
