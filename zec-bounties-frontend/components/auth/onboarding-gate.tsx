"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBounty } from "@/lib/bounty-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Building2, Loader2, ArrowLeft } from "lucide-react";

export function OnboardingGate() {
  const { currentUser, needsOnboarding, completeOnboarding } = useBounty();
  const router = useRouter();

  const [selected, setSelected] = useState<"HUNTER" | "TEAM" | null>(null);
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!currentUser || !needsOnboarding) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");

    const result = await completeOnboarding(
      selected,
      selected === "TEAM" ? teamName.trim() || undefined : undefined,
    );

    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Something went wrong — please try again");
      return;
    }

    router.push(selected === "TEAM" ? "/teams" : "/home");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        {selected !== "TEAM" ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">Welcome to Zechub Bounties</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                How do you want to use the platform? You can't switch later
                without an admin's help, so pick the one that fits.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => setSelected("HUNTER")}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  selected === "HUNTER"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Hunter</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Apply to and submit work for bounties. Get paid in ZEC for
                      completed work.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelected("TEAM")}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  (selected as string) === "TEAM"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Teams</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create and manage bounties for others to work on. Invite
                      members, set up a shared wallet.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {error && (
              <p className="text-xs text-destructive text-center mt-4">
                {error}
              </p>
            )}

            <Button
              className="w-full mt-6"
              disabled={!selected || submitting}
              onClick={handleConfirm}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold">Name your team</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                You can change this later. Leave it blank and we'll use "
                {currentUser.name}'s Team".
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Team Name</Label>
              <Input
                placeholder={`${currentUser.name}'s Team`}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive text-center mt-4">
                {error}
              </p>
            )}

            <Button
              className="w-full mt-6"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating team...
                </>
              ) : (
                "Create Team & Continue"
              )}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
