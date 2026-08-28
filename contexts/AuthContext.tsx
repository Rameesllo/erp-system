"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const DEFAULT_USER: AuthUser = {
  id: "admin-default",
  name: "System Admin",
  email: "admin@erpsystem.com",
  role: "ADMIN",
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  loading: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_USER);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          return;
        }
      }
    } catch {}
    setUser(DEFAULT_USER);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(DEFAULT_USER);
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

