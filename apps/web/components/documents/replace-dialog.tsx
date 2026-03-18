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

interface ReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function ReplaceDialog({
  open,
  onOpenChange,
  documentTitle,
  onConfirm,
  loading,
}: ReplaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace {documentTitle}?</DialogTitle>
          <DialogDescription>
            The existing document and its index will be replaced with the new file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            Replace File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
