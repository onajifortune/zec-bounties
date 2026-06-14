"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useBounty } from "@/lib/bounty-context";
import { formatAddress } from "@/lib/utils";

interface WalletTopupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletTopupModal({
  open,
  onOpenChange,
}: WalletTopupModalProps) {
  const { addresses } = useBounty();
  const [copied, setCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const walletAddress = addresses[activeIndex] || "Loading Address...";
  const hasMultiple = addresses.length > 1;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const prev = () =>
    setActiveIndex((i) => (i - 1 + addresses.length) % addresses.length);
  const next = () => setActiveIndex((i) => (i + 1) % addresses.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Top Up Balance
          </DialogTitle>
          <DialogDescription>
            Scan the QR code or use the wallet address below to deposit ZEC
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* QR Code with carousel controls */}
          <div className="flex items-center gap-3 w-full justify-center">
            {hasMultiple && (
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                className="h-8 w-8 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center p-4">
              {addresses.length > 0 ? (
                <QRCodeSVG
                  value={walletAddress}
                  size={224}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="text-center">
                  <svg
                    className="w-32 h-32 text-muted-foreground mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="text-xs text-muted-foreground font-medium">
                    Loading QR Code...
                  </p>
                </div>
              )}
            </div>

            {hasMultiple && (
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="h-8 w-8 flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Dot indicators */}
          {hasMultiple && (
            <div className="flex gap-1.5">
              {addresses.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Address counter */}
          {hasMultiple && (
            <p className="text-xs text-muted-foreground -mt-3">
              Address {activeIndex + 1} of {addresses.length}
            </p>
          )}

          {/* Wallet Address */}
          <div className="w-full">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight mb-2 block">
              Wallet Address
            </label>
            <div className="flex gap-2 items-center bg-muted rounded-lg p-3 border border-border">
              <code className="text-xs font-mono flex-1 break-all text-foreground">
                {formatAddress(walletAddress)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleCopyAddress}
                disabled={addresses.length === 0}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90">
            View on Block Explorer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
