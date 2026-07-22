export default function TaskRow({ task, depth, onClick }) {
  const progressColor = task.progress >= 100 ? '#059669' : task.progress > 0 ? '#D97706' : '#999';

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        paddingLeft: 12 + depth * 20, borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer', fontSize: 13,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: progressColor
      }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.name}
      </span>
      <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>
        {task.progress}%
      </span>
    </div>
  );
}
