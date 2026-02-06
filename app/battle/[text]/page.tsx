import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Swords,
  ArrowLeft,
  Users,
  Clock,
  Gamepad2,
  Activity,
  ChevronRight,
} from "lucide-react";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import Nav from "@/components/Nav";
import { getBattleByDisplayName, getBattleTurns, type TurnData } from "@/app/actions/battles";
import { DownloadBattleButton } from "@/components/DownloadBattleButton";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ text: string }>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "pending":
      return <Badge variant="warning">Waiting for Opponent</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "abandoned":
      return <Badge variant="destructive">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getActionDescription(action: TurnData['actions'][0]) {
  switch (action.type) {
    case "move":
      return `Move ${action.unitId || "unit"} from (${action.from?.x}, ${action.from?.y}) to (${action.to?.x}, ${action.to?.y})`;
    case "attack":
      return `Attack ${action.targetId || "target"} with ${action.unitId || "unit"}`;
    case "build":
      return `Build unit`;
    case "capture":
      return `Capture action at (${action.to?.x}, ${action.to?.y})`;
    case "wait":
      return `${action.unitId || "Unit"} waits`;
    case "take_off":
      return `${action.unitId || "Unit"} takes off`;
    case "land":
      return `${action.unitId || "Unit"} lands`;
    case "supply":
      return `${action.unitId || "Unit"} supplies adjacent units`;
    case "end_turn":
      return "End turn";
    default:
      return action.type;
  }
}

export default async function BattleDetailPage({ params }: Props) {
  const { text } = await params;
  const displayName = decodeURIComponent(text);

  const battle = await getBattleByDisplayName(displayName);

  if (!battle) {
    notFound();
  }

  const turns = await getBattleTurns(battle.battleId);

  const players = [battle.player1DeviceId, battle.player2DeviceId].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
            <div className="flex items-center gap-4">
              <h1
                className="text-3xl font-bold"
                data-testid="battle-display-name"
              >
                {battle.displayName}
              </h1>
              {getStatusBadge(battle.status)}
            </div>
            <DownloadBattleButton battle={battle} turns={turns} />
          </div>
          <p className="text-muted-foreground">
            <span className="font-mono text-xs">{battle.battleId}</span> ·
            Created {formatDate(battle.createdAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Current Turn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-current-turn">
                {battle.currentTurn}
              </p>
              {battle.status === "active" && (
                <p className="text-sm text-muted-foreground mt-1">
                  {battle.currentPlayerIndex === 0
                    ? battle.player1DisplayName
                    : battle.player2DisplayName}
                  &apos;s turn (P{battle.currentPlayerIndex + 1})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-player-count">
                {players.length}/2
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {battle.player2DeviceId
                  ? "Battle ready"
                  : "Waiting for opponent"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Update
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold" data-testid="text-last-update">
                {formatRelativeTime(battle.updatedAt)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(battle.updatedAt)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>
                Devices participating in this battle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link
                href={`/player/${encodeURIComponent(battle.player1DisplayName || "")}`}
                className="block group no-underline"
              >
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card transition-all active:scale-[0.98] hover-elevate">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className="font-medium"
                          data-testid="text-player1-name"
                        >
                          {battle.player1DisplayName}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          P1
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {battle.player1DeviceId.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {battle.status === "active" &&
                      battle.currentPlayerIndex === 0 && (
                        <Badge variant="default">Current Turn</Badge>
                      )}
                    {battle.winnerId === battle.player1DeviceId && (
                      <Badge variant="success">Winner</Badge>
                    )}
                  </div>
                </div>
              </Link>

              {battle.player2DeviceId ? (
                <Link
                  href={`/player/${encodeURIComponent(battle.player2DisplayName || "")}`}
                  className="block group no-underline"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card transition-all active:scale-[0.98] hover-elevate">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className="font-medium"
                            data-testid="text-player2-name"
                          >
                            {battle.player2DisplayName}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            P2
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {battle.player2DeviceId.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {battle.status === "active" &&
                        battle.currentPlayerIndex === 1 && (
                          <Badge variant="default">Current Turn</Badge>
                        )}
                      {battle.winnerId === battle.player2DeviceId && (
                        <Badge variant="success">Winner</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground text-sm">
                    Waiting for Player 2 to join...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Turn History</CardTitle>
              <CardDescription>
                {turns.length} turn{turns.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {turns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No turns submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {turns.map((turn) => (
                    <Link
                      key={turn.turnId}
                      href={`/turn/${turn.turnId}`}
                      className="block group"
                    >
                      <div
                        className="p-3 rounded-lg border border-border transition-all active:scale-[0.98] hover-elevate"
                        data-testid={`turn-${turn.turnNumber}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              Turn {turn.turnNumber}
                            </span>
                            <span
                              className="text-sm text-muted-foreground"
                              data-testid={`turn-${turn.turnNumber}-player`}
                            >
                              by{" "}
                              {turn.deviceId === battle.player1DeviceId
                                ? battle.player1DisplayName
                                : turn.deviceId === battle.player2DeviceId
                                  ? battle.player2DisplayName || "Player 2"
                                  : "Unknown"}
                            </span>
                            {(turn.deviceId === battle.player1DeviceId ||
                              turn.deviceId === battle.player2DeviceId) && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                data-testid={`turn-${turn.turnNumber}-badge`}
                              >
                                {turn.deviceId === battle.player1DeviceId
                                  ? "P1"
                                  : "P2"}
                              </Badge>
                            )}
                            {turn.isValid ? (
                              <Badge variant="success" className="text-xs">
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Invalid
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(turn.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {turn.actions.length} action
                          {turn.actions.length !== 1 ? "s" : ""}
                        </div>
                        {turn.actions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {turn.actions.slice(0, 3).map((action, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground flex items-center gap-1"
                              >
                                <ChevronRight className="w-3 h-3" />
                                {getActionDescription(action)}
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
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
