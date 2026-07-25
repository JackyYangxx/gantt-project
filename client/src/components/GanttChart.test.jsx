import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import GanttChart from './GanttChart';
import React from 'react';

const mocks = vi.hoisted(() => {
  const refreshMock = vi.fn();
  return {
    refreshMock,
    GanttMock: vi.fn(() => ({ refresh: refreshMock })),
  };
});

vi.mock('frappe-gantt', () => ({
  default: mocks.GanttMock,
}));

describe('GanttChart', () => {
  const mockTasks = [
    { id: '1', name: 'Task 1', start: '2026-07-22', end: '2026-07-25', progress: 50, dependencies: [], sort_order: 0 },
  ];

  beforeEach(() => {
    mocks.refreshMock.mockClear();
    mocks.GanttMock.mockClear();
  });

  it('renders svg container when tasks are provided', () => {
    const { container } = render(React.createElement(GanttChart, {
      tasks: mockTasks,
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    const svg = container.querySelector('svg#gantt-container');
    expect(svg).toBeTruthy();
  });

  it('renders svg container when tasks are empty', () => {
    const { container } = render(React.createElement(GanttChart, {
      tasks: [],
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    const svg = container.querySelector('svg#gantt-container');
    expect(svg).toBeTruthy();
  });

  it('initializes frappe-gantt when tasks are present', () => {
    render(React.createElement(GanttChart, {
      tasks: mockTasks,
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    expect(mocks.GanttMock).toHaveBeenCalledTimes(1);
  });

  it('does not initialize frappe-gantt when tasks are empty', () => {
    render(React.createElement(GanttChart, {
      tasks: [],
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    expect(mocks.GanttMock).toHaveBeenCalledTimes(0);
  });
});
