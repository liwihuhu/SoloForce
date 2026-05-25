import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5301';

interface ModelConfig {
  id: string;
  name: string;
  type: 'llm' | 'image';
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const [llmModels, setLlmModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'llm' as 'llm' | 'image',
    provider: '',
    model: '',
    apiKey: '',
    baseUrl: '',
    enabled: true,
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [openclawConfig, setOpenclawConfig] = useState({
    endpoint: localStorage.getItem('openclaw_endpoint') || 'http://127.0.0.1:18789',
    token: localStorage.getItem('openclaw_token') || '',
    agentId: localStorage.getItem('openclaw_agent_id') || 'main',
  });

  // 加载模型数据
  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/models`);
      const data = await res.json();
      if (data.success) {
        setLlmModels(data.data.filter((m: ModelConfig) => m.type === 'llm'));
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // 打开新增弹窗
  const openAddModal = (type: 'llm' | 'image') => {
    setModalMode('add');
    setFormData({
      name: '',
      type,
      provider: '',
      model: '',
      apiKey: '',
      baseUrl: '',
      enabled: true,
      isDefault: false,
    });
    setSelectedModel(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (model: ModelConfig) => {
    setModalMode('edit');
    setSelectedModel(model);
    setFormData({
      name: model.name,
      type: model.type,
      provider: model.provider,
      model: model.model,
      apiKey: model.apiKey || '',
      baseUrl: model.baseUrl || '',
      enabled: model.enabled,
      isDefault: model.isDefault,
    });
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name || !formData.provider || !formData.model) return;

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await fetch(`${API_BASE}/api/models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else if (selectedModel) {
        await fetch(`${API_BASE}/api/models/${selectedModel.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      fetchModels();
    } catch (error) {
      console.error('保存模型配置失败:', error);
    }
    setSubmitting(false);
  };

  // 删除模型
  const handleDelete = async (model: ModelConfig) => {
    if (!confirm(`确定要删除模型 "${model.name}" 吗？`)) return;

    try {
      await fetch(`${API_BASE}/api/models/${model.id}`, {
        method: 'DELETE',
      });
      fetchModels();
    } catch (error) {
      console.error('删除模型配置失败:', error);
    }
  };

  // 切换启用状态
  const toggleEnabled = async (model: ModelConfig) => {
    try {
      await fetch(`${API_BASE}/api/models/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !model.enabled }),
      });
      fetchModels();
    } catch (error) {
      console.error('更新模型状态失败:', error);
    }
  };

  // 保存 OpenClaw 配置
  const saveOpenclawConfig = () => {
    localStorage.setItem('openclaw_endpoint', openclawConfig.endpoint);
    localStorage.setItem('openclaw_token', openclawConfig.token);
    localStorage.setItem('openclaw_agent_id', openclawConfig.agentId);
    setTestResult({ success: true, message: '配置已保存到浏览器本地存储' });
  };

  // 测试 OpenClaw 连接
  const testOpenclawConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${openclawConfig.endpoint}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openclawConfig.token}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': openclawConfig.agentId,
        },
        body: JSON.stringify({
          model: 'openclaw',
          input: '你好，请回复"连接测试成功"',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.output?.[0]?.content || '';
        setTestResult({ 
          success: true, 
          message: `连接成功！响应内容：${content.slice(0, 100)}` 
        });
      } else {
        const errorData = await response.json();
        setTestResult({ 
          success: false, 
          message: `连接失败：${errorData.error?.message || response.statusText}` 
        });
      }
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: `连接失败：${error.message || '网络错误'}` 
      });
    }

    setTesting(false);
  };

  // 渲染模型列表
  const renderModelList = (models: ModelConfig[], title: string, type: 'llm' | 'image') => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#F1F5F9',
          margin: 0 
        }}>
          {title}
        </h3>
        <button
          onClick={() => openAddModal(type)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
          }}
        >
          + 添加模型
        </button>
      </div>

      {models.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#64748B',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '12px',
        }}>
          暂无配置，点击"添加模型"创建
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {models.map(model => (
            <div
              key={model.id}
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${model.isDefault ? 'rgba(6, 182, 212, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>
                    {model.name}
                  </span>
                  {model.isDefault && (
                    <span style={{
                      padding: '2px 8px',
                      background: 'rgba(6, 182, 212, 0.2)',
                      color: '#06B6D4',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      默认
                    </span>
                  )}
                  {!model.enabled && (
                    <span style={{
                      padding: '2px 8px',
                      background: 'rgba(100, 116, 139, 0.3)',
                      color: '#94A3B8',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      已禁用
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {model.provider} · {model.model}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => toggleEnabled(model)}
                  style={{
                    padding: '6px 12px',
                    background: model.enabled 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(100, 116, 139, 0.2)',
                    color: model.enabled ? '#10B981' : '#94A3B8',
                    border: `1px solid ${model.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {model.enabled ? '已启用' : '已禁用'}
                </button>
                <button
                  onClick={() => openEditModal(model)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#A78BFA',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(model)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#F87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        color: '#64748B',
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      height: '100%', 
      overflow: 'auto', 
      background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' 
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: 600, 
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        模型配置
      </h2>

      {renderModelList(llmModels, '语言模型 (LLM)', 'llm')}

      {/* OpenClaw API 配置 */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#F1F5F9',
          marginBottom: '16px' 
        }}>
          OpenClaw API 配置
        </h3>
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* API 端点 */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                API 端点
              </label>
              <input
                type="text"
                value={openclawConfig.endpoint}
                onChange={e => setOpenclawConfig({ ...openclawConfig, endpoint: e.target.value })}
                placeholder="http://127.0.0.1:18789"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#F1F5F9',
                  outline: 'none',
                }}
              />
            </div>

            {/* API Token */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                API Token
              </label>
              <input
                type="password"
                value={openclawConfig.token}
                onChange={e => setOpenclawConfig({ ...openclawConfig, token: e.target.value })}
                placeholder="输入 API Token"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#F1F5F9',
                  outline: 'none',
                }}
              />
            </div>

            {/* Agent ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                Agent ID
              </label>
              <input
                type="text"
                value={openclawConfig.agentId}
                onChange={e => setOpenclawConfig({ ...openclawConfig, agentId: e.target.value })}
                placeholder="main"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#F1F5F9',
                  outline: 'none',
                }}
              />
            </div>

            {/* 保存按钮 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={saveOpenclawConfig}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                }}
              >
                保存配置
              </button>
              <button
                onClick={testOpenclawConnection}
                disabled={testing}
                style={{
                  padding: '10px 20px',
                  background: testing 
                    ? 'rgba(100, 116, 139, 0.3)' 
                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                  color: testing ? '#94A3B8' : '#A78BFA',
                  border: testing ? 'none' : '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: testing ? 'not-allowed' : 'pointer',
                }}
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
            </div>

            {/* 测试结果 */}
            {testResult && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                background: testResult.success 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : 'rgba(239, 68, 68, 0.15)',
                color: testResult.success ? '#10B981' : '#F87171',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 数据导入/导出 */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#F1F5F9',
          marginBottom: '16px' 
        }}>
          数据管理
        </h3>
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:5301/api/export');
                  const data = await response.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tw-project-backup-${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('导出失败:', error);
                }
              }}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              导出数据
            </button>
            
            <label
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                display: 'inline-block',
              }}
            >
              导入数据
              <input
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    if (!confirm('导入数据将覆盖当前所有数据，确定要继续吗？')) return;
                    
                    const response = await fetch('http://localhost:5301/api/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert('导入成功，请刷新页面');
                    } else {
                      alert('导入失败: ' + result.error);
                    }
                  } catch (error) {
                    console.error('导入失败:', error);
                    alert('导入失败，请检查文件格式');
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '12px' }}>
            导出将下载所有员工、团队、关系、任务历史和模型配置数据。导入将覆盖现有数据。
          </p>
        </div>
      </div>

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
            borderRadius: '16px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px', 
              fontWeight: 600,
              color: '#F1F5F9',
            }}>
              {modalMode === 'add' ? '添加模型' : '编辑模型'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                  模型名称 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：Qwen2.5-7B"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                  提供商 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={e => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="如：硅基流动"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                  模型标识 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                  placeholder="如：Qwen/Qwen2.5-7B-Instruct"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                  API Key（可选）
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="留空则使用默认配置"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                  基础 URL（可选）
                </label>
                <input
                  type="text"
                  value={formData.baseUrl}
                  onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="如：https://api.siliconflow.cn/v1"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#F1F5F9',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#94A3B8' }}>启用</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#94A3B8' }}>设为默认</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(71, 85, 105, 0.3)',
                  color: '#94A3B8',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.name || !formData.provider || !formData.model}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
