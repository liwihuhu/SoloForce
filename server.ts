import express from 'express';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync, spawn } from 'child_process';
import { Router } from 'express';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5301;

// OpenClaw API 配置（统一 AI 调用）
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN || 'a9b2a391cf24f37e397718bfdae0ff2302a1133f0fe2b3f2';

// SiliconFlow LLM 配置
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || '';
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

console.log('[配置] OpenClaw URL:', OPENCLAW_URL);
console.log('[配置] OpenClaw Token:', OPENCLAW_API_TOKEN ? `${OPENCLAW_API_TOKEN.slice(0, 10)}...` : '未配置');
console.log('[配置] SiliconFlow API Key:', SILICONFLOW_API_KEY ? `${SILICONFLOW_API_KEY.slice(0, 10)}...` : '未配置');

// 修复格式错误的 JSON 字符串
function fixMalformedJSON(jsonStr: string): string {
  // 1. 修复属性名没有引号的情况
  let fixed = jsonStr.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // 2. 修复属性值没有引号的情况（如果是字符串）
  // 只修复跟在 ": " 后面的未加引号的字符串值
  fixed = fixed.replace(/"\s*:\s*([a-zA-Z_{}[\]][^",\n}]*?)(\s*[,}])/g, (match, value, ending) => {
    // 如果值包含特殊字符或看起来像对象/数组，就不加了
    if (value.startsWith('{') || value.startsWith('[') || value === 'null' || value === 'true' || value === 'false') {
      return match;
    }
    return `"${value}"${ending}`;
  });
  
  // 3. 移除尾部逗号
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  
  return fixed;
}

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

