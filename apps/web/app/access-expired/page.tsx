import { Lock } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function AccessExpiredPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        <Lock className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Access expired</h1>
        <p className="text-muted-foreground">
          This link is no longer active. Contact the sender for a new link.
        </p>
      </div>
    </AuthLayout>
  );
}
