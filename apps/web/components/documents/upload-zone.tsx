'use client';

import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const ACCEPTED_TYPES = '.pdf,.xlsx,.md,.txt';
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/markdown',
  'text/plain',
];

export function UploadZone({ onUpload, disabled, label = "Drag files here or click to browse", description = "Supports PDF, Excel (.xlsx), and Markdown files" }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ACCEPTED_MIME_TYPES.includes(file.type) ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt')
      );
      if (files.length > 0) onUpload(files);
    },
    [disabled, onUpload]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) onUpload(files);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [onUpload]
  );

  return (
    <Card
      className={`flex flex-col items-center justify-center min-h-[120px] border-dashed border-2 cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-muted' : 'border-border'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Upload documents"
    >
      <div className="flex flex-col items-center gap-2 py-6 px-4">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </Card>
  );
}
