// 员工类型定义
export type EmployeeType = 
  // 通用
  | 'superadmin'   // 终极管理员
  | 'executor'     // 执行官
  | 'manager'      // 经理/主管
  | 'developer'    // 开发工程师
  | 'designer'     // 设计师
  | 'analyst'      // 分析师
  | 'writer'       // 内容创作者
  | 'support'      // 客服/支持
  | 'researcher'   // 研究员
  | 'qa'           // 测试工程师
  | 'devops'       // 运维/运营
  | 'sales'        // 销售
  // 金融
  | 'analyst_sec'  // 证券分析师
  | 'risk_manager' // 风控专员
  | 'trader'       // 交易员
  | 'wealth_advisor' // 理财顾问
  // 医疗
  | 'doctor'       // 医师
  | 'pharmacist'   // 药师
  | 'nurse'        // 护士
  // 教育
  | 'teacher'      // 教师
  | 'curriculum_designer' // 课程设计师
  // 媒体
  | 'director'     // 编导
  | 'cameraman'    // 摄像师
  | 'editor_video' // 视频剪辑师
  // 制造
  | 'engineer_mech' // 工艺工程师
  | 'quality_inspector' // 质检专员
  // 自定义
  | 'custom';      // 自定义角色

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
  devops: '/avatars/devops.png',
  sales: '/avatars/sales.png',
  // 金融行业
  analyst_sec: '/avatars/analyst_sec.png',
  risk_manager: '/avatars/risk_manager.png',
  trader: '/avatars/trader.png',
  wealth_advisor: '/avatars/wealth_advisor.png',
  // 医疗行业
  doctor: '/avatars/doctor.png',
  pharmacist: '/avatars/pharmacist.png',
  nurse: '/avatars/nurse.png',
  // 教育行业
  teacher: '/avatars/teacher.png',
  curriculum_designer: '/avatars/curriculum_designer.png',
  // 媒体行业
  director: '/avatars/director.png',
  cameraman: '/avatars/cameraman.png',
  editor_video: '/avatars/editor_video.png',
  // 制造行业
  engineer_mech: '/avatars/engineer_mech.png',
  quality_inspector: '/avatars/quality_inspector.png',
  // 自定义角色
  custom: '/avatars/custom.png',
};

