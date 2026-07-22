import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api';
import TopBar from '../components/TopBar';
import SidePanel from '../components/SidePanel';
import GanttChart from '../components/GanttChart';
import TaskDrawer from '../components/TaskDrawer';

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  useEffect(() => {
    api.getProjects().then((data) => {
      setProject(data.projects.find((p) => p.id === id));
    });
    api.getTasks(id).then((data) => {
      setTasks(data.tasks);
    });
  }, [id]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setDrawerOpen(true);
  };

  const handleTaskSave = async (taskData) => {
    if (selectedTask) {
      await api.updateTask(selectedTask.id, taskData);
    } else {
      await api.createTask(id, taskData);
    }
    const data = await api.getTasks(id);
    setTasks(data.tasks);
    setDrawerOpen(false);
  };

  const handleTaskDelete = async () => {
    if (!selectedTask || !confirm('Delete this task?')) return;
    await api.deleteTask(selectedTask.id);
    const data = await api.getTasks(id);
    setTasks(data.tasks);
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  if (!project) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        project={project}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
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
            onDateChange={async (task, start, end) => {
              await api.updateTask(task.id, { start, end });
            }}
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
