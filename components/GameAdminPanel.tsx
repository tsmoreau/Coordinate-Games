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
  UserSearch,
  BookType,
  Save,
  Tag,
  Trophy,
  Database
} from 'lucide-react';
import { 
  recoverPlayerByDeviceId, 
  resetAllBattles, 
  purgeAllBattles,
  purgeAllScores,
  purgeAllData,
  unbanAllPlayers,
  toggleGameMaintenance,
  updateGameMotd,
  updateGameHaikunator,
  updateGameVersioning
} from '@/app/actions/admin';
import type { AdminPlayerDetails } from '@/app/actions/admin';

interface GameAdminPanelProps {
  gameSlug: string;
  gameName: string;
  capabilities: string[];
  maintenance: boolean;
  motd: string | null;
  haikunator: { adjectives: string[]; nouns: string[] } | null;
  versioning: { minVersion: string; currentVersion: string; updateUrl: string | null } | null;
}

export default function GameAdminPanel({ gameSlug, gameName, capabilities, maintenance, motd, haikunator, versioning }: GameAdminPanelProps) {
  const [deviceIdSearch, setDeviceIdSearch] = useState('');
  const [recoveredPlayer, setRecoveredPlayer] = useState<AdminPlayerDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const [motdInput, setMotdInput] = useState(motd || '');

  const [adjectives, setAdjectives] = useState((haikunator?.adjectives ?? []).join('\n'));
  const [nouns, setNouns] = useState((haikunator?.nouns ?? []).join('\n'));

  const [minVersion, setMinVersion] = useState(versioning?.minVersion ?? '');
  const [currentVersion, setCurrentVersion] = useState(versioning?.currentVersion ?? '');
  const [updateUrl, setUpdateUrl] = useState(versioning?.updateUrl ?? '');

  const hasAsync = capabilities.includes('async');
  const hasLeaderboard = capabilities.includes('leaderboard');
  const hasData = capabilities.includes('data');

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
      case 'purgeScores':
        result = await purgeAllScores(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Deleted ${result.deleted} scores permanently` });
        } else {
          setActionResult({ type: 'error', message: result.error || 'Failed' });
        }
        break;
      case 'purgeData':
        result = await purgeAllData(gameSlug);
        if (result.success) {
          setActionResult({ type: 'success', message: `Deleted ${result.deleted} data entries permanently` });
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

  async function handleSaveHaikunator() {
    setActionLoading('haikunator');
    const adjList = adjectives.split('\n').map(w => w.trim()).filter(Boolean);
    const nounList = nouns.split('\n').map(w => w.trim()).filter(Boolean);
    const result = await updateGameHaikunator(gameSlug, adjList, nounList);
    if (result.success) {
      setActionResult({ type: 'success', message: `Word lists saved (${adjList.length} adjectives, ${nounList.length} nouns)` });
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to save word lists' });
    }
    setActionLoading(null);
  }

  async function handleSaveVersioning() {
    setActionLoading('versioning');
    const result = await updateGameVersioning(gameSlug, minVersion, currentVersion, updateUrl);
    if (result.success) {
      setActionResult({ type: 'success', message: 'Versioning updated' });
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to update versioning' });
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
          <CardTitle className="uppercase flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            DANGER ZONE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAsync && (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
                <div>
                  <div className="font-medium text-sm uppercase">RESET BATTLES</div>
                  <div className="text-xs text-muted-foreground">Cancels all active and pending battles. Completed battles remain.</div>
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
                  <div className="font-medium text-sm uppercase">PURGE BATTLES</div>
                  <div className="text-xs text-muted-foreground">Permanently deletes all battles including history. This cannot be undone.</div>
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
            </>
          )}

          {hasLeaderboard && (
            <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm uppercase">PURGE SCORES</div>
                <div className="text-xs text-muted-foreground">Permanently deletes all score submissions and leaderboard data. This cannot be undone.</div>
              </div>
              <Button 
                variant={confirmAction === 'purgeScores' ? 'destructive' : 'outline'}
                onClick={() => handleAction('purgeScores')}
                disabled={actionLoading !== null}
                data-testid="button-purge-scores"
              >
                <Trophy className="w-4 h-4 mr-2" />
                {confirmAction === 'purgeScores' ? 'CONFIRM PURGE' : 'PURGE SCORES'}
              </Button>
            </div>
          )}

          {hasData && (
            <div className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm uppercase">PURGE DATA</div>
                <div className="text-xs text-muted-foreground">Permanently deletes all key-value data entries. This cannot be undone.</div>
              </div>
              <Button 
                variant={confirmAction === 'purgeData' ? 'destructive' : 'outline'}
                onClick={() => handleAction('purgeData')}
                disabled={actionLoading !== null}
                data-testid="button-purge-data"
              >
                <Database className="w-4 h-4 mr-2" />
                {confirmAction === 'purgeData' ? 'CONFIRM PURGE' : 'PURGE DATA'}
              </Button>
            </div>
          )}

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

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <Tag className="w-5 h-5" />
            VERSIONING
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control client version requirements for {gameName}. The ping endpoint returns these values so clients can check for updates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">MIN VERSION</label>
              <Input
                placeholder="1.0.0"
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                data-testid="input-min-version"
              />
              <p className="text-xs text-muted-foreground">
                Oldest client version allowed to connect
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">CURRENT VERSION</label>
              <Input
                placeholder="1.0.0"
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                data-testid="input-current-version"
              />
              <p className="text-xs text-muted-foreground">
                Latest available client version
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">UPDATE URL</label>
              <Input
                placeholder="https://..."
                value={updateUrl}
                onChange={(e) => setUpdateUrl(e.target.value)}
                data-testid="input-update-url"
              />
              <p className="text-xs text-muted-foreground">
                Where players can download the update
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveVersioning}
              disabled={actionLoading === 'versioning'}
              data-testid="button-save-versioning"
            >
              <Save className="w-4 h-4 mr-2" />
              {actionLoading === 'versioning' ? 'SAVING...' : 'SAVE VERSIONING'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Clear all three fields and save to remove versioning
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="uppercase flex items-center gap-2">
            <BookType className="w-5 h-5" />
            NAME GENERATOR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure the word lists used to generate random display names for players and battles in {gameName}. Enter one word per line.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">ADJECTIVES</label>
              <textarea
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder={"brave\nswift\nfierce\n..."}
                value={adjectives}
                onChange={(e) => setAdjectives(e.target.value)}
                data-testid="textarea-adjectives"
              />
              <p className="text-xs text-muted-foreground">
                {adjectives.split('\n').filter(w => w.trim()).length} words
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">NOUNS</label>
              <textarea
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder={"eagle\nwolf\ndragon\n..."}
                value={nouns}
                onChange={(e) => setNouns(e.target.value)}
                data-testid="textarea-nouns"
              />
              <p className="text-xs text-muted-foreground">
                {nouns.split('\n').filter(w => w.trim()).length} words
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveHaikunator}
              disabled={actionLoading === 'haikunator'}
              data-testid="button-save-haikunator"
            >
              <Save className="w-4 h-4 mr-2" />
              {actionLoading === 'haikunator' ? 'SAVING...' : 'SAVE WORD LISTS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}