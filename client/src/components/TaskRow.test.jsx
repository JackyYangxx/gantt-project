import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from './TaskRow';
import React from 'react';

describe('TaskRow', () => {
  const baseTask = { id: '1', name: 'Test Task', progress: 0, parent_id: null, sort_order: 0 };

  it('renders task name', () => {
    render(React.createElement(TaskRow, { task: baseTask, depth: 0, onClick: () => {} }));
    expect(screen.getByText('Test Task')).toBeTruthy();
  });

  it('renders progress percentage', () => {
    render(React.createElement(TaskRow, { task: { ...baseTask, progress: 75 }, depth: 0, onClick: () => {} }));
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('shows green dot for completed tasks', () => {
    const { container } = render(
      React.createElement(TaskRow, { task: { ...baseTask, progress: 100 }, depth: 0, onClick: () => {} })
    );
    const dot = container.querySelector('span');
    expect(dot.style.background).toBe('rgb(5, 150, 105)'); // #059669
  });

  it('shows amber dot for in-progress tasks', () => {
    const { container } = render(
      React.createElement(TaskRow, { task: { ...baseTask, progress: 50 }, depth: 0, onClick: () => {} })
    );
    const dot = container.querySelector('span');
    expect(dot.style.background).toBe('rgb(217, 119, 6)'); // #D97706
  });

  it('shows gray dot for 0% progress', () => {
    const { container } = render(
      React.createElement(TaskRow, { task: { ...baseTask, progress: 0 }, depth: 0, onClick: () => {} })
    );
    const dot = container.querySelector('span');
    expect(dot.style.background).toBe('rgb(153, 153, 153)'); // #999
  });

  it('applies depth-based left padding', () => {
    const { container } = render(
      React.createElement(TaskRow, { task: baseTask, depth: 2, onClick: () => {} })
    );
    const row = container.firstChild;
    expect(row.style.paddingLeft).toBe('52px'); // 12 + 2 * 20
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      React.createElement(TaskRow, { task: baseTask, depth: 0, onClick: handleClick })
    );
    fireEvent.click(container.firstChild);
    expect(handleClick).toHaveBeenCalledWith(baseTask);
  });
});
