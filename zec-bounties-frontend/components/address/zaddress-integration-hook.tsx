"use client";

import { useState, useEffect } from "react";
import { useBounty } from "@/lib/bounty-context";
import { ZAddressCollectionModal } from "./zaddress-collection-modal";

interface UseZAddressCollectionReturn {
  showZAddressModal: boolean;
  handleZAddressSubmit: (zAddress: string) => Promise<void>;
}

export function useZAddressCollection(): UseZAddressCollectionReturn {
  const { currentUser, isLoading, zAddressUpdate } = useBounty();
  const [showZAddressModal, setShowZAddressModal] = useState(false);

  useEffect(() => {
    // Don't evaluate until auth has finished initializing
    if (isLoading) return;

    if (currentUser && !currentUser.z_address && currentUser.role !== "ADMIN") {
      setShowZAddressModal(true);
    } else {
      setShowZAddressModal(false);
    }
  }, [isLoading, currentUser]);

  const handleZAddressSubmit = async (zAddress: string) => {
    if (!currentUser) throw new Error("No user logged in");
    const result = await zAddressUpdate(zAddress);
    setShowZAddressModal(false);
  };

  return { showZAddressModal, handleZAddressSubmit };
}

interface ZAddressProviderProps {
  children: React.ReactNode;
}

export function ZAddressProvider({ children }: ZAddressProviderProps) {
  const { showZAddressModal, handleZAddressSubmit } = useZAddressCollection();

  return (
    <>
      {children}
      <ZAddressCollectionModal
        isOpen={showZAddressModal}
        onComplete={handleZAddressSubmit}
      />
    </>
  );
}
