"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingCountBadge } from "@/components/dashboard/pending-count-badge";
import { UserAvatarMenu } from "@/components/auth/user-avatar-menu";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export function SiteNav() {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();

  // No nav on auth pages or access-expired
  if (["/login", "/signup", "/access-expired"].includes(pathname)) {
    return null;
  }

  // Anonymous token access (no user) -- minimal nav
  if (!loading && !user) {
    return (
      <header className="sticky top-0 z-50 h-14 border-b bg-background flex items-center px-4 gap-6">
        <Link href="/" className="font-semibold text-sm">
          Zeee Pitch Zooo
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link
            href="/pitch"
            className="hover:text-foreground transition-colors"
          >
            Pitch
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background flex items-center px-4 gap-6">
      <Link href="/" className="font-semibold text-sm">
        Zeee Pitch Zooo
      </Link>
      <nav className="flex items-center gap-6 text-sm text-muted-foreground flex-1">
        <Link
          href="/pitch"
          className="hover:text-foreground transition-colors"
        >
          Pitch
        </Link>
        {role === "founder" && (
          <>
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
          </>
        )}
      </nav>
      <div className="ml-auto flex items-center">
        {loading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : user ? (
          <UserAvatarMenu user={user} role={role} />
        ) : null}
      </div>
    </header>
  );
}
