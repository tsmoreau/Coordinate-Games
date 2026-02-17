import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Type, ArrowRight, Grid3X3, Sparkles } from 'lucide-react';

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
  {
    slug: 'dithergradient',
    name: 'Dither Gradient',
    description: 'Create 1-bit dither gradients with Bayer ordered dithering and GFXP pattern output for Playdate.',
    icon: Grid3X3,
    tags: ['PLAYDATE', 'DITHER', 'GRADIENT', 'GFXP'],
  },
  {
    slug: 'particlesizzler',
    name: 'Particle Sizzler',
    description: 'Generate pre-baked particle effect spritesheets with full simulation. Exports Playdate ImageTable PNGs.',
    icon: Sparkles,
    tags: ['PLAYDATE', 'PARTICLES', 'SPRITESHEET', 'VFX'],
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.slug} href={`/tools/${tool.slug}`}>
                <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-tool-${tool.slug}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium uppercase">{tool.name}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
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