"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { AuthState, AuthUser } from "@/lib/sso/types";

type AuthContextValue = {
  authData: AuthState;
  setAuthData: React.Dispatch<React.SetStateAction<AuthState>>;
  setUser: (user: AuthUser | null) => void;
  requestLogout: () => void;
  requestLoginRedirect: () => void;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  verificandoToken: false,
  deslogar: false,
  redirectLogin: false,
  error: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authData, setAuthData] = useState<AuthState>(initialState);

  const setUser = useCallback((user: AuthUser | null) => {
    setAuthData((prev) => ({
      ...prev,
      user,
      isAuthenticated: Boolean(user),
      verificandoToken: false,
      redirectLogin: false,
      deslogar: false,
      error: null,
    }));
  }, []);

  const requestLogout = useCallback(() => {
    setAuthData((prev) => ({
      ...prev,
      deslogar: true,
    }));
  }, []);

  const requestLoginRedirect = useCallback(() => {
    setAuthData({
      ...initialState,
      redirectLogin: true,
    });
  }, []);

  const value = useMemo(
    () => ({
      authData,
      setAuthData,
      setUser,
      requestLogout,
      requestLoginRedirect,
    }),
    [authData, requestLoginRedirect, requestLogout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
