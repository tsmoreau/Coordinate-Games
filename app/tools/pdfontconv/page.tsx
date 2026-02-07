import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import Nav from '@/components/Nav';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PdfontconvTool from './PdfontconvTool';

export const dynamic = 'force-dynamic';

export default async function PdfontconvPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/tools">
              <Button variant="ghost" size="icon" data-testid="button-back-tools">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight -mb-1">PDFONTCONV</h1>
              <p className="text-muted-foreground">Convert TTF, OTF, WOFF and WOFF2 fonts into .fnt files for Playdate</p>
            </div>
          </div>
        </div>

        <PdfontconvTool />
      </main>
    </div>
  );
}
