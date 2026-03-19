'use client';

import { useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, FileSpreadsheet, MoreHorizontal } from 'lucide-react';
import type { Document } from '@/lib/api';
import { formatFileSize } from '@/lib/api';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onPurposeChange: (id: string, purpose: "pitch" | "rag") => void;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'xlsx') {
    return <FileSpreadsheet className="h-8 w-8 text-muted-foreground shrink-0" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground shrink-0" />;
}

function StatusBadge({ status, chunkCount }: { status: Document['status']; chunkCount?: number | null }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Queued</Badge>;
    case 'processing':
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-chart-1/10 text-chart-1 hover:bg-chart-1/10">Indexing...</Badge>
          <Progress value={50} className="w-16 h-1.5 [&>div]:animate-pulse" />
        </div>
      );
    case 'ready':
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Ready</Badge>
          {chunkCount != null && (
            <span className="text-sm text-muted-foreground">{chunkCount} sections indexed</span>
          )}
        </div>
      );
    case 'error':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return null;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DocumentCard({ document, onDelete, onReplace, onPurposeChange }: DocumentCardProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceClick = useCallback(() => {
    replaceInputRef.current?.click();
  }, []);

  const handleReplaceFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onReplace(document.id, file);
      e.target.value = '';
    },
    [document.id, onReplace]
  );

  return (
    <Card className="flex flex-row items-center gap-4 p-4">
      <FileIcon fileType={document.file_type} />

      <div className="flex-1 min-w-0">
        <p className="text-base font-medium truncate">{document.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-muted-foreground">
            {formatFileSize(document.file_size_bytes)}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDate(document.created_at)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={document.status} chunkCount={document.chunk_count} />
          <button
            type="button"
            onClick={() =>
              onPurposeChange(document.id, document.purpose === "pitch" ? "rag" : "pitch")
            }
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors border border-border hover:bg-accent"
            title={`Currently: ${document.purpose === "pitch" ? "Pitch document" : "RAG only"}. Click to toggle.`}
          >
            {document.purpose === "pitch" ? "Pitch" : "RAG"}
          </button>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Document actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleReplaceClick}>
            Replace File
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(document.id)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.xlsx,.md,.txt"
        className="hidden"
        onChange={handleReplaceFile}
        tabIndex={-1}
      />
    </Card>
  );
}
