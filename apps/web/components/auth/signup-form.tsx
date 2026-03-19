"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signup } from "@/app/signup/actions";

export function SignupForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const inviteParam = searchParams.get("invite");

  const [state, formAction, pending] = useActionState(signup, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold leading-tight">
          Create account
        </h1>
        <p className="text-base text-muted-foreground">
          Get started with Zeee Pitch Zooo
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {inviteParam && (
          <input type="hidden" name="invite" value={inviteParam} />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            disabled={pending}
            defaultValue={emailParam ?? ""}
            readOnly={!!emailParam}
            className={emailParam ? "bg-muted" : ""}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            disabled={pending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordMismatch && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={pending || passwordMismatch}
        >
          {pending ? <Loader2 className="animate-spin" /> : "Create account"}
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
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
