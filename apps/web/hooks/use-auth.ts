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
          const res = await fetch("/api/me");
          if (res.ok) {
            const { role } = await res.json();
            setState({ user: session.user, role: role ?? "founder", loading: false });
          }
        } catch {
          // Role fetch failed — default to founder
          setState({ user: session.user, role: "founder", loading: false });
        }
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
