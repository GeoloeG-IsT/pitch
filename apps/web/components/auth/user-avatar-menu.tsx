"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";

interface UserAvatarMenuProps {
  user: User;
  role: string | null;
}

export function UserAvatarMenu({ user, role }: UserAvatarMenuProps) {
  const router = useRouter();

  const initial = (user.email?.[0] ?? "U").toUpperCase();
  const roleLabel = role === "founder" ? "Founder" : "Investor";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast("Signed out");
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" />}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground truncate">
              {user.email}
            </span>
            <Badge variant="secondary" className="w-fit text-xs">
              {roleLabel}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
