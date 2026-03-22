import { useState, useEffect } from 'react';
import type { Employee, EmployeeType, EmployeeStatus } from '../types';
import { EMPLOYEE_TYPE_CONFIG, EMPLOYEE_AVATARS } from '../types';

const API_BASE = 'http://localhost:5301';

// 员工类型选项
const EMPLOYEE_TYPES: { value: EmployeeType; label: string; color: string }[] = [
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
];

// 状态选项
const STATUS_OPTIONS: { value: EmployeeStatus; label: string; color: string }[] = [
  { value: 'idle', label: '空闲', color: '#10B981' },
  { value: 'busy', label: '工作中', color: '#F59E0B' },
  { value: 'offline', label: '离线', color: '#6B7280' },
];

interface EmployeeFormData {
  name: string;
  type: EmployeeType;
  roleName: string;
  department: string;
  description: string;
  avatar: string;
  expertise: string;
  responsibilities: string;
}

const defaultFormData: EmployeeFormData = {
  name: '',
  type: 'developer',
  roleName: '',
  department: '',
  description: '',
  avatar: EMPLOYEE_AVATARS.developer,
  expertise: '',
  responsibilities: '',
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

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
      roleName: emp.roleName || '',
      department: emp.department || '',
      description: emp.description,
      avatar: emp.avatar,
      expertise: emp.expertise?.join(', ') || '',
      responsibilities: emp.responsibilities?.join(', ') || '',
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
        ...formData,
        expertise: formData.expertise.split(',').map(s => s.trim()).filter(Boolean),
        responsibilities: formData.responsibilities.split(',').map(s => s.trim()).filter(Boolean),
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
    return STATUS_OPTIONS.find(s => s.value === status) || { label: '未知', color: '#64748B' };
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto', background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}>
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
          background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
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
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              width: '200px',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#F1F5F9',
              outline: 'none',
            }}
          />
          
          {/* 类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              color: '#F1F5F9',
              outline: 'none',
            }}
          >
            <option value="" style={{ background: '#1E293B' }}>全部类型</option>
            {EMPLOYEE_TYPES.map(t => (
              <option key={t.value} value={t.value} style={{ background: '#1E293B' }}>{t.label}</option>
            ))}
          </select>
          
          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#F1F5F9',
            }}
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#1E293B' }}>{s.label}</option>
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
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
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
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* 头部 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}>
                    {emp.avatar && emp.avatar.startsWith('/') ? (
                      <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>{emp.avatar}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: '#F1F5F9' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94A3B8' }}>
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
                    {EMPLOYEE_TYPES.find(t => t.value === emp.type)?.label || emp.type}
                  </span>
                  {emp.department && (
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: '#64748B' }}>
                      {emp.department}
                    </span>
                  )}
                </div>

                {/* 描述 */}
                <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '14px', lineHeight: 1.6 }}>
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
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#06B6D4',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                      }}>
                        {skill}
                      </span>
                    ))}
                    {emp.expertise.length > 3 && (
                      <span style={{ fontSize: '11px', color: '#64748B' }}>+{emp.expertise.length - 3}</span>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '14px' }}>
                  {/* 状态切换 */}
                  <select
                    value={emp.status}
                    onChange={(e) => handleStatusChange(emp, e.target.value as EmployeeStatus)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      color: '#F1F5F9',
                      cursor: 'pointer',
                    }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value} style={{ background: '#1E293B' }}>{s.label}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => openEditModal(emp)}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
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
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
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
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            borderRadius: '20px',
            padding: '28px',
            width: '520px',
            maxHeight: '85vh',
            overflow: 'auto',
            border: '1px solid rgba(6, 182, 212, 0.3)',
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
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  姓名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 类型 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  类型 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as EmployeeType, avatar: EMPLOYEE_AVATARS[e.target.value as EmployeeType] })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                >
                  {EMPLOYEE_TYPES.map(t => (
                    <option key={t.value} value={t.value} style={{ background: '#1E293B' }}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* 角色名 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
                  角色名称
                </label>
                <input
                  type="text"
                  value={formData.roleName}
                  onChange={e => setFormData({ ...formData, roleName: e.target.value })}
                  placeholder="如：后端开发工程师"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* 部门 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
                  部门
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="如：技术部"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* 头像选择 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
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
                        border: formData.avatar === avatar ? '2px solid #06B6D4' : '2px solid transparent',
                        background: '#1E293B',
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
                        border: formData.avatar === avatar ? '2px solid #06B6D4' : '2px solid transparent',
                        background: '#1E293B',
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
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '10px',
                      color: '#06B6D4',
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
                      <span style={{ fontSize: '12px', color: '#64748B' }}>本地图片</span>
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

              {/* 技能 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
                  擅长技能（逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.expertise}
                  onChange={e => setFormData({ ...formData, expertise: e.target.value })}
                  placeholder="如：Java, Python, 数据库"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* 职责 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
                  职责（逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.responsibilities}
                  onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="如：后端开发, 接口实现"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
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
                  color: '#94A3B8',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
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
