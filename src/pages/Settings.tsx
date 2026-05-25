import { useState } from 'react';

const API_BASE = 'http://localhost:5301';

// LLM 配置接口
export interface LLMConfig {
  id: string;
  name: string;
  provider: 'siliconflow' | 'openai' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

// 默认 LLM 配置
const defaultLLMConfigs: LLMConfig[] = [
  {
    id: 'siliconflow-default',
    name: '硅基流动 (SiliconFlow)',
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    enabled: true,
  },
];

export default function Settings() {
  const [openclawConfig, setOpenclawConfig] = useState({
    endpoint: localStorage.getItem('openclaw_endpoint') || 'http://127.0.0.1:18789',
    token: localStorage.getItem('openclaw_token') || '',
    agentId: localStorage.getItem('openclaw_agent_id') || 'main',
  });

  // LLM 配置状态
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>(() => {
    const saved = localStorage.getItem('llm_configs');
    return saved ? JSON.parse(saved) : defaultLLMConfigs;
  });
  const [editingLLM, setEditingLLM] = useState<LLMConfig | null>(null);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  return (
    <div style={{ 
      padding: '24px', 
      height: '100%', 
      overflow: 'auto', 
      background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' 
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: 600, 
        marginBottom: '24px',
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        设置
      </h2>

      {/* OpenClaw API 配置 */}
      <div>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: 'var(--text-primary)',
          marginBottom: '16px' 
        }}>
          OpenClaw API 配置
        </h3>
        
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-primary) 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          maxWidth: '600px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* API 端点 */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
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
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* API Token */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
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
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Agent ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
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
                  color: 'var(--text-primary)',
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
                  background: 'linear-gradient(135deg, var(--accent) 0%, #0891B2 100%)',
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
                  color: testing ? 'var(--text-secondary)' : 'var(--accent)',
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
                color: testResult.success ? 'var(--success)' : '#F87171',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 大模型 API 配置 */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: 'var(--text-primary)',
          marginBottom: '16px' 
        }}>
          大模型 API 配置
        </h3>
        
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-primary) 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          maxWidth: '700px',
        }}>
          {/* 已有配置列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {llmConfigs.map(config => (
              <div key={config.id} style={{
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: config.enabled ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: config.enabled 
                      ? 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)' 
                      : 'rgba(100, 116, 139, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {config.provider === 'siliconflow' ? '💧' : config.provider === 'openai' ? '🤖' : '🔧'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {config.name}
                      {config.enabled && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--success)',
                          borderRadius: '10px',
                        }}>
                          已启用
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {config.model} • {config.baseUrl}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setEditingLLM(config); setShowLLMModal(true); }}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      const updated = llmConfigs.map(c => 
                        c.id === config.id ? { ...c, enabled: !c.enabled } : c
                      );
                      setLLMConfigs(updated);
                      localStorage.setItem('llm_configs', JSON.stringify(updated));
                    }}
                    style={{
                      padding: '6px 12px',
                      background: config.enabled 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : 'rgba(16, 185, 129, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      color: config.enabled ? '#F87171' : 'var(--success)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {config.enabled ? '禁用' : '启用'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 添加按钮 */}
          <button
            onClick={() => { setEditingLLM(null); setShowLLMModal(true); }}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
              border: '1px dashed rgba(6, 182, 212, 0.5)',
              borderRadius: '10px',
              color: 'var(--accent)',
              fontSize: '13px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + 添加大模型配置
          </button>
        </div>
      </div>

      {/* LLM 配置弹窗 */}
      {showLLMModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '480px',
            maxWidth: '90vw',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
              {editingLLM ? '编辑大模型配置' : '添加大模型配置'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 提供者 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  提供者
                </label>
                <select
                  value={editingLLM?.provider || 'siliconflow'}
                  onChange={e => setEditingLLM(editingLLM ? { ...editingLLM, provider: e.target.value as any } : null as any)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {/* 名称 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  配置名称
                </label>
                <input
                  type="text"
                  value={editingLLM?.name || ''}
                  onChange={e => setEditingLLM(editingLLM ? { ...editingLLM, name: e.target.value } : null as any)}
                  placeholder="例如：硅基流动 Qwen-7B"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Base URL */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  API Base URL
                </label>
                <input
                  type="text"
                  value={editingLLM?.baseUrl || ''}
                  onChange={e => setEditingLLM(editingLLM ? { ...editingLLM, baseUrl: e.target.value } : null as any)}
                  placeholder="https://api.siliconflow.cn/v1"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={editingLLM?.apiKey || ''}
                  onChange={e => setEditingLLM(editingLLM ? { ...editingLLM, apiKey: e.target.value } : null as any)}
                  placeholder="输入 API Key"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 模型 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  模型名称
                </label>
                <input
                  type="text"
                  value={editingLLM?.model || ''}
                  onChange={e => setEditingLLM(editingLLM ? { ...editingLLM, model: e.target.value } : null as any)}
                  placeholder="Qwen/Qwen2.5-7B-Instruct"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowLLMModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: 'rgba(100, 116, 139, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!editingLLM?.name || !editingLLM?.baseUrl || !editingLLM?.apiKey || !editingLLM?.model) {
                    alert('请填写完整信息');
                    return;
                  }
                  const newConfig = {
                    ...editingLLM,
                    id: editingLLM?.id || `llm-${Date.now()}`,
                  };
                  const updated = editingLLM?.id 
                    ? llmConfigs.map(c => c.id === editingLLM!.id ? newConfig : c)
                    : [...llmConfigs, newConfig];
                  setLLMConfigs(updated);
                  localStorage.setItem('llm_configs', JSON.stringify(updated));
                  setShowLLMModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 数据导入/导出 */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: 'var(--text-primary)',
          marginBottom: '16px' 
        }}>
          数据管理
        </h3>
        
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-primary) 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          maxWidth: '600px',
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
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            导出将下载所有员工、团队、关系、任务历史数据。导入将覆盖现有数据。
          </p>
        </div>
      </div>
    </div>
  );
}
