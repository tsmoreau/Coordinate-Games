import Nav from '@/components/Nav';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="border border-border rounded-lg p-6 space-y-4">
              <div className="w-24 h-24 mx-auto bg-muted animate-pulse rounded-lg" />
              <div className="h-6 w-40 mx-auto bg-muted animate-pulse rounded" />
              <div className="space-y-3 pt-4">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
