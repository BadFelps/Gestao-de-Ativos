import { createContext, useContext, useState, useCallback } from 'react';

const AccessContext = createContext(null);

const PANEL_NAMES = {
  admin: 'Administrativo',
  logistics: 'Logística',
  driver: 'Motorista',
  warehouse: 'Armazém',
  commercial: 'Comercial',
  gerenciais: 'Gerenciais',
};

const STORAGE_KEY = 'renova_access_sessions';

function loadSessions() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function AccessProvider({ children }) {
  const [sessions, setSessions] = useState(() => loadSessions());

  const login = useCallback((panel, operatorName, code, revenda) => {
    setSessions(prev => {
      const updated = { ...prev, [panel]: { operatorName, code, revenda: revenda || null } };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback((panel) => {
    setSessions(prev => {
      const updated = { ...prev };
      delete updated[panel];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getSession = useCallback((panel) => {
    return sessions[panel] || null;
  }, [sessions]);

  return (
    <AccessContext.Provider value={{ sessions, login, logout, getSession, PANEL_NAMES }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used inside AccessProvider');
  return ctx;
}

export { PANEL_NAMES };