"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Provider = "google" | "github" | "linkedin_oidc";

const providers: { id: Provider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "linkedin_oidc", label: "LinkedIn" },
];

// Only show OAuth buttons if at least one provider is configured via env
const enabledProviders = providers.filter((p) => {
  const key = `NEXT_PUBLIC_OAUTH_${p.id.toUpperCase()}`;
  return typeof window !== "undefined"
    ? process.env[key] === "true"
    : false;
});

export function OAuthButtons() {
  if (enabledProviders.length === 0) return null;

  async function handleOAuth(provider: Provider) {
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
      {enabledProviders.map((p) => (
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
