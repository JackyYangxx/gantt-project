import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function useYjs(projectId) {
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState({});
  const ydocRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const provider = new WebsocketProvider(wsUrl, `project-${projectId}`, ydoc);
    providerRef.current = provider;

    provider.on('status', (event) => {
      setConnected(event.status === 'connected');
    });

    const tasksMap = ydoc.getMap('tasks');

    const updateHandler = () => {
      const result = {};
      tasksMap.forEach((val, key) => {
        const raw = val.toJSON ? val.toJSON() : val;
        result[key] = {
          ...raw,
          dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
        };
      });
      setTasks(result);
    };

    tasksMap.observeDeep(updateHandler);

    // Initial sync
    if (tasksMap.size > 0) {
      updateHandler();
    }

    // Load from REST if empty (first user in room)
    provider.on('sync', (synced) => {
      if (synced && tasksMap.size === 0) {
        import('../api').then(({ api }) => {
          api.getTasks(projectId).then((data) => {
            ydoc.transact(() => {
              for (const t of data.tasks) {
                const yTask = new Y.Map();
                yTask.set('id', t.id);
                yTask.set('project_id', t.project_id);
                yTask.set('name', t.name);
                yTask.set('start', t.start);
                yTask.set('end', t.end);
                yTask.set('progress', t.progress);
                const deps = new Y.Array();
                (t.dependencies || []).forEach((d) => deps.push([d]));
                yTask.set('dependencies', deps);
                yTask.set('parent_id', t.parent_id);
                yTask.set('sort_order', t.sort_order);
                yTask.set('color', t.color);
                yTask.set('progress_notes', t.progress_notes || '');
                yTask.set('assigned_to', t.assigned_to);
                yTask.set('created_by', t.created_by);
                tasksMap.set(t.id, yTask);
              }
            });
          });
        });
      }
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [projectId]);

  const updateTask = (taskId, updates) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    const yTask = tasksMap.get(taskId);
    if (!yTask) return;

    ydocRef.current.transact(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'dependencies' && Array.isArray(value)) {
          const arr = yTask.get('dependencies') || new Y.Array();
          arr.delete(0, arr.length);
          value.forEach((d) => arr.push([d]));
        } else {
          yTask.set(key, value);
        }
      }
    });
  };

  const addTask = (task) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    ydocRef.current.transact(() => {
      const yTask = new Y.Map();
      for (const [k, v] of Object.entries(task)) {
        if (k === 'dependencies') {
          const arr = new Y.Array();
          (v || []).forEach((d) => arr.push([d]));
          yTask.set(k, arr);
        } else {
          yTask.set(k, v);
        }
      }
      tasksMap.set(task.id, yTask);
    });
  };

  const deleteTask = (taskId) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    tasksMap.delete(taskId);
  };

  return { tasks, connected, updateTask, addTask, deleteTask, provider: providerRef };
}
