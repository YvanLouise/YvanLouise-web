import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { adminLogin, adminLogout, getAdminMe } from "../lib/api";
import { AdminCredentials } from "../types";

interface AuthContextValue {
  loading: boolean;
  isAuthenticated: boolean;
  username?: string;
  login: (credentials: AdminCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const me = await getAdminMe();
      setIsAuthenticated(me.authenticated);
      setUsername(me.username);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (credentials: AdminCredentials) => {
    await adminLogin(credentials);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setUsername(undefined);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      isAuthenticated,
      username,
      login,
      logout,
      refresh
    }),
    [isAuthenticated, loading, login, logout, refresh, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}