'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AvatarImage from '@/components/AvatarImage';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import type { PlayerListEntry } from '@/app/actions/players';

interface PlayerGridProps {
  players: PlayerListEntry[];
  gameSlug: string;
}

export function PlayerGrid({ players, gameSlug }: PlayerGridProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim() === ''
    ? players
    : players.filter(p =>
        p.displayName.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <>
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No players matching &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((player) => (
            <Link
              key={player.deviceId}
              href={`/${gameSlug}/players/${encodeURIComponent(player.displayName)}`}
              className="block group"
            >
              <div className="hover:border-foreground/20 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.98] relative border border-border rounded-lg p-4 text-center">
                <div className="w-16 h-16 mx-auto mb-3">
                  <AvatarImage
                    gameSlug={gameSlug}
                    avatarId={player.avatar}
                    displayName={player.displayName}
                    size={64}
                  />
                </div>
                <p className="font-bold text-sm uppercase tracking-tight truncate">
                  {player.displayName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Joined {formatDate(player.createdAt)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(player.lastSeen)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}