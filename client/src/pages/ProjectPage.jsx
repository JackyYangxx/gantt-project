import { useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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

  if (!project) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        project={project}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
        onlineUsers={onlineUsers}
        connected={connected}
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
