"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPitch, type PitchResponse } from "@/lib/pitch-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TOCSidebar } from "./toc-sidebar";
import { DocumentGroup } from "./document-group";
import { FloatingInput } from "@/components/viewer/fab-button";
import { QAPanel } from "@/components/qa/qa-panel";
import { useActiveSection } from "@/hooks/use-active-section";

export function PitchViewer() {
  const [data, setData] = useState<PitchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeId, handleInView } = useActiveSection();
  const [tocOpen, setTocOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | null>(null);

  useEffect(() => {
    fetchPitch()
      .then(setData)
      .catch(() =>
        setError(
          "Unable to load pitch content. Check that your documents have finished processing, then refresh the page."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const activeSectionName = useMemo(() => {
    if (!activeId || !data) return null;
    for (const doc of data.documents) {
      const chunk = doc.chunks.find((c) => c.id === activeId);
      if (chunk) {
        // For heading chunks, use content directly
        if (chunk.chunk_type === "heading") return chunk.content;
        // Find preceding heading in same document
        const idx = doc.chunks.indexOf(chunk);
        for (let i = idx - 1; i >= 0; i--) {
          if (doc.chunks[i].chunk_type === "heading")
            return doc.chunks[i].content;
        }
        return doc.title; // Fallback to document title
      }
    }
    return null;
  }, [activeId, data]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Brief ring highlight (2s) per UI-SPEC Animation Contract
      el.classList.add("ring-2", "ring-primary/30");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/30"), 2000);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="h-14 bg-card border-b" />
        <div className="max-w-5xl mx-auto py-16 px-4 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.documents.length === 0) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold">No pitch content yet</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your pitch deck and supporting documents to create your
              investor-ready viewer. Go to Documents to get started.
            </p>
            <a href="/documents">
              <Button className="mt-4">Go to Documents</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Sticky header */}
      <header
        className={cn(
          "sticky top-0 z-40 h-14 bg-card border-b flex items-center px-4 lg:px-6"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-2"
          onClick={() => setTocOpen(true)}
          aria-label="Open table of contents"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">Zeee Pitch Zooo</span>
      </header>

      <div className="flex">
        <TOCSidebar
          documents={data.documents}
          activeId={activeId}
          onSectionClick={scrollToSection}
          open={tocOpen}
          onOpenChange={setTocOpen}
        />
        <main
          className={cn(
            "flex-1 py-16 px-4 lg:px-8 transition-[padding] duration-300",
            qaOpen && "lg:pr-[460px]"
          )}
        >
          <div className="max-w-5xl mx-auto">
            {data.documents.map((doc) => (
              <DocumentGroup
                key={doc.id}
                document={doc}
                onSectionInView={handleInView}
              />
            ))}
          </div>
        </main>
      </div>

      <FloatingInput
        onSubmit={(question) => {
          setInitialQuestion(question);
          setQaOpen(true);
        }}
        visible={!qaOpen && data.documents.length > 0}
        sectionName={activeSectionName}
      />

      <QAPanel
        open={qaOpen}
        onOpenChange={setQaOpen}
        sectionName={activeSectionName}
        sectionId={activeId}
        onScrollToSection={scrollToSection}
        initialQuestion={initialQuestion}
        onInitialQuestionConsumed={() => setInitialQuestion(null)}
      />
    </div>
  );
}
