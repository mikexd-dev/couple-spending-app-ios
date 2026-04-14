import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isBiometricEnabled } from "./biometric";
import { Database } from "./database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthState =
  | "loading"
  | "unauthenticated"
  | "biometric_locked"
  | "needs_onboarding"
  | "needs_couple"
  | "authenticated";

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  authState: AuthState;
  refreshProfile: () => Promise<void>;
  unlockBiometric: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  authState: "loading",
  refreshProfile: async () => {},
  unlockBiometric: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setAuthState("unauthenticated");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setAuthState("unauthenticated");
        setBiometricUnlocked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [session]);

  async function handleAppStateChange(state: AppStateStatus) {
    if (state === "active" && session) {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(data);
    await resolveAuthState(data);
  }

  async function resolveAuthState(p: Profile | null) {
    if (!p) {
      setAuthState("unauthenticated");
      return;
    }

    const bioEnabled = await isBiometricEnabled();
    if (bioEnabled && !biometricUnlocked) {
      setAuthState("biometric_locked");
      return;
    }

    if (!p.display_name) {
      setAuthState("needs_onboarding");
      return;
    }

    if (!p.couple_id) {
      setAuthState("needs_couple");
      return;
    }

    setAuthState("authenticated");
  }

  function unlockBiometric() {
    setBiometricUnlocked(true);
    if (profile) {
      if (!profile.display_name) {
        setAuthState("needs_onboarding");
      } else if (!profile.couple_id) {
        setAuthState("needs_couple");
      } else {
        setAuthState("authenticated");
      }
    }
  }

  async function refreshProfile() {
    if (!session) return;
    await fetchProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, authState, refreshProfile, unlockBiometric }}
    >
      {children}
    </AuthContext.Provider>
  );
}
