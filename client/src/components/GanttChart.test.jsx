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

  it('renders view mode buttons', () => {
    const { container } = render(React.createElement(GanttChart, {
      tasks: mockTasks,
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    ['Day', 'Week', 'Month'].forEach((mode) => {
      expect(container.textContent).toContain(mode);
    });
  });

  it('renders when tasks are empty', () => {
    const { container } = render(React.createElement(GanttChart, {
      tasks: [],
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });

  it('passes div container to frappe-gantt when tasks are present', () => {
    render(React.createElement(GanttChart, {
      tasks: mockTasks,
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    const args = mocks.GanttMock.mock.calls[0];
    expect(args[0] instanceof HTMLDivElement).toBe(true);
    expect(args[1]).toEqual([
      { id: '1', name: 'Task 1', start: '2026-07-22', end: '2026-07-25', progress: 50, dependencies: '' },
    ]);
  });

  it('does not initialize frappe-gantt when tasks are empty', () => {
    render(React.createElement(GanttChart, {
      tasks: [],
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    expect(mocks.GanttMock).toHaveBeenCalledTimes(0);
  });

  it('passes correct options to frappe-gantt', () => {
    render(React.createElement(GanttChart, {
      tasks: mockTasks,
      onTaskClick: () => {},
      onDateChange: () => {},
    }));
    const options = mocks.GanttMock.mock.calls[0][2];
    expect(options.view_mode).toBe('Day');
    expect(options.date_format).toBe('YYYY-MM-DD');
  });
});
