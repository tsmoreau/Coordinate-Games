'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Trash2,
  Database,
  Hash,
  Eye,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  deleteDataEntry,
  AdminDataEntry,
} from '@/app/actions/admin';

interface DataManagementProps {
  entries: AdminDataEntry[];
  gameSlug: string;
}

export default function DataManagement({ entries: initialEntries, gameSlug }: DataManagementProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminDataEntry | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminDataEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = entries.filter(e => {
    const matchesSearch = e.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.ownerDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesScope = scopeFilter === 'all' || e.scope === scopeFilter;
    return matchesSearch && matchesScope;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteDataEntry(target.id);
      if (result.success) {
        setEntries(prev => prev.filter(e => e.id !== target.id));
        toast({ title: 'Data entry deleted' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setDeleteTarget(null);
    });
  };

  const scopeBadgeVariant = (scope: string) => {
    switch (scope) {
      case 'global': return 'default' as const;
      case 'player': return 'secondary' as const;
      case 'public': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by key or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-data-search"
          />
        </div>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-data-scope">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          <Hash className="w-3 h-3 mr-1" />
          {filtered.length}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No data entries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-medium truncate" data-testid={`text-data-key-${entry.id}`}>
                        {entry.key}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={scopeBadgeVariant(entry.scope)} className="text-[10px] uppercase">
                          {entry.scope}
                        </Badge>
                        {entry.ownerDisplayName && (
                          <span className="text-xs text-muted-foreground">
                            {entry.ownerDisplayName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(entry.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setViewTarget(entry)}
                      data-testid={`button-view-data-${entry.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(entry)}
                      data-testid={`button-delete-data-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm break-all">{viewTarget?.key}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={scopeBadgeVariant(viewTarget?.scope || 'global')} className="text-[10px] uppercase">
                {viewTarget?.scope}
              </Badge>
              {viewTarget?.ownerDisplayName && (
                <span className="text-xs text-muted-foreground">
                  Owner: {viewTarget.ownerDisplayName}
                </span>
              )}
            </div>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[400px]">
              {viewTarget ? JSON.stringify(viewTarget.value, null, 2) : ''}
            </pre>
            <div className="text-xs text-muted-foreground">
              Updated {viewTarget ? formatRelativeTime(viewTarget.updatedAt) : ''}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE DATA ENTRY</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the data entry with key &quot;{deleteTarget?.key}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
