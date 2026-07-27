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
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ganttTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      color: t.color,
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

    // --- Color progress bars ---
    tasks.forEach((t) => {
      const wrapper = el.querySelector(`.bar-wrapper[data-id="${t.id}"]`);
      if (!wrapper) return;
      const bar = wrapper.querySelector('.bar');
      if (bar) bar.style.fill = '#e2e8f0';
      const prog = wrapper.querySelector('.bar-progress');
      if (!prog) return;
      if (t.color) prog.style.fill = t.color;
      else if (t.progress >= 100) prog.style.fill = '#059669';
      else if (t.progress > 0) prog.style.fill = '#D97706';
    });

    const cleanups = [];

    // --- Disable built-in popup; show custom popup on task name click ---
    if (ganttRef.current) ganttRef.current.show_popup = () => {};

    ganttTasks.forEach((t) => {
      const wrapper = el.querySelector(`.bar-wrapper[data-id="${t.id}"]`);
      if (!wrapper) return;
      const text = wrapper.querySelector('text');
      if (!text) return;
      text.style.cursor = 'pointer';
      const handler = (e) => {
        e.stopPropagation();
        const r = wrapper.getBoundingClientRect();
        setPopup({ task: t, x: r.right + 12, y: r.top - 8 });
      };
      text.addEventListener('click', handler);
      cleanups.push(() => {
        text.removeEventListener('click', handler);
        text.style.cursor = '';
      });
    });

    // --- Drag-to-pan (no scrollbar needed) ---
    const scrollEl = el.querySelector('.gantt-container');
    if (scrollEl) {
      const state = { isDown: false, startX: 0, scrollLeft: 0 };

      const onDown = (e) => {
        if (e.button !== 0) return;
        // Don't intercept clicks on task bars, handles, or popups
        if (e.target.closest('.bar-wrapper, .popup-wrapper, .handle')) return;
        state.isDown = true;
        state.startX = e.clientX;
        state.scrollLeft = scrollEl.scrollLeft;
        scrollEl.style.cursor = 'grabbing';
        scrollEl.style.userSelect = 'none';
      };
      const onMove = (e) => {
        if (!state.isDown) return;
        e.preventDefault();
        scrollEl.scrollLeft = state.scrollLeft - (e.clientX - state.startX);
      };
      const onUp = () => {
        state.isDown = false;
        scrollEl.style.cursor = 'grab';
        scrollEl.style.userSelect = '';
      };

      scrollEl.addEventListener('mousedown', onDown);
      scrollEl.addEventListener('mousemove', onMove);
      scrollEl.addEventListener('mouseup', onUp);
      scrollEl.addEventListener('mouseleave', onUp);
      scrollEl.style.cursor = 'grab';

      cleanups.push(() => {
        scrollEl.removeEventListener('mousedown', onDown);
        scrollEl.removeEventListener('mousemove', onMove);
        scrollEl.removeEventListener('mouseup', onUp);
        scrollEl.removeEventListener('mouseleave', onUp);
        scrollEl.style.cursor = '';
        scrollEl.style.userSelect = '';
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
      setPopup(null);
      ganttRef.current = null;
    };
  }, [tasks, viewMode]);

  // --- Close popup on click outside ---
  useEffect(() => {
    if (!popup) return;
    const close = () => setPopup(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [popup]);

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
      <style>{'.gantt .arrow { display: none; }'}</style>
      {popup && (
        <div onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: popup.x, top: popup.y, zIndex: 1000,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            padding: '12px 18px', width: 'auto',
          }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, whiteSpace: 'nowrap' }}>
            {popup.task.name}
          </div>
          <div style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
            {fmt(popup.task.start)} → {fmt(popup.task.end)}
          </div>
          <div style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
            Progress: {popup.task.progress}%
          </div>
        </div>
      )}
    </div>
  );
}
