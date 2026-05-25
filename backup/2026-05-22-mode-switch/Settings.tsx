import { useState } from 'react';

const API_BASE = 'http://localhost:5301';

export default function Settings() {
  const [openclawConfig, setOpenclawConfig] = useState({
    endpoint: localStorage.getItem('openclaw_endpoint') || 'http://127.0.0.1:18789',
    token: localStorage.getItem('openclaw_token') || '',
    agentId: localStorage.getItem('openclaw_agent_id') || 'main',
  });
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
