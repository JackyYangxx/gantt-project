import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState('');
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const loadUsers = useCallback(async () => {
    const data = await api.getUsers();
    setUsers(data.users);
  }, []);

  const loadProjects = useCallback(async () => {
    const data = await api.getAllProjects();
    setAllProjects(data.projects);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUsername, newPassword, selectedProjectIds);
      setNewUsername('');
      setNewPassword('');
      setSelectedProjectIds([]);
      setMessage('User created');
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleChangePassword = async (id) => {
    if (!editValue || editValue.length < 4) {
      setMessage('Password must be at least 4 characters');
      return;
    }
    try {
      await api.updateUserPassword(id, editValue);
      setEditing(null);
      setEditValue('');
      setMessage('Password updated');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleChangeRole = async (id, role) => {
    try {
      await api.updateUserRole(id, role);
      setMessage('Role updated');
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
        <p style={{ color: '#DC2626' }}>Access denied. Admin only.</p>
        <button onClick={() => navigate('/')} style={{ padding: '4px 12px', marginTop: 12 }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Account Management</h1>
        <button onClick={() => navigate('/')} style={{ padding: '4px 12px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Back</button>
      </div>

      {message && (
        <p style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 4, marginBottom: 16, fontSize: 14 }}>{message}</p>
      )}

      {/* Create user form */}
      <div style={{ marginBottom: 24, padding: 16, background: '#fff', borderRadius: 8 }}>
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Create Account</h3>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Username</label>
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, width: 200 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, width: 200 }} />
            </div>
            <button type="submit" style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4 }}>Create</button>
          </div>
          {allProjects.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#666' }}>Project Permissions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allProjects.map((p) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedProjectIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIds([...selectedProjectIds, p.id]);
                        } else {
                          setSelectedProjectIds(selectedProjectIds.filter(id => id !== p.id));
                        }
                      }} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 160px 200px', gap: 8, padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: 12, color: '#999', fontWeight: 600 }}>
          <span>Username</span>
          <span>Role</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 160px 200px', gap: 8, padding: '10px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 13, alignItems: 'center' }}>
            <span>{u.username} {u.id === user.id && <span style={{ color: '#999', fontSize: 11 }}>(you)</span>}</span>
            <span style={{ fontSize: 12 }}>
              <select value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value)}
                style={{ padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3, fontSize: 12 }}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </span>
            <span style={{ color: '#999', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</span>
            <span>
              {editing === u.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="password" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    placeholder="New password" style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 3, fontSize: 12, width: 120 }} />
                  <button onClick={() => handleChangePassword(u.id)} style={{ padding: '4px 8px', fontSize: 11, background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 3 }}>Save</button>
                  <button onClick={() => setEditing(null)} style={{ padding: '4px 8px', fontSize: 11, background: '#fff', border: '1px solid #ddd', borderRadius: 3 }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setEditing(u.id); setEditValue(''); }} style={{ padding: '4px 8px', fontSize: 11, background: '#fff', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer' }}>
                  Change Password
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
