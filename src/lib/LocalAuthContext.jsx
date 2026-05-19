import React, { createContext, useContext, useState, useEffect } from 'react';

const LocalAuthContext = createContext();

export function LocalAuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('renova_session');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // perfil: 'gestor' | 'vendedor'  — setor: código do vendedor (null para gestor)
  const login = (perfil, setor) => {
    const s = perfil === 'gestor'
      ? { perfil: 'gestor', setor: null }
      : { perfil: 'vendedor', setor: String(setor).trim(), setorNome: String(setor).trim() };
    sessionStorage.setItem('renova_session', JSON.stringify(s));
    setSession(s);
    return s;
  };

  const logout = () => {
    sessionStorage.removeItem('renova_session');
    setSession(null);
  };

  const getSession = () => session;

  const currentSession = session;

  const value = {
    perfil: currentSession?.perfil || null,
    setor: currentSession?.setor || null,
    setorNome: currentSession?.setorNome || null,
    filial: currentSession?.filial || null,
    isGestor: currentSession?.perfil === 'gestor',
    isVendedor: currentSession?.perfil === 'vendedor',
    login,
    logout,
    getSession,
  };

  return <LocalAuthContext.Provider value={value}>{children}</LocalAuthContext.Provider>;
}

export function useLocalAuth() { return useContext(LocalAuthContext); }