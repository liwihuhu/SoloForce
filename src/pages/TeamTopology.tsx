// 命令链路页面
// 功能：将开发中...

export default function TeamTopology() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      flexDirection: 'column',
      color: 'var(--text-muted)',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div style={{ 
        fontSize: '80px', 
        marginBottom: '24px',
        opacity: 0.3,
      }}></div>
      <div style={{ 
        fontSize: '22px', 
        fontWeight: 500, 
        marginBottom: '12px',
        color: 'var(--text-primary)'
      }}>
        命令链路
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: 'var(--text-muted)',
        padding: '8px 20px',
        background: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border-default)',
      }}>
        功能开发中...
      </div>
    </div>
  );
}
