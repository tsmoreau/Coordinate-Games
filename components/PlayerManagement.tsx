'use client';

import { useState, useTransition } from 'react';
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
  Ban,
  UserCheck,
  Pencil,
  Trash2,
  Gamepad2,
  Clock,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  banPlayer,
  unbanPlayer,
  forceNameChange,
  changeAvatar,
  deletePlayer,
  AdminPlayerDetails,
} from '@/app/actions/admin';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import PlayerDetailDialog from '@/components/PlayerDetailDialog';

interface PlayerManagementProps {
  players: AdminPlayerDetails[];
  gameSlug: string;
  gameAvatars: string[];
}

export default function PlayerManagement({ players, gameSlug, gameAvatars }: PlayerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [isPending, startTransition] = useTransition();

  const [editingPlayer, setEditingPlayer] = useState<AdminPlayerDetails | null>(null);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailPlayer, setDetailPlayer] = useState<AdminPlayerDetails | null>(null);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.deviceId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && player.isActive) ||
      (filterStatus === 'banned' && !player.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleBan = (player: AdminPlayerDetails) => {
    setEditingPlayer(player);
    setShowBanDialog(true);
  };

  const confirmBan = () => {
    if (!editingPlayer) return;
    
    startTransition(async () => {
      const result = editingPlayer.isActive 
        ? await banPlayer(gameSlug, editingPlayer.deviceId)
        : await unbanPlayer(gameSlug, editingPlayer.deviceId);
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Operation failed',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: editingPlayer.isActive ? 'Player banned' : 'Player unbanned',
        });
      }
      setShowBanDialog(false);
      setEditingPlayer(null);
    });
  };

  const handleNameEdit = (player: AdminPlayerDetails) => {
    setEditingPlayer(player);
    setNewName(player.displayName);
    setShowNameDialog(true);
  };

  const confirmNameChange = () => {
    if (!editingPlayer || !newName.trim()) return;
    
    startTransition(async () => {
      const result = await forceNameChange(gameSlug, editingPlayer.deviceId, newName.trim());
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Failed to change name',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: 'Player name changed',
        });
      }
      setShowNameDialog(false);
      setEditingPlayer(null);
      setNewName('');
    });
  };

  const handleAvatarEdit = (player: AdminPlayerDetails) => {
    setEditingPlayer(player);
    setNewAvatar(player.avatar);
    setShowAvatarDialog(true);
  };

  const confirmAvatarChange = () => {
    if (!editingPlayer || !newAvatar) return;
    
    startTransition(async () => {
      const result = await changeAvatar(gameSlug, editingPlayer.deviceId, newAvatar);
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Failed to change avatar',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: 'Avatar changed',
        });
      }
      setShowAvatarDialog(false);
      setEditingPlayer(null);
      setNewAvatar('');
    });
  };

  const handleDelete = (player: AdminPlayerDetails) => {
    setEditingPlayer(player);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!editingPlayer) return;
    
    startTransition(async () => {
      const result = await deletePlayer(gameSlug, editingPlayer.deviceId);
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Failed to delete player',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: 'Player deleted',
        });
      }
      setShowDeleteDialog(false);
      setEditingPlayer(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-players"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'banned') => setFilterStatus(value)}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-player-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL PLAYERS</SelectItem>
            <SelectItem value="active">ACTIVE ONLY</SelectItem>
            <SelectItem value="banned">BANNED ONLY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground uppercase font-medium">
        {filteredPlayers.length} PLAYER{filteredPlayers.length !== 1 ? 'S' : ''} FOUND
      </div>

      <div className="space-y-3">
        {filteredPlayers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold uppercase">NO PLAYERS FOUND</p>
            </CardContent>
          </Card>
        ) : (
          filteredPlayers.map((player) => (
            <Card
              key={player.deviceId}
              data-testid={`card-player-${player.deviceId}`}
              className="cursor-pointer hover-elevate transition-colors"
              onClick={() => { setDetailPlayer(player); setShowDetailDialog(true); }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold uppercase text-muted-foreground">{player.avatar.substring(0, 4)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold uppercase tracking-tight truncate">
                          {player.displayName}
                        </h3>
                        {!player.isActive && (
                          <Badge variant="destructive">BANNED</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{player.deviceId}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(player.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold">{player.stats.wins}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">WINS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{player.stats.losses}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">LOSSES</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{player.stats.totalBattles}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">TOTAL</div>
                      </div>
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAvatarEdit(player)}
                              disabled={isPending}
                              data-testid={`button-edit-avatar-${player.deviceId}`}
                            >
                              <Gamepad2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Change Avatar</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNameEdit(player)}
                              disabled={isPending}
                              data-testid={`button-edit-name-${player.deviceId}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Change Name</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBan(player)}
                              disabled={isPending}
                              data-testid={`button-ban-${player.deviceId}`}
                            >
                              {player.isActive ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{player.isActive ? 'Ban Player' : 'Unban Player'}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(player)}
                              disabled={isPending}
                              data-testid={`button-delete-player-${player.deviceId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Player</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CHANGE PLAYER NAME</DialogTitle>
            <DialogDescription>
              Force a name change for {editingPlayer?.displayName}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New display name"
            maxLength={100}
            data-testid="input-new-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameDialog(false)}>
              CANCEL
            </Button>
            <Button onClick={confirmNameChange} disabled={isPending || !newName.trim()}>
              {isPending ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CHANGE AVATAR</DialogTitle>
            <DialogDescription>
              Select a new avatar for {editingPlayer?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
            {gameAvatars.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setNewAvatar(avatar)}
                className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  newAvatar === avatar
                    ? 'border-foreground bg-muted'
                    : 'border-transparent hover:border-foreground/20'
                }`}
                data-testid={`button-avatar-${avatar}`}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{avatar.substring(0, 4)}</span>
                </div>
                <span className="text-[10px] font-bold uppercase truncate w-full text-center">{avatar}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvatarDialog(false)}>
              CANCEL
            </Button>
            <Button onClick={confirmAvatarChange} disabled={isPending || !newAvatar}>
              {isPending ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingPlayer?.isActive ? 'BAN PLAYER' : 'UNBAN PLAYER'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingPlayer?.isActive
                ? `Are you sure you want to ban ${editingPlayer?.displayName}? They will not be able to participate in battles.`
                : `Are you sure you want to unban ${editingPlayer?.displayName}? They will be able to participate in battles again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBan} disabled={isPending}>
              {isPending ? 'PROCESSING...' : editingPlayer?.isActive ? 'BAN' : 'UNBAN'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE PLAYER</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {editingPlayer?.displayName}? This action cannot be undone.
              All their turn data will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'DELETING...' : 'DELETE'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlayerDetailDialog
        player={detailPlayer}
        gameSlug={gameSlug}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
}
