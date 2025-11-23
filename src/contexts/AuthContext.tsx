import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAuthToken, getAuthToken } from '../lib/api';

interface User {
  id: string;
  name: string;
  nis: string;
  email: string;
  roles: string[];
  commission_id: string | null;
  class: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isGrader: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const token = getAuthToken();
      if (token) {
        const userData = await api.auth.me();
        const roles = typeof userData.roles === 'string' ? JSON.parse(userData.roles) : userData.roles;
        setUser({
          ...userData,
          roles,
        });
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const response = await api.auth.login(email, password);
    setAuthToken(response.access_token);
    const roles = typeof response.user.roles === 'string' ? JSON.parse(response.user.roles) : response.user.roles;
    setUser({
      ...response.user,
      roles,
    });
  }

  async function signOut() {
    setAuthToken(null);
    setUser(null);
  }

  const isAdmin = user?.roles?.includes('admin') || false;
  const isGrader = user?.roles?.includes('grader') || user?.roles?.includes('admin') || false;

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, isGrader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
