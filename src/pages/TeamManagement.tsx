import { useState, useEffect } from 'react';
import { useTopologyStore } from '../store';
import { DEFAULT_EMPLOYEES } from '../types';

const API_BASE = 'http://localhost:5301';

interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  relationships: { source: string; target: string }[];
  createdAt: string;
  updatedAt: string;
}

interface TeamFormData {
  name: string;
  avatar: string;
  description: string;
  memberIds: string[];
  relationships: { source: string; target: string }[];
}

const defaultFormData: TeamFormData = {
  name: '',
  avatar: '/avatars/manager.png',
  description: '',
  memberIds: ['emp-0', 'emp-exec'],
  relationships: [],
};

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  
  const { loadFromServer, relationships } = useTopologyStore();

  // 加载团队数据
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams`);
      const data = await res.json();
      if (data.success) {
        setTeams(data.data);
      }
    } catch (error) {
      console.error('加载团队失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // 打开新增弹窗
  const openAddModal = () => {
    setModalMode('add');
    setFormData({ ...defaultFormData, relationships: relationships });
    setSelectedTeam(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (team: Team) => {
    setModalMode('edit');
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      avatar: team.avatar || '/avatars/manager.png',
      description: team.description || '',
      memberIds: team.memberIds,
      relationships: team.relationships,
    });
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请填写团队名称');
      return;
    }

    // 获取当前的拓扑关系
    const { getRelationships } = useTopologyStore.getState();
    const currentRelationships = getRelationships();
    console.log('💾 保存团队关系:', currentRelationships);

    // 将当前关系一起保存
    const payload = {
      ...formData,
      relationships: currentRelationships,
    };

    setSubmitting(true);
    try {
      let res;
      if (modalMode === 'add') {
        res = await fetch(`${API_BASE}/api/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/teams/${selectedTeam?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchTeams();
      } else {
        alert(data.error?.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('操作失败');
    }
    setSubmitting(false);
  };

  // 删除团队
  const handleDelete = async (team: Team) => {
    if (!confirm(`确定删除团队 "${team.name}" 吗？`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/teams/${team.id}`, {
        method: 'DELETE',
      });
      if (res.status === 204 || res.ok) {
        fetchTeams();
      } else {
        const data = await res.json();
        alert(data.error?.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 切换团队
  const switchToTeam = async (team: Team) => {
    if (confirm(`切换到团队 "${team.name}" 吗？当前未保存的关系将会丢失。`)) {
      // 保存当前关系到新团队
      try {
        await fetch(`${API_BASE}/api/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '临时保存',
            memberIds: DEFAULT_EMPLOYEES.map(e => e.id),
            relationships: relationships,
          }),
        });
      } catch (e) {
        // ignore
      }
      
      // 加载选中的团队关系
      const { loadRelationships } = useTopologyStore.getState();
      loadRelationships(team.relationships);
      alert(`已切换到团队 "${team.name}"`);
    }
  };

  // 切换成员
  const toggleMember = (employeeId: string) => {
    // 董事长和执行官不能移除
    if (employeeId === 'emp-0' || employeeId === 'emp-exec') return;
    
    const newMembers = formData.memberIds.includes(employeeId)
      ? formData.memberIds.filter(id => id !== employeeId)
      : [...formData.memberIds, employeeId];
    setFormData({ ...formData, memberIds: newMembers });
  };

  const getEmployee = (id: string) => DEFAULT_EMPLOYEES.find(e => e.id === id);

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto', background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}>
      {/* 顶部工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 600,
          background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          团队管理
        </h2>
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
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}
        >
          + 新建团队
        </button>
      </div>

      {/* 团队列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          加载中...
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}></div>
          <div style={{ fontSize: '16px', marginBottom: '8px', color: '#94A3B8' }}>暂无团队</div>
          <div style={{ fontSize: '13px' }}>点击"新建团队"创建第一个团队</div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '16px' 
        }}>
          {teams.map(team => {
            const memberCount = team.memberIds.length;
            const relationshipCount = team.relationships.length;

            return (
              <div
                key={team.id}
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
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    overflow: 'hidden',
                    padding: '4px',
                  }}>
                    <img src={team.avatar || '/avatars/manager.png'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: '#F1F5F9' }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                      {memberCount} 名成员，{relationshipCount} 条关系
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                {team.description && (
                  <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '14px', lineHeight: 1.6 }}>
                    {team.description}
                  </div>
                )}

                {/* 成员预览 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {team.memberIds.slice(0, 6).map(id => {
                    const emp = getEmployee(id);
                    return emp ? (
                      <span key={id} style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#06B6D4',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {emp.avatar && emp.avatar.startsWith('/') ? (
                          <img src={emp.avatar} alt={emp.name} style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                        ) : (
                          <span>{emp.avatar}</span>
                        )}
                        {emp.name}
                      </span>
                    ) : null;
                  })}
                  {team.memberIds.length > 6 && (
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>+{team.memberIds.length - 6}</span>
                  )}
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '14px' }}>
                  <button
                    onClick={() => switchToTeam(team)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    切换到此团队
                  </button>
                  <button
                    onClick={() => openEditModal(team)}
                    style={{
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                      color: '#A78BFA',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    编辑
                  </button>
                  {team.name !== '默认团队' && (
                    <button
                      onClick={() => handleDelete(team)}
                      style={{
                        padding: '10px 14px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                        color: '#F87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        fontSize: '13px',
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
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '22px', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {modalMode === 'add' ? '新建团队' : '编辑团队'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 团队名称 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  团队名称 <span style={{ color: '#EF4444' }}>*</span>
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

              {/* 团队头像选择 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  团队头像
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {['/avatars/superadmin.png', '/avatars/executor.png', '/avatars/manager.png', '/avatars/developer.png', '/avatars/designer.png', '/avatars/ai1.svg', '/avatars/ai2.svg', '/avatars/ai3.svg'].map(avatar => (
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
              </div>

              {/* 描述 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    resize: 'vertical',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 成员选择 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
                  团队成员 <span style={{ color: '#EF4444' }}>*（董事长和执行官为必选）</span>
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                }}>
                  {DEFAULT_EMPLOYEES.map(emp => {
                    const isSelected = formData.memberIds.includes(emp.id);
                    const isRequired = emp.id === 'emp-0' || emp.id === 'emp-exec';
                    
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: isSelected 
                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)'
                            : 'rgba(30, 41, 59, 0.5)',
                          border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.5)' : 'rgba(148, 163, 184, 0.2)'}`,
                          cursor: isRequired ? 'default' : 'pointer',
                          opacity: isRequired ? 0.8 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {emp.avatar && emp.avatar.startsWith('/') ? (
                            <img src={emp.avatar} alt={emp.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ fontSize: '18px' }}>{emp.avatar}</span>
                          )}
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#F1F5F9' }}>{emp.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          {isRequired ? '（必选）' : emp.roleName || emp.type}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
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
