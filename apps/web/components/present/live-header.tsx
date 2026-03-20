"use client";

import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LiveHeaderProps {
  investorCount: number;
  investors: string[];
  onEndSession: () => void;
}

export function LiveHeader({
  investorCount,
  investors,
  onEndSession,
}: LiveHeaderProps) {
  const investorLabel =
    investorCount === 1
      ? "1 investor connected"
      : `${investorCount} investors connected`;

  return (
    <div className="sticky top-0 z-40 h-14 bg-card border-b flex items-center justify-between px-4">
      <h1 className="text-[32px] font-semibold leading-[1.2]">Live Q&A</h1>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" />
            }
          >
            <span className="text-sm">{investorLabel}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {investors.length === 0 ? (
              <DropdownMenuItem disabled>No investors connected</DropdownMenuItem>
            ) : (
              investors.map((email) => (
                <DropdownMenuItem key={email}>{email}</DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm" />
            }
          >
            End Session
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
                onClick={onEndSession}
              >
                End Session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
