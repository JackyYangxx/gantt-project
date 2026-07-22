import { useState, useEffect } from 'react';

export function useAwareness(providerRef) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    const updateAwareness = () => {
      const states = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) {
          states.push({ clientId, ...state.user });
        }
      });
      setOnlineUsers(states);
    };

    provider.awareness.on('change', updateAwareness);
    return () => provider.awareness.off('change', updateAwareness);
  }, [providerRef]);

  const setLocalState = (state) => {
    const provider = providerRef.current;
    if (provider) {
      provider.awareness.setLocalStateField('user', state);
    }
  };

  return { onlineUsers, setLocalState };
}
