'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Swords,
  CheckCircle2,
  XCircle,
  Play,
  Download,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { TurnData } from '@/app/actions/battles';

interface TurnReplayModalProps {
  turn: TurnData | null;
  playerName: string;
  playerBadge: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActionDescription(action: TurnData['actions'][0]) {
  switch (action.type) {
    case 'move':
      return `Move ${action.unitId || 'unit'} from (${action.from?.x}, ${action.from?.y}) to (${action.to?.x}, ${action.to?.y})`;
    case 'attack':
      return `Attack ${action.targetId || 'target'} with ${action.unitId || 'unit'}`;
    case 'build':
      return 'Build unit';
    case 'capture':
      return `Capture at (${action.to?.x}, ${action.to?.y})`;
    case 'wait':
      return `${action.unitId || 'Unit'} waits`;
    case 'take_off':
      return `${action.unitId || 'Unit'} takes off`;
    case 'land':
      return `${action.unitId || 'Unit'} lands`;
    case 'supply':
      return `${action.unitId || 'Unit'} supplies adjacent units`;
    case 'load':
      return `${action.unitId || 'Unit'} loads`;
    case 'unload':
      return `${action.unitId || 'Unit'} unloads`;
    case 'combine':
      return `${action.unitId || 'Unit'} combines`;
    case 'end_turn':
      return 'End turn';
    default:
      return action.type;
  }
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'move':
      return <ChevronRight className="w-4 h-4" />;
    case 'attack':
      return <Swords className="w-4 h-4" />;
    case 'end_turn':
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return <Play className="w-4 h-4" />;
  }
}

export function TurnReplayModal({
  turn,
  playerName,
  playerBadge,
  open,
  onOpenChange,
}: TurnReplayModalProps) {
  if (!turn) return null;

  const handleDownloadTurn = () => {
    const exportData = {
      turnId: turn.turnId,
      turnNumber: turn.turnNumber,
      deviceId: turn.deviceId,
      playerName,
      timestamp: turn.timestamp,
      isValid: turn.isValid,
      validationErrors: turn.validationErrors,
      actions: turn.actions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `turn-${turn.turnNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle>Turn {turn.turnNumber} Replay</DialogTitle>
            {playerBadge && (
              <Badge variant="outline" className="text-xs">
                {playerBadge}
              </Badge>
            )}
            {turn.isValid ? (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
          <DialogDescription>
            {playerName} · {formatRelativeTime(turn.timestamp)} · {turn.actions.length} action{turn.actions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {!turn.isValid && turn.validationErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-1">
            {turn.validationErrors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-destructive">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {err}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {turn.actions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No actions recorded</p>
          ) : (
            turn.actions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-border"
              >
                <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                  {getActionIcon(action.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {action.type}
                    </Badge>
                    <span className="text-sm font-medium">
                      {getActionDescription(action)}
                    </span>
                  </div>
                  {action.unitId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {action.unitId}
                    </p>
                  )}
                  {action.data && Object.keys(action.data).length > 0 && (
                    <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-x-auto">
                      {JSON.stringify(action.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTurn}>
            <Download className="w-4 h-4 mr-2" />
            Download Turn JSON
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
