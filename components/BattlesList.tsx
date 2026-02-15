import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Swords, 
  Clock, 
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { generateBattleName } from '@/lib/battleNames';
import type { BattleWithDetails } from '@/app/actions/battles';
import AvatarImage from '@/components/AvatarImage';
import BattlesFilter from '@/components/BattlesFilter';

interface BattlesListProps {
  battles: BattleWithDetails[];
  gameSlug: string;
  showFilters?: boolean;
  showCreatedDate?: boolean;
  emptyMessage?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success" data-testid="badge-status-active">Active</Badge>;
    case 'pending':
      return <Badge variant="warning" data-testid="badge-status-pending">Waiting</Badge>;
    case 'completed':
      return <Badge variant="secondary" data-testid="badge-status-completed">Completed</Badge>;
    case 'abandoned':
      return <Badge variant="destructive" data-testid="badge-status-abandoned">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function BattleCards({
  battles,
  gameSlug,
  showCreatedDate = true,
  emptyMessage = 'No matches found',
}: Omit<BattlesListProps, 'showFilters'>) {
  if (battles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Swords className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No matches found</h3>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {battles.map((battle) => (
        <Link
          key={battle.battleId}
          href={`/${gameSlug}/matches/${encodeURIComponent(battle.displayName)}`}
          data-testid={`battle-card-${battle.battleId}`}
          data-status={battle.status}
          className="block group"
        >
          <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99] relative border border-border rounded-lg">
            <div className="absolute top-2 right-2 z-10">
              {getStatusBadge(battle.status)}
            </div>
            <div className="flex items-center justify-between gap-4 p-5 px-6">
              <div className="flex items-center gap-4 min-w-0 w-full">
                <div className="w-12 shrink-0 flex items-center justify-center">
                  <div className="flex -space-x-3">
                    <div className="relative z-10">
                      <AvatarImage
                        gameSlug={battle.gameSlug}
                        avatarId={battle.player1Avatar}
                        displayName={battle.player1DisplayName}
                        size={36}
                      />
                    </div>
                    {battle.player2Avatar && (
                      <div className="relative z-0">
                        <AvatarImage
                          gameSlug={battle.gameSlug}
                          avatarId={battle.player2Avatar}
                          displayName={battle.player2DisplayName || 'Unknown'}
                          size={36}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1 pr-20">
                    <h3 className="font-bold uppercase text-base truncate" data-testid={`battle-name-${battle.battleId}`}>
                      {battle.displayName || generateBattleName(battle.battleId)}
                    </h3>
                  </div>
                  <p className="text-[12px] font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-2 mb-0.5">
                    <span>{battle.player1DisplayName}</span>
                    <span className="text-[10px] opacity-40">VS</span>
                    <span>{battle.player2DisplayName ? battle.player2DisplayName : 'WAITING...'}</span>
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground uppercase font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(battle.updatedAt)}
                    </span>
                    <span>TURN {battle.currentTurn}</span>
                    <span>{battle.mapName || 'Standard'}</span>
                  </div>
                </div>
              </div>
              {showCreatedDate && (
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[11px] text-muted-foreground uppercase">Created</p>
                  <p className="text-[11px] font-bold uppercase">{formatDate(battle.createdAt)}</p>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function BattlesList({ 
  battles, 
  gameSlug,
  showFilters = true,
  showCreatedDate = true,
  emptyMessage = 'No matches found'
}: BattlesListProps) {
  const cards = (
    <BattleCards
      battles={battles}
      gameSlug={gameSlug}
      showCreatedDate={showCreatedDate}
      emptyMessage={emptyMessage}
    />
  );

  if (!showFilters) {
    return cards;
  }

  return (
    <BattlesFilter>
      {cards}
    </BattlesFilter>
  );
}
