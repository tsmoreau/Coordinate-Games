"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <img
            src="/birb001.png"
            alt="Bird Wars"
            className="w-16 h-16 rounded-md object-cover mx-auto mb-4"
          />
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wide mb-2">
            Bird Wars Roost
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access the admin dashboard
          </p>
        </div>
        <Button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full"
          data-testid="button-google-signin"
        >
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
