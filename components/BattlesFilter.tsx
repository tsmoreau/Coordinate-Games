'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

interface BattlesFilterProps {
  children: React.ReactNode;
}

export default function BattlesFilter({ children }: BattlesFilterProps) {
  const [filter, setFilter] = useState<string>('all');

  return (
    <div data-battle-filter={filter}>
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'pending', 'completed'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              data-testid={`filter-${status}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
