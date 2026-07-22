"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBounty } from "@/lib/bounty-context";
import { useRouter } from "next/navigation";
import { backendUrl } from "@/lib/configENV";
import { SeedPhraseLogin } from "@/components/auth/SeedPhraseLogin";
import { SeedPhraseSetup } from "@/components/auth/SeedPhraseSetup";
import { ZcashSignIn } from "@/components/auth/ZcashSignIn";

type Mode = "password" | "seed-login" | "seed-setup" | "zcash-signin";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithSession, currentUser } = useBounty();
  const router = useRouter();

  const redirectByRole = (user: any) => {
    router.push(user.role === "ADMIN" ? "/admin" : "/home");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success && result.user) {
        redirectByRole(result.user);
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedAuthenticated = async (token: string, user: any) => {
    await loginWithSession(token, user);
    redirectByRole(user);
  };

  if (mode === "seed-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-4">
          <SeedPhraseLogin onAuthenticated={handleSeedAuthenticated} />
          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline block w-full"
              onClick={() => setMode("password")}
            >
              Back to standard sign in
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline block w-full"
              onClick={() => setMode("seed-setup")}
            >
              Don't have a recovery phrase? Create one
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "seed-setup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-4">
          <SeedPhraseSetup onAuthenticated={handleSeedAuthenticated} />
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline block w-full text-center"
            onClick={() => setMode("password")}
          >
            Back to standard sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "zcash-signin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-4">
          <ZcashSignIn onAuthenticated={handleSeedAuthenticated} />
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline block w-full text-center"
            onClick={() => setMode("password")}
          >
            Back to standard sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="ZecHubBlue.png"
              alt="ZecHubBlue.png"
              style={{ height: "5rem" }}
            />
          </div>
          <CardTitle className="text-2xl font-bold">Zechub Bounties</CardTitle>
          <CardDescription>Log In to start earning bounties!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-destructive/30 bg-destructive/10">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {process.env.NODE_ENV === "development" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-muted/50 border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-muted/50 border"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </>
            )}

            <a
              href={`${backendUrl}/auth/github`}
              className="github-login-btn block"
            >
              <Button
                type="button"
                className="w-full h-11 font-medium hover:cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Login with GitHub"}
              </Button>
            </a>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={() => setMode("seed-login")}
              disabled={isLoading}
            >
              Sign in with recovery phrase
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={() => setMode("zcash-signin")}
              disabled={isLoading}
            >
              Sign in with Zcash
            </Button>

            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline block w-full text-center"
              onClick={() => setMode("seed-setup")}
            >
              Create a passwordless account instead
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
