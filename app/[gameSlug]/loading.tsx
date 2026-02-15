import Nav from '@/components/Nav';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 mt-8">
          <div className="h-9 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="h-4 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
