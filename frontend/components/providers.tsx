"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { getFirebaseAuth, isFirebaseConfigured, signOutUser } from "@/lib/firebase";

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  firebaseReady: boolean;
  sessionError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  firebaseReady: false,
  sessionError: null,
  logout: async () => {},
});

export function usePulseAuth() {
  return useContext(AuthContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
          },
        },
      })
  );

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    document.documentElement.classList.remove("dark");

    const auth = getFirebaseAuth();
    if (!auth) {
      setSessionError("Sign-in is temporarily unavailable.");
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(
      auth,
      async (fbUser) => {
        setUser(fbUser);
        setSessionError(null);
        if (fbUser) {
          try {
            await apiFetch("/api/v1/auth/sync", { method: "POST" });
          } catch {
            // Keep auth session active; individual pages surface friendly retry state if offline
          }
        } else {
          queryClient.clear();
        }
        setLoading(false);
      },
      () => {
        setUser(null);
        setSessionError("Your session could not be restored. Please sign in again.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [queryClient]);

  const logout = async () => {
    await signOutUser();
    setUser(null);
    queryClient.clear();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          loading,
          firebaseReady,
          sessionError,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
