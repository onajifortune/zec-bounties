"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ZcashParams, Balance } from "../types";
import { api, ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useSocketEvents } from "../socket/useSocket";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImportWalletData {
  accountName: string;
  seedPhrase: string;
  chain: string;
  serverUrl: string;
  birthdayHeight?: number;
}

export type ZcashParamsInput = Omit<
  ZcashParams,
  "id" | "ownerId" | "createdAt" | "updatedAt" | "owner"
>;

// Sync status shape returned by the backend
export interface SyncStatus {
  sync_id?: number;
  in_progress?: boolean;
  synced_blocks?: number;
  total_blocks?: number;
  last_synced_hash?: string;
  sync_percent?: number;

  percentage_session_blocks_scanned: number;
  percentage_session_outputs_scanned: number;
  percentage_total_blocks_scanned: number;
  percentage_total_outputs_scanned: number;
  scan_ranges: [];
  session_blocks_scanned: number;
  session_orchard_outputs_scanned: number;
  session_sapling_outputs_scanned: number;
  sync_start_height: number;
  total_blocks_scanned: number;
  total_orchard_outputs_scanned: number;
  total_sapling_outputs_scanned: number;
}

type ActionResult = { success: boolean; message: string; data?: any };

export interface WalletContextType {
  // Zcash params
  zcashParams: ZcashParams[];
  zcashParamsLoading: boolean;
  /** Default wallet, else the most recently added one. */
  activeWallet: ZcashParams | null;
  fetchZcashParams: () => Promise<void>;
  fetchAllZcashParams: () => Promise<void>; // Admin only
  getZcashParam: (accountName: string) => Promise<ZcashParams | null>;
  createZcashParams: (data: ZcashParamsInput) => Promise<ZcashParams>;
  updateZcashParams: (
    accountName: string,
    data: Partial<ZcashParamsInput>,
  ) => Promise<ZcashParams>;
  deleteZcashParams: (accountName: string) => Promise<void>;
  upsertZcashParams: (data: ZcashParamsInput) => Promise<ZcashParams>;
  testZcashConnection: (accountName: string) => Promise<ActionResult>;
  importWallet: (data: ImportWalletData) => Promise<ActionResult>;
  setDefaultWallet: (accountName: string, teamId?: string) => Promise<void>;

  // Balance + addresses (admin wallet)
  balance: Balance | undefined;
  fetchBalance: () => Promise<void>;
  address: string | undefined;
  addresses: string[];
  fetchAddresses: () => Promise<void>;

  // Sync status & rescan (admin wallet)
  syncStatus: SyncStatus | null;
  syncStatusLoading: boolean;
  syncStatusError: string | null;
  rescanStatus: string | null;
  fetchSyncStatus: () => Promise<void>;
  rescanWallet: () => Promise<void>;
  rescanLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

/** Prefer the server's `message` field, then the generic ApiError message. */
function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.data?.message || error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

const enc = encodeURIComponent;

// ── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  const [zcashParams, setZcashParams] = useState<ZcashParams[]>([]);
  const [zcashParamsLoading, setZcashParamsLoading] = useState(false);

