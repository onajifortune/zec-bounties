"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBounty } from "@/lib/bounty-context";
import {
  AlertTriangle,
  Wallet,
  CheckCircle,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";

type ValidationState = "idle" | "checking" | "valid" | "invalid";

interface ZAddressCollectionModalProps {
  isOpen: boolean;
  onComplete: (zAddress: string) => void;
}

export function ZAddressCollectionModal({
  isOpen,
  onComplete,
}: ZAddressCollectionModalProps) {
  const [zAddress, setZAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationState, setValidationState] =
    useState<ValidationState>("idle");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestAddress = useRef<string>("");

  const { verifyZaddress } = useBounty();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZAddress("");
      setError(null);
      setIsSubmitting(false);
      setValidationState("idle");
    }
  }, [isOpen]);

  // Prevent escape key from closing
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener("keydown", handleKeyDown, true);
      return () => document.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [isOpen]);

  const validateAddress = async (address: string) => {
    if (!address.trim()) {
      setValidationState("idle");
      return;
    }

    // Optimistic: flag obviously-wrong addresses immediately without a round-trip
    // Zcash unified addresses start with "u1", sapling with "zs1", sprout with "zc"
    const looksLikeZcash =
      address.startsWith("utest") ||
      address.startsWith("u1") ||
      address.startsWith("zs1") ||
      address.startsWith("zc");

    if (!looksLikeZcash || address.length < 10) {
      setValidationState("invalid");
      return;
    }

    setValidationState("checking");

    // Keep track of the latest address so stale responses are ignored
    latestAddress.current = address;

    try {
      const result = await verifyZaddress(address.trim());
      // Only apply if this response belongs to the most recent request
      if (latestAddress.current === address) {
        setValidationState(result ? "valid" : "invalid");
      }
    } catch {
      if (latestAddress.current === address) {
        setValidationState("invalid");
      }
    }
  };

  const handleAddressChange = (value: string) => {
    setZAddress(value);
    setError(null);

    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!value.trim()) {
      setValidationState("idle");
      return;
    }

    // Show "checking" almost immediately so the user knows something is happening
    setValidationState("checking");

    // Debounce the actual API call by 600 ms
    debounceTimer.current = setTimeout(() => {
      validateAddress(value);
    }, 600);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!zAddress.trim()) {
      setError("A shielded address is required to continue");
      return;
    }

    if (validationState === "checking") {
      // Wait for in-flight validation to finish — just show a message
      setError("Address validation is still in progress, please wait.");
      return;
    }

    if (validationState !== "valid") {
      setError("Please enter a valid Zcash shielded address");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onComplete(zAddress.trim());
      setIsSubmitting(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save shielded address. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  // Prevent closing the dialog
  const handleOpenChange = () => {
    return;
  };

  // ── Inline validation indicator ──────────────────────────────────────────
  const ValidationIndicator = () => {
    if (validationState === "idle") return null;

    if (validationState === "checking") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Verifying address…</span>
        </div>
      );
    }

    if (validationState === "valid") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Valid Zcash shielded address</span>
        </div>
      );
    }

    // invalid
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 mt-1">
        <XCircle className="w-3.5 h-3.5" />
        <span>Invalid address — must start with utest, u1, zs1, or zc</span>
      </div>
    );
  };

  // Border colour driven by validation state
  const inputBorderClass =
    validationState === "valid"
      ? "border-emerald-500 focus-visible:ring-emerald-500"
      : validationState === "invalid"
        ? "border-red-500 focus-visible:ring-red-500"
        : validationState === "checking"
          ? "border-yellow-400 focus-visible:ring-yellow-400"
          : "";

  const canSubmit = !isSubmitting && validationState === "valid";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Setup Required
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Please provide your Zcash shielded address to receive bounty
            payments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              {/* Your Z-address is required to receive ZEC payments for completed
              bounties. This ensures secure and private transactions. */}

              <p>
                Kindly enter a valid <strong>TESTNET</strong> address
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="zaddress" className="text-sm font-medium">
              Zcash Shielded Address <span className="text-red-500">*</span>
            </Label>

            {/* Input with right-side icon */}
            <div className="relative">
              <Input
                id="zaddress"
                type="text"
                placeholder="utest.......(testnet address)"
                value={zAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={`font-mono text-sm pr-9 transition-colors ${inputBorderClass}`}
                disabled={isSubmitting}
                autoFocus
              />

              {/* Status icon inside the input */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {validationState === "checking" && (
                  <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                )}
                {validationState === "valid" && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                {validationState === "invalid" && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Inline feedback text */}
            <ValidationIndicator />

            {validationState === "idle" && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your Zcash shielded address — we'll verify it as you type
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving…
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue to Dashboard
                </div>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don't have a shielded address? Get one from your Zcash wallet
                app
              </p>
            </div>
          </div>
        </form>

        {/* Help section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Need help finding your UA-address?
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p>• Open your Zcash wallet (Zingo, Zkool, etc.)</p>
              <p>• Look for "Receive" or "Shielded Address"</p>
              <p>• Copy the address that starts with u1…</p>
              <p>• Paste it in the field above</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
