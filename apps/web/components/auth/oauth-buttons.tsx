"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const providers = [
  { id: "google" as const, label: "Google" },
  { id: "github" as const, label: "GitHub" },
  { id: "linkedin_oidc" as const, label: "LinkedIn" },
];

export function OAuthButtons() {
  async function handleOAuth(provider: "google" | "github" | "linkedin_oidc") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {providers.map((p) => (
        <Button
          key={p.id}
          type="button"
          variant="outline"
          className="flex-1 min-w-[100px]"
          onClick={() => handleOAuth(p.id)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
