'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Document } from '@/lib/api';
import {
  listDocuments,
  uploadDocument,
  getDocument,
  deleteDocument,
  replaceDocument,
  updateDocumentPurpose,
} from '@/lib/api';
import { UploadZone } from '@/components/documents/upload-zone';
import { DocumentList } from '@/components/documents/document-list';
import { DeleteDialog } from '@/components/documents/delete-dialog';
import { ReplaceDialog } from '@/components/documents/replace-dialog';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Polling state
  const pollingIds = useRef<Map<string, number>>(new Map()); // id -> start timestamp
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Replace dialog state
  const [replaceTarget, setReplaceTarget] = useState<{ doc: Document; file: File } | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);

  // Load documents on mount
  useEffect(() => {
    listDocuments()
      .then((data) => {
        setDocuments(data.documents);
        // Resume polling for any in-progress documents
        for (const doc of data.documents) {
          if (doc.status === 'pending' || doc.status === 'processing') {
            pollingIds.current.set(doc.id, Date.now());
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load documents. Check that the backend is running and refresh.');
        setLoading(false);
      });
  }, []);

  // Polling effect
  useEffect(() => {
    function pollDocuments() {
      const ids = Array.from(pollingIds.current.entries());
      if (ids.length === 0) return;

      for (const [id, startTime] of ids) {
        // Timeout check
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          pollingIds.current.delete(id);
          toast.error('Processing is taking longer than expected. Refresh to check status.');
          continue;
        }

        getDocument(id)
          .then((updated) => {
            setDocuments((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );

            if (updated.status === 'ready') {
              pollingIds.current.delete(id);
              toast.success(`${updated.file_name} uploaded and indexed`);
            } else if (updated.status === 'error') {
              pollingIds.current.delete(id);
              toast.error(
                `Failed to process ${updated.file_name}. Check the file format and try again.`
              );
            }
          })
          .catch(() => {
            // Silently retry on next poll cycle
          });
      }
    }

    pollingTimerRef.current = setInterval(pollDocuments, POLL_INTERVAL_MS);
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, []);

  // Upload handler
  const handleUpload = useCallback(async (files: File[], purpose: "pitch" | "rag" = "pitch") => {
    for (const file of files) {
      try {
        const doc = await uploadDocument(file, undefined, purpose);
        setDocuments((prev) => {
          const exists = prev.some((d) => d.id === doc.id);
          if (exists) return prev.map((d) => (d.id === doc.id ? doc : d));
          return [doc, ...prev];
        });
        pollingIds.current.set(doc.id, Date.now());
        toast(`Processing ${file.name}...`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        toast.error(`Upload failed -- ${message}. Try again or choose a different file.`);
      }
    }
  }, []);

  const handleUploadPitch = useCallback((files: File[]) => handleUpload(files, "pitch"), [handleUpload]);
  const handleUploadRag = useCallback((files: File[]) => handleUpload(files, "rag"), [handleUpload]);

  // Delete handlers
  const handleDeleteRequest = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (doc) setDeleteTarget(doc);
    },
    [documents]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      pollingIds.current.delete(deleteTarget.id);
      toast(`${deleteTarget.title} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete document. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  // Purpose handler
  const handlePurposeChange = useCallback(async (id: string, purpose: "pitch" | "rag") => {
    try {
      const updated = await updateDocumentPurpose(id, purpose);
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast(`Marked as ${purpose === "pitch" ? "Pitch" : "RAG"}`);
    } catch {
      toast.error('Failed to update document purpose.');
    }
  }, []);

  // Replace handlers
  const handleReplaceRequest = useCallback(
    (id: string, file: File) => {
      const doc = documents.find((d) => d.id === id);
      if (doc) setReplaceTarget({ doc, file });
    },
    [documents]
  );

  const handleReplaceConfirm = useCallback(async () => {
    if (!replaceTarget) return;
    setReplaceLoading(true);
    try {
      const updated = await replaceDocument(replaceTarget.doc.id, replaceTarget.file);
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      pollingIds.current.set(updated.id, Date.now());
      toast(`Processing ${replaceTarget.file.name}...`);
      setReplaceTarget(null);
    } catch {
      toast.error('Failed to replace document. Please try again.');
    } finally {
      setReplaceLoading(false);
    }
  }, [replaceTarget]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto pt-16 pb-16 px-4">
          <h1 className="text-[28px] font-semibold leading-[1.2] text-primary">Documents</h1>
          <p className="mt-8 text-center text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto pt-16 pb-16 px-4">
        <h1 className="text-[28px] font-semibold leading-[1.2] text-primary">Documents</h1>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Pitch Documents</h2>
            <UploadZone
              onUpload={handleUploadPitch}
              label="Drop pitch files here"
              description="Shown in the investor pitch viewer"
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Annex Documents</h2>
            <UploadZone
              onUpload={handleUploadRag}
              label="Drop annex files here"
              description="Used for Q&A context only (not shown in viewer)"
            />
          </div>
        </div>

        <h2 className="text-xl font-semibold mt-8">Your Documents</h2>

        <div className="mt-4">
          <DocumentList
            documents={documents}
            loading={loading}
            onDelete={handleDeleteRequest}
            onReplace={handleReplaceRequest}
            onPurposeChange={handlePurposeChange}
          />
        </div>
      </div>

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        documentTitle={deleteTarget?.title ?? ''}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <ReplaceDialog
        open={replaceTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReplaceTarget(null);
        }}
        documentTitle={replaceTarget?.doc.title ?? ''}
        onConfirm={handleReplaceConfirm}
        loading={replaceLoading}
      />
    </div>
  );
}
