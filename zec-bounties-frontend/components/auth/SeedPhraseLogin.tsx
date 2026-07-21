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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { backendUrl } from "@/lib/configENV";
import { deriveKeyPair, isValidMnemonic, signNonce } from "@/lib/seed-auth";

interface SeedPhraseLoginProps {
  onAuthenticated: (token: string, user: any) => void;
}

export function SeedPhraseLogin({ onAuthenticated }: SeedPhraseLoginProps) {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidMnemonic(phrase)) {
      setError(
        "That doesn't look like a valid recovery phrase. Check spelling and word order.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const { privateKey, publicKey } = await deriveKeyPair(phrase);

      // 1. Request a single-use challenge nonce for this public key.
      const challengeRes = await fetch(
        `${backendUrl}/auth/key/challenge?publicKey=${encodeURIComponent(publicKey)}`,
      );
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        // Generic message on purpose — don't reveal whether this identity exists.
        throw new Error(
          "Sign in failed. Check your recovery phrase and try again.",
        );
      }

      // 2. Sign the nonce with the derived private key.
      const signature = await signNonce(privateKey, challengeData.nonce);

      // 3. Exchange the signature for a session token.
      const loginRes = await fetch(`${backendUrl}/auth/key/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          signature,
          message: challengeData.nonce,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(
          "Sign in failed. Check your recovery phrase and try again.",
        );
      }

      setPhrase(""); // clear from memory as soon as we're done with it
      onAuthenticated(loginData.token, loginData.user);
    } catch (err: any) {
      console.error("Seed phrase login error:", err);
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Sign in with Recovery Phrase
        </CardTitle>
        <CardDescription>
          Enter your 24-word phrase, in order, separated by spaces.
        </CardDescription>
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

          <div className="space-y-2">
            <Label htmlFor="phrase">Recovery phrase</Label>
            <Textarea
              id="phrase"
              placeholder="word1 word2 word3 ..."
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="bg-muted/50 border font-mono min-h-24"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-medium"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
