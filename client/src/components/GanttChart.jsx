import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';

export default function GanttChart({ tasks, onTaskClick, onDateChange }) {
  const containerRef = useRef(null);
  const ganttRef = useRef(null);
  const prevTaskIdsRef = useRef('');

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const currentIds = tasks.map((t) => t.id).sort().join(',');

    if (ganttRef.current) {
      if (currentIds !== prevTaskIdsRef.current) {
        ganttRef.current.refresh(tasks);
        prevTaskIdsRef.current = currentIds;
      }
      return;
    }

    const ganttTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      dependencies: (t.dependencies || []).join(', '),
    }));

    ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
      view_mode: 'Day',
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
        return `<div style="padding:8px"><strong>${task.name}</strong><br/>${task.start} → ${task.end}<br/>Progress: ${task.progress}%</div>`;
      },
    });

    prevTaskIdsRef.current = currentIds;

    return () => {
      ganttRef.current = null;
    };
  }, [tasks]);

  return (
    <div style={{ padding: 16, height: '100%' }}>
      <svg ref={containerRef} id="gantt-container" style={{ width: '100%' }} />
    </div>
  );
}
