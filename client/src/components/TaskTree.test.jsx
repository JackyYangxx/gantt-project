import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskTree from './TaskTree';
import React from 'react';

describe('TaskTree', () => {
  it('renders flat list of tasks', () => {
    const tasks = [
      { id: '1', name: 'Task A', progress: 0, parent_id: null, sort_order: 0 },
      { id: '2', name: 'Task B', progress: 100, parent_id: null, sort_order: 1 },
    ];

    render(React.createElement(TaskTree, { tasks, onTaskClick: () => {} }));

    expect(screen.getByText('Task A')).toBeTruthy();
    expect(screen.getByText('Task B')).toBeTruthy();
  });

  it('renders hierarchical tasks with children', () => {
    const tasks = [
      { id: '1', name: 'Parent', progress: 0, parent_id: null, sort_order: 0 },
      { id: '2', name: 'Child', progress: 50, parent_id: '1', sort_order: 0 },
    ];

    render(React.createElement(TaskTree, { tasks, onTaskClick: () => {} }));

    expect(screen.getByText('Parent')).toBeTruthy();
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('renders empty tree without crashing', () => {
    const { container } = render(
      React.createElement(TaskTree, { tasks: [], onTaskClick: () => {} })
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('sorts tasks by sort_order', () => {
    const tasks = [
      { id: '2', name: 'Second', progress: 0, parent_id: null, sort_order: 1 },
      { id: '1', name: 'First', progress: 0, parent_id: null, sort_order: 0 },
    ];

    const { container } = render(
      React.createElement(TaskTree, { tasks, onTaskClick: () => {} })
    );

    const rows = container.querySelectorAll('[style*="cursor: pointer"]');
    expect(rows[0].textContent).toContain('First');
    expect(rows[1].textContent).toContain('Second');
  });
});
