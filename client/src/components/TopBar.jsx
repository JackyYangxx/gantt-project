import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel, onlineUsers = [], connected = false, onImport, onExport, onDownloadTemplate }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#fff', height: 48
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onToggleSidePanel} style={{ padding: '4px 8px', fontSize: 12 }}>
          {sidePanelOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 8px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Import</button>
        <button onClick={onDownloadTemplate} style={{ padding: '4px 8px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>导入模板</button>
        <button onClick={onExport} style={{ padding: '4px 8px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Export</button>
        <button onClick={() => navigate('/')} style={{ padding: '4px 12px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Back</button>
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
