'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search, RefreshCw, Globe } from 'lucide-react';
import { fetchAuditLogs, AuditLogEntry } from '@/app/actions/admin';

interface AuditLogViewerProps {
  games: { slug: string; name: string }[];
}

export default function AuditLogViewer({ games }: AuditLogViewerProps) {
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const loadLogs = (targetPage: number = page) => {
    startTransition(async () => {
      const result = await fetchAuditLogs({
        gameSlug: gameFilter !== 'all' ? gameFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        page: targetPage,
        limit: 50,
      });
      if (result.success && result.logs) {
        setLogs(result.logs);
        setTotal(result.total ?? 0);
        setPage(result.page ?? 1);
        setTotalPages(result.totalPages ?? 1);
      }
    });
  };

  useEffect(() => {
    loadLogs(1);
  }, [gameFilter, actionFilter]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const gameNameMap = Object.fromEntries(games.map(g => [g.slug, g.name]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="uppercase text-sm">AUDIT LOG</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-audit-game">
                  <SelectValue placeholder="All games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All games</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-audit-action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="ping">Ping</SelectItem>
                  <SelectItem value="register">Register</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => loadLogs(page)}
                disabled={isPending}
                title="Refresh"
                data-testid="button-refresh-audit"
              >
                <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 && !isPending ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No audit log entries found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase text-xs">TIME</TableHead>
                      <TableHead className="uppercase text-xs">GAME</TableHead>
                      <TableHead className="uppercase text-xs">ACTION</TableHead>
                      <TableHead className="uppercase text-xs">IP</TableHead>
                      <TableHead className="uppercase text-xs">DETAILS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="text-xs whitespace-nowrap font-mono">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {gameNameMap[log.gameSlug] || log.gameSlug}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.ip}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {Object.entries(log.metadata)
                            .filter(([, v]) => v != null)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(', ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {total} total entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPage(p => p - 1); loadLogs(page - 1); }}
                    disabled={page <= 1 || isPending}
                    data-testid="button-audit-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPage(p => p + 1); loadLogs(page + 1); }}
                    disabled={page >= totalPages || isPending}
                    data-testid="button-audit-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
