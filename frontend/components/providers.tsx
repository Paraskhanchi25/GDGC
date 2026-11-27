"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { getFirebaseAuth, getMissingFirebaseConfig, isFirebaseConfigured, signOutUser } from "@/lib/firebase";

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
  const previousUid = useRef<string | null>(null);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    document.documentElement.classList.remove("dark");

    const auth = getFirebaseAuth();
    if (!auth) {
      // Names only: never log configuration values or backend credentials.
      console.warn(`[PULSE] Google sign-in is disabled. Missing browser build settings: ${getMissingFirebaseConfig().join(", ")}. Supply these as Docker/Coolify build-time variables and rebuild the frontend image.`);
      setSessionError("Sign-in is temporarily unavailable.");
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(
      auth,
      async (fbUser) => {
        if (previousUid.current && fbUser && previousUid.current !== fbUser.uid) {
          // Reset active observers as well as their cached data. Removing them
          // during initial restoration can strand a mounted page in loading.
          void queryClient.resetQueries();
        }
        previousUid.current = fbUser?.uid || null;
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
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
