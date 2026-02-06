'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ExternalLink,
  Wrench,
  Power,
  MessageSquare,
  Users,
  Swords,
  Gamepad2,
  Copy,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  toggleGameMaintenance,
  toggleGameActive,
  updateGameMotd,
  AdminGameDetails,
} from '@/app/actions/admin';

interface GameManagementProps {
  games: AdminGameDetails[];
}

export default function GameManagement({ games }: GameManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedGame, setSelectedGame] = useState<AdminGameDetails | null>(null);
  const [showMotdDialog, setShowMotdDialog] = useState(false);
  const [motdValue, setMotdValue] = useState('');

  const handleToggleMaintenance = (game: AdminGameDetails) => {
    startTransition(async () => {
      const result = await toggleGameMaintenance(game.slug);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error });
      } else {
        toast({ title: 'SUCCESS', description: `Maintenance mode ${game.maintenance ? 'disabled' : 'enabled'}` });
      }
    });
  };

  const handleToggleActive = (game: AdminGameDetails) => {
    startTransition(async () => {
      const result = await toggleGameActive(game.slug);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error });
      } else {
        toast({ title: 'SUCCESS', description: `Game ${game.active ? 'deactivated' : 'activated'}` });
      }
    });
  };

  const handleEditMotd = (game: AdminGameDetails) => {
    setSelectedGame(game);
    setMotdValue(game.motd || '');
    setShowMotdDialog(true);
  };

  const confirmMotdChange = () => {
    if (!selectedGame) return;
    startTransition(async () => {
      const result = await updateGameMotd(selectedGame.slug, motdValue);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error });
      } else {
        toast({ title: 'SUCCESS', description: 'MOTD updated' });
      }
      setShowMotdDialog(false);
      setSelectedGame(null);
    });
  };

  const copyApiBase = (slug: string) => {
    const base = `${window.location.origin}/api/${slug}`;
    navigator.clipboard.writeText(base);
    toast({ title: 'COPIED', description: 'API base URL copied to clipboard' });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground uppercase font-medium">
        {games.length} GAME{games.length !== 1 ? 'S' : ''} REGISTERED
      </div>

      <div className="space-y-3">
        {games.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold uppercase">NO GAMES REGISTERED</p>
              <p className="text-sm mt-1">Seed games via POST /api/games/seed</p>
            </CardContent>
          </Card>
        ) : (
          games.map((game) => (
            <Card key={game.slug} data-testid={`card-game-manage-${game.slug}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold uppercase tracking-tight">{game.name}</h3>
                      {game.active ? (
                        <Badge variant="default">ACTIVE</Badge>
                      ) : (
                        <Badge variant="destructive">INACTIVE</Badge>
                      )}
                      {game.maintenance && <Badge variant="secondary">MAINTENANCE</Badge>}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="font-mono text-xs">/api/{game.slug}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {game.playerCount} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Swords className="w-3 h-3" />
                        {game.battleCount} battles
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {game.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline" className="text-[10px]">
                          {cap.toUpperCase()}
                        </Badge>
                      ))}
                    </div>

                    {game.motd && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        MOTD: {game.motd}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/dashboard/${game.slug}`}>
                      <Button size="sm" variant="outline" data-testid={`button-manage-game-${game.slug}`}>
                        <ExternalLink className="w-4 h-4 mr-1" />
                        MANAGE
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyApiBase(game.slug)}
                      data-testid={`button-copy-api-${game.slug}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEditMotd(game)}
                      disabled={isPending}
                      data-testid={`button-motd-${game.slug}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleMaintenance(game)}
                      disabled={isPending}
                      data-testid={`button-maintenance-${game.slug}`}
                    >
                      <Wrench className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleActive(game)}
                      disabled={isPending}
                      data-testid={`button-toggle-active-${game.slug}`}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showMotdDialog} onOpenChange={setShowMotdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>UPDATE MOTD</DialogTitle>
            <DialogDescription>
              Set the message of the day for {selectedGame?.name}. Leave empty to clear.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={motdValue}
            onChange={(e) => setMotdValue(e.target.value)}
            placeholder="Message of the day..."
            maxLength={500}
            data-testid="input-motd"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMotdDialog(false)}>
              CANCEL
            </Button>
            <Button onClick={confirmMotdChange} disabled={isPending}>
              {isPending ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
