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

    async function getSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setState({ user, role: profile?.role ?? null, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setState({
          user: session.user,
          role: profile?.role ?? null,
          loading: false,
        });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