// 行业模板配置
export interface IndustryTemplate {
  id: string;
  name: string;
  icon: string;
  roles: { type: EmployeeType; label: string; expertise: string[] }[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'tech',
    name: '科技/互联网',
    icon: '💻',
    roles: [
      { type: 'manager', label: '项目经理', expertise: ['项目管理', '团队协调', '敏捷开发'] },
      { type: 'developer', label: '开发工程师', expertise: ['前端开发', '后端开发', '全栈'] },
      { type: 'designer', label: '设计师', expertise: ['UI设计', 'UX设计', '交互设计'] },
      { type: 'analyst', label: '数据分析师', expertise: ['数据分析', '数据可视化', 'Python'] },
      { type: 'qa', label: '测试工程师', expertise: ['功能测试', '自动化测试', '性能测试'] },
      { type: 'devops', label: '运维工程师', expertise: ['DevOps', '容器化', '监控告警'] },
      { type: 'researcher', label: '技术研究员', expertise: ['AI/ML', '架构设计', '前沿技术'] },
      { type: 'writer', label: '内容运营', expertise: ['文案策划', '新媒体运营', '用户增长'] },
    ],
  },
  {
    id: 'finance',
    name: '金融/证券',
    icon: '📈',
    roles: [
      { type: 'analyst_sec', label: '证券分析师', expertise: ['宏观策略', '行业研究', '个股分析'] },
      { type: 'risk_manager', label: '风控专员', expertise: ['信用风控', '市场风险', '量化风控'] },
      { type: 'trader', label: '交易员', expertise: ['日内交易', '量化策略', '套利'] },
      { type: 'wealth_advisor', label: '理财顾问', expertise: ['资产配置', '基金销售', '客户维护'] },
      { type: 'manager', label: '营业部经理', expertise: ['团队管理', '业绩目标', '客户开发'] },
      { type: 'support', label: '客服专员', expertise: ['客户咨询', '投诉处理', '服务品质'] },
    ],
  },
  {
    id: 'medical',
    name: '医疗健康',
    icon: '🏥',
    roles: [
      { type: 'doctor', label: '主治医师', expertise: ['临床诊断', '疾病治疗', '患者管理'] },
      { type: 'pharmacist', label: '药师', expertise: ['药品管理', '用药指导', '药物咨询'] },
      { type: 'nurse', label: '护士', expertise: ['护理操作', '患者护理', '医疗记录'] },
      { type: 'analyst', label: '医疗数据分析师', expertise: ['医疗统计', '流行病学', '健康大数据'] },
      { type: 'support', label: '医疗咨询师', expertise: ['健康咨询', '导诊服务', '患者随访'] },
    ],
  },
  {
    id: 'education',
    name: '教育培训',
    icon: '📚',
    roles: [
      { type: 'teacher', label: '教师', expertise: ['学科教学', '学生管理', '课程设计'] },
      { type: 'curriculum_designer', label: '课程设计师', expertise: ['课程开发', '教学设计', '学习评估'] },
      { type: 'analyst', label: '学习分析师', expertise: ['学习数据', '效果评估', '个性化推荐'] },
      { type: 'writer', label: '教学内容编辑', expertise: ['教材编写', '题库建设', '内容策划'] },
      { type: 'support', label: '学习顾问', expertise: ['课程咨询', '学习规划', '家长沟通'] },
    ],
  },
  {
    id: 'media',
    name: '媒体/创意',
    icon: '🎬',
    roles: [
      { type: 'director', label: '编导', expertise: ['节目策划', '脚本创作', '现场导演'] },
      { type: 'cameraman', label: '摄像师', expertise: ['摄像技巧', '镜头语言', '设备操作'] },
      { type: 'editor_video', label: '视频剪辑师', expertise: ['剪辑软件', '特效包装', '调色'] },
      { type: 'writer', label: '内容编辑', expertise: ['文案写作', '选题策划', '热点追踪'] },
      { type: 'designer', label: '视觉设计师', expertise: ['平面设计', '品牌视觉', '创意设计'] },
      { type: 'support', label: '运营专员', expertise: ['账号运营', '粉丝互动', '数据分析'] },
    ],
  },
  {
    id: 'manufacturing',
    name: '制造业',
    icon: '🏭',
    roles: [
      { type: 'engineer_mech', label: '工艺工程师', expertise: ['工艺设计', '生产优化', '设备维护'] },
      { type: 'quality_inspector', label: '质检专员', expertise: ['质量检验', '标准制定', '问题分析'] },
      { type: 'manager', label: '生产主管', expertise: ['生产计划', '人员调度', '现场管理'] },
      { type: 'devops', label: '采购专员', expertise: ['供应商管理', '成本控制', '供应链'] },
      { type: 'analyst', label: 'IE工程师', expertise: ['效率分析', '精益生产', '流程优化'] },
    ],
  },
  {
    id: 'enterprise',
    name: '企业通用',
    icon: '🏢',
    roles: [
      { type: 'manager', label: '部门经理', expertise: ['团队管理', '目标制定', '绩效评估'] },
      { type: 'writer', label: '行政专员', expertise: ['公文写作', '会务组织', '档案管理'] },
      { type: 'support', label: 'HR专员', expertise: ['招聘培训', '薪酬福利', '员工关系'] },
      { type: 'analyst', label: '财务分析师', expertise: ['财务报表', '预算管理', '成本分析'] },
      { type: 'support', label: '法务专员', expertise: ['合同审核', '法律咨询', '合规管理'] },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    icon: '✨',
    roles: [],
  },
];

// 获取所有角色类型选项
export const getAllRoleTypes = (): { value: EmployeeType; label: string; color: string }[] => [
  { value: 'superadmin', label: '董事长', color: '#F59E0B' },
  { value: 'executor', label: '执行官', color: '#DC2626' },
  { value: 'manager', label: '经理/主管', color: '#7C3AED' },
  { value: 'developer', label: '开发工程师', color: '#2563EB' },
  { value: 'designer', label: '设计师', color: '#DB2777' },
  { value: 'analyst', label: '分析师', color: '#059669' },
  { value: 'writer', label: '内容创作者', color: '#D97706' },
  { value: 'support', label: '客服/支持', color: '#0891B2' },
  { value: 'researcher', label: '研究员', color: '#7C3AED' },
  { value: 'qa', label: '测试工程师', color: '#DC2626' },
  { value: 'devops', label: '运维/运营', color: '#4B5563' },
  { value: 'sales', label: '销售', color: '#EA580C' },
  // 金融
  { value: 'analyst_sec', label: '证券分析师', color: '#059669' },
  { value: 'risk_manager', label: '风控专员', color: '#DC2626' },
  { value: 'trader', label: '交易员', color: '#7C3AED' },
  { value: 'wealth_advisor', label: '理财顾问', color: '#D97706' },
  // 医疗
  { value: 'doctor', label: '医师', color: '#2563EB' },
  { value: 'pharmacist', label: '药师', color: '#059669' },
  { value: 'nurse', label: '护士', color: '#DB2777' },
  // 教育
  { value: 'teacher', label: '教师', color: '#7C3AED' },
  { value: 'curriculum_designer', label: '课程设计师', color: '#D97706' },
  // 媒体
  { value: 'director', label: '编导', color: '#DC2626' },
  { value: 'cameraman', label: '摄像师', color: '#4B5563' },
  { value: 'editor_video', label: '视频剪辑师', color: '#7C3AED' },
  // 制造
  { value: 'engineer_mech', label: '工艺工程师', color: '#2563EB' },
  { value: 'quality_inspector', label: '质检专员', color: '#059669' },
  // 自定义
  { value: 'custom', label: '自定义角色', color: '#8B5CF6' },
];

// 12种预设员工（第一个是终极管理员，第二个是OpenClaw执行官）
export const PRESET_EMPLOYEES: Employee[] = [
  { 
    id: 'emp-0', 
    name: '董事长', 
    type: 'superadmin', 
    avatar: EMPLOYEE_AVATARS.superadmin,
    description: '终极管理员，权限最高，不存在上级',
    status: 'idle'
  },
  { 
    id: 'emp-exec', 
    name: 'OpenClaw执行官', 
    type: 'executor', 
    avatar: EMPLOYEE_AVATARS.executor,
    description: '汇总执行层输出，优化任务，形成可执行命令',
    status: 'idle'
  },
  { 
    id: 'emp-1', 
    name: '张经理', 
    type: 'manager', 
    avatar: EMPLOYEE_AVATARS.manager,
    description: '团队负责人，负责整体协调和决策',
    status: 'idle'
  },
  { 
    id: 'emp-2', 
    name: '陈开发', 
    type: 'developer', 
    avatar: EMPLOYEE_AVATARS.developer,
    description: '后端开发，擅长 Java/Go',
    status: 'idle'
  },
  { 
    id: 'emp-3', 
    name: '刘前端', 
    type: 'developer', 
    avatar: EMPLOYEE_AVATARS.developer,
    description: '前端开发，擅长 React/Vue',
    status: 'idle'
  },
  { 
    id: 'emp-4', 
    name: '林设计', 
    type: 'designer', 
    avatar: EMPLOYEE_AVATARS.designer,
    description: 'UI/UX 设计师',
    status: 'idle'
  },
  { 
    id: 'emp-5', 
    name: '徐分析', 
    type: 'analyst', 
    avatar: EMPLOYEE_AVATARS.analyst,
    description: '数据分析师',
    status: 'idle'
  },
  { 
    id: 'emp-6', 
    name: '王文案', 
    type: 'writer', 
    avatar: EMPLOYEE_AVATARS.writer,
    description: '内容创作者',
    status: 'idle'
  },
  { 
    id: 'emp-7', 
    name: '赵客服', 
    type: 'support', 
    avatar: EMPLOYEE_AVATARS.support,
    description: '客户支持',
    status: 'idle'
  },
  { 
    id: 'emp-8', 
    name: '孙研究', 
    type: 'researcher', 
    avatar: EMPLOYEE_AVATARS.researcher,
    description: '技术研究员',
    status: 'idle'
  },
  { 
    id: 'emp-9', 
    name: '周测试', 
    type: 'qa', 
    avatar: EMPLOYEE_AVATARS.qa,
    description: '测试工程师',
    status: 'idle'
  },
  { 
    id: 'emp-10', 
    name: '吴销售', 
    type: 'sales', 
    avatar: EMPLOYEE_AVATARS.sales,
    description: '销售代表',
    status: 'idle'
  },
];

// 默认员工列表（与 PRESET_EMPLOYEES 相同，用于 store 中的默认值）
export const DEFAULT_EMPLOYEES = PRESET_EMPLOYEES;

// 员工类型的颜色配置
export const EMPLOYEE_TYPE_CONFIG: Record<EmployeeType, { color: string; bgColor: string }> = {
  // 通用
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
  // 金融
  analyst_sec: { color: '#059669', bgColor: '#D1FAE5' },
  risk_manager: { color: '#DC2626', bgColor: '#FEE2E2' },
  trader: { color: '#7C3AED', bgColor: '#EDE9FE' },
  wealth_advisor: { color: '#D97706', bgColor: '#FEF3C7' },
  // 医疗
  doctor: { color: '#2563EB', bgColor: '#DBEAFE' },
  pharmacist: { color: '#059669', bgColor: '#D1FAE5' },
  nurse: { color: '#DB2777', bgColor: '#FCE7F3' },
  // 教育
  teacher: { color: '#7C3AED', bgColor: '#EDE9FE' },
  curriculum_designer: { color: '#D97706', bgColor: '#FEF3C7' },
  // 媒体
  director: { color: '#DC2626', bgColor: '#FEE2E2' },
  cameraman: { color: '#4B5563', bgColor: '#F3F4F6' },
  editor_video: { color: '#7C3AED', bgColor: '#EDE9FE' },
  // 制造
  engineer_mech: { color: '#2563EB', bgColor: '#DBEAFE' },
  quality_inspector: { color: '#059669', bgColor: '#D1FAE5' },
  // 自定义
  custom: { color: '#8B5CF6', bgColor: '#EDE9FE' },
};
