"use client";

import { cn } from "@/lib/utils";
import type { PitchDocument } from "@/lib/pitch-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TOCSidebarProps {
  documents: PitchDocument[];
  activeId: string | null;
  onSectionClick: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TOCContent({
  documents,
  activeId,
  onSectionClick,
}: Pick<TOCSidebarProps, "documents" | "activeId" | "onSectionClick">) {
  return (
    <div className="py-4">
      {documents.map((doc) => (
        <div key={doc.id} className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2 px-4">
            {doc.title}
          </p>
          <div className="flex flex-col">
            {doc.chunks
              .filter((chunk) => chunk.section_number != null)
              .map((chunk) => {
                const isActive = activeId === chunk.id;
                const label =
                  chunk.chunk_type === "heading"
                    ? chunk.content
                    : chunk.content.slice(0, 50);
                return (
                  <button
                    key={chunk.id}
                    onClick={() => onSectionClick(chunk.id)}
                    className={cn(
                      "w-full text-left text-sm px-4 py-1.5 truncate transition-colors duration-150",
                      isActive
                        ? "bg-accent border-l-2 border-primary text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TOCSidebar({
  documents,
  activeId,
  onSectionClick,
  open,
  onOpenChange,
}: TOCSidebarProps) {
  const handleSectionClick = (id: string) => {
    onSectionClick(id);
    onOpenChange(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 border-r bg-card sticky top-14 h-[calc(100vh-3.5rem)] hidden lg:block">
        <ScrollArea className="h-full">
          <TOCContent
            documents={documents}
            activeId={activeId}
            onSectionClick={onSectionClick}
          />
        </ScrollArea>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" showCloseButton>
          <SheetHeader>
            <SheetTitle>Contents</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <TOCContent
              documents={documents}
              activeId={activeId}
              onSectionClick={handleSectionClick}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