// ========== 协商会议路由 ==========
// 动态导入协商服务（需要 Node.js 原生模块支持）
async function loadNegotiationRouter() {
  try {
    // 协商引擎和服务
    const { createNegotiationEngine } = await import('./backend/src/services/negotiation/index.js');
    
    // 存储活跃的协商引擎实例
    const activeEngines = new Map<string, any>();
    
    // 创建协商会话
    app.post('/api/negotiation/create', async (req, res) => {
      try {
        const { meetingId, topic, participants, maxRounds = 99, aiMode = 'openclaw' } = req.body;
        const finalMeetingId = meetingId || `meeting-${Date.now()}`;

        if (!topic || !participants || participants.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_REQUEST', message: '缺少必要参数' }
          });
        }

        // 根据 aiMode 选择适配器配置
        const llmConfig = aiMode === 'llm' 
          ? {
              // 优先使用前端传递的配置，否则使用默认/环境变量
              baseUrl: req.body.llmConfig?.baseUrl || SILICONFLOW_BASE_URL,
              apiKey: req.body.llmConfig?.apiKey || SILICONFLOW_API_KEY,
              model: req.body.llmConfig?.model || SILICONFLOW_MODEL,
            }
          : undefined;

        const openClawConfig = aiMode === 'openclaw'
          ? {
              baseUrl: OPENCLAW_URL,
              apiToken: OPENCLAW_API_TOKEN,
              defaultAgentId: 'main',
            }
          : undefined;

        const engine = createNegotiationEngine({
          meetingId: finalMeetingId,
          topic,
          participants,
          maxRounds,
          userAsArbitrator: true,
          llm: llmConfig,
          openClaw: openClawConfig,
          callbacks: {
            onMessage: (message) => {
              console.log(`[协商-${aiMode}] ${message.senderName}: ${message.content?.slice(0, 50) || ''}...`);
            },
          },
        });

        activeEngines.set(finalMeetingId, engine);

        res.json({
          success: true,
          data: { meetingId: finalMeetingId, status: 'created', participants: participants.length }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'CREATE_FAILED', message: error instanceof Error ? error.message : '创建失败' }
        });
      }
    });

    // 开始协商
    app.post('/api/negotiation/:meetingId/start', async (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '协商会话不存在' }
          });
        }

        engine.start().catch(console.error);

        res.json({ success: true, data: { meetingId, status: 'started' } });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'START_FAILED', message: error instanceof Error ? error.message : '启动失败' }
        });
      }
    });

    // 用户发言
    app.post('/api/negotiation/:meetingId/speak', (req, res) => {
      try {
        const { meetingId } = req.params;
        const { content, mentionedIds } = req.body;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '协商会话不存在' }
          });
        }

        if (!content) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_REQUEST', message: '内容不能为空' }
          });
        }

        engine.userSpeak(content, mentionedIds);

        res.json({ success: true, data: { meetingId, message: '已添加到黑板' } });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'SPEAK_FAILED', message: error instanceof Error ? error.message : '发言失败' }
        });
      }
    });

    // 获取协商状态
    app.get('/api/negotiation/:meetingId/status', (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '协商会话不存在' }
          });
        }

        const state = engine.getState();

        res.json({ success: true, data: state });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'GET_STATUS_FAILED', message: error instanceof Error ? error.message : '获取状态失败' }
        });
      }
    });

    // 暂停协商
    app.post('/api/negotiation/:meetingId/pause', (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '协商会话不存在' } });
        }

        engine.pause();
        res.json({ success: true, data: { meetingId, status: 'paused' } });
      } catch (error) {
        res.status(500).json({ success: false, error: { code: 'PAUSE_FAILED', message: error instanceof Error ? error.message : '暂停失败' } });
      }
    });

    // 继续协商
    app.post('/api/negotiation/:meetingId/resume', (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '协商会话不存在' } });
        }

        engine.resume();
        res.json({ success: true, data: { meetingId, status: 'resumed' } });
      } catch (error) {
        res.status(500).json({ success: false, error: { code: 'RESUME_FAILED', message: error instanceof Error ? error.message : '继续失败' } });
      }
    });

    // 推进下一轮
    app.post('/api/negotiation/:meetingId/next-round', (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '协商会话不存在' } });
        }

        engine.advanceToNextRound();
        res.json({ success: true, data: { meetingId, status: 'next_round_started' } });
      } catch (error) {
        res.status(500).json({ success: false, error: { code: 'NEXT_ROUND_FAILED', message: error instanceof Error ? error.message : '推进失败' } });
      }
    });

    // 结束协商（自动生成会议总结）
    app.post('/api/negotiation/:meetingId/stop', async (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '协商会话不存在' } });
        }

        // 获取最终状态（在删除引擎之前）
        const finalState = engine.getState();

        // 异步停止（会触发自动总结）
        await engine.stop();
        
        // 不立即删除引擎，保持状态以便后续查询
        // 延迟删除，确保前端能获取到最终状态
        setTimeout(() => {
          activeEngines.delete(meetingId);
        }, 30000); // 30秒后删除

        res.json({
          success: true,
          data: { 
            meetingId, 
            status: finalState.status, 
            state: finalState 
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: { code: 'STOP_FAILED', message: error instanceof Error ? error.message : '停止失败' } });
      }
    });

    // 手动触发会议总结
    app.post('/api/negotiation/:meetingId/summarize', async (req, res) => {
      try {
        const { meetingId } = req.params;
        const engine = activeEngines.get(meetingId);

        if (!engine) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '协商会话不存在' } });
        }

        const summary = await engine.summarize();

        res.json({
          success: true,
          data: { meetingId, summary }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: { code: 'SUMMARIZE_FAILED', message: error instanceof Error ? error.message : '总结生成失败' } });
      }
    });

    console.log('✅ 协商会议路由已加载');
  } catch (error) {
    console.error('❌ 协商路由加载失败:', error);
  }
}

// 延迟加载协商路由（等待模块解析）
setTimeout(loadNegotiationRouter, 1000);

// ========== OpenClaw 系统状态 API (带缓存) ==========
let ocStatusCache: { data: any; ts: number } = { data: null, ts: 0 };
const OC_CACHE_TTL = 10000; // 10秒缓存

function getSkillsAndMcpCount() {
  try {
    const skillsDir = os.homedir() + '/.openclaw/skills';
    const extensionsDir = os.homedir() + '/.openclaw/extensions';
    const skills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter(f => !f.endsWith('.skill') && !f.startsWith('.')).length : 0;
    const mcp = fs.existsSync(extensionsDir) ? fs.readdirSync(extensionsDir).filter(f => !f.startsWith('.')).length : 0;
    return { skills, mcp };
  } catch { return { skills: 0, mcp: 0 }; }
}

