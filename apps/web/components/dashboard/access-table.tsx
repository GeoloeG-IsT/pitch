"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ShareToken } from "@/lib/share-api";

interface AccessTableProps {
  tokens: ShareToken[];
  onRevoke: (id: string) => Promise<void>;
  loading: boolean;
}

function getStatus(token: ShareToken): "Active" | "Expired" | "Revoked" {
  if (token.revoked_at) return "Revoked";
  if (new Date(token.expires_at) < new Date()) return "Expired";
  return "Active";
}

function StatusBadge({ status }: { status: "Active" | "Expired" | "Revoked" }) {
  switch (status) {
    case "Active":
      return (
        <Badge className="bg-[hsl(142,72%,29%)] text-white hover:bg-[hsl(142,72%,29%)]">
          Active
        </Badge>
      );
    case "Expired":
      return <Badge variant="secondary">Expired</Badge>;
    case "Revoked":
      return <Badge variant="destructive">Revoked</Badge>;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccessTable({ tokens, onRevoke, loading }: AccessTableProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    try {
      setRevokingId(id);
      await onRevoke(id);
      toast("Access revoked");
    } catch {
      toast("Failed to revoke access");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold">No shared links yet</h3>
            <p className="text-muted-foreground mt-1">
              Generate a share link or send an email invite to give investors access to your pitch.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Links</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => {
              const status = getStatus(token);
              const identifier = token.investor_email || "Anonymous";
              return (
                <TableRow key={token.id}>
                  <TableCell className="text-sm">{identifier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.expires_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    {status === "Active" && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={revokingId === token.id}
                            />
                          }
                        >
                          Revoke
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {identifier} will immediately lose access to the pitch.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleRevoke(token.id)}
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
