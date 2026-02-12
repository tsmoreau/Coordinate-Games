'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, Loader2, ImageIcon, CheckCircle2, XCircle, FileImage } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { deleteGameAvatar } from '@/app/actions/admin';
import AvatarImage from '@/components/AvatarImage';

interface AvatarUploadProps {
  gameSlug: string;
  avatars: string[];
}

interface FileEntry {
  file: File;
  avatarId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

function deriveAvatarId(filename: string): string {
  return filename
    .replace(/\.png$/i, '')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 20)
    .toUpperCase();
}

export default function AvatarUpload({ gameSlug, avatars }: AvatarUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const idRegex = /^[A-Za-z0-9_-]{1,20}$/;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = [];
    for (const file of Array.from(newFiles)) {
      if (file.type !== 'image/png') {
        entries.push({ file, avatarId: deriveAvatarId(file.name), status: 'error', error: 'Not a PNG file' });
        continue;
      }
      if (file.size > 500 * 1024) {
        entries.push({ file, avatarId: deriveAvatarId(file.name), status: 'error', error: 'Exceeds 500KB' });
        continue;
      }
      const avatarId = deriveAvatarId(file.name);
      if (!idRegex.test(avatarId)) {
        entries.push({ file, avatarId, status: 'error', error: 'Invalid avatar ID from filename' });
        continue;
      }
      entries.push({ file, avatarId, status: 'pending' });
    }
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAvatarId = (index: number, newId: string) => {
    setFiles((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const updated: FileEntry = { ...entry, avatarId: newId.toUpperCase() };
        if (entry.status === 'error' && entry.file.type === 'image/png' && entry.file.size <= 500 * 1024) {
          if (idRegex.test(newId.toUpperCase())) {
            updated.status = 'pending';
            updated.error = undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status !== 'pending') continue;

      if (!idRegex.test(entry.avatarId)) {
        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: 'error', error: 'Invalid avatar ID' } : f))
        );
        errorCount++;
        continue;
      }

      setFiles((prev) =>
        prev.map((f, j) => (j === i ? { ...f, status: 'uploading' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('gameSlug', gameSlug);
        formData.append('avatarId', entry.avatarId);
        formData.append('file', entry.file);

        const res = await fetch('/api/avatars/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!data.success) {
          setFiles((prev) =>
            prev.map((f, j) => (j === i ? { ...f, status: 'error', error: data.error || 'Upload failed' } : f))
          );
          errorCount++;
        } else {
          setFiles((prev) =>
            prev.map((f, j) => (j === i ? { ...f, status: 'success' } : f))
          );
          successCount++;
        }
      } catch {
        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: 'error', error: 'Network error' } : f))
        );
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: 'UPLOAD COMPLETE',
        description: `${successCount} avatar${successCount !== 1 ? 's' : ''} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });
      window.location.reload();
    } else if (errorCount > 0) {
      toast({ variant: 'destructive', title: 'UPLOAD FAILED', description: `All ${errorCount} file${errorCount !== 1 ? 's' : ''} failed to upload` });
    }
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const clearAll = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteGameAvatar(gameSlug, deleteTarget);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error || 'Failed to delete avatar' });
      } else {
        toast({ title: 'SUCCESS', description: `Avatar ${deleteTarget} deleted` });
      }
      setDeleteTarget(null);
    });
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <Upload className="w-4 h-4" />
            UPLOAD AVATARS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover-elevate'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-avatar-upload"
          >
            <FileImage className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-bold uppercase text-sm">
              DROP PNG FILES HERE OR CLICK TO BROWSE
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG only, max 500KB each. Filenames become avatar IDs.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              data-testid="input-avatar-files"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                  {pendingCount > 0 && ` (${pendingCount} ready)`}
                  {errorCount > 0 && ` (${errorCount} with errors)`}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={uploading}
                    data-testid="button-clear-files"
                  >
                    CLEAR ALL
                  </Button>
                  <Button
                    onClick={handleUploadAll}
                    disabled={uploading || pendingCount === 0}
                    data-testid="button-upload-all"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        UPLOADING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        UPLOAD {pendingCount} FILE{pendingCount !== 1 ? 'S' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
                {files.map((entry, index) => (
                  <div
                    key={`${entry.file.name}-${index}`}
                    className="flex items-center gap-3 p-3 flex-wrap"
                    data-testid={`file-entry-${index}`}
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      {entry.status === 'pending' && (
                        <FileImage className="w-5 h-5 text-muted-foreground" />
                      )}
                      {entry.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      {entry.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {entry.status === 'error' && (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.file.name}</p>
                      {entry.status === 'error' && entry.error && (
                        <p className="text-xs text-destructive">{entry.error}</p>
                      )}
                      {entry.status === 'success' && (
                        <p className="text-xs text-green-500">Uploaded</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(entry.status === 'pending' || entry.status === 'error') && (
                        <Input
                          type="text"
                          value={entry.avatarId}
                          onChange={(e) => updateAvatarId(index, e.target.value)}
                          className="w-28 text-xs font-mono"
                          maxLength={20}
                          data-testid={`input-avatar-id-${index}`}
                        />
                      )}
                      {entry.status !== 'uploading' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            AVATARS ({avatars.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avatars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold uppercase">NO AVATARS</p>
              <p className="text-sm mt-1">Upload avatars using the drop zone above</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {avatars.map((id) => (
                <div key={id} className="flex flex-col items-center gap-2">
                  <AvatarImage
                    gameSlug={gameSlug}
                    avatarId={id}
                    displayName={id}
                    size={64}
                  />
                  <span className="text-[10px] font-bold uppercase text-center truncate w-full">
                    {id}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(id)}
                    disabled={isPending}
                    data-testid={`button-delete-avatar-${id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE AVATAR</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete avatar &quot;{deleteTarget}&quot;? Players using this avatar will have their avatar reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'DELETING...' : 'DELETE'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
