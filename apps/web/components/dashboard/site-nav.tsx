"use client";

import Link from "next/link";
import { PendingCountBadge } from "@/components/dashboard/pending-count-badge";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background flex items-center px-4 gap-6">
      <Link href="/" className="font-semibold text-sm">
        Zeee Pitch Zooo
      </Link>
      <nav className="flex items-center gap-6 text-sm text-muted-foreground">
        <Link href="/pitch" className="hover:text-foreground transition-colors">
          Pitch
        </Link>
        <Link
          href="/documents"
          className="hover:text-foreground transition-colors"
        >
          Documents
        </Link>
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors flex items-center"
        >
          Dashboard
          <PendingCountBadge />
        </Link>
      </nav>
    </header>
  );
}
