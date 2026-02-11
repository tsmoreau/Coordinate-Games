'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Trash2,
  Flag,
  Swords,
  Clock,
  Trophy,
  Eye,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  forfeitBattle,
  deleteBattle,
  AdminBattleDetails,
} from '@/app/actions/admin';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BattleManagementProps {
  battles: AdminBattleDetails[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default">ACTIVE</Badge>;
    case 'pending':
      return <Badge variant="secondary">PENDING</Badge>;
    case 'completed':
      return <Badge variant="outline">COMPLETED</Badge>;
    case 'abandoned':
      return <Badge variant="destructive">ABANDONED</Badge>;
    default:
      return <Badge variant="outline">{status.toUpperCase()}</Badge>;
  }
}

export default function BattleManagement({ battles }: BattleManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  const [selectedBattle, setSelectedBattle] = useState<AdminBattleDetails | null>(null);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredBattles = battles.filter((battle) => {
    const matchesSearch = 
      battle.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      battle.battleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      battle.player1DisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (battle.player2DisplayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = filterStatus === 'all' || battle.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleForfeit = (battle: AdminBattleDetails) => {
    setSelectedBattle(battle);
    setShowForfeitDialog(true);
  };

  const confirmForfeit = () => {
    if (!selectedBattle) return;
    
    startTransition(async () => {
      const result = await forfeitBattle(selectedBattle.battleId);
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Failed to forfeit battle',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: selectedBattle.status === 'pending' ? 'Battle cancelled' : 'Battle forfeited',
        });
      }
      setShowForfeitDialog(false);
      setSelectedBattle(null);
    });
  };

  const handleDelete = (battle: AdminBattleDetails) => {
    setSelectedBattle(battle);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!selectedBattle) return;
    
    startTransition(async () => {
      const result = await deleteBattle(selectedBattle.battleId);
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'ERROR',
          description: result.error || 'Failed to delete battle',
        });
      } else {
        toast({
          title: 'SUCCESS',
          description: 'Battle deleted',
        });
      }
      setShowDeleteDialog(false);
      setSelectedBattle(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search battles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-battles"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-battle-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL BATTLES</SelectItem>
            <SelectItem value="active">ACTIVE</SelectItem>
            <SelectItem value="pending">PENDING</SelectItem>
            <SelectItem value="completed">COMPLETED</SelectItem>
            <SelectItem value="abandoned">ABANDONED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground uppercase font-medium">
        {filteredBattles.length} BATTLE{filteredBattles.length !== 1 ? 'S' : ''} FOUND
      </div>

      <div className="space-y-3">
        {filteredBattles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold uppercase">NO BATTLES FOUND</p>
            </CardContent>
          </Card>
        ) : (
          filteredBattles.map((battle) => (
            <Card key={battle.battleId} data-testid={`card-battle-${battle.battleId}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">{battle.player1Avatar.substring(0, 3)}</span>
                        </div>
                        {battle.player2Avatar && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground">{battle.player2Avatar.substring(0, 3)}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold uppercase tracking-tight">{battle.displayName}</h3>
                      {getStatusBadge(battle.status)}
                      {battle.isPrivate && <Badge variant="outline">PRIVATE</Badge>}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="font-bold uppercase">{battle.player1DisplayName}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-bold uppercase">
                        {battle.player2DisplayName || 'WAITING...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(battle.updatedAt)}
                      </span>
                      <span>MAP: {battle.mapName}</span>
                      <span>TURN: {battle.currentTurn}</span>
                      {battle.winnerId && (
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {battle.winnerId === battle.player1DeviceId
                            ? battle.player1DisplayName
                            : battle.player2DisplayName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/battle/${battle.displayName}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-battle-${battle.battleId}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Battle</p>
                        </TooltipContent>
                      </Tooltip>

                      {(battle.status === 'active' || battle.status === 'pending') && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleForfeit(battle)}
                              disabled={isPending}
                              data-testid={`button-forfeit-${battle.battleId}`}
                            >
                              <Flag className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{battle.status === 'pending' ? 'Cancel Battle' : 'Forfeit Battle'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(battle)}
                            disabled={isPending}
                            data-testid={`button-delete-battle-${battle.battleId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Battle</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={showForfeitDialog} onOpenChange={setShowForfeitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBattle?.status === 'pending' ? 'CANCEL BATTLE' : 'FORFEIT BATTLE'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBattle?.status === 'pending'
                ? `Are you sure you want to cancel "${selectedBattle?.displayName}"? The battle will be marked as abandoned.`
                : `Are you sure you want to forfeit "${selectedBattle?.displayName}"? The current non-turn holder will be declared the winner.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={confirmForfeit} disabled={isPending}>
              {isPending ? 'PROCESSING...' : selectedBattle?.status === 'pending' ? 'CANCEL BATTLE' : 'FORFEIT'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE BATTLE</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBattle?.displayName}"? 
              This will permanently remove the battle and all its turn history. This action cannot be undone.
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
    </div>
  );
}
