import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar';
import React from 'react';

describe('TopBar', () => {
  const baseProps = {
    project: { id: '1', name: 'Test Project' },
    sidePanelOpen: true,
    onToggleSidePanel: () => {},
    onlineUsers: [],
    connected: false,
  };

  const renderWithRouter = (ui) => {
    return render(React.createElement(MemoryRouter, null, ui));
  };

  it('renders project name', () => {
    renderWithRouter(React.createElement(TopBar, baseProps));
    expect(screen.getByText('Test Project')).toBeTruthy();
  });

  it('shows "Hide Tasks" when side panel is open', () => {
    renderWithRouter(React.createElement(TopBar, { ...baseProps, sidePanelOpen: true }));
    expect(screen.getByText('Hide Tasks')).toBeTruthy();
  });

  it('shows "Show Tasks" when side panel is closed', () => {
    renderWithRouter(React.createElement(TopBar, { ...baseProps, sidePanelOpen: false }));
    expect(screen.getByText('Show Tasks')).toBeTruthy();
  });

  it('calls onToggleSidePanel when toggle button clicked', () => {
    const handleToggle = vi.fn();
    renderWithRouter(React.createElement(TopBar, { ...baseProps, onToggleSidePanel: handleToggle }));
    fireEvent.click(screen.getByText('Hide Tasks'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('shows connected indicator when connected', () => {
    const { container } = renderWithRouter(
      React.createElement(TopBar, { ...baseProps, connected: true })
    );
    const dots = container.querySelectorAll('span[style*="border-radius: 50%"]');
    const statusDot = Array.from(dots).find(dot => dot.style.background === 'rgb(5, 150, 105)');
    expect(statusDot).toBeTruthy();
  });

  it('shows disconnected indicator when not connected', () => {
    const { container } = renderWithRouter(
      React.createElement(TopBar, { ...baseProps, connected: false })
    );
    const dots = container.querySelectorAll('span[style*="border-radius: 50%"]');
    const statusDot = Array.from(dots).find(dot => dot.style.background === 'rgb(220, 38, 38)');
    expect(statusDot).toBeTruthy();
  });

  it('shows online user count', () => {
    renderWithRouter(React.createElement(TopBar, { ...baseProps, connected: true }));
    expect(screen.getByText('0 online')).toBeTruthy();
  });

  it('shows online users with colors', () => {
    const users = [
      { clientId: 1, username: 'Alice', color: '#4F46E5' },
      { clientId: 2, username: 'Bob', color: '#059669' },
    ];

    renderWithRouter(React.createElement(TopBar, { ...baseProps, onlineUsers: users, connected: true }));

    expect(screen.getByText('2 online')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('renders export PNG button', () => {
    renderWithRouter(React.createElement(TopBar, baseProps));
    expect(screen.getByText('Export PNG')).toBeTruthy();
  });

  it('renders back navigation button', () => {
    renderWithRouter(React.createElement(TopBar, baseProps));
    const backButton = screen.getByText('←');
    expect(backButton).toBeTruthy();
  });
});
