// 团队拓扑页面
// 功能：将开发中...

export default function TeamTopology() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      flexDirection: 'column',
      color: '#64748B',
      background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
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
        color: '#E2E8F0'
      }}>
        团队拓扑
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: '#64748B',
        padding: '8px 20px',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '20px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}>
        功能开发中...
      </div>
    </div>
  );
}