  const [balance, setBalance] = useState<Balance | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [addresses, setAddresses] = useState<string[]>([]);

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null);
  const [rescanStatus, setRescanStatus] = useState<string | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);

  const isAdmin = () => userRef.current?.role === "ADMIN";

  const activeWallet = useMemo<ZcashParams | null>(
    () =>
      zcashParams.find((p) => p.isDefault) ??
      (zcashParams.length > 0 ? zcashParams[zcashParams.length - 1] : null),
    [zcashParams],
  );

  // ── Zcash params ───────────────────────────────────────────────────────────

  const fetchZcashParams = useCallback(async () => {
    if (!userRef.current) return;
    setZcashParamsLoading(true);
    try {
      const res = await api.get<{ data?: ZcashParams[] }>("/api/zcash/params", {
        fallbackError: "Failed to fetch Zcash parameters",
      });
      setZcashParams(res.data || []);
    } catch (error) {
      console.error("Failed to fetch Zcash parameters:", error);
      setZcashParams([]);
    } finally {
      setZcashParamsLoading(false);
    }
  }, []);

  const fetchAllZcashParams = useCallback(async () => {
    if (!isAdmin()) return;
    setZcashParamsLoading(true);
    try {
      const res = await api.get<{ data?: ZcashParams[] }>(
        "/api/zcash/params/all",
        { fallbackError: "Failed to fetch all Zcash parameters" },
      );
      setZcashParams(res.data || []);
    } catch (error) {
      console.error("Failed to fetch all Zcash parameters:", error);
      setZcashParams([]);
    } finally {
      setZcashParamsLoading(false);
    }
  }, []);

  const getZcashParam = useCallback(async (accountName: string) => {
    if (!userRef.current) return null;
    try {
      const res = await api.get<{ data: ZcashParams }>(
        `/api/zcash/params/${enc(accountName)}`,
      );
      return res.data;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        console.error("Failed to fetch Zcash parameter:", error);
      }
      return null;
    }
  }, []);

  const createZcashParams = useCallback(async (data: ZcashParamsInput) => {
    if (!userRef.current) throw new Error("User not authenticated");
    const res = await api.post<{ data: ZcashParams }>(
      "/api/zcash/params",
      data,
      { fallbackError: "Failed to create Zcash parameters" },
    );
    setZcashParams((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateZcashParams = useCallback(
    async (accountName: string, data: Partial<ZcashParamsInput>) => {
      if (!userRef.current) throw new Error("User not authenticated");
      const res = await api.patch<{ data: ZcashParams }>(
        `/api/zcash/params/${enc(accountName)}`,
        data,
        { fallbackError: "Failed to update Zcash parameters" },
      );
      setZcashParams((prev) =>
        prev.map((p) => (p.accountName === accountName ? res.data : p)),
      );
      return res.data;
    },
    [],
  );

  const deleteZcashParams = useCallback(async (accountName: string) => {
    if (!userRef.current) throw new Error("User not authenticated");
    await api.delete(`/api/zcash/params/${enc(accountName)}`, {
      fallbackError: "Failed to delete Zcash parameters",
    });
    setZcashParams((prev) => prev.filter((p) => p.accountName !== accountName));
  }, []);

  const upsertZcashParams = useCallback(async (data: ZcashParamsInput) => {
    if (!userRef.current) throw new Error("User not authenticated");
    const res = await api.post<{ data: ZcashParams }>(
      "/api/zcash/params/upsert",
      data,
      { fallbackError: "Failed to save Zcash parameters" },
    );
    const saved = res.data;
    setZcashParams((prev) =>
      prev.some((p) => p.accountName === data.accountName)
        ? prev.map((p) => (p.accountName === data.accountName ? saved : p))
        : [...prev, saved],
    );
    return saved;
  }, []);

  const setDefaultWallet = useCallback(
    async (accountName: string, teamId?: string) => {
      if (!isAdmin()) throw new Error("Only admins can set a default wallet");

      await api.patch(
        `/api/zcash/params/${enc(accountName)}/set-default`,
        { teamId: teamId ?? null },
        { fallbackError: "Failed to set default wallet" },
      );

      setZcashParams((prev) =>
        prev.map((p) => ({
          ...p,
          isDefault:
            p.accountName === accountName &&
            (p.teamId ?? null) === (teamId ?? null),
        })),
      );
    },
    [],
  );

  const testZcashConnection = useCallback(
    async (accountName: string): Promise<ActionResult> => {
      if (!userRef.current) {
        return { success: false, message: "User not authenticated" };
      }
      try {
        const res = await api.post<{ message?: string }>(
          `/api/zcash/test-connection/${enc(accountName)}`,
        );
        return {
          success: true,
          message: res.message || "Connection successful",
          data: res,
        };
      } catch (error) {
        console.error("Failed to test Zcash connection:", error);
        return {
          success: false,
          message: messageFrom(error, "Failed to test connection"),
        };
      }
    },
    [],
  );

  const importWallet = useCallback(
    async (data: ImportWalletData): Promise<ActionResult> => {
      if (!userRef.current) {
        return { success: false, message: "User not authenticated" };
      }
      try {
        const res = await api.post<{ message?: string; data?: ZcashParams }>(
          "/api/zcash/import-wallet",
          data,
        );

        const imported = res.data;
        if (imported) setZcashParams((prev) => [...prev, imported]);

        try {
          await setDefaultWallet(data.accountName);
        } catch (e) {
          console.warn("Wallet imported but failed to set as default:", e);
        }

        await fetchZcashParams();

        return {
          success: true,
          message: res.message || "Wallet imported successfully",
          data: imported,
        };
      } catch (error) {
        console.error("Failed to import wallet:", error);
        return {
          success: false,
          message: messageFrom(error, "Failed to import wallet"),
        };
      }
    },
    [setDefaultWallet, fetchZcashParams],
  );

  // ── Balance + addresses ────────────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    if (!isAdmin()) return;
    try {
      setBalance(await api.get<Balance>("/api/transactions/balance"));
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!isAdmin()) return;
    try {
      const data = await api.get<any[]>("/api/transactions/addresses");
      const list = data.map((a) => a.encoded_address).filter(Boolean);
      setAddresses(list);
      setAddress(list[0]); // keep single address in sync for anything that uses it
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  }, []);

  // ── Sync status & rescan ───────────────────────────────────────────────────

  const fetchSyncStatus = useCallback(async () => {
    if (!isAdmin()) return;
    setSyncStatusLoading(true);
    setSyncStatusError(null);
    try {
      setSyncStatus(
        await api.get<SyncStatus>("/api/transactions/sync-status", {
          fallbackError: "Failed to fetch sync status",
        }),
      );
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
      setSyncStatusError(
        error instanceof Error ? error.message : "Sync status unavailable",
      );
    } finally {
      setSyncStatusLoading(false);
    }
  }, []);

  const rescanWallet = useCallback(async () => {
    if (!isAdmin()) return;
    setRescanLoading(true);
    setSyncStatusError(null);
    try {
      await api.get("/api/transactions/rescan", {
        fallbackError: "Import wallet again",
      });
      setRescanStatus("Rescan Success");
    } catch (error) {
      console.error("Failed to rescan wallet:", error);
      setSyncStatusError(
        error instanceof Error ? error.message : "Rescan failed",
      );
    } finally {
      setRescanLoading(false);
    }
  }, []);

  // ── Session lifecycle ──────────────────────────────────────────────────────
  // Load on login, wipe on logout (incl. admin balance/addresses, which the old
  // code left in memory after logout).
  const userId = currentUser?.id;
  useEffect(() => {
    if (userId) {
      fetchZcashParams();
    } else {
      setZcashParams([]);
      setBalance(undefined);
      setAddress(undefined);
      setAddresses([]);
      setSyncStatus(null);
      setSyncStatusError(null);
      setRescanStatus(null);
    }
  }, [userId, fetchZcashParams]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useSocketEvents({
    balance_updated: (p) => setBalance(p.balance),
    balance_fetched: (p) => setBalance(p.balance),
    sync_status: (p) => {
      setSyncStatus(p.data);
      setSyncStatusError(null);
    },
    account_created: () => fetchZcashParams(),
    addresses_fetched: (p) => setAddress(p.addresses?.encoded_address),
  });

  const value = useMemo<WalletContextType>(
    () => ({
      zcashParams,
      zcashParamsLoading,
      activeWallet,
      fetchZcashParams,
      fetchAllZcashParams,
      getZcashParam,
      createZcashParams,
      updateZcashParams,
      deleteZcashParams,
      upsertZcashParams,
      testZcashConnection,
      importWallet,
      setDefaultWallet,
      balance,
      fetchBalance,
      address,
      addresses,
      fetchAddresses,
      syncStatus,
      syncStatusLoading,
      syncStatusError,
      rescanStatus,
      fetchSyncStatus,
      rescanWallet,
      rescanLoading,
    }),
    [
      zcashParams,
      zcashParamsLoading,
      activeWallet,
      fetchZcashParams,
      fetchAllZcashParams,
      getZcashParam,
      createZcashParams,
      updateZcashParams,
      deleteZcashParams,
      upsertZcashParams,
      testZcashConnection,
      importWallet,
      setDefaultWallet,
      balance,
      fetchBalance,
      address,
      addresses,
      fetchAddresses,
      syncStatus,
      syncStatusLoading,
      syncStatusError,
      rescanStatus,
      fetchSyncStatus,
      rescanWallet,
      rescanLoading,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (ctx === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
