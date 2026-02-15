"use client";

import { useState, useEffect, ReactNode } from "react";
import { ImportWalletModal } from "./import-modal";
import { backendUrl } from "@/lib/configENV";

interface WalletGuardProps {
  children: ReactNode;
}

export function WalletGuard({ children }: WalletGuardProps) {
  const [isCheckingParams, setIsCheckingParams] = useState(true);
  const [hasParams, setHasParams] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    checkZcashParams();
  }, []);

  const checkZcashParams = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsCheckingParams(false);
        setHasParams(true); // Allow access if no token (auth will handle)
        return;
      }

      const response = await fetch(`${backendUrl}/auth/has-zcash-params`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.hasParams) {
          // No params found - show modal as required
          setHasParams(false);
          setShowImportModal(true);
        } else {
          // Params exist
          setHasParams(true);
        }
      } else {
        // On error, allow access (don't block user)
        setHasParams(true);
      }
    } catch (error) {
      console.error("Error checking Zcash params:", error);
      // On error, allow access (don't block user)
      setHasParams(true);
    } finally {
      setIsCheckingParams(false);
    }
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    setHasParams(true);
    // Optionally refresh or reload data here
  };

  // Show loading state while checking
  if (isCheckingParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Checking wallet status...</p>
        </div>
      </div>
    );
  }

  // Show import modal if params don't exist
  // This blocks the entire app until wallet is imported
  if (!hasParams) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-muted/20">
          <div className="text-center max-w-md p-8">
            <h2 className="text-2xl font-bold mb-2">Wallet Setup Required</h2>
            <p className="text-muted-foreground mb-4">
              Please import your Zcash wallet to continue using the application.
            </p>
          </div>
        </div>
        <ImportWalletModal
          open={showImportModal}
          onOpenChange={handleImportComplete}
          isRequired={true}
        />
      </>
    );
  }

  // Render children if params exist
  return <>{children}</>;
}
