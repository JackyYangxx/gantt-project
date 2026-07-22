import { useNavigate } from 'react-router-dom';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel, onlineUsers = [], connected = false }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5', height: 48
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 16 }}>&larr;</button>
        <button onClick={onToggleSidePanel} style={{ padding: '4px 8px', fontSize: 12 }}>
          {sidePanelOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#059669' : '#DC2626', display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
          {onlineUsers.length} online
        </span>
        {onlineUsers.map((u) => (
          <span key={u.clientId} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, display: 'inline-block' }} />
            {u.username}
          </span>
        ))}
      </div>
    </div>
  );
}
