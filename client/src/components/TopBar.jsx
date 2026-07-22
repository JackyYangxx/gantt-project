import { useNavigate } from 'react-router-dom';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel }) {
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
        {/* Online users will go here in Task 13 */}
      </div>
    </div>
  );
}
