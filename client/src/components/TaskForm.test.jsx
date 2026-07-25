import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskForm from './TaskForm';
import React from 'react';

describe('TaskForm', () => {
  it('renders create mode when no task provided', () => {
    render(React.createElement(TaskForm, { task: null, onSave: () => {} }));
    expect(screen.getByText('Create Task')).toBeTruthy();
  });

  it('renders update mode when task provided', () => {
    const task = { id: '1', name: 'Existing', start: '2026-07-22', end: '2026-07-25', progress: 50, dependencies: [], color: '#4F46E5' };
    render(React.createElement(TaskForm, { task, onSave: () => {} }));
    expect(screen.getByText('Update Task')).toBeTruthy();
  });

  it('pre-fills form fields from task', () => {
    const task = { id: '1', name: 'My Task', start: '2026-07-22', end: '2026-07-25', progress: 75, dependencies: ['dep-1', 'dep-2'], color: '#DC2626' };
    render(React.createElement(TaskForm, { task, onSave: () => {} }));

    expect(screen.getByDisplayValue('My Task')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-07-22')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-07-25')).toBeTruthy();
    expect(screen.getByDisplayValue('dep-1, dep-2')).toBeTruthy();
  });

  it('calls onSave with form data on submit', () => {
    const handleSave = vi.fn();
    const { container } = render(React.createElement(TaskForm, { task: null, onSave: handleSave }));

    const nameInput = container.querySelector('input[required]');
    fireEvent.change(nameInput, { target: { value: 'New Task' } });

    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Task',
      progress: 0,
      color: '#4F46E5',
      dependencies: [],
    }));
  });

  it('parses comma-separated dependencies', () => {
    const handleSave = vi.fn();
    const task = { id: '1', name: 'Task', start: '2026-07-22', end: '2026-07-25', progress: 0, dependencies: [], color: '#4F46E5' };
    render(React.createElement(TaskForm, { task, onSave: handleSave }));

    const depsInput = screen.getByPlaceholderText('e.g. task-id-1, task-id-2');
    fireEvent.change(depsInput, { target: { value: 'id-1, id-2 , id-3' } });

    fireEvent.click(screen.getByText('Update Task'));

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      dependencies: ['id-1', 'id-2', 'id-3'],
    }));
  });

  it('requires task name', () => {
    const { container } = render(React.createElement(TaskForm, { task: null, onSave: () => {} }));
    const nameInput = container.querySelector('input[required]');
    expect(nameInput).toBeTruthy();
  });

  it('submits progress value when slider is changed', () => {
    const handleSave = vi.fn();
    render(React.createElement(TaskForm, { task: null, onSave: handleSave }));

    const slider = document.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: '75' } });

    const nameInput = document.querySelector('input[required]');
    fireEvent.change(nameInput, { target: { value: 'Progress Task' } });

    fireEvent.click(screen.getByText('Create Task'));

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Progress Task',
      progress: 75,
    }));
  });

  it('submits progress update with new value', () => {
    const handleSave = vi.fn();
    const task = { id: '1', name: 'Task', start: '2026-07-22', end: '2026-07-25', progress: 50, dependencies: [], color: '#4F46E5' };
    render(React.createElement(TaskForm, { task, onSave: handleSave }));

    const slider = document.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: '100' } });

    fireEvent.click(screen.getByText('Update Task'));

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Task',
      progress: 100,
    }));
  });

  it('submits progress 0 correctly', () => {
    const handleSave = vi.fn();
    const task = { id: '1', name: 'Task', start: '2026-07-22', end: '2026-07-25', progress: 0, dependencies: [], color: '#4F46E5' };
    render(React.createElement(TaskForm, { task, onSave: handleSave }));

    const slider = document.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: '0' } });

    fireEvent.click(screen.getByText('Update Task'));

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      progress: 0,
    }));
  });

  it('pre-fills progress from task data', () => {
    const task = { id: '1', name: 'Task', start: '2026-07-22', end: '2026-07-25', progress: 42, dependencies: [], color: '#4F46E5' };
    render(React.createElement(TaskForm, { task, onSave: () => {} }));
    const slider = document.querySelector('input[type="range"]');
    expect(slider.value).toBe('42');
  });
});
