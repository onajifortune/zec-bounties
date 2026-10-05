import { useRef, useState } from "react";
import { useBounty } from "@/lib/bounty-context";
import type { Team, Bounty } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TeamAuthorizePaymentPanel({
  team,
  teamBounties,
}: {
  team: Team;
  teamBounties: Bounty[];
}) {
  const {
    authorizeTeamDuePayment,
    fetchTeamBounties,
    loadMoreTeamBounties,
    teamBountiesHasMore,
    teamBountiesLoading,
  } = useBounty();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // One idempotency key per selection, stable across retries so a double
  // submit of the same payout is caught by the backend.
  const attemptKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const keyForSelection = (ids: string[]) => {
    const fingerprint = [...ids].sort().join(",");
    if (attemptKey.current?.fingerprint !== fingerprint) {
      attemptKey.current = {
        fingerprint,
        key:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }
    return attemptKey.current.key;
  };

  const wallet = team.wallet;
  const activeChain: "TEST" | "MAIN" | null =
    wallet?.chain === "testnet"
      ? "TEST"
      : wallet?.chain === "mainnet"
        ? "MAIN"
        : null;
  const isTestnetWallet = activeChain === "TEST";

  console.table(
    teamBounties.map((b) => ({
      title: b.title.slice(0, 24),
      status: b.status,
      chain: b.chain,
      isApproved: b.isApproved,
      isPaid: b.isPaid,
      inFlight: b.paymentInFlight,
    })),
  );
  console.log("wallet chain:", wallet?.chain, "→ activeChain:", activeChain);

  const eligibleBounties = teamBounties.filter(
    (b) =>
      b.status === "DONE" &&
      b.isApproved &&
      !b.isPaid &&
      !b.paymentInFlight &&
      b.chain === activeChain,
  );

  const blockedBounties = teamBounties.filter(
    (b) =>
      b.status === "DONE" &&
      b.isApproved &&
      !b.isPaid &&
      !b.paymentInFlight &&
      b.chain !== activeChain,
  );

  // Sends the backend couldn't confirm — locked until resolved.
  const inFlightBounties = teamBounties.filter(
    (b) => b.status === "DONE" && !b.isPaid && b.paymentInFlight,
  );

  const hasMore = teamBountiesHasMore[team.id] ?? false;
  const loadingMore = teamBountiesLoading[team.id] ?? false;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.size === eligibleBounties.length
        ? new Set()
        : new Set(eligibleBounties.map((b) => b.id)),
    );
  };

  const selectedBounties = eligibleBounties.filter((b) =>
    selectedIds.has(b.id),
  );
  const totalSelected = selectedBounties.reduce(
    (sum, b) => sum + b.bountyAmount,
    0,
  );

  const handleConfirmAuthorize = async () => {
    setShowConfirm(false);
    setIsProcessing(true);
    const ids = selectedBounties.map((b) => b.id);
    try {
      const result = await authorizeTeamDuePayment(
        team.id,
        ids,
        keyForSelection(ids),
      );
      const txid = result.txids[0];
      toast.success("Payment sent", {
        description:
          `${result.paidCount} bounty payment(s) sent` +
          (txid ? ` — tx ${txid.slice(0, 12)}…` : "") +
          (result.skipped.length > 0
            ? ` ${result.skipped.length} skipped: ${result.skipped
                .map((s) => `${s.title} (${s.reason})`)
                .join("; ")}`
            : ""),
        duration: 12000,
      });
      attemptKey.current = null;
      setSelectedIds(new Set());
    } catch (error: any) {
      const [title, ...rest] = error.message?.split(": ") ?? [];
      const description =
        rest.join(": ") || error.message || "Failed to authorize payment";
      toast.error(title || "Payment failed", { description, duration: 8000 });
    } finally {
      // authorizeTeamDuePayment refreshes the global feed, not this team's
      // list, so refresh it here (success or a locked-in-flight failure).
      fetchTeamBounties(team.id);
      setIsProcessing(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-800 dark:bg-yellow-950/20">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
        <span>Set up a team wallet before authorizing payments.</span>
      </div>
    );
  }

  if (eligibleBounties.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <Coins className="mx-auto h-8 w-8 opacity-40" />
        <p className="text-sm">No bounties ready for payment</p>
        {hasMore && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadMoreTeamBounties(team.id)}
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loadingMore ? "Loading…" : "Load more bounties"}
          </Button>
        )}
        {inFlightBounties.length > 0 && (
          <p className="text-xs text-amber-600">
            {inFlightBounties.length} payment
            {inFlightBounties.length > 1 ? "s" : ""} awaiting settlement.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-800 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <span>
          Paying from <span className="font-medium">{wallet.accountName}</span>{" "}
          ({wallet.chain})
        </span>
      </div>

      {inFlightBounties.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-amber-800 dark:text-amber-200">
            <span className="font-medium">
              {inFlightBounties.length} payment
              {inFlightBounties.length > 1 ? "s" : ""} awaiting settlement
            </span>{" "}
            — the wallet didn't confirm the send, so{" "}
            {inFlightBounties.length > 1 ? "they are" : "it is"} locked against
            retry. Check the wallet history before taking further action.
          </span>
        </div>
      )}

      {blockedBounties.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-800 dark:bg-yellow-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <span className="text-yellow-800 dark:text-yellow-200">
            <span className="font-medium">
              {blockedBounties.length} bount
              {blockedBounties.length > 1 ? "ies" : "y"} hidden
            </span>{" "}
            — the team wallet is on{" "}
            <span className="font-medium">{wallet.chain}</span> but{" "}
            {blockedBounties.length > 1
              ? "those bounties are"
              : "that bounty is"}{" "}
            on{" "}
            <span className="font-medium">
              {isTestnetWallet ? "mainnet" : "testnet"}
            </span>
            . Replace the wallet to pay them.
          </span>
        </div>
      )}

      {hasMore && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span className="flex-1 text-blue-800 dark:text-blue-200">
            More bounties exist than are loaded. "Select all" only selects
            what's currently loaded.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadMoreTeamBounties(team.id)}
            disabled={loadingMore}
            className="shrink-0 gap-1.5"
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === eligibleBounties.length}
            onCheckedChange={toggleAll}
            id="team-select-all"
          />
          <label
            htmlFor="team-select-all"
            className="cursor-pointer text-sm font-medium"
          >
            Select all ({eligibleBounties.length})
          </label>
        </div>
        {selectedIds.size > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected · {totalSelected.toFixed(4)} ZEC
          </span>
        )}
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {eligibleBounties.map((bounty) => {
          // Testnet wallet pays z_address, mainnet wallet pays UA_address.
          const hasAddress = isTestnetWallet
            ? !!bounty.assigneeUser?.z_address
            : !!bounty.assigneeUser?.UA_address;
          const label = isTestnetWallet ? "TA" : "UA";

          return (
            <div
              key={bounty.id}
              onClick={() => toggleOne(bounty.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                selectedIds.has(bounty.id)
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={selectedIds.has(bounty.id)}
                onCheckedChange={() => toggleOne(bounty.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bounty.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {bounty.assigneeUser?.name ?? "Unknown assignee"}
                  {hasAddress ? (
                    <span className="flex items-center gap-0.5 text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> {label} set
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-red-600">
                      <AlertTriangle className="h-3 w-3" /> No {label}
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-medium">
                {bounty.bountyAmount.toFixed(4)} ZEC
              </span>
            </div>
          );
        })}
      </div>

      <Button
        onClick={() => setShowConfirm(true)}
        disabled={selectedIds.size === 0 || isProcessing}
        className="w-full"
      >
        {isProcessing
          ? "Processing..."
          : `Authorize ${selectedIds.size > 0 ? `${selectedIds.size} Payment${selectedIds.size > 1 ? "s" : ""}` : "Payment"}`}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to authorize{" "}
                  <span className="font-semibold text-foreground">
                    {selectedBounties.length} payment
                    {selectedBounties.length > 1 ? "s" : ""}
                  </span>{" "}
                  totalling{" "}
                  <span className="font-semibold text-foreground">
                    {totalSelected.toFixed(4)} ZEC
                  </span>{" "}
                  from the {team.name} wallet{" "}
                  <span className="font-semibold text-foreground">
                    {wallet.accountName}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-foreground">
                    {wallet.chain}
                  </span>
                  .
                </p>

                <div className="max-h-48 divide-y overflow-y-auto rounded-lg border bg-muted/40">
                  {selectedBounties.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="max-w-[60%] truncate font-medium text-foreground">
                        {b.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {b.assigneeUser?.name ?? "Unknown"}
                        </span>
                        <span className="font-mono text-xs font-semibold">
                          {b.bountyAmount.toFixed(4)} ZEC
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-medium text-destructive">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAuthorize}
              disabled={isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Send"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
