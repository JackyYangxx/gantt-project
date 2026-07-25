import { useParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useYjs } from '../hooks/useYjs';
import { useAwareness } from '../hooks/useAwareness';
import TopBar from '../components/TopBar';
import SidePanel from '../components/SidePanel';
import GanttChart from '../components/GanttChart';
import TaskDrawer from '../components/TaskDrawer';

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  const { tasks: tasksMap, connected, updateTask, addTask, deleteTask, provider } = useYjs(id);
  const { onlineUsers, setLocalState } = useAwareness(provider);

  // Set local awareness state
  useEffect(() => {
    if (user) {
      setLocalState({ username: user.username, color: user.color });
    }
  }, [user]);

  useEffect(() => {
    api.getProjects().then((data) => {
      setProject(data.projects.find((p) => p.id === id));
    });
    api.initWS(id);
  }, [id]);

  const tasks = useMemo(() => {
    return Object.values(tasksMap).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [tasksMap]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setDrawerOpen(true);
  };

  const handleTaskSave = (taskData) => {
    if (selectedTask) {
      updateTask(selectedTask.id, taskData);
    } else {
      addTask({
        id: uuid(),
        project_id: id,
        name: taskData.name,
        start: taskData.start,
        end: taskData.end,
        progress: taskData.progress,
        progress_notes: taskData.progress_notes || '',
        dependencies: taskData.dependencies,
        parent_id: null,
        sort_order: tasks.length,
        color: taskData.color,
        assigned_to: null,
        created_by: user.id,
      });
    }
    setDrawerOpen(false);
  };

  const handleTaskDelete = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id);
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleDateChange = (task, start, end) => {
    updateTask(task.id, { start, end });
  };

  const handleExport = useCallback(() => {
    import('xlsx').then((XLSX) => {
      const data = Object.values(tasksMap).map((t) => ({
        name: t.name,
        start: t.start,
        end: t.end,
        progress: t.progress,
        progress_notes: t.progress_notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, `${project?.name || 'project'}-tasks.xlsx`);
    });
  }, [tasksMap, project]);

  const handleDownloadTemplate = useCallback(() => {
    import('xlsx').then((XLSX) => {
      const template = [{
        name: 'Example Task',
        start: new Date().toISOString().slice(0, 10),
        end: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        progress: 50,
        progress_notes: 'In progress, on track',
      }];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, 'gantt-import-template.xlsx');
    });
  }, []);

  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      import('xlsx').then((XLSX) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        let order = Object.values(tasksMap).length;
        for (const row of rows) {
          if (!row.name) continue;
          addTask({
            id: uuid(),
            project_id: id,
            name: String(row.name),
            start: row.start || new Date().toISOString().slice(0, 10),
            end: row.end || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            progress: row.progress != null ? Number(row.progress) : 0,
            progress_notes: row.progress_notes || '',
            dependencies: [],
            parent_id: null,
            sort_order: order++,
            color: '#4F46E5',
            assigned_to: null,
            created_by: user?.id,
          });
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }, [id, tasksMap, addTask, user]);

  if (!project) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        project={project}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
        onlineUsers={onlineUsers}
        connected={connected}
        onImport={handleImport}
        onExport={handleExport}
        onDownloadTemplate={handleDownloadTemplate}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidePanelOpen && (
          <SidePanel
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <GanttChart
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDateChange={handleDateChange}
          />
        </div>
      </div>
      {drawerOpen && (
        <TaskDrawer
          task={selectedTask}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
