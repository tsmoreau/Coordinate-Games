'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { TurnReplayModal } from '@/components/TurnReplayModal';
import type { TurnData } from '@/app/actions/battles';

interface MatchTurnListProps {
  turns: TurnData[];
  player1DeviceId: string;
  player1DisplayName: string;
  player2DeviceId: string | null;
  player2DisplayName: string | null;
}

function getPlayerForTurn(
  deviceId: string,
  p1Id: string,
  p1Name: string,
  p2Id: string | null,
  p2Name: string | null
): { name: string; badge: string | null } {
  if (deviceId === p1Id) return { name: p1Name, badge: 'P1' };
  if (deviceId === p2Id) return { name: p2Name || 'Player 2', badge: 'P2' };
  return { name: 'Unknown', badge: null };
}

export function MatchTurnList({
  turns,
  player1DeviceId,
  player1DisplayName,
  player2DeviceId,
  player2DisplayName,
}: MatchTurnListProps) {
  const [selectedTurn, setSelectedTurn] = useState<TurnData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTurnClick = (turn: TurnData) => {
    setSelectedTurn(turn);
    setModalOpen(true);
  };

  const selectedPlayerInfo = selectedTurn
    ? getPlayerForTurn(
        selectedTurn.deviceId,
        player1DeviceId,
        player1DisplayName,
        player2DeviceId,
        player2DisplayName
      )
    : { name: '', badge: null };

  if (turns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No turns submitted yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {turns.map((turn) => {
          const player = getPlayerForTurn(
            turn.deviceId,
            player1DeviceId,
            player1DisplayName,
            player2DeviceId,
            player2DisplayName
          );

          return (
            <button
              key={turn.turnId}
              onClick={() => handleTurnClick(turn)}
              className="w-full text-left"
            >
              <div className="p-3 rounded-lg border border-border transition-all active:scale-[0.98] hover:border-foreground/20 hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">Turn {turn.turnNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      by {player.name}
                    </span>
                    {player.badge && (
                      <Badge variant="outline" className="text-xs">
                        {player.badge}
                      </Badge>
                    )}
                    {turn.isValid ? (
                      <Badge variant="success" className="text-xs">Valid</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Invalid</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(turn.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {turn.actions.length} action{turn.actions.length !== 1 ? 's' : ''}
                </div>
                {turn.actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {turn.actions.slice(0, 3).map((action, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3" />
                        {action.type}
                        {action.unitId ? ` (${action.unitId})` : ''}
                      </div>
                    ))}
                    {turn.actions.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{turn.actions.length - 3} more actions
                      </p>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <TurnReplayModal
        turn={selectedTurn}
        playerName={selectedPlayerInfo.name}
        playerBadge={selectedPlayerInfo.badge}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
