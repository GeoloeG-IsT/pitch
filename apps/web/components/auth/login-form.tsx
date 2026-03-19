"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { login } from "@/app/login/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold leading-tight">Sign in</h1>
        <p className="text-base text-muted-foreground">to your account</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            disabled={pending}
          />
          <Link
            href="/reset-password"
            className="text-sm text-muted-foreground hover:underline self-end"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : "Sign in"}
        </Button>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>

      <div className="relative flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or continue with</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons />

      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
