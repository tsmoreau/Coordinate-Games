'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Loader2,
  Clock,
  ChevronRight,
  Swords,
  User,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { generateBattleName } from '@/lib/battleNames';
import Nav from '@/components/Nav';

interface TurnAction {
  type: string;
  unitId?: string;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  targetId?: string;
  data?: Record<string, unknown>;
}

interface Turn {
  turnId: string;
  battleId: string;
  deviceId: string;
  turnNumber: number;
  actions: TurnAction[];
  timestamp: string;
  isValid: boolean;
  validationErrors: string[];
  gameState: Record<string, unknown>;
}

interface Battle {
  battleId: string;
  displayName: string;
  player1DeviceId: string;
  player1DisplayName: string;
  player1Avatar: string;
  player2DeviceId: string | null;
  player2DisplayName: string | null;
  player2Avatar: string | null;
  status: string;
  currentTurn: number;
}

export default function TurnDetailPage() {
  const params = useParams();
  const turnId = params.id as string;
  
  const [turn, setTurn] = useState<Turn | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTurn() {
      try {
        const res = await fetch(`/api/turns/${turnId}`);
        const data = await res.json();
        
        if (data.success) {
          setTurn(data.turn);
          setBattle(data.battle);
        } else {
          setError(data.error || 'Failed to load turn');
        }
      } catch (err) {
        console.error('Failed to fetch turn:', err);
        setError('Failed to load turn');
      } finally {
        setLoading(false);
      }
    }

    if (turnId) {
      fetchTurn();
    }
  }, [turnId]);

  const getActionDescription = (action: TurnAction) => {
    switch (action.type) {
      case 'move':
        return `Move ${action.unitId || 'unit'} from (${action.from?.x}, ${action.from?.y}) to (${action.to?.x}, ${action.to?.y})`;
      case 'attack':
        return `Attack ${action.targetId || 'target'} with ${action.unitId || 'unit'}`;
      case 'build':
        return `Build unit`;
      case 'capture':
        return `Capture action at (${action.to?.x}, ${action.to?.y})`;
      case 'wait':
        return `${action.unitId || 'Unit'} waits`;
      case 'take_off':
        return `${action.unitId || 'Unit'} takes off`;
      case 'land':
        return `${action.unitId || 'Unit'} lands`;
      case 'supply':
        return `${action.unitId || 'Unit'} supplies adjacent units`;
      case 'end_turn':
        return 'End turn';
      default:
        return action.type;
    }
  };

  const getActionIcon = (actionType: string) => {
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
  };

  const getPlayerInfo = () => {
    if (!turn || !battle) return { name: 'Unknown', badge: null };
    
    if (turn.deviceId === battle.player1DeviceId) {
      return { 
        name: battle.player1DisplayName || 'Player 1',
        badge: 'P1'
      };
    } else if (turn.deviceId === battle.player2DeviceId) {
      return { 
        name: battle.player2DisplayName || 'Player 2',
        badge: 'P2'
      };
    }
    return { name: 'Unknown', badge: null };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !turn) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <XCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Turn not found</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const playerInfo = getPlayerInfo();

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={battle ? `/battle/${encodeURIComponent(battle.displayName)}` : '/'}>
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Battle
            </Button>
          </Link>
        </div>

        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
          {battle && (
            <>
              <Link 
                href={`/battle/${encodeURIComponent(battle.displayName)}`} 
                className="hover:text-foreground transition-colors"
                data-testid="breadcrumb-battle"
              >
                <div className="flex items-center gap-1">
                  <Swords className="w-4 h-4" />
                  {battle.displayName || generateBattleName(battle.battleId)}
                </div>
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link 
                href={`/player/${encodeURIComponent(playerInfo.name)}`} 
                className="hover:text-foreground transition-colors"
                data-testid="breadcrumb-player"
              >
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {playerInfo.name}
                </div>
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-foreground font-medium" data-testid="breadcrumb-turn">
            Turn {turn.turnNumber}
          </span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold" data-testid="turn-title">
              Turn {turn.turnNumber}
            </h1>
            {playerInfo.badge && (
              <Badge variant="outline" className="text-sm" data-testid="turn-player-badge">
                {playerInfo.badge}
              </Badge>
            )}
            {turn.isValid ? (
              <Badge variant="success" data-testid="turn-valid-badge">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive" data-testid="turn-invalid-badge">
                <XCircle className="w-3 h-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Submitted by{' '}
            <Link 
              href={`/player/${encodeURIComponent(playerInfo.name)}`}
              className="hover:underline"
              data-testid="turn-player-link"
            >
              {playerInfo.name}
            </Link>
            {' · '}
            <span className="font-mono text-xs">{turn.turnId}</span>
            {' · '}
            {formatDate(turn.timestamp)}
          </p>
        </div>

        <div className="grid gap-6">
          <Card data-testid="card-turn-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Turn Information
              </CardTitle>
              <CardDescription>
                Details about this turn submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Turn Number</dt>
                  <dd className="text-lg font-medium" data-testid="info-turn-number">{turn.turnNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Player</dt>
                  <dd className="text-lg font-medium" data-testid="info-player">{playerInfo.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Actions</dt>
                  <dd className="text-lg font-medium" data-testid="info-action-count">{turn.actions.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Submitted</dt>
                  <dd className="text-lg font-medium" data-testid="info-timestamp">{formatRelativeTime(turn.timestamp)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card data-testid="card-actions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Actions ({turn.actions.length})
              </CardTitle>
              <CardDescription>
                All actions performed in this turn
              </CardDescription>
            </CardHeader>
            <CardContent>
              {turn.actions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions recorded</p>
              ) : (
                <div className="space-y-2">
                  {turn.actions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border"
                      data-testid={`action-${idx}`}
                    >
                      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                        {getActionIcon(action.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs" data-testid={`action-${idx}-type`}>
                            {action.type}
                          </Badge>
                          <span className="text-sm font-medium" data-testid={`action-${idx}-desc`}>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!turn.isValid && turn.validationErrors.length > 0 && (
            <Card data-testid="card-errors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Validation Errors
                </CardTitle>
                <CardDescription>
                  Issues detected with this turn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {turn.validationErrors.map((err, idx) => (
                    <li 
                      key={idx}
                      className="flex items-start gap-2 text-sm text-destructive"
                      data-testid={`error-${idx}`}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {err}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {battle && (
            <Card data-testid="card-battle-context">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Battle Context
                </CardTitle>
                <CardDescription>
                  The battle this turn belongs to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href={`/battle/${encodeURIComponent(battle.displayName)}`}
                  className="block hover-elevate p-4 rounded-lg border border-border transition-all"
                  data-testid="link-battle"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {battle.displayName || generateBattleName(battle.battleId)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {battle.player1DisplayName || 'Player 1'} vs {battle.player2DisplayName || 'Player 2'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current turn: {battle.currentTurn} · Status: {battle.status}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