function parseOpenClawStatus(output: string) {
  // 处理 UTF-8 box-drawing 和 middle-dot 字符
  const clean = output
    .replace(/[│┌┐└┘├┤┬┴┼─━]/g, ' ')
    .replace(/·/g, ' ')
    .replace(/[^\x20-\x7E\t\n\r]/g, '')
    .replace(/\s+/g, ' ').trim();

  const data = {
    gateway: { reachable: false, latency: null },
    agents: { count: 0, sessions: 0 },
    memory: { files: 0, chunks: 0, cache: null as string | null },
    tasks: { active: 0, queued: 0, running: 0, tracked: 0, issues: 0 },
    sessions: { active: 0, model: '' },
    security: { critical: 0, warn: 0, info: 0 },
    heartbeat: { interval: '', target: '' },
    tailscale: 'off',
    channel: '',
    version: '',
    os: '',
    uptime: 0,
    skills: 0,
    mcp: 0,
  };

  const gm = clean.match(/reachable\s+(\d+)ms/);
  if (gm) { data.gateway.reachable = true; data.gateway.latency = parseInt(gm[1]); }

  const am = clean.match(/Agents\s+(\d+).*?sessions\s+(\d+)/);
  if (am) { data.agents.count = parseInt(am[1]); data.agents.sessions = parseInt(am[2]); }

  const fm = clean.match(/(\d+)\s+files/);
  const cm = clean.match(/(\d+)\s+chunks/);
  if (fm) data.memory.files = parseInt(fm[1]);
  if (cm) data.memory.chunks = parseInt(cm[1]);
  const cacheM = clean.match(/cache\s+(on|off)\s*\((\d+)\)/);
  if (cacheM) data.memory.cache = `on(${cacheM[2]})`;

  const tm = clean.match(/(\d+)\s+active.*?(\d+)\s+queued.*?(\d+)\s+running/);
  if (tm) { data.tasks.active = parseInt(tm[1]); data.tasks.queued = parseInt(tm[2]); data.tasks.running = parseInt(tm[3]); }
  const trm = clean.match(/(\d+)\s+tracked/);
  if (trm) data.tasks.tracked = parseInt(trm[1]);
  const issuesM = clean.match(/(\d+)\s+issues/);
  if (issuesM) data.tasks.issues = parseInt(issuesM[1]);

  const sm = clean.match(/Sessions\s+(\d+)\s+active/);
  if (sm) data.sessions.active = parseInt(sm[1]);
  const modelM = clean.match(/default\s+([\w.-]+)\s+\(/);
  if (modelM) data.sessions.model = modelM[1];

  const secM = clean.match(/(\d+)\s+critical.*?(\d+)\s+warn.*?(\d+)\s+info/);
  if (secM) { data.security.critical = parseInt(secM[1]); data.security.warn = parseInt(secM[2]); data.security.info = parseInt(secM[3]); }

  const hbM = clean.match(/Heartbeat\s+(\S+)\s+\((\w+)\)/);
  if (hbM) { data.heartbeat.interval = hbM[1]; data.heartbeat.target = hbM[2]; }

  const tsM = clean.match(/Tailscale\s+(on|off)/);
  if (tsM) data.tailscale = tsM[1];

  const chM = clean.match(/Channel\s+(stable|beta|\S+)/);
  if (chM) data.channel = chM[1];

  const verM = clean.match(/latest\s+(\d+\.\d+\.\d+)/);
  if (verM) data.version = verM[1];

  const osM = clean.match(/OS\s+(macos[\s\d.+]+?)\s+/);
  if (osM) data.os = osM[1].trim();

  return data;
}

app.get('/api/openclaw-status', (req, res) => {
  const now = Date.now();
  if (ocStatusCache.data && (now - ocStatusCache.ts) < OC_CACHE_TTL) {
    res.json({ success: true, data: ocStatusCache.data, cached: true });
    return;
  }
  // 使用 spawn 异步执行避免阻塞
  const p = spawn('/opt/homebrew/bin/openclaw', ['status'], { timeout: 20000 });
  let out = '';
  let done = false; // 防止重复响应
  p.stdout.on('data', d => out += d.toString());
  p.on('close', (code) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (code === 0 && out.length > 0) {
      const data = parseOpenClawStatus(out);
      const { skills, mcp } = getSkillsAndMcpCount();
      data.skills = skills;
      data.mcp = mcp;
      ocStatusCache = { data, ts: now };
      res.json({ success: true, data });
    } else if (ocStatusCache.data) {
      res.json({ success: true, data: ocStatusCache.data, stale: true });
    } else {
      res.json({ success: false, error: 'command failed' });
    }
  });
  p.on('error', (e) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (ocStatusCache.data) {
      res.json({ success: true, data: ocStatusCache.data, stale: true });
    } else {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  // 20秒超时保底
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    p.kill();
    if (ocStatusCache.data) res.json({ success: true, data: ocStatusCache.data, stale: true });
    else res.status(504).json({ success: false, error: 'timeout' });
  }, 20000);
});

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

