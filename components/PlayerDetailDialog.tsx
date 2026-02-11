'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  XCircle,
  Minus,
  Swords,
  Clock,
  Shield,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  AdminPlayerDetails,
  PlayerBattleHistoryEntry,
  getPlayerBattleHistory,
} from '@/app/actions/admin';

interface PlayerDetailDialogProps {
  player: AdminPlayerDetails | null;
  gameSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OUTCOME_CONFIG = {
  win: { label: 'WIN', variant: 'default' as const, icon: Trophy, className: '' },
  loss: { label: 'LOSS', variant: 'destructive' as const, icon: XCircle, className: '' },
  draw: { label: 'DRAW', variant: 'secondary' as const, icon: Minus, className: '' },
  in_progress: { label: 'IN PROGRESS', variant: 'outline' as const, icon: Swords, className: '' },
  pending: { label: 'PENDING', variant: 'outline' as const, icon: Clock, className: '' },
  abandoned: { label: 'ABANDONED', variant: 'secondary' as const, icon: Shield, className: '' },
};

const STATUS_CONFIG = {
  pending: { label: 'PENDING', className: '' },
  active: { label: 'ACTIVE', className: '' },
  completed: { label: 'COMPLETED', className: '' },
  abandoned: { label: 'ABANDONED', className: '' },
};

export default function PlayerDetailDialog({ player, gameSlug, open, onOpenChange }: PlayerDetailDialogProps) {
  const [battles, setBattles] = useState<PlayerBattleHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && player) {
      setIsLoading(true);
      setError(null);
      setBattles([]);
      getPlayerBattleHistory(gameSlug, player.deviceId)
        .then(setBattles)
        .catch((err) => setError(err.message || 'Failed to load battle history'))
        .finally(() => setIsLoading(false));
    }
  }, [open, player, gameSlug]);

  if (!player) return null;

  const winRate = player.stats.totalBattles > 0
    ? Math.round((player.stats.wins / player.stats.totalBattles) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" data-testid="dialog-player-detail">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tight">PLAYER DETAILS</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden" data-testid="dialog-player-detail-content">
          <div className="space-y-6 pb-6 shrink-0">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center" data-testid="img-player-avatar">
                <span className="text-sm font-bold uppercase text-muted-foreground">{player.avatar.substring(0, 4)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold uppercase tracking-tight" data-testid="text-player-name">
                    {player.displayName}
                  </h2>
                  {player.isActive ? (
                    <Badge variant="outline">ACTIVE</Badge>
                  ) : (
                    <Badge variant="destructive">BANNED</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1" data-testid="text-player-deviceid">
                  {player.deviceId}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0 -mx-6">
            <div className="h-px bg-border shrink-0" />
            <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs uppercase font-medium">AVATAR</span>
                  <p className="font-bold uppercase" data-testid="text-player-avatar-name">{player.avatar}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase font-medium">STATUS</span>
                  <p className="font-bold uppercase" data-testid="text-player-status">{player.isActive ? 'ACTIVE' : 'BANNED'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase font-medium">REGISTERED</span>
                  <p className="font-bold" data-testid="text-player-registered">{formatDate(player.registeredAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase font-medium">LAST SEEN</span>
                  <p className="font-bold" data-testid="text-player-lastseen">{formatRelativeTime(player.lastSeen)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'WINS', value: player.stats.wins, testId: 'text-stat-wins' },
                  { label: 'LOSSES', value: player.stats.losses, testId: 'text-stat-losses' },
                  { label: 'DRAWS', value: player.stats.draws, testId: 'text-stat-draws' },
                  { label: 'TOTAL', value: player.stats.totalBattles, testId: 'text-stat-total' },
                  { label: 'ACTIVE', value: player.stats.activeBattles, testId: 'text-stat-active' },
                  { label: 'WIN RATE', value: `${winRate}%`, testId: 'text-stat-winrate' },
                ].map(stat => (
                  <div key={stat.label} className="flex flex-col items-center justify-center p-0.5 rounded-lg border bg-muted/30 aspect-square">
                    <div className="text-lg font-bold" data-testid={stat.testId}>{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-bold uppercase tracking-tight text-sm mb-3">
                  BATTLE HISTORY ({isLoading ? '...' : battles.length})
                </h3>

                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {error && (
                  <Card>
                    <CardContent className="py-6 text-center text-destructive text-sm">
                      {error}
                    </CardContent>
                  </Card>
                )}

                {!isLoading && !error && battles.length === 0 && (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-bold uppercase">NO BATTLES FOUND</p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && !error && battles.length > 0 && (
                  <div className="space-y-2">
                    {battles.map((battle) => {
                      const outcomeInfo = OUTCOME_CONFIG[battle.outcome];
                      const statusInfo = STATUS_CONFIG[battle.status];
                      const OutcomeIcon = outcomeInfo.icon;

                      return (
                        <Card key={battle.battleId} data-testid={`card-battle-${battle.battleId}`}>
                          <CardContent className="p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                {battle.opponentAvatar && (
                                  <div className="w-8 h-8 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{battle.opponentAvatar.substring(0, 3)}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold lowercase text-sm truncate">
                                      vs {battle.opponentDisplayName || 'waiting...'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                    <span className="font-mono">on {battle.displayName}</span>
                                    {battle.isPrivate && (
                                      <EyeOff className="w-3 h-3" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                <Badge
                                  variant={outcomeInfo.variant}
                                  className={outcomeInfo.className}
                                >
                                  <OutcomeIcon className="w-3 h-3 mr-1" />
                                  {outcomeInfo.label}
                                </Badge>
                                <Badge variant="outline" className={statusInfo.className}>
                                  {statusInfo.label}
                                </Badge>
                                <span>T{battle.currentTurn}</span>
                                {battle.endReason && (
                                  <span className="uppercase">{battle.endReason}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(battle.createdAt)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-border shrink-0" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
