"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  api,
  ApiError,
  clearToken,
  getToken,
  setTokens,
  type RegisterInput,
  type User,
} from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContext extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContext | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const initialized = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = getToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }

    api.auth
      .me()
      .then((user) => setState({ user, loading: false }))
      .catch((err) => {
        // 401 means token is expired/invalid — clear it silently
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
        }
        setState({ user: null, loading: false });
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.auth.login({ username: email, password });
      setTokens(tokens);

      const user = await api.auth.me();
      setState({ user, loading: false });

      router.push("/dashboard");
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      await api.auth.register(data);
      // Auto-login after registration
      const tokens = await api.auth.login({
        username: data.email,
        password: data.password,
      });
      setTokens(tokens);

      const user = await api.auth.me();
      setState({ user, loading: false });

      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, loading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContext {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
