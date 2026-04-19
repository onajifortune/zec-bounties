"use client";

import type React from "react";
import { useBounty } from "@/lib/bounty-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImportWalletModal } from "@/components/settings/import-modal";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, zcashParams, zcashParamsLoading } =
    useBounty();
  const router = useRouter();
  const [showImportModal, setShowImportModal] = useState(false);

  // Both checks run in parallel — we wait for BOTH to finish together
  const authLoading = isLoading;
  const walletLoading = zcashParamsLoading;
  const isReady = !authLoading && !walletLoading;

  useEffect(() => {
    if (!isReady) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (currentUser.role !== "ADMIN") {
      router.push("/home");
      return;
    }
  }, [isReady, currentUser, router]);

  useEffect(() => {
    if (!isReady) return;
    const hasParams = zcashParams && zcashParams.length > 0;
    if (!hasParams) setShowImportModal(true);
    else setShowImportModal(false);
  }, [isReady, zcashParams]);

  // Single unified loading screen — shown once, not twice
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return null; // router.push already fired
  }

  const hasParams = zcashParams && zcashParams.length > 0;

  if (!hasParams) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-muted/20">
          <div className="text-center max-w-md p-8">
            <h2 className="text-2xl font-bold mb-2">Wallet Setup Required</h2>
            <p className="text-muted-foreground mb-4">
              Please import your Zcash wallet to continue.
            </p>
          </div>
        </div>
        <ImportWalletModal
          open={showImportModal}
          onOpenChange={(open) => {
            if (!open && hasParams) setShowImportModal(false);
          }}
          isRequired={true}
        />
      </>
    );
  }

  return <>{children}</>;
}
