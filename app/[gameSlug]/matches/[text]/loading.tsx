import Nav from '@/components/Nav';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div>
              <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-6">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-3" />
              <div className="h-10 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-6">
              <div className="h-5 w-32 bg-muted animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-16 bg-muted animate-pulse rounded" />
                <div className="h-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
