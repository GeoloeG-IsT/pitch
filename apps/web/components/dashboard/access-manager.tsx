"use client";

import { useEffect, useState, useCallback } from "react";
import { listShareTokens, revokeShareToken, type ShareToken } from "@/lib/share-api";
import { ShareLinkGenerator } from "@/components/dashboard/share-link-generator";
import { EmailInviteForm } from "@/components/dashboard/email-invite-form";
import { AccessTable } from "@/components/dashboard/access-table";

export function AccessManager() {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setError(null);
      const data = await listShareTokens();
      setTokens(data);
    } catch {
      setError("Unable to load access list. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  async function handleRevoke(id: string) {
    await revokeShareToken(id);
    await fetchTokens();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold">Shared Access</h2>
      <ShareLinkGenerator onGenerated={fetchTokens} />
      <EmailInviteForm onInvited={fetchTokens} />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <AccessTable tokens={tokens} onRevoke={handleRevoke} loading={loading} />
      )}
    </div>
  );
}
