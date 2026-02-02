"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Gamepad2 } from "lucide-react";

export default function Nav() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <header className="border-b border-border bg-card top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Gamepad2 className="w-7 h-7 text-primary" />
            <span className="font-mono text-lg font-bold uppercase tracking-tight">
              coordinate.games
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/battles"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-battles"
            >
              Battles
            </Link>
            <Link
              href="/schema"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-api-docs"
            >
              API
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-dashboard"
              >
                Dashboard
              </Link>
            )}
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="ml-2"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                ) : (
                  <Link href="/login" data-testid="link-login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
