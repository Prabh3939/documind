import { createContext, useContext, useState } from 'react';
import api from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('dm_user') || 'null'));

  const authenticate = async (mode, body) => {
    const { data } = await api.post(`/auth/${mode}`, body);
    localStorage.setItem('dm_token', data.token);
    localStorage.setItem('dm_user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_user');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, authenticate, logout }}>{children}</AuthCtx.Provider>;
}
