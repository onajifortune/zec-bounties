"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Check, Copy } from "lucide-react";
import { backendUrl } from "@/lib/configENV";
import {
  generateMnemonic,
  deriveKeyPair,
  normalizeMnemonic,
} from "@/lib/seed-auth";

type Step = "intro" | "reveal" | "confirm" | "done";

interface SeedPhraseSetupProps {
  /** Called once registration succeeds with the server's token + user. */
  onAuthenticated: (token: string, user: any) => void;
  displayName?: string;
}

export function SeedPhraseSetup({
  onAuthenticated,
  displayName = "",
}: SeedPhraseSetupProps) {
  const [step, setStep] = useState<Step>("intro");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(displayName);

  // Pick 3 distinct random word positions to quiz the user on before continuing.
  const quizIndices = useMemo(() => {
    if (!mnemonic) return [];
    const words = mnemonic.split(" ");
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * words.length));
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [mnemonic]);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handleGenerate = () => {
    setMnemonic(generateMnemonic());
    setStep("reveal");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmContinue = () => {
    setError("");
    const words = mnemonic.split(" ");
    const allCorrect = quizIndices.every(
      (i) => quizAnswers[i]?.trim().toLowerCase() === words[i],
    );
    if (!allCorrect) {
      setError(
        "One or more words don't match. Check your backup and try again.",
      );
      return;
    }
    handleRegister();
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError("");
    try {
      const { privateKey, publicKey } = await deriveKeyPair(mnemonic);

      const res = await fetch(`${backendUrl}/auth/key/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, name: name || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      // Private key stays in memory for this session only — it is never
      // persisted (localStorage/IndexedDB) by this component. The user
      // authenticates again with their phrase next time. See README for
      // an optional "remember this device" extension.
      void privateKey;

      setStep("done");
      onAuthenticated(data.token, data.user);
    } catch (err: any) {
      console.error("Seed phrase registration error:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Create a Recovery Phrase
        </CardTitle>
        <CardDescription>
          No email, no password. Your recovery phrase is the only way in.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {step === "intro" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name (optional)</Label>
              <Input
                id="display-name"
                placeholder="Anonymous"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/50 border"
              />
            </div>
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                We'll generate a 24-word recovery phrase. It never leaves your
                device and we never store it. If you lose it, we cannot recover
                your account — there is no email reset.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full h-11 font-medium"
              onClick={handleGenerate}
            >
              Generate Recovery Phrase
            </Button>
          </>
        )}

        {step === "reveal" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground w-4 text-right">
                    {i + 1}.
                  </span>
                  <span className="font-mono">{w}</span>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy to clipboard
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Write this down and store it somewhere safe (offline, ideally).
              Anyone with these words can access your account.
            </p>
            <Button
              className="w-full h-11 font-medium"
              onClick={() => setStep("confirm")}
            >
              I've saved it — continue
            </Button>
          </>
        )}

        {step === "confirm" && (
          <>
            <p className="text-sm text-muted-foreground">
              Confirm your backup by entering the requested words.
            </p>
            {quizIndices.map((i) => (
              <div className="space-y-1" key={i}>
                <Label htmlFor={`word-${i}`}>Word #{i + 1}</Label>
                <Input
                  id={`word-${i}`}
                  className="bg-muted/50 border font-mono"
                  value={quizAnswers[i] || ""}
                  onChange={(e) =>
                    setQuizAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  autoComplete="off"
                />
              </div>
            ))}
            <Button
              className="w-full h-11 font-medium"
              disabled={isLoading}
              onClick={handleConfirmContinue}
            >
              {isLoading ? "Creating account..." : "Confirm & Create Account"}
            </Button>
          </>
        )}

        {step === "done" && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <Check className="h-4 w-4" />
            <AlertDescription>Account created. Redirecting...</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Your recovery phrase is the only credential. Store it like cash.
        </p>
      </CardFooter>
    </Card>
  );
}
