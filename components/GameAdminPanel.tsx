'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  RotateCcw,
  Wrench,
  UserSearch
} from 'lucide-react';
import { 
  recoverPlayerByDeviceId, 
  resetAllBattles, 
  purgeAllBattles, 
  unbanAllPlayers,
  toggleGameMaintenance,
  updateGameMotd
} from '@/app/actions/admin';
import type { AdminPlayerDetails } from '@/app/actions/admin';

interface GameAdminPanelProps {
  gameSlug: string;
  gameName: string;
  maintenance: boolean;
  motd: string | null;
}

export default function GameAdminPanel({ gameSlug, gameName, maintenance, motd }: GameAdminPanelProps) {
  const [deviceIdSearch, setDeviceIdSearch] = useState('');
  const [recoveredPlayer, setRecoveredPlayer] = useState<AdminPlayerDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const [motdInput, setMotdInput] = useState(motd || '');

  async function handleRecoverPlayer() {
    if (!deviceIdSearch.trim()) return;
    setSearching(true);
    setSearchError(null);
    setRecoveredPlayer(null);
    
    const result = await recoverPlayerByDeviceId(gameSlug, deviceIdSearch.trim());
    if (result.success && result.data) {
      setRecoveredPlayer(result.data);
    } else {
      setSearchError(result.error || 'Player not found');
    }
    setSearching(false);
  }

  async function handleAction(action: string) {
    if (confirmAction !== action) {
      setConfirmAction(action);
      return;
    }

    setActionLoading(action);
    setActionResult(null);
    setConfirmAction(null);

    let result;
    switch (action) {
      case 'resetBattles':
        result = await resetAllBattles(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Cancelled ${result.affected} active/pending battles` });
        } else {
          setActionResult({ type: 'error', message: result.error || 'Failed' });
        }
        break;
      case 'purgeBattles':
        result = await purgeAllBattles(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Deleted ${result.deleted} battles permanently` });
        } else {
          setActionResult({ type: 'error', message: result.error || 'Failed' });
        }
        break;
      case 'unbanAll':
        result = await unbanAllPlayers(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Unbanned ${result.affected} players` });
        } else {
          setActionResult({ type: 'error', message: result.error || 'Failed' });
        }
        break;
      case 'toggleMaintenance':
        result = await toggleGameMaintenance(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Maintenance mode toggled` });
        } else {
          setActionResult({ type: 'error', message: result.error || 'Failed' });
        }
        break;
    }

    setActionLoading(null);
  }

  async function handleUpdateMotd() {
    setActionLoading('motd');
    const result = await updateGameMotd(gameSlug, motdInput);
    if (result.success) {
      setActionResult({ type: 'success', message: 'MOTD updated' });
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to update MOTD' });
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      {actionResult && (
        <div className={`p-3 rounded-md text-sm ${actionResult.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
          {actionResult.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <UserSearch className="w-5 h-5" />
            ACCOUNT RECOVERY
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Look up a player by their Device ID to view account details and status.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Enter Device ID"
              value={deviceIdSearch}
              onChange={(e) => setDeviceIdSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecoverPlayer()}
              className="max-w-sm"
              data-testid="input-device-id-search"
            />
            <Button 
              onClick={handleRecoverPlayer} 
              disabled={searching || !deviceIdSearch.trim()}
              data-testid="button-search-player"
            >
              <Search className="w-4 h-4 mr-2" />
              {searching ? 'SEARCHING...' : 'SEARCH'}
            </Button>
          </div>

          {searchError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-sm">
              {searchError}
            </div>
          )}

          {recoveredPlayer && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">DISPLAY NAME</div>
                    <div className="font-medium" data-testid="text-recovered-name">{recoveredPlayer.displayName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">DEVICE ID</div>
                    <div className="font-mono text-xs" data-testid="text-recovered-deviceid">{recoveredPlayer.deviceId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">STATUS</div>
                    <Badge variant={recoveredPlayer.isActive ? 'default' : 'destructive'} data-testid="status-recovered-player">
                      {recoveredPlayer.isActive ? 'ACTIVE' : 'BANNED'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">AVATAR</div>
                    <div data-testid="text-recovered-avatar">{recoveredPlayer.avatar}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">REGISTERED</div>
                    <div data-testid="text-recovered-registered">{new Date(recoveredPlayer.registeredAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">LAST SEEN</div>
                    <div data-testid="text-recovered-lastseen">{new Date(recoveredPlayer.lastSeen).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">TOTAL BATTLES</div>
                    <div className="font-bold" data-testid="text-recovered-battles">{recoveredPlayer.stats.totalBattles}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">W / L / D</div>
                    <div className="font-bold" data-testid="text-recovered-wld">{recoveredPlayer.stats.wins} / {recoveredPlayer.stats.losses} / {recoveredPlayer.stats.draws}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase text-xs">ACTIVE BATTLES</div>
                    <div className="font-bold" data-testid="text-recovered-active-battles">{recoveredPlayer.stats.activeBattles}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            MASS RESETS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bulk operations for {gameName}. These actions affect all players and battles in this game.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm uppercase">CANCEL ALL ACTIVE BATTLES</div>
                <div className="text-xs text-muted-foreground">Abandons all active and pending battles for this game.</div>
              </div>
              <Button 
                variant={confirmAction === 'resetBattles' ? 'destructive' : 'outline'}
                onClick={() => handleAction('resetBattles')}
                disabled={actionLoading !== null}
                data-testid="button-reset-battles"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {confirmAction === 'resetBattles' ? 'CONFIRM RESET' : 'RESET BATTLES'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm uppercase">PURGE ALL BATTLE HISTORY</div>
                <div className="text-xs text-muted-foreground">Permanently deletes every battle record for this game. Cannot be undone.</div>
              </div>
              <Button 
                variant={confirmAction === 'purgeBattles' ? 'destructive' : 'outline'}
                onClick={() => handleAction('purgeBattles')}
                disabled={actionLoading !== null}
                data-testid="button-purge-battles"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {confirmAction === 'purgeBattles' ? 'CONFIRM PURGE' : 'PURGE BATTLES'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm uppercase">UNBAN ALL PLAYERS</div>
                <div className="text-xs text-muted-foreground">Reactivates all banned players for this game.</div>
              </div>
              <Button 
                variant={confirmAction === 'unbanAll' ? 'destructive' : 'outline'}
                onClick={() => handleAction('unbanAll')}
                disabled={actionLoading !== null}
                data-testid="button-unban-all"
              >
                <Shield className="w-4 h-4 mr-2" />
                {confirmAction === 'unbanAll' ? 'CONFIRM UNBAN' : 'UNBAN ALL'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            MAINTENANCE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
            <div>
              <div className="font-medium text-sm uppercase">MAINTENANCE MODE</div>
              <div className="text-xs text-muted-foreground">
                Currently: <Badge variant={maintenance ? 'destructive' : 'secondary'}>{maintenance ? 'ON' : 'OFF'}</Badge>
              </div>
            </div>
            <Button 
              variant={confirmAction === 'toggleMaintenance' ? 'destructive' : 'outline'}
              onClick={() => handleAction('toggleMaintenance')}
              disabled={actionLoading !== null}
              data-testid="button-toggle-maintenance"
            >
              <Wrench className="w-4 h-4 mr-2" />
              {confirmAction === 'toggleMaintenance' ? 'CONFIRM TOGGLE' : (maintenance ? 'DISABLE' : 'ENABLE')}
            </Button>
          </div>

          <div className="p-3 border rounded-md space-y-3">
            <div className="font-medium text-sm uppercase">MESSAGE OF THE DAY</div>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Set MOTD for this game"
                value={motdInput}
                onChange={(e) => setMotdInput(e.target.value)}
                className="max-w-md"
                data-testid="input-motd"
              />
              <Button 
                onClick={handleUpdateMotd}
                disabled={actionLoading === 'motd'}
                data-testid="button-update-motd"
              >
                {actionLoading === 'motd' ? 'SAVING...' : 'UPDATE MOTD'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
