'use client';

import { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, Loader2, ImageIcon } from 'lucide-react';
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

export default function AvatarUpload({ gameSlug, avatars }: AvatarUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [avatarId, setAvatarId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !avatarId.trim()) return;

    if (file.type !== 'image/png') {
      toast({ variant: 'destructive', title: 'ERROR', description: 'File must be a PNG image' });
      return;
    }

    if (file.size > 500 * 1024) {
      toast({ variant: 'destructive', title: 'ERROR', description: 'File must be under 500KB' });
      return;
    }

    const idRegex = /^[A-Za-z0-9_-]{1,20}$/;
    if (!idRegex.test(avatarId.trim())) {
      toast({ variant: 'destructive', title: 'ERROR', description: 'Avatar ID must be 1-20 alphanumeric characters (plus - and _)' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('gameSlug', gameSlug);
      formData.append('avatarId', avatarId.trim());
      formData.append('file', file);

      const res = await fetch('/api/avatars/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!data.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: data.error || 'Upload failed' });
      } else {
        toast({ title: 'SUCCESS', description: `Avatar ${avatarId.trim()} uploaded` });
        setAvatarId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        window.location.reload();
      }
    } catch {
      toast({ variant: 'destructive', title: 'ERROR', description: 'Upload failed' });
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <Upload className="w-4 h-4" />
            UPLOAD AVATAR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Avatar ID (e.g. KNIGHT1)"
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value.toUpperCase())}
              maxLength={20}
              className="sm:w-48"
              data-testid="input-avatar-id"
            />
            <Input
              type="file"
              accept="image/png"
              ref={fileInputRef}
              className="sm:flex-1"
              data-testid="input-avatar-file"
            />
            <Button
              onClick={handleUpload}
              disabled={uploading || !avatarId.trim()}
              data-testid="button-upload-avatar"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  UPLOADING...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  UPLOAD
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            PNG only, max 500KB. Avatar ID must be 1-20 alphanumeric characters.
          </p>
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
              <p className="text-sm mt-1">Upload avatars using the form above</p>
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
