"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  isDemo: boolean;
  setDemoMode: (val: boolean) => void;
  firebaseReady: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isDemo: true,
  setDemoMode: () => {},
  firebaseReady: false,
  darkMode: false,
  toggleDarkMode: () => {},
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
  const [isDemo, setIsDemo] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("pulse_theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        setIsDemo(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        window.localStorage.setItem("pulse_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        window.localStorage.setItem("pulse_theme", "light");
      }
      return next;
    });
  };

  const setDemoMode = (val: boolean) => {
    setIsDemo(val);
    queryClient.invalidateQueries();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          loading,
          isDemo,
          setDemoMode,
          firebaseReady,
          darkMode,
          toggleDarkMode,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
