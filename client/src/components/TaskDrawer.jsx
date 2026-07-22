import TaskForm from './TaskForm';

export default function TaskDrawer({ task, onSave, onDelete, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
      background: '#fff', boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      zIndex: 100, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #e5e5e5'
      }}>
        <h3 style={{ fontSize: 16 }}>{task ? 'Edit Task' : 'New Task'}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20 }}>&times;</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <TaskForm task={task} onSave={onSave} />
      </div>
      {task && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e5' }}>
          <button onClick={onDelete}
            style={{ width: '100%', padding: '8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 4 }}>
            Delete Task
          </button>
        </div>
      )}
    </div>
  );
}
