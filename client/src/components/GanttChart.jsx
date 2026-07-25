import { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';

function fmt(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const VIEW_MODES = ['Day', 'Week', 'Month'];

export default function GanttChart({ tasks, onTaskClick, onDateChange }) {
  const containerRef = useRef(null);
  const ganttRef = useRef(null);
  const [viewMode, setViewMode] = useState('Day');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ganttTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      dependencies: (t.dependencies || []).join(', '),
    }));

    if (tasks.length === 0) return;

    // Clean previous instance
    if (ganttRef.current) {
      ganttRef.current = null;
    }
    el.innerHTML = '';

    ganttRef.current = new Gantt(el, ganttTasks, {
      view_mode: viewMode,
      bar_height: 30,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 18,
      date_format: 'YYYY-MM-DD',
      language: 'en',
      readonly: false,
      on_click: (task) => onTaskClick(task),
      on_date_change: (task, start, end) => onDateChange(task, start, end),
      custom_popup_html: (task) => {
        return `<div style="padding:8px"><strong>${task.name}</strong><br/>${fmt(task.start)} → ${fmt(task.end)}<br/>Progress: ${task.progress}%</div>`;
      },
    });

    return () => {
      ganttRef.current = null;
    };
  }, [tasks, viewMode]);

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 4 }}>
        {VIEW_MODES.map((mode) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            style={{
              padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4,
              background: viewMode === mode ? '#4F46E5' : '#fff',
              color: viewMode === mode ? '#fff' : '#333',
              fontSize: 12, cursor: 'pointer',
            }}>
            {mode}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}
