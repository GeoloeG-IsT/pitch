"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PitchViewer } from "@/components/viewer/pitch-viewer";
import { validateShareToken } from "@/lib/share-api";
import { useAuth } from "@/hooks/use-auth";

export default function PitchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { user, role, loading: authLoading } = useAuth();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenId, setTokenId] = useState<string | undefined>();
  const [founderId, setFounderId] = useState<string | undefined>();

  useEffect(() => {
    if (!token) {
      setTokenValid(null);
      return;
    }

    setTokenLoading(true);
    validateShareToken(token)
      .then((result) => {
        if (result.valid) {
          setTokenValid(true);
          setTokenId(result.token_id);
          setFounderId(result.founder_id);
        } else {
          // Invalid/expired/revoked token -- redirect to access-expired
          router.replace("/access-expired");
        }
      })
      .catch(() => {
        router.replace("/access-expired");
      })
      .finally(() => setTokenLoading(false));
  }, [token, router]);

  // If token provided, wait for validation
  if (token && tokenLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Validating access...</p>
      </div>
    );
  }

  // Token invalid -> already redirected in useEffect
  if (token && tokenValid === false) {
    return null;
  }

  // No token and not authenticated -> middleware handles redirect
  // (but as safety net)
  if (!token && !authLoading && !user) {
    return null;
  }

  // Determine tracking configuration
  // Share token access: track with token info
  // Authenticated investor: track with user id
  // Founder: tracking disabled
  const isShareTokenAccess = !!token && tokenValid;
  const isFounder = role === "founder";

  const trackingEnabled = isShareTokenAccess
    ? true
    : !isFounder && role === "investor";

  // Valid token OR authenticated user -> show pitch
  return (
    <PitchViewer
      trackingFounderId={isShareTokenAccess ? founderId : user?.id}
      trackingShareTokenId={isShareTokenAccess ? tokenId : undefined}
      trackingUserId={!isShareTokenAccess ? user?.id : undefined}
      trackingEnabled={trackingEnabled}
      shareToken={isShareTokenAccess ? token! : undefined}
    />
  );
}
