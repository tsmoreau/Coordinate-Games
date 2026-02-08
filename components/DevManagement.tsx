'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Code,
  Key,
  Gamepad2,
  Eye,
  Ban,
  CheckCircle,
  Copy,
  Mail,
  Calendar,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MockGame {
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

interface MockDev {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'revoked';
  games: MockGame[];
  keys: number;
  joined: string;
  apiKey: string;
}

const MOCK_DEVS: MockDev[] = [
  {
    id: 'alex-chen',
    name: 'Alex Chen',
    email: 'alex@studioforge.dev',
    status: 'active',
    games: [
      { name: 'Bird Wars', slug: 'bird-wars', status: 'active' },
      { name: 'Dungeon Dash', slug: 'dungeon-dash', status: 'active' },
    ],
    keys: 2,
    joined: 'Jan 12, 2026',
    apiKey: 'cg_live_ak8x2mQ9...',
  },
  {
    id: 'maria-santos',
    name: 'Maria Santos',
    email: 'maria@pixelbound.io',
    status: 'active',
    games: [
      { name: 'Pixel Pets', slug: 'pixel-pets', status: 'active' },
    ],
    keys: 2,
    joined: 'Jan 18, 2026',
    apiKey: 'cg_live_mS4pLx7f...',
  },
  {
    id: 'jordan-blake',
    name: 'Jordan Blake',
    email: 'jordan@nightowlgames.com',
    status: 'active',
    games: [],
    keys: 1,
    joined: 'Feb 01, 2026',
    apiKey: 'cg_live_jB9kTn3w...',
  },
  {
    id: 'sam-patel',
    name: 'Sam Patel',
    email: 'sam@indiearcade.co',
    status: 'pending',
    games: [],
    keys: 0,
    joined: 'Feb 06, 2026',
    apiKey: '',
  },
];

export default function DevManagement() {
  const [selectedDev, setSelectedDev] = useState<MockDev | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  const devs = MOCK_DEVS;
  const activeCount = devs.filter(d => d.status === 'active').length;
  const pendingCount = devs.filter(d => d.status === 'pending').length;
  const totalKeys = devs.reduce((sum, d) => sum + d.keys, 0);
  const totalGames = devs.reduce((sum, d) => sum + d.games.length, 0);

  const handleView = (dev: MockDev) => {
    setSelectedDev(dev);
    setShowViewDialog(true);
  };

  const handleRevoke = (dev: MockDev) => {
    setSelectedDev(dev);
    setShowRevokeDialog(true);
  };

  const handleApprove = (dev: MockDev) => {
    setSelectedDev(dev);
    setShowApproveDialog(true);
  };

  const confirmRevoke = () => {
    toast({ variant: 'destructive', title: 'ACCESS REVOKED', description: `${selectedDev?.name}'s access has been revoked` });
    setShowRevokeDialog(false);
    setSelectedDev(null);
  };

  const confirmApprove = () => {
    toast({ title: 'DEVELOPER APPROVED', description: `${selectedDev?.name} has been approved and notified` });
    setShowApproveDialog(false);
    setSelectedDev(null);
  };

  const handleInvite = () => {
    setInviteName('');
    setGeneratedKey('');
    setShowInviteDialog(true);
  };

  const generateNewKey = () => {
    if (!inviteName.trim()) {
      toast({ variant: 'destructive', title: 'ERROR', description: 'Please enter a name for the key' });
      return;
    }
    const key = `cg_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setGeneratedKey(key);
    toast({ title: 'KEY GENERATED', description: `Provisioning key for ${inviteName}` });
  };

  const confirmInvite = () => {
    toast({ title: 'ACCESS GRANTED', description: `Temporary access key generated for ${inviteName}` });
    setShowInviteDialog(false);
    setInviteName('');
    setGeneratedKey('');
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'COPIED', description: 'API key copied to clipboard' });
  };

  const statusVariant = (status: string) => {
    if (status === 'active') return 'default' as const;
    if (status === 'pending') return 'secondary' as const;
    return 'destructive' as const;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">REGISTERED DEVS</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-devs">{devs.length}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-dev-summary">
              {activeCount} active, {pendingCount} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">API KEYS ISSUED</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-api-keys">{totalKeys}</div>
            <p className="text-xs text-muted-foreground">Across all developers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">DEV-REGISTERED GAMES</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-dev-games">{totalGames}</div>
            <p className="text-xs text-muted-foreground">Via developer portal</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground uppercase font-medium">
          {devs.length} DEVELOPER{devs.length !== 1 ? 'S' : ''} REGISTERED
        </div>
        <Button onClick={handleInvite} data-testid="button-invite-dev">
          <Key className="w-4 h-4 mr-2" />
          PROVISION ACCESS
        </Button>
      </div>

      <div className="space-y-3">
        {devs.map((dev) => (
          <Card
            key={dev.id}
            data-testid={`card-dev-${dev.id}`}
          >
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-muted-foreground">
                      <Code className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold uppercase tracking-tight" data-testid={`text-dev-name-${dev.id}`}>{dev.name}</h3>
                    <Badge variant={statusVariant(dev.status)} data-testid={`badge-dev-status-${dev.id}`}>
                      {dev.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
                    <span className="flex items-center gap-1" data-testid={`text-dev-email-${dev.id}`}>
                      <Mail className="w-3 h-3" />
                      {dev.email}
                    </span>
                    <span className="flex items-center gap-1" data-testid={`text-dev-joined-${dev.id}`}>
                      <Calendar className="w-3 h-3" />
                      {dev.joined}
                    </span>
                    <span className="flex items-center gap-1" data-testid={`text-dev-keys-${dev.id}`}>
                      <Key className="w-3 h-3" />
                      {dev.keys} key{dev.keys !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1" data-testid={`text-dev-games-${dev.id}`}>
                      <Gamepad2 className="w-3 h-3" />
                      {dev.games.length} game{dev.games.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {dev.games.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dev.games.map((game) => (
                        <Badge key={game.slug} variant="outline" className="text-[10px]" data-testid={`badge-dev-game-${dev.id}-${game.slug}`}>
                          {game.name.toUpperCase()}
                          {game.status === 'inactive' && ' (INACTIVE)'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleView(dev)}
                    data-testid={`button-view-dev-${dev.id}`}
                    title="View developer details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {dev.status === 'pending' ? (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleApprove(dev)}
                      data-testid={`button-approve-dev-${dev.id}`}
                      title="Approve developer"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  ) : dev.status === 'active' ? (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleRevoke(dev)}
                      data-testid={`button-revoke-dev-${dev.id}`}
                      title="Revoke developer access"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase">DEVELOPER DETAILS</DialogTitle>
            <DialogDescription>
              Viewing profile for {selectedDev?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDev && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-muted-foreground">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold uppercase">{selectedDev.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedDev.email}</p>
                </div>
                <Badge variant={statusVariant(selectedDev.status)} className="ml-auto">
                  {selectedDev.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground uppercase text-xs font-medium">JOINED</p>
                  <p className="font-medium">{selectedDev.joined}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-xs font-medium">API KEYS</p>
                  <p className="font-medium">{selectedDev.keys}</p>
                </div>
              </div>

              {selectedDev.apiKey && (
                <div>
                  <p className="text-muted-foreground uppercase text-xs font-medium mb-1">LATEST API KEY</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded-md flex-1" data-testid="text-dev-apikey">
                      {selectedDev.apiKey}
                    </code>
                    <Button size="icon" variant="ghost" onClick={() => copyApiKey(selectedDev.apiKey)} data-testid="button-copy-apikey">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-muted-foreground uppercase text-xs font-medium mb-2">REGISTERED GAMES ({selectedDev.games.length})</p>
                {selectedDev.games.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No games registered yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDev.games.map((game) => (
                      <div key={game.slug} className="flex items-center justify-between gap-4 p-2 rounded-md border">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium uppercase">{game.name}</span>
                        </div>
                        <Badge variant={game.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                          {game.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} data-testid="button-view-close">
              CLOSE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase">APPROVE DEVELOPER</DialogTitle>
            <DialogDescription>
              Approve {selectedDev?.name} ({selectedDev?.email}) to access the developer portal? They will be able to register games and issue API keys.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} data-testid="button-approve-cancel">
              CANCEL
            </Button>
            <Button onClick={confirmApprove} data-testid="button-approve-confirm">
              APPROVE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase">REVOKE ACCESS</DialogTitle>
            <DialogDescription>
              Revoke {selectedDev?.name}&apos;s developer access? Their API keys will be invalidated and games will be set to maintenance mode.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)} data-testid="button-revoke-cancel">
              CANCEL
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} data-testid="button-revoke-confirm">
              REVOKE ACCESS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase">PROVISION DEVELOPER ACCESS</DialogTitle>
            <DialogDescription>
              Generate a temporary access key to provision a new developer account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase">Developer Name / Team</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Studio Forge"
                data-testid="input-invite-name"
              />
            </div>
            
            {generatedKey ? (
              <div className="space-y-2">
                <label className="text-sm font-medium uppercase">Generated Access Key</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-2 rounded-md flex-1 break-all">
                    {generatedKey}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => copyApiKey(generatedKey)} data-testid="button-copy-generated-key">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Share this key with the developer. It will allow them to claim their account.
                </p>
              </div>
            ) : (
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={generateNewKey}
                disabled={!inviteName.trim()}
                data-testid="button-generate-key"
              >
                GENERATE ACCESS KEY
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} data-testid="button-invite-cancel">
              CANCEL
            </Button>
            <Button onClick={confirmInvite} disabled={!generatedKey} data-testid="button-invite-confirm">
              DONE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
