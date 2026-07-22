import TaskTree from './TaskTree';

export default function SidePanel({ tasks, onTaskClick, onAddTask }) {
  return (
    <div style={{
      width: 320, background: '#fff', borderRight: '1px solid #e5e5e5',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Tasks</span>
        <button onClick={onAddTask} style={{ padding: '2px 8px', fontSize: 12, background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>
          + Add
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <TaskTree tasks={tasks} onTaskClick={onTaskClick} />
      </div>
    </div>
  );
}
