import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Type, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: typeof Type;
  tags: string[];
}

const tools: Tool[] = [
  {
    slug: 'pdfontconv',
    name: 'pdfontconv',
    description: 'Convert TTF, OTF, WOFF and WOFF2 fonts into .fnt files for use with the Playdate SDK.',
    icon: Type,
    tags: ['PLAYDATE', 'FONT', 'CONVERTER'],
  },
];

export default async function ToolsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-tight -mb-1">TOOLS</h1>
          <p className="text-muted-foreground">Development utilities for the Playdate platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.slug} href={`/tools/${tool.slug}`}>
                <Card className="hover-elevate cursor-pointer h-full border-muted/40" data-testid={`card-tool-${tool.slug}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted/30 rounded-md">
                        <Icon className="h-5 w-5 text-foreground/80" />
                      </div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider">{tool.name}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tool.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-bold tracking-tight px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
