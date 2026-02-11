'use client';

import { useState, useTransition, useMemo } from 'react';
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
  Search,
  Trash2,
  Trophy,
  Hash,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  deleteScore,
  AdminScoreEntry,
} from '@/app/actions/admin';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreManagementProps {
  scores: AdminScoreEntry[];
  gameSlug: string;
}

export default function ScoreManagement({ scores: initialScores, gameSlug }: ScoreManagementProps) {
  const [scores, setScores] = useState(initialScores);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminScoreEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const cats = new Set(scores.map(s => s.category || 'default'));
    return Array.from(cats).sort();
  }, [scores]);

  const filtered = scores.filter(s => {
    const matchesSearch = s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.deviceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (s.category || 'default') === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteScore(target.id);
      if (result.success) {
        setScores(prev => prev.filter(s => s.id !== target.id));
        toast({ title: 'Score deleted' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player name or device ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-score-search"
          />
        </div>
        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-score-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge variant="secondary">
          <Hash className="w-3 h-3 mr-1" />
          {filtered.length}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No scores found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((score, index) => (
            <Card key={score.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-medium" data-testid={`text-score-player-${score.id}`}>
                        {score.displayName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">
                          {score.deviceId.substring(0, 12)}...
                        </span>
                        {score.category && score.category !== 'default' && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {score.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold" data-testid={`text-score-value-${score.id}`}>
                        {score.score.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(score.createdAt)}
                      </div>
                    </div>

                    {Object.keys(score.metadata).length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px]">
                              META
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <pre className="text-xs max-w-xs overflow-auto">
                              {JSON.stringify(score.metadata, null, 2)}
                            </pre>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(score)}
                      data-testid={`button-delete-score-${score.id}`}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE SCORE</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the score of {deleteTarget?.score.toLocaleString()} by {deleteTarget?.displayName}
              {deleteTarget?.category && deleteTarget.category !== 'default' ? ` in category "${deleteTarget.category}"` : ''}? This cannot be undone.
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
