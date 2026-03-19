import { Card, CardContent } from "@/components/ui/card";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <Card className="max-w-sm w-full mx-4">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}
