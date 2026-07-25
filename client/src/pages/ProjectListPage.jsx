import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function ProjectListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [renameOpen, setRenameOpen] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const loadProjects = useCallback(async () => {
    const data = await api.getProjects();
    setProjects(data.projects);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createProject(name);
    setName('');
    setShowCreate(false);
    loadProjects();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await api.deleteProject(id);
      await loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRename = async (projectId) => {
    if (!renameValue.trim()) return;
    try {
      await api.updateProject(projectId, renameValue.trim());
      setRenameOpen(null);
      setRenameValue('');
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>My Projects</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>Logged in as <strong>{user.username}</strong></span>
          {user.role === 'admin' && (
            <button onClick={() => navigate('/a7x9k2m')} style={{ padding: '4px 12px', marginRight: 8 }}>Admin</button>
          )}
          <button onClick={logout} style={{ padding: '4px 12px' }}>Logout</button>
        </div>
      </div>

      <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '8px 16px', marginBottom: 16, background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>
        + New Project
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, marginRight: 8, width: 300 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4 }}>Create</button>
        </form>
      )}

      {projects.length === 0 && <p style={{ color: '#999' }}>No projects yet. Create one to get started.</p>}

      <div style={{ display: 'grid', gap: 12 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ padding: 16, background: '#fff', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/project/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: '#999' }}>
                  {p.members?.length || 0} member(s) · Created {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setRenameOpen(renameOpen === p.id ? null : p.id); setRenameValue(p.name); }}
                  style={{ padding: '4px 8px', fontSize: 12 }}>Rename</button>
                <button onClick={() => handleDelete(p.id)}
                  style={{ padding: '4px 8px', fontSize: 12, color: '#DC2626' }}>Delete</button>
              </div>
            </div>
            {renameOpen === p.id && (
              <div style={{ marginTop: 8, display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="New name"
                  style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, flex: 1 }} />
                <button onClick={() => handleRename(p.id)} style={{ padding: '4px 12px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
