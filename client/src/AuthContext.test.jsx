import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token', user: { id: '1', username: 'testuser', color: '#4F46E5' } }),
    });
  });

  const wrapper = ({ children }) => React.createElement(AuthProvider, null, children);

  it('provides null user when not logged in', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('login sets user and stores token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.user).toEqual({ id: '1', username: 'testuser', color: '#4F46E5' });
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: '1', username: 'testuser', color: '#4F46E5' }));
  });

  it('register sets user and stores token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register('newuser', 'password');
    });

    expect(result.current.user).toEqual({ id: '1', username: 'testuser', color: '#4F46E5' });
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('logout clears user and storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('token', 'saved-token');
    localStorage.setItem('user', JSON.stringify({ id: '2', username: 'saved', color: '#059669' }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual({ id: '2', username: 'saved', color: '#059669' });
  });

  it('useAuth throws when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be inside AuthProvider');

    spy.mockRestore();
  });
});
