'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { DocumentCard } from './document-card';
import type { Document } from '@/lib/api';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
}

export function DocumentList({ documents, loading, onDelete, onReplace }: DocumentListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[72px] w-full rounded-lg" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-xl font-semibold">No documents yet</p>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Upload your pitch deck, financial model, or supporting documents to get started.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports PDF, Excel (.xlsx), and Markdown files
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={onDelete}
          onReplace={onReplace}
        />
      ))}
    </div>
  );
}
