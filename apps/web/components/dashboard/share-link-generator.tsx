"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShareToken } from "@/lib/share-api";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

interface ShareLinkGeneratorProps {
  onGenerated: () => void;
}

export function ShareLinkGenerator({ onGenerated }: ShareLinkGeneratorProps) {
  const [expiryDays, setExpiryDays] = useState(14);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);
      const token = await createShareToken(expiryDays);
      const url = `${window.location.origin}/pitch?token=${token.token}`;
      setGeneratedUrl(url);
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard");
      onGenerated();
    } catch {
      toast("Failed to generate share link");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    toast("Link copied to clipboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Share Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <label htmlFor="expiry-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Expires in
          </label>
          <select
            id="expiry-select"
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Link"}
          </Button>
        </div>
        {generatedUrl && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <Input value={generatedUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
