import { getBattles } from '@/app/actions/battles';
import BattlesList from '@/components/BattlesList';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function BattlesPage() {
  const battles = await getBattles();

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Battles</h1>
            <p className="text-muted-foreground">View and manage all battle sessions</p>
          </div>
        </div>

        <BattlesList 
          battles={battles} 
          emptyMessage="Start a new battle from your Playdate device to see it here."
        />
      </main>
    </div>
  );
}
