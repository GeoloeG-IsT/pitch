'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  documentTitle,
  onConfirm,
  loading,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {documentTitle}?</DialogTitle>
          <DialogDescription>
            This will permanently remove the document and all its indexed content. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep Document
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            Delete Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
