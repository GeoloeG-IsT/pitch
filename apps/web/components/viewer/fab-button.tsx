"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FABButtonProps {
  onClick: () => void;
  visible: boolean;
  className?: string;
}

export function FABButton({ onClick, visible, className }: FABButtonProps) {
  if (!visible) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            className={cn(
              "fixed z-50 h-14 w-14 rounded-full shadow-lg",
              "bottom-4 right-4",
              "max-md:bottom-4 max-md:left-1/2 max-md:-translate-x-1/2 max-md:right-auto",
              "transition-transform duration-150",
              className
            )}
            onClick={onClick}
            aria-label="Ask a question"
          />
        }
      >
        <MessageSquare className="h-6 w-6" />
      </TooltipTrigger>
      <TooltipContent side="left">Ask a question</TooltipContent>
    </Tooltip>
  );
}
