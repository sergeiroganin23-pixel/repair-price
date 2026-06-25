import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  role: "admin" | "master";
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

const TOKEN_KEY = "repair_token";

// module-level token для использования в queryClient
let _token: string | null = null;

export function getToken() {
  return _token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Восстанавливаем сессию при загрузке страницы
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      _token = savedToken;
      // Проверяем что токен ещё действителен
      apiRequest("GET", "/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.id) {
            setUser({ id: data.id, role: data.role, displayName: data.displayName });
            setToken(savedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            _token = null;
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          _token = null;
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    _token = newToken;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    // Уведомляем сервер о выходе (удаляем sessionId из БД)
    if (_token) {
      apiRequest("POST", "/api/auth/logout").catch(() => {});
    }
    _token = null;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  // Слушаем глобальное событие "выкинуть из аккаунта" (401 с другого устройства)
  useEffect(() => {
    const handler = () => {
      _token = null;
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
