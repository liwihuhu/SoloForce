import { useState, useEffect } from 'react';
import type { Employee, EmployeeType, EmployeeStatus } from '../types';
import { EMPLOYEE_TYPE_CONFIG, EMPLOYEE_AVATARS, INDUSTRY_TEMPLATES, getAllRoleTypes } from '../types';

const API_BASE = 'http://localhost:5301';

// 状态选项
const STATUS_OPTIONS: { value: EmployeeStatus; label: string; color: string }[] = [
  { value: 'idle', label: '空闲', color: 'var(--success)' },
  { value: 'busy', label: '工作中', color: 'var(--warning)' },
  { value: 'offline', label: '离线', color: '#6B7280' },
];

// 所有角色类型
const ALL_ROLE_TYPES = getAllRoleTypes();

// 性格标签选项
const PERSONALITY_TAGS = [
  { value: 'analytical', label: '🔍 分析型', desc: '注重数据与逻辑，决策谨慎' },
  { value: 'creative', label: '💡 创意型', desc: '思维活跃，善于提出新想法' },
  { value: 'pragmatic', label: '⚡ 实干型', desc: '注重落地执行，关注可行性' },
  { value: 'diplomatic', label: '🤝 协调型', desc: '擅长沟通调解，平衡各方利益' },
  { value: 'bold', label: '🚀 进取型', desc: '敢于冒险，追求快速增长' },
  { value: 'cautious', label: '🛡️ 稳健型', desc: '风险意识强，决策保守' },
  { value: 'empathetic', label: '❤️ 共情型', desc: '关注人的感受，重视团队氛围' },
  { value: 'critical', label: '❄️ 批判型', desc: '善于发现问题，质疑现状' },
  { value: 'optimistic', label: '☀️ 乐观型', desc: '积极正面，相信问题都能解决' },
  { value: 'pessimistic', label: '🌧️ 谨慎型', desc: '习惯考虑 worst case，防患未然' },
  { value: 'leadership', label: '👑 主导型', desc: '喜欢掌控节奏，引导讨论方向' },
  { value: 'supportive', label: '🌿 支持型', desc: '配合他人，补充细节与信息' },
];

interface EmployeeFormData {
  name: string;
  type: EmployeeType;
  industry: string;
  roleName: string;
  department: string;
  description: string;  // AI角色提示词
  avatar: string;
  expertise: string[];  // 改为数组
  responsibilities: string;
  personalities: string[];  // 性格标签
}

const defaultFormData: EmployeeFormData = {
  name: '',
  type: 'developer',
  industry: 'tech',
  roleName: '',
  department: '',
  description: '',
  avatar: EMPLOYEE_AVATARS.developer,
  expertise: [],
  responsibilities: '',
  personalities: [],
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newExpertise, setNewExpertise] = useState('');  // 新增专业输入
  const [customIndustry, setCustomIndustry] = useState('');  // 自定义行业
  const [customRole, setCustomRole] = useState('');  // 自定义角色
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // 根据行业获取角色列表
  const getRolesByIndustry = (industryId: string) => {
    if (industryId === 'custom') return [];
    const industry = INDUSTRY_TEMPLATES.find(i => i.id === industryId);
    return industry?.roles || [];
  };

  // 根据角色类型获取预设专业
  const getExpertiseByType = (type: EmployeeType): string[] => {
    for (const industry of INDUSTRY_TEMPLATES) {
      const role = industry.roles.find(r => r.type === type);
      if (role) return role.expertise;
    }
    return [];
  };

  // 获取角色颜色
  const getRoleColor = (type: EmployeeType): string => {
    const role = ALL_ROLE_TYPES.find(r => r.value === type);
    return role?.color || '#6B7280';
  };

  // 行业变化时更新角色和专业
  const handleIndustryChange = (industryId: string) => {
    const roles = getRolesByIndustry(industryId);
    const defaultRole = roles[0];
    setFormData({
      ...formData,
      industry: industryId,
      type: defaultRole?.type || 'custom',
      roleName: defaultRole?.label || '',
      expertise: defaultRole?.expertise || [],
    });
  };

  // 角色变化时更新专业
  const handleRoleChange = (type: EmployeeType) => {
    const roleConfig = ALL_ROLE_TYPES.find(r => r.value === type);
    const expertise = getExpertiseByType(type);
    setFormData({
      ...formData,
      type,
      roleName: roleConfig?.label || '',
      expertise: expertise.length > 0 ? expertise : formData.expertise,
    });
  };

  // 添加专业标签
  const addExpertise = (exp: string) => {
    if (exp.trim() && !formData.expertise.includes(exp.trim())) {
      setFormData({
        ...formData,
        expertise: [...formData.expertise, exp.trim()],
      });
    }
    setNewExpertise('');
  };

  // 删除专业标签
  const removeExpertise = (exp: string) => {
    setFormData({
      ...formData,
      expertise: formData.expertise.filter(e => e !== exp),
    });
  };

  // 添加性格标签
  const togglePersonality = (tag: string) => {
    if (formData.personalities.includes(tag)) {
      setFormData({
        ...formData,
        personalities: formData.personalities.filter(p => p !== tag),
      });
    } else {
      setFormData({
        ...formData,
        personalities: [...formData.personalities, tag],
      });
    }
  };

  // 加载员工数据
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`${API_BASE}/api/employees?${params}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.items);
      }
    } catch (error) {
      console.error('加载员工失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, typeFilter, statusFilter]);

  // 打开新增弹窗
  const openAddModal = () => {
    setModalMode('add');
    setFormData(defaultFormData);
    setSelectedEmployee(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (emp: Employee) => {
    setModalMode('edit');
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      type: emp.type,
      industry: (emp as any).industry || 'tech',
      roleName: emp.roleName || '',
      department: emp.department || '',
      description: emp.description,
      avatar: emp.avatar,
      expertise: emp.expertise || [],
      responsibilities: emp.responsibilities?.join(', ') || '',
      personalities: emp.personalities || [],
    });
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name || !formData.type) {
      alert('请填写姓名和类型');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        industry: formData.industry,
        roleName: formData.roleName || formData.type,
        department: formData.department,
        description: formData.description,  // AI角色提示词
        avatar: formData.avatar,
        expertise: formData.expertise,
        responsibilities: formData.responsibilities.split(',').map(s => s.trim()).filter(Boolean),
        personalities: formData.personalities,
      };

      let res;
      if (modalMode === 'add') {
        res = await fetch(`${API_BASE}/api/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/employees/${selectedEmployee?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchEmployees();
      } else {
        alert(data.error?.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('操作失败');
    }
    setSubmitting(false);
  };

  // 删除员工
  const handleDelete = async (emp: Employee) => {
    if (!confirm(`确定删除员工 "${emp.name}" 吗？`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/employees/${emp.id}`, {
        method: 'DELETE',
      });
      // DELETE 成功返回 204 No Content
      if (res.status === 204 || res.ok) {
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.error?.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 更新状态
  const handleStatusChange = async (emp: Employee, newStatus: EmployeeStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/employees/${emp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('状态更新失败:', error);
    }
  };

  const getTypeConfig = (type: EmployeeType) => {
    return EMPLOYEE_TYPE_CONFIG[type] || { color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const getStatusConfig = (status: EmployeeStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status) || { label: '未知', color: 'var(--text-muted)' };
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto', background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      {/* 顶部工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 600,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          员工管理
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索员工..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              fontSize: '14px',
              width: '200px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          
          {/* 类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              fontSize: '14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          >
            <option value="" style={{ background: 'var(--bg-secondary)' }}>全部类型</option>
            {ALL_ROLE_TYPES.map(t => (
              <option key={t.value} value={t.value} style={{ background: 'var(--bg-secondary)' }}>{t.label}</option>
            ))}
          </select>
          
          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              fontSize: '14px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value} style={{ background: 'var(--bg-secondary)' }}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 新增按钮 */}
        <button
          onClick={openAddModal}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}
        >
          + 新增员工
        </button>
      </div>

      {/* 员工列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          加载中...
        </div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          暂无员工数据
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '16px' 
        }}>
          {employees.map(emp => {
            const typeConfig = getTypeConfig(emp.type);
            const statusConfig = getStatusConfig(emp.status);
            // 只有董事长(emp-0)和执行官(emp-exec)不可删除
            const isProtected = emp.id === 'emp-0' || emp.id === 'emp-exec';

            return (
              <div
                key={emp.id}
                style={{
                  background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-primary) 100%)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--accent-border)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* 头部 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, var(--accent-muted) 0%, var(--blue-bg) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--accent-border)',
                  }}>
                    {emp.avatar && emp.avatar.startsWith('/') ? (
                      <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>{emp.avatar}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: 'var(--text-primary)' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {emp.roleName || emp.name}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: `${statusConfig.color}20`,
                    color: statusConfig.color,
                    border: `1px solid ${statusConfig.color}30`,
                  }}>
                    {statusConfig.label}
                  </div>
                </div>

                {/* 类型标签 */}
                <div style={{ marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: `${typeConfig.color}20`,
                    color: typeConfig.color,
                    border: `1px solid ${typeConfig.color}30`,
                  }}>
                    {ALL_ROLE_TYPES.find(t => t.value === emp.type)?.label || emp.type}
                  </span>
                  {emp.department && (
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {emp.department}
                    </span>
                  )}
                </div>

                {/* 描述 */}
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
                  {emp.description}
                </div>

                {/* 技能标签 */}
                {emp.expertise && emp.expertise.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {emp.expertise.slice(0, 3).map((skill, i) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                      }}>
                        {skill}
                      </span>
                    ))}
                    {emp.expertise.length > 3 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{emp.expertise.length - 3}</span>
                    )}
                  </div>
                )}

                {/* 性格标签 */}
                {emp.personalities && emp.personalities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {emp.personalities.map((tag, i) => {
                      const tagInfo = PERSONALITY_TAGS.find(t => t.value === tag);
                      return (
                        <span key={i} style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#A78BFA',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}>
                          {tagInfo?.label || tag}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-default)', paddingTop: '14px' }}>
                  {/* 状态切换 */}
                  <select
                    value={emp.status}
                    onChange={(e) => handleStatusChange(emp, e.target.value as EmployeeStatus)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value} style={{ background: 'var(--bg-secondary)' }}>{s.label}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => openEditModal(emp)}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      background: 'linear-gradient(135deg, var(--accent-muted) 0%, var(--blue-bg) 100%)',
                      color: '#A78BFA',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    编辑
                  </button>
                  
                  {!isProtected && (
                    <button
                      onClick={() => handleDelete(emp)}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, var(--danger-bg) 0%, var(--danger-bg) 100%)',
                        color: '#F87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 弹窗 */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            borderRadius: '20px',
            padding: '28px',
            width: '520px',
            maxHeight: '85vh',
            overflow: 'auto',
            border: '1px solid var(--accent-border)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '22px', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {modalMode === 'add' ? '新增员工' : '编辑员工'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 姓名 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  姓名 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 行业选择 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  行业 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={e => handleIndustryChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  {INDUSTRY_TEMPLATES.map(ind => (
                    <option key={ind.id} value={ind.id} style={{ background: 'var(--bg-secondary)' }}>
                      {ind.icon} {ind.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 自定义行业输入 */}
              {formData.industry === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    自定义行业名称
                  </label>
                  <input
                    type="text"
                    value={customIndustry}
                    onChange={e => setCustomIndustry(e.target.value)}
                    placeholder="输入自定义行业名称"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* 角色类型 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  角色类型 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {formData.industry !== 'custom' ? (
                  <select
                    value={formData.type}
                    onChange={e => handleRoleChange(e.target.value as EmployeeType)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    {getRolesByIndustry(formData.industry).map(role => (
                      <option key={role.type} value={role.type} style={{ background: 'var(--bg-secondary)' }}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customRole}
                    onChange={e => {
                      setCustomRole(e.target.value);
                      setFormData({ ...formData, type: 'custom', roleName: e.target.value });
                    }}
                    placeholder="输入自定义角色名称"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              {/* 专业领域（标签） */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  专业领域
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {formData.expertise.map(exp => (
                    <span
                      key={exp}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: `1px solid ${getRoleColor(formData.type)}50`,
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: '#C4B5FD',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {exp}
                      <button
                        onClick={() => removeExpertise(exp)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#A78BFA',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '14px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={e => setNewExpertise(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExpertise(newExpertise))}
                    placeholder="输入专业技能后按回车添加"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => addExpertise(newExpertise)}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#A78BFA',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* 角色描述（AI提示词） */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  🤖 AI角色提示词 <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>（用于会议协商时定义AI行为）</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="定义这个角色的AI行为..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 部门 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  部门
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="如：技术部、投行部"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 性格标签 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  🧠 性格标签 <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>（影响会议发言风格）</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PERSONALITY_TAGS.map(tag => (
                    <button
                      key={tag.value}
                      onClick={() => togglePersonality(tag.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        border: formData.personalities.includes(tag.value)
                          ? '2px solid var(--accent)'
                          : '2px solid var(--border-default)',
                        background: formData.personalities.includes(tag.value)
                          ? 'rgba(139, 92, 246, 0.2)'
                          : 'var(--bg-secondary)',
                        color: formData.personalities.includes(tag.value)
                          ? '#A78BFA'
                          : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}
                      title={tag.desc}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 头像选择 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  头像
                </label>
                
                {/* 预设头像网格 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {/* 原有角色头像 */}
                  {['/avatars/superadmin.png', '/avatars/executor.png', '/avatars/manager.png', '/avatars/developer.png', '/avatars/designer.png', '/avatars/analyst.png', '/avatars/writer.png', '/avatars/support.png', '/avatars/researcher.png', '/avatars/qa.png', '/avatars/sales.png'].map(avatar => (
                    <div
                      key={avatar}
                      onClick={() => setFormData({ ...formData, avatar })}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: formData.avatar === avatar ? '2px solid var(--accent)' : '2px solid transparent',
                        background: 'var(--bg-secondary)',
                        padding: '4px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  {/* AI 风格头像 */}
                  {['/avatars/ai1.svg', '/avatars/ai2.svg', '/avatars/ai3.svg', '/avatars/ai4.svg', '/avatars/ai5.svg', '/avatars/ai6.svg'].map(avatar => (
                    <div
                      key={avatar}
                      onClick={() => setFormData({ ...formData, avatar })}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: formData.avatar === avatar ? '2px solid var(--accent)' : '2px solid transparent',
                        background: 'var(--bg-secondary)',
                        padding: '4px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                
                {/* 本地上传 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label
                    style={{
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, var(--accent-muted) 0%, var(--blue-bg) 100%)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: '10px',
                      color: 'var(--accent)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    上传头像
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setFormData({ ...formData, avatar: url });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {formData.avatar && !formData.avatar.startsWith('/') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={formData.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>本地图片</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 职责 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  职责
                </label>
                <input
                  type="text"
                  value={formData.responsibilities}
                  onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="如：后端开发, 接口实现"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '28px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(71, 85, 105, 0.3)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                }}
              >
                {submitting ? '提交中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