// 调用大模型（支持 OpenClaw 和 LLM 双模式）
// 调用 OpenClaw API（用于团队拓扑任务分发）
async function callLLM(messages: { role: string; content: string }[], aiMode: 'openclaw' | 'llm' = 'openclaw'): Promise<string> {
  try {
    // 分离 system 和 user 消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    // 构建 input
    const input = userMessages.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n');
    
    // 构建 instructions
    const instructions = systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n')
      : '你是一个专业的 AI 助手，直接回答用户的问题。';

    if (aiMode === 'llm') {
      // LLM 模式 - 使用 SiliconFlow
      console.log('[callLLM] 使用 LLM 模式 (SiliconFlow)');
      const llmResponse = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            { role: 'system', content: instructions },
            { role: 'user', content: input }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        throw new Error(`LLM API error: ${llmResponse.status} - ${errorText}`);
      }

      const data = await llmResponse.json();
      const outputText = data.choices?.[0]?.message?.content || '';
      if (!outputText) {
        throw new Error('Empty response from LLM');
      }
      return outputText;
    } else {
      // OpenClaw 模式
      const response = await fetch(`${OPENCLAW_URL}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENCLAW_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openclaw',
          input,
          instructions,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 提取响应文本
      let outputText = '';
      if (data.output && Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.type === 'message' && item.content) {
            const content = item.content;
            if (Array.isArray(content)) {
              for (const c of content) {
                if (c.type === 'output_text' || c.type === 'text') {
                  outputText = c.text || c.content || '';
                  break;
                }
              }
            }
            if (!outputText && typeof content === 'string') {
              outputText = content;
            }
          }
          if (outputText) break;
        }
      }
      
      if (!outputText) {
        throw new Error('Empty response from OpenClaw');
      }
      return outputText;
    }
  } catch (error) {
    console.error('[callLLM] AI API call failed:', error);
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
  depth: number = 0,
  aiMode: 'openclaw' | 'llm' = 'openclaw'
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
      console.log(`${indent}🤖 正在调用LLM (${aiMode})...`);
      const llmResponse = await callLLM([
        { role: 'system', content: '你是一个任务分解专家。请分析任务并合理分配给下属。' },
        { role: 'user', content: prompt }
      ], aiMode);
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
            const subResult = await distributeTask(subEmployeeId, breakdown.subTask, depth + 1, aiMode);
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
      const subResult = await distributeTask(nonExecutorSubordinates[i], subTask, depth + 1, aiMode);
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
      ], aiMode);

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

// ========== 任务分发 API（单Agent协调模式） ==========

// 构建组织拓扑描述
function buildOrgTopology(): string {
  const lines = ['## 组织架构'];
  
  for (const emp of employees) {
    const subordinates = relationships
      .filter(r => r.source === emp.id)
      .map(r => {
        const sub = employees.find(e => e.id === r.target);
        return sub?.name || r.target;
      });
    
    lines.push(`- ${emp.name} (ID: ${emp.id}, 类型: ${emp.type})${subordinates.length ? ' → 下属: ' + subordinates.join(', ') : ''}`);
  }
  
  return lines.join('\n');
}

// 获取完整员工信息
function getEmployeeDetails(emp: Employee): string {
  return `
- ID: ${emp.id}
- 名称: ${emp.name}
- 类型: ${emp.type}
- 描述: ${emp.description || '无'}
- 专长: ${emp.expertise?.join('、') || '无'}
- 职责: ${emp.responsibilities?.join('、') || '无'}
`.trim();
}

// 任务分发API（单Agent协调模式）
app.post('/api/distribute-task', async (req, res) => {
  const { task, startEmployeeId, teamId, aiMode = 'openclaw' } = req.body;

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

  try {
    console.log('\n🚀 开始任务分发...');
    console.log(`📋 任务: ${task}`);
    console.log(`📦 团队ID: ${teamId || '未指定（使用所有员工）'}`);
    console.log(`🤖 AI模式: ${aiMode}\n`);

    // 获取当前团队的员工列表
    const currentTeamEmployees = teamId 
      ? employees.filter(e => teams.some(t => t.id === teamId && t.memberIds.includes(e.id)))
      : employees;
    const currentTeamEmployeeIds = new Set(currentTeamEmployees.map(e => e.id));
    
    // 过滤关系，只保留涉及当前团队员工的关系
    const currentRelationships = relationships.filter(
      r => currentTeamEmployeeIds.has(r.source) && currentTeamEmployeeIds.has(r.target)
    );
    
    // 构建当前团队的拓扑信息
    const employeeMap = new Map(currentTeamEmployees.map(e => [e.id, e]));
    
    const orgTopologyLines = ['## 组织架构（仅限当前团队）'];
    for (const emp of currentTeamEmployees) {
      const subordinates = currentRelationships
        .filter(r => r.source === emp.id)
        .map(r => employeeMap.get(r.target)?.name || r.target);
      orgTopologyLines.push(`- ${emp.name} (ID: ${emp.id}, 类型: ${emp.type})${subordinates.length ? ' → 下属: ' + subordinates.join(', ') : ''}`);
    }
    const orgTopology = orgTopologyLines.join('\n');
    
    const allEmployeesInfo = currentTeamEmployees.map(e => getEmployeeDetails(e)).join('\n');
    
    // 构建拓扑关系（谁向谁汇报）
    const reportingLines = currentRelationships.map(r => {
      const source = employeeMap.get(r.source);
      const target = employeeMap.get(r.target);
      return `${target?.name || r.target} → ${source?.name || r.source}（${source?.name}是${target?.name}的上级）`;
    }).join('\n');

    // 构建prompt，让OpenClaw一次性完成所有分析和生成
    const prompt = `你是任务协调专家。请根据以下组织架构和任务，协调完成工作并生成结构化结果。

【重要】只能分配任务给上述"详细员工信息"中列出的员工，不要分配给任何其他人员！

${orgTopology}

## 汇报关系（严格按照此关系执行）：
${reportingLines}

## 详细员工信息（仅限这些员工）：
${allEmployeesInfo}

## 任务：
${task}

请按照以下JSON格式输出（必须严格遵循JSON格式，不要有额外文字）：
{
  "task_analysis": "任务分析（50字以内）",
  "node_responses": [
    {
      "employee_id": "员工ID",
      "employee_name": "员工名称",
      "task_assigned": "分配给该员工的子任务",
      "response": "该员工的专业分析和回答"
    }
  ],
  "final_command": "最终汇总的可执行命令（必须是具体的技术操作，包含所有重要的技术细节）"
}

注意：
1. 必须考虑员工的专长来分配任务
2. 必须按照汇报关系进行任务分解
3. node_responses中每个员工的task_assigned应该是其直属上级的分配
4. final_command必须包含所有重要的技术细节，如：
   - 具体的技术栈和库（如 Canvas API、particles.js）
   - 具体的参数值（如颜色代码、动画时长）
   - 具体的实现方案（如粒子物理参数、贝塞尔曲线）
   - 具体的代码结构（如需要的类名、函数名）
5. final_command是给开发者看的执行命令，要足够详细以便直接实现`;

    const llmResponse = await callLLM([
      { role: 'system', content: '你是一个专业的任务协调专家，负责分析任务、组织人员、生成执行方案。' },
      { role: 'user', content: prompt }
    ], aiMode);

    console.log('📨 LLM响应:', llmResponse.substring(0, 300), '...');

    // 解析LLM响应
    let parsed;
    let rawJson: any = null;
    try {
      // 提取 JSON（支持 markdown 代码块格式）
      let jsonStr = llmResponse;
      const codeBlockMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // 尝试修复格式错误的 JSON
        const fixedJson = fixMalformedJSON(jsonMatch[0]);
        parsed = JSON.parse(fixedJson);
        rawJson = parsed;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ JSON解析失败，尝试降级处理:', parseError);
      // 降级方案：直接使用 LLM 响应作为结果
      const startEmployee = getEmployee(startId);
      
      // 尝试从原始响应中提取有用信息
      const fallbackResult = {
        task_analysis: '任务分析完成',
        node_responses: [] as any[],
        final_command: llmResponse.slice(0, 500),
      };
      
      // 尝试提取任何看起来像员工任务的内容
      const taskMatches = llmResponse.matchAll(/(?:员工|employee)[^:：]*[：:]\s*([^\n]+)/gi);
      for (const match of taskMatches) {
        fallbackResult.node_responses.push({
          employee_id: 'unknown',
          employee_name: '未知员工',
          task_assigned: match[1]?.trim() || '',
          response: '（待处理）',
        });
      }
      
      parsed = fallbackResult;
      rawJson = fallbackResult;
      console.log('📨 使用降级方案处理响应');
    }

    const startEmployee = getEmployee(startId);
    
    const result = {
      employee: startEmployee,
      result: parsed.task_analysis || '任务分析完成',
      nodeResponses: parsed.node_responses || [],
      finalCommand: parsed.final_command || '',
      rawJson: parsed
    };

    console.log('✅ 任务分发完成');

    res.json({ 
      success: true, 
      data: {
        task,
        startEmployee,
        result
      }
    });
  } catch (error) {
    console.error('❌ 任务分发失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: '任务分发失败', details: errorMessage });
  }
});

// AI 任务执行接口（支持 OpenClaw 和 LLM 双模式）
app.post('/api/task/execute', async (req, res) => {
  const { input, aiMode = 'openclaw', model } = req.body;
  
  const openclawUrl = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
  const openclawToken = process.env.OPENCLAW_TOKEN || '';
  const agentId = process.env.OPENCLAW_AGENT_ID || 'main';

  try {
    if (aiMode === 'llm') {
      // LLM 模式 - 使用 SiliconFlow
      const llmBaseUrl = 'https://api.siliconflow.cn/v1';
      const llmApiKey = process.env.SILICONFLOW_API_KEY || '';
      const llmModel = model || 'Qwen/Qwen2.5-7B-Instruct';

      const response = await fetch(`${llmBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmModel,
          messages: [
            { role: 'system', content: '你是一个专业的助手，负责回答问题和执行任务。' },
            { role: 'user', content: input }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLM] Task execution failed:', response.status, errorText);
        return res.status(response.status).json({ error: { message: `LLM API 调用失败: ${response.status}` } });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '无返回内容';
      
      // 转换为与 OpenClaw 一致的格式
      return res.json({
        output: [{ type: 'message', content: content }]
      });
    } else {
      // OpenClaw 模式
      const response = await fetch(`${openclawUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openclawToken}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': agentId,
        },
        body: JSON.stringify({
          model: model || 'openclaw',
          input,
        }),
      });

      const data = await response.json();
      return res.json(data);
    }
  } catch (error) {
    console.error('[Task Execute] AI API 调用失败:', error);
    res.status(500).json({ error: { message: 'AI API 调用失败' } });
  }
});

// OpenClaw 代理接口（保留向后兼容）
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

// ========== 协商讨论 API ==========

interface NegotiationRequest {
  speakerId: string;
  speakerName: string;
  speakerType: string;
  expertise: string[];
  topic: string;
  blackboard: {
    authorName: string;
    authorType: string;
    type: string;
    content: string;
  }[];
  userPriorityContent?: string;  // 用户最新发言，优先级最高
}

// 总结黑板内容接口
interface SummaryRequest {
  topic: string;
  blackboard: {
    authorName: string;
    type: string;
    content: string;
  }[];
}

// 专门用于协商的LLM调用（更高温度，更多样化）
async function callNegotiationLLM(messages: { role: string; content: string }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    import('node:https').then(({ default: https }) => {
      const body = Buffer.from(JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 150,    // 限制最大150字
        top_p: 0.85,
        frequency_penalty: 0.6,  // 频率惩罚
        presence_penalty: 0.4,
      }), 'utf8');

      const options = {
        hostname: 'api.siliconflow.cn',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Length': body.byteLength,
        }
      };

      const req = https.request(options, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              resolve(parsed.choices[0].message.content);
            } else {
              reject(new Error('LLM响应格式错误: ' + data.substring(0, 200)));
            }
          } catch (e) {
            reject(new Error('解析LLM响应失败: ' + data.substring(0, 200)));
          }
        });
      });

      req.on('error', (e: Error) => {
        reject(e);
      });

      req.write(body);
      req.end();
    }).catch(reject);
  });
}

// 角色性格描述（让LLM更像这个角色）
const rolePersonalities: Record<string, string> = {
  // 企业通用
  manager: '你是一个经验丰富的项目经理，善于从全局思考问题，关注进度、风险、资源协调。你说话直接务实，喜欢用数据和计划说话。',
  developer: '你是一个资深技术专家，关注技术可行性、架构设计、代码质量。你说话喜欢用技术术语，逻辑严谨。',
  designer: '你是一个创意设计师，关注用户体验、视觉美感、交互流程。你说话富有想象力，喜欢举例子说明。',
  analyst: '你是一个数据分析师，关注数据洞察、市场趋势、用户行为。你说话喜欢用数据支撑观点。',
  writer: '你是一个文案策划，擅长内容创作，品牌表达、用户沟通。你说话富有感染力，注重表达效果。',
  support: '你是一个客服主管，关注客户需求、服务流程、问题解决。你说话亲切耐心，注重用户反馈。',
  researcher: '你是一个技术研究员，关注前沿技术、创新方案、可行性分析。你说话严谨前瞻，喜欢引用行业趋势。',
  qa: '你是一个测试专家，关注质量把控、风险评估、测试策略。你说话注重细节和边界条件。',
  devops: '你是一个运维工程师，关注稳定性、部署效率、监控告警。你说话务实，关注SLA和可用性。',
  sales: '你是一个销售经理，关注客户需求、商务谈判、市场拓展。你说话自信，善于把握客户心理。',
  // 金融/证券
  analyst_sec: '你是一个专业的二级市场证券分析师，关注宏观经济、行业动向和个股基本面。你说话严谨客观，注重数据分析和风险提示。',
  risk_manager: '你是一个资深风控专员，关注信用风险、市场风险和操作风险。你说话谨慎保守，强调合规和风险控制。',
  trader: '你是一个专业交易员，关注盘面动态、交易机会和资金管理。你说话简洁果断，注重风险收益比。',
  wealth_advisor: '你是一个专业理财顾问，关注客户资产配置、财富目标和投资偏好。你说话亲切专业，注重长期收益和资产保值。',
  // 医疗健康
  doctor: '你是一个资深临床医师，关注疾病诊断、治疗方案和患者管理。你说话严谨专业，注重临床证据和诊疗规范。',
  pharmacist: '你是一个专业药师，关注药品管理、用药安全和药物相互作用。你说话细致严谨，注重用药说明和禁忌提示。',
  nurse: '你是一个专业护士，关注护理操作、患者护理和医疗协调。你说话温柔耐心，注重患者感受和护理细节。',
  // 教育培训
  teacher: '你是一个资深教师，关注教学方法、学生发展和课堂效果。你说话生动有趣，注重因材施教和启发引导。',
  curriculum_designer: '你是一个专业课程设计师，关注教学设计、课程开发和学习评估。你说话系统严谨，注重学习目标和效果转化。',
  // 媒体创意
  director: '你是一个资深编导，关注节目策划、脚本创作和现场把控。你说话富有创意，注重内容价值和观众体验。',
  cameraman: '你是一个专业摄像师，关注镜头语言、画面构图和拍摄技巧。你说话技术流，注重光线运用和构图美感。',
  editor_video: '你是一个专业视频剪辑师，关注剪辑节奏、叙事结构和视觉呈现。你说话有艺术感，注重故事线和情感节奏。',
  // 制造行业
  engineer_mech: '你是一个资深工艺工程师，关注工艺设计、生产优化和设备维护。你说话务实严谨，注重工艺参数和质量标准。',
  quality_inspector: '你是一个专业质检专员，关注质量检验、标准制定和问题分析。你说话严格认真，注重质量把控和缺陷预防。',
  // 自定义
  custom: '你是一个专业人士，关注本领域的专业知识和实践经验。你说话专业务实，结合行业特点发表观点。',
};

// 协商讨论接口
app.post('/api/negotiate', async (req, res) => {
  const { speakerId, speakerName, speakerType, expertise, topic, blackboard, userPriorityContent } = req.body as NegotiationRequest;

  if (!speakerId || !topic) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 获取黑板上的现有观点
  const existingOpinions = blackboard
    .filter(item => item.type === 'opinion' || item.type === 'summary')
    .slice(-5)
    .map((item) => `【${item.authorName}】：${item.content}`)
    .join('\n');

  const questions = blackboard
    .filter(item => item.type === 'question')
    .map((item) => `【${item.authorName}提问】：${item.content}`)
    .join('\n');

  const pendingItems = blackboard
    .filter(item => item.type === 'pending')
    .map((item) => `【待处理-${item.authorName}】：${item.content}`)
    .join('\n');

  // 获取角色性格
  const personality = rolePersonalities[speakerType] || rolePersonalities['developer'];

  // 构建prompt（用户优先级最高）
  const prompt = `## 场景
你正在参加一个团队会议，作为"${speakerName}"（${speakerType}）发言。

## 角色设定
${personality}

## 你的专长
${expertise.length > 0 ? expertise.join('、') : '综合能力'}

## 会议议题
"${topic}"

${userPriorityContent ? `## ⚠️ 仲裁者指示
"${userPriorityContent}"

【重要】你必须先回应仲裁者的观点！` : ''}
${questions ? `## ❓ 仲裁者提出的问题（必须正面回答）
${questions}
` : ''}
${existingOpinions ? `## 会议上已经讨论的内容
${existingOpinions}
` : ''}
${pendingItems ? `## ⏳ 待处理的事项
${pendingItems}
` : ''}

## 发言要求
${userPriorityContent ? `1. 【必须】先回应仲裁者的观点（同意/补充/反对）
2. 【必须】回答仲裁者提出的问题` : '1. 【必须】回答仲裁者提出的问题'}
3. 然后结合你的专业背景提出见解
4. 发言口语化，像真实开会
5. 控制在150字以内
6. 直接输出，不要前缀

开始发言：`;

  try {
    const result = await callNegotiationLLM([
      { role: 'system', content: '你是一个参加会议的专业人士，每次发言要有独特视角，不要重复别人说过的内容。' },
      { role: 'user', content: prompt }
    ]);

    // 清理输出
    const cleanedResult = result.trim();

    res.json({
      success: true,
      data: {
        content: cleanedResult,
        speakerId,
        speakerName,
        speakerType,
      }
    });
  } catch (error) {
    console.error('协商讨论LLM调用失败:', error);
    res.status(500).json({ error: '协商讨论失败', details: String(error) });
  }
});

// 总结黑板内容接口
app.post('/api/summarize', async (req, res) => {
  const { topic, blackboard } = req.body as SummaryRequest;

  if (!topic || !blackboard || blackboard.length === 0) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 获取所有观点
  const allOpinions = blackboard
    .filter(item => item.type === 'opinion' || item.type === 'summary')
    .map((item) => `【${item.authorName}（${item.authorType}）】：${item.content}`)
    .join('\n');

  const questions = blackboard
    .filter(item => item.type === 'question')
    .map((item) => `【${item.authorName}提问】：${item.content}`)
    .join('\n');

  const pendingItems = blackboard
    .filter(item => item.type === 'pending')
    .map((item) => `【待处理】：${item.content}`)
    .join('\n');

  const prompt = `## 会议议题
"${topic}"

## 讨论内容汇总
${allOpinions}

${questions ? `## 待解答问题\n${questions}\n\n` : ''}
${pendingItems ? `## 待处理事项\n${pendingItems}\n\n` : ''}

## 你的任务
请将以上讨论内容整理成简洁的条例形式，每条不超过20字。格式要求：
1. 用「•」或「1.」开头
2. 每条一个核心观点
3. 合并相似观点
4. 保留争议点
5. 只输出条例内容，不要解释

输出示例：
• 引入Trello管理任务分配
• 建议增加周会同步进度
• 技术方案待进一步评估`;

  try {
    const result = await callNegotiationLLM([
      { role: 'system', content: '你是一个专业的会议记录员，擅长将讨论内容整理成简洁的条例。' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      success: true,
      data: {
        content: result.trim(),
        topic,
      }
    });
  } catch (error) {
    console.error('总结LLM调用失败:', error);
    res.status(500).json({ error: '总结失败', details: String(error) });
  }
});

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
