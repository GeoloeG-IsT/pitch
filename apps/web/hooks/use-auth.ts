"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  role: string | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Set user immediately, fetch role in background
        setState({ user: session.user, role: null, loading: false });

        try {
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role) {
            setState({ user: session.user, role: profile.role, loading: false });
          }
        } catch {
          // Role fetch failed — user still shown, role stays null
        }
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
