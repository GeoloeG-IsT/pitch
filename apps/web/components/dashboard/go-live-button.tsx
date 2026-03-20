"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { SessionResponse } from "@/lib/session-api";

interface GoLiveButtonProps {
  isLive: boolean;
  session: SessionResponse | null;
  startLive: () => Promise<void>;
  endLive: () => Promise<void>;
  loading: boolean;
}

export function GoLiveButton({
  isLive,
  startLive,
  endLive,
  loading,
}: GoLiveButtonProps) {
  const [startDialogOpen, setStartDialogOpen] = useState(false);

  async function handleStart() {
    await startLive();
    setStartDialogOpen(false);
  }

  if (isLive) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/present">
          <Button variant="outline" size="sm">
            Open Presenter View
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" disabled={loading} />
            }
          >
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(0,84%,60%)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(0,84%,60%)]" />
            </span>
            Live Now
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End live session?</AlertDialogTitle>
              <AlertDialogDescription>
                Unanswered questions will move to your review queue for
                asynchronous review.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">
                Keep Live
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={endLive}
              >
                End Session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={loading} />
        }
      >
        <Radio className="h-4 w-4 mr-1.5" />
        Go Live
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Start live session?</DialogTitle>
          <DialogDescription>
            Investors will see a LIVE indicator and all questions will route
            through you for approval.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setStartDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={loading}>
            Start Live Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
