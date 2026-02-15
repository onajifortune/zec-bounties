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
import { Wallet, Copy, Check } from "lucide-react";
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
  const { balance, fetchBalance, address, fetchAddresses } = useBounty();
  const [copied, setCopied] = useState(false);

  const walletAddress = address || "Loading Address ...";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {/* QR Code */}
          <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center p-4">
            {address ? (
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

          {/* Wallet Address */}
          <div className="w-full">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight mb-2 block">
              Wallet Address
            </label>
            <div className="flex gap-2 items-center bg-muted rounded-lg p-3 border border-border">
              <code className="text-xs font-mono flex-1 break-all text-foreground">
                {formatAddress(walletAddress || "")}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleCopyAddress}
                disabled={!address}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Info Box */}
          {/* <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
              <strong>Minimum deposit:</strong> 0.1 ZEC
              <br />
              <strong>Processing time:</strong> 2-10 minutes
              <br />
              Deposits are credited after 1 network confirmation
            </p>
          </div> */}
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
