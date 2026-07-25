import { useState, useMemo } from 'react';

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function TaskForm({ task, onSave }) {
  const [name, setName] = useState(task?.name || '');
  const [start, setStart] = useState(task?.start || new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(task?.end || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [progress, setProgress] = useState(task?.progress || 0);
  const [deps, setDeps] = useState(task?.dependencies?.join(', ') || '');
  const [color, setColor] = useState(task?.color || '#4F46E5');
  const [notes, setNotes] = useState(task?.progress_notes || '');

  const rangeLabel = useMemo(() => {
    const s = fmtDate(start);
    const e = fmtDate(end);
    return s === e ? s : `${s} → ${e}`;
  }, [start, end]);

  const startMonth = useMemo(() => fmtMonth(start), [start]);
  const endMonth = useMemo(() => fmtMonth(end), [end]);
  const sameMonth = startMonth === endMonth;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name, start, end, progress: Number(progress),
      dependencies: deps ? deps.split(',').map((s) => s.trim()).filter(Boolean) : [],
      color, progress_notes: notes,
    });
  };

  const fieldStyle = { marginBottom: 12 };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 };
  const inputStyle = { width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Date Range</label>
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-end',
        }}>
          <div style={{ flex: 1 }}>
            <input style={inputStyle} type="date" value={start}
              onChange={(e) => setStart(e.target.value)} />
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{startMonth}</div>
          </div>
          <span style={{ paddingBottom: 8, color: '#999' }}>→</span>
          <div style={{ flex: 1 }}>
            <input style={inputStyle} type="date" value={end}
              onChange={(e) => setEnd(e.target.value)} />
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{endMonth}</div>
          </div>
        </div>
        <div style={{
          marginTop: 6, padding: '6px 10px', background: sameMonth ? '#f0f4ff' : '#fef3e2',
          borderRadius: 4, fontSize: 13, color: sameMonth ? '#4F46E5' : '#b85c00', textAlign: 'center',
        }}>
          {rangeLabel}
          {!sameMonth && <span style={{ marginLeft: 6 }}>↔ 跨月</span>}
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Progress ({progress}%)</label>
        <input style={{ width: '100%' }} type="range" min="0" max="100" value={progress}
          onChange={(e) => setProgress(e.target.value)} />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Dependencies (comma-separated task IDs)</label>
        <input style={inputStyle} value={deps} onChange={(e) => setDeps(e.target.value)}
          placeholder="e.g. task-id-1, task-id-2" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          style={{ width: 40, height: 30, border: 'none', cursor: 'pointer' }} />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Progress Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter progress details, blockers, or comments..."
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
      <button type="submit"
        style={{ width: '100%', padding: '8px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4, marginTop: 8 }}>
        {task ? 'Update' : 'Create'} Task
      </button>
    </form>
  );
}
