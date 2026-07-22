// components/auth/ZcashSignIn.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react"; // npm install qrcode.react
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { backendUrl } from "@/lib/configENV";

interface ZcashSignInProps {
  onAuthenticated: (token: string, user: any) => void;
}

type Status = "loading" | "pending" | "confirmed" | "expired" | "error";

export function ZcashSignIn({ onAuthenticated }: ZcashSignInProps) {
  const [uri, setUri] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createChallenge = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${backendUrl}/auth/zcash/challenge`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create challenge");
      const data = await res.json();
      setUri(data.uri);
      setChallengeId(data.challengeId);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setStatus("pending");
    } catch (err) {
      console.error("Zcash challenge error:", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    createChallenge();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [createChallenge]);

  useEffect(() => {
    if (status !== "pending" || !challengeId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${backendUrl}/auth/zcash/challenge/${challengeId}/status`,
        );
        const data = await res.json();

        if (data.status === "CONFIRMED") {
          clearInterval(pollRef.current!);
          setStatus("confirmed");
          onAuthenticated(data.token, data.user);
        } else if (data.status === "EXPIRED" || data.status === "NOT_FOUND") {
          clearInterval(pollRef.current!);
          setStatus("expired");
        }
      } catch (err) {
        console.error("Zcash status poll error:", err);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, challengeId, onAuthenticated]);

  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-1">
        <CardTitle>Sign in with Zcash</CardTitle>
        <CardDescription>
          Scan with Ywallet, Zashi, or any shielded wallet. It's a zero-value
          transaction — you only pay the network fee.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {status === "error" && (
          <Alert className="border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">
              Couldn't generate a sign-in code. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {status === "loading" && (
          <div className="h-64 w-64 flex items-center justify-center text-sm text-muted-foreground">
            Generating code...
          </div>
        )}

        {(status === "pending" || status === "confirmed") && uri && (
          <div className="relative">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={uri} size={224} />
            </div>
            {status === "confirmed" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                <span className="text-sm font-medium text-green-600">
                  Confirmed — signing you in...
                </span>
              </div>
            )}
          </div>
        )}

        {status === "expired" && (
          <div className="h-64 w-64 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground border rounded-lg">
            <span>This code expired.</span>
          </div>
        )}

        {status === "pending" && (
          <p className="text-xs text-muted-foreground text-center break-all">
            {uri}
          </p>
        )}

        {(status === "expired" || status === "error") && (
          <Button variant="outline" onClick={createChallenge}>
            Generate new code
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
