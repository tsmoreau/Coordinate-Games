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
  Plus,
  Settings,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  toggleGameMaintenance,
  toggleGameActive,
  updateGameMotd,
  createGame,
  updateGameCapabilities,
  AdminGameDetails,
} from '@/app/actions/admin';

const ALL_CAPABILITIES = ['data', 'async', 'leaderboard'] as const;

interface GameManagementProps {
  games: AdminGameDetails[];
}

export default function GameManagement({ games }: GameManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedGame, setSelectedGame] = useState<AdminGameDetails | null>(null);
  const [showMotdDialog, setShowMotdDialog] = useState(false);
  const [motdValue, setMotdValue] = useState('');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCaps, setNewCaps] = useState<string[]>([]);

  const [showCapsDialog, setShowCapsDialog] = useState(false);
  const [editCaps, setEditCaps] = useState<string[]>([]);

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

  const handleOpenAddDialog = () => {
    setNewName('');
    setNewSlug('');
    setNewCaps([]);
    setShowAddDialog(true);
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    setNewSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const toggleNewCap = (cap: string) => {
    setNewCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);
  };

  const confirmAddGame = () => {
    if (!newName.trim() || !newSlug.trim() || newCaps.length === 0) {
      toast({ variant: 'destructive', title: 'ERROR', description: 'Name, slug, and at least one capability required' });
      return;
    }
    startTransition(async () => {
      const result = await createGame(newName, newSlug, newCaps);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error });
      } else {
        toast({ title: 'SUCCESS', description: `Game "${newName}" created` });
        setShowAddDialog(false);
      }
    });
  };

  const handleOpenCapsDialog = (game: AdminGameDetails) => {
    setSelectedGame(game);
    setEditCaps([...game.capabilities]);
    setShowCapsDialog(true);
  };

  const toggleEditCap = (cap: string) => {
    setEditCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);
  };

  const confirmCapsChange = () => {
    if (!selectedGame) return;
    if (editCaps.length === 0) {
      toast({ variant: 'destructive', title: 'ERROR', description: 'At least one capability is required' });
      return;
    }
    startTransition(async () => {
      const result = await updateGameCapabilities(selectedGame.slug, editCaps);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'ERROR', description: result.error });
      } else {
        toast({ title: 'SUCCESS', description: 'Capabilities updated' });
      }
      setShowCapsDialog(false);
      setSelectedGame(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground uppercase font-medium">
          {games.length} GAME{games.length !== 1 ? 'S' : ''} REGISTERED
        </div>
        <Button onClick={handleOpenAddDialog} data-testid="button-add-game">
          <Plus className="w-4 h-4 mr-2" />
          ADD GAME
        </Button>
      </div>

      <div className="space-y-3">
        {games.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold uppercase">NO GAMES REGISTERED</p>
              <p className="text-sm mt-1">Click ADD GAME to register your first game.</p>
            </CardContent>
          </Card>
        ) : (
          games.map((game) => (
            <Link key={game.slug} href={`/dashboard/${game.slug}`} className="block">
              <Card 
                data-testid={`card-game-manage-${game.slug}`}
                className="hover-elevate cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{game.name}</h3>
                        {game.active ? (
                          <Badge variant="default" data-testid={`status-active-${game.slug}`}>ACTIVE</Badge>
                        ) : (
                          <Badge variant="destructive" data-testid={`status-active-${game.slug}`}>INACTIVE</Badge>
                        )}
                        {game.maintenance && <Badge variant="secondary" data-testid={`status-maintenance-${game.slug}`}>MAINTENANCE</Badge>}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
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

                    <div className="flex gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => copyApiBase(game.slug)}
                              data-testid={`button-copy-api-${game.slug}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy API base URL</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleOpenCapsDialog(game)}
                              disabled={isPending}
                              data-testid={`button-edit-caps-${game.slug}`}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit capabilities</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEditMotd(game)}
                              disabled={isPending}
                              data-testid={`button-motd-${game.slug}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit message of the day</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleToggleMaintenance(game)}
                              disabled={isPending}
                              data-testid={`button-maintenance-${game.slug}`}
                            >
                              <Wrench className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{game.maintenance ? 'Disable maintenance mode' : 'Enable maintenance mode'}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleToggleActive(game)}
                              disabled={isPending}
                              data-testid={`button-toggle-active-${game.slug}`}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{game.active ? 'Deactivate game' : 'Activate game'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
            <Button variant="outline" onClick={() => setShowMotdDialog(false)} data-testid="button-motd-cancel">
              CANCEL
            </Button>
            <Button onClick={confirmMotdChange} disabled={isPending} data-testid="button-motd-save">
              {isPending ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ADD NEW GAME</DialogTitle>
            <DialogDescription>
              Register a new game on the platform. The slug is used for API routes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">Game Name</label>
              <Input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Game"
                data-testid="input-new-game-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">Slug</label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-awesome-game"
                className="font-mono"
                data-testid="input-new-game-slug"
              />
              <p className="text-xs text-muted-foreground">API routes: /api/{newSlug || '...'}/</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CAPABILITIES.map((cap) => (
                  <Button
                    key={cap}
                    size="sm"
                    variant={newCaps.includes(cap) ? 'default' : 'outline'}
                    onClick={() => toggleNewCap(cap)}
                    data-testid={`button-new-cap-${cap}`}
                  >
                    {cap.toUpperCase()}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select which features this game uses.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-add-game-cancel">
              CANCEL
            </Button>
            <Button onClick={confirmAddGame} disabled={isPending || !newName.trim() || !newSlug.trim() || newCaps.length === 0} data-testid="button-add-game-confirm">
              {isPending ? 'CREATING...' : 'CREATE GAME'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCapsDialog} onOpenChange={setShowCapsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EDIT CAPABILITIES</DialogTitle>
            <DialogDescription>
              Update capabilities for {selectedGame?.name}. At least one must be selected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {ALL_CAPABILITIES.map((cap) => (
              <Button
                key={cap}
                size="sm"
                variant={editCaps.includes(cap) ? 'default' : 'outline'}
                onClick={() => toggleEditCap(cap)}
                data-testid={`button-edit-cap-${cap}`}
              >
                {cap.toUpperCase()}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCapsDialog(false)} data-testid="button-caps-cancel">
              CANCEL
            </Button>
            <Button onClick={confirmCapsChange} disabled={isPending || editCaps.length === 0} data-testid="button-caps-save">
              {isPending ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
