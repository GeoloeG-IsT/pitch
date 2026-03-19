"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShareToken } from "@/lib/share-api";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

interface EmailInviteFormProps {
  onInvited: () => void;
}

export function EmailInviteForm({ onInvited }: EmailInviteFormProps) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  function validateEmail(value: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const token = await createShareToken(14, email);
      const url = `${window.location.origin}/signup?email=${encodeURIComponent(email)}&invite=${token.token}`;
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
      toast(`Invite link copied to clipboard for ${email}`);
      setEmail("");
      onInvited();
    } catch {
      toast("Failed to create invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast("Invite link copied to clipboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite by Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex items-start gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="investor@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
            {emailError && (
              <p className="text-sm text-destructive mt-1">{emailError}</p>
            )}
          </div>
          <Button type="submit" disabled={loading || !email}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
          </Button>
        </form>
        {inviteUrl && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <Input value={inviteUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy invite link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
