"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import type {
  User,
  Bounty,
  BountyFormData,
  BountyApplication,
  WorkSubmission,
  ZcashParamsFormData,
  ZcashParams,
  Team,
  TeamMember,
  TeamWallet,
} from "./types";
import { backendUrl, backendWebSpocketUrl } from "./configENV";

interface BountyCategory {
  id: number;
  name: string;
}

interface ImportWalletData {
  accountName: string;
  seedPhrase: string;
  chain: string;
  serverUrl: string;
  birthdayHeight?: number;
}

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

interface BountyContextType {
  // Auth
  currentUser: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; user?: any }>;
  logout: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;

  // Role switching (isRobin users only)
  switchRole: () => Promise<void>;
  isSwitchingRole: boolean;

  // Categories
  categories: BountyCategory[];
  categoriesLoading: boolean;
  fetchCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<BountyCategory>;
  updateCategory: (id: number, name: string) => Promise<BountyCategory>;
  deleteCategory: (id: number) => Promise<void>;

  // Bounties
  bounties: Bounty[];
  bountiesLoading: boolean;
  createBounty: (data: BountyFormData) => Promise<void>;
  updateBounty: (id: string, data: Partial<BountyFormData>) => Promise<void>;
  updateBountyStatus: (
    id: string,
    status: Bounty["status"],
    winnerId?: string,
  ) => Promise<void>;
  approveBounty: (id: string, approved: boolean) => Promise<void>;
  authorizePayment: (id: string) => Promise<void>;
  paymentIDs: string[] | undefined;
  paymentChain: string | undefined;
  paymentServerUrl: string | undefined;
  authorizeDuePayment: (bountyIds: string[]) => Promise<{
    success: boolean;
    paidCount: number;
    skipped: Array<{ id: string; title: string; reason: string }>;
  }>;
  deleteBounty: (id: string) => Promise<void>;
  zAddressUpdate: (z_address: string) => Promise<boolean | undefined>;
  verifyZaddress: (z_address: string) => Promise<boolean | undefined>;
  fetchBounties: (reset?: boolean) => Promise<void>;
  loadMoreBounties: () => Promise<void>;
  hasMoreBounties: boolean;
  bountiesPage: number;
  totalBountyAmount: number;
  totalBountyCount: number;
  fetchBountyById: (id: string) => Promise<Bounty | null>;
  fetchTransactionHashes: () => Promise<void>;
  applyToBounty: (bountyId: string, message: string) => Promise<void>;
  editBounty: (id: string, data: Partial<BountyFormData>) => void;

  // Zcash Params
  zcashParams: ZcashParams[];
  zcashParamsLoading: boolean;
  fetchZcashParams: () => Promise<void>;
  fetchAllZcashParams: () => Promise<void>;
  getZcashParam: (accountName: string) => Promise<ZcashParams | null>;
  createZcashParams: (
    data: Omit<
      ZcashParams,
      "id" | "ownerId" | "createdAt" | "updatedAt" | "owner"
    >,
  ) => Promise<ZcashParams>;
  updateZcashParams: (
    accountName: string,
    data: Partial<
      Omit<ZcashParams, "id" | "ownerId" | "createdAt" | "updatedAt" | "owner">
    >,
  ) => Promise<ZcashParams>;
  deleteZcashParams: (accountName: string) => Promise<void>;
  upsertZcashParams: (
    data: Omit<
      ZcashParams,
      "id" | "ownerId" | "createdAt" | "updatedAt" | "owner"
    >,
  ) => Promise<ZcashParams>;
  testZcashConnection: (
    accountName: string,
  ) => Promise<{ success: boolean; message: string; data?: any }>;
  importWallet: (
    data: ImportWalletData,
  ) => Promise<{ success: boolean; message: string; data?: any }>;

  // Users — still needed for user lists/selects in the UI (e.g. assignee picker)
  users: User[];
  nonAdminUsers: User[];
  usersLoading: boolean;
  fetchUsers: () => Promise<void>;
  balance: number | undefined;
  fetchBalance: () => Promise<void>;
  address: string | undefined;
  fetchAddresses: () => Promise<void>;

  // Sync status & rescan
  syncStatus: SyncStatus | null;
  syncStatusLoading: boolean;
  syncStatusError: string | null;
  rescanStatus: string | null;
  fetchSyncStatus: () => Promise<void>;
  rescanWallet: () => Promise<void>;
  rescanLoading: boolean;

  // Applications
  applications: BountyApplication[];
  allApplications: BountyApplication[];
  bountyApplications: Record<string, BountyApplication[]>;

  fetchUserApplications: () => Promise<void>;
  fetchAllUsersApplications: () => Promise<void>;
  fetchBountyApplications: (bountyId: string) => Promise<BountyApplication[]>;

  getUserApplicationForBounty: (bountyId: string) => BountyApplication | null;
  getAllApplicationsForBounty: (bountyId: string) => BountyApplication[];
  getAllApplicationForBounty: (bountyId: string) => BountyApplication | null;

  acceptApplication: (applicationId: string) => Promise<BountyApplication>;
  rejectApplication: (applicationId: string) => Promise<BountyApplication>;

  // Work submission
  submitWork: (
    bountyId: string,
    submissionData: {
      description: string;
      deliverableUrl?: string;
    },
  ) => Promise<void>;

  fetchAllSubmissions: () => Promise<WorkSubmission[]>;

  fetchWorkSubmissions: (bountyId: string) => Promise<WorkSubmission[]>;

  reviewWorkSubmission: (
    submissionId: string,
    reviewData: {
      status: "approved" | "rejected" | "needs_revision";
      reviewNotes?: string;
    },
  ) => Promise<void>;

  authorizeBatchPayment: (
    bountyId: string,
    scheduledFor: Date,
  ) => Promise<void>;
  processBatchPayments: () => Promise<{
    success: boolean;
    batchId?: string;
    message: string;
  }>;
  getPendingBatchPayments: () => Array<{
    address: string;
    amount: number;
    memo?: string;
  }>;
  setDefaultWallet: (accountName: string, teamId?: string) => Promise<void>;

  fetchExportPayments: (from?: string, to?: string) => Promise<any[]>;
  updateUserOfac: (userId: string, ofacVerified: boolean) => Promise<void>;

  // Teams
  teams: Team[];
  teamsLoading: boolean;
  fetchTeams: () => Promise<void>;
  createTeam: (data: { name: string; description?: string }) => Promise<Team>;
  updateTeam: (
    id: string,
    data: { name?: string; description?: string },
  ) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  addTeamMembers: (
    teamId: string,
    userIds: string[],
    role?: string,
  ) => Promise<TeamMember[]>;
  updateTeamMemberRole: (
    teamId: string,
    userId: string,
    role: string,
  ) => Promise<TeamMember>;
  removeTeamMember: (teamId: string, userId: string) => Promise<void>;
  createTeamWallet: (
    teamId: string,
    data: { accountName: string; chain?: string; serverUrl?: string },
  ) => Promise<TeamWallet>;
  importTeamWallet: (
    teamId: string,
    data: {
      accountName: string;
      seedPhrase: string;
      chain?: string;
      serverUrl?: string;
      birthdayHeight?: number;
    },
  ) => Promise<TeamWallet>;
  deleteTeamWallet: (teamId: string) => Promise<void>;
  currentTeam: Team | null;
}

const BountyContext = createContext<BountyContextType | undefined>(undefined);

export function BountyProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [bountiesLoading, setBountiesLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [nonAdminUsers, setNonAdminUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [applications, setApplications] = useState<BountyApplication[]>([]);
  const [allApplications, setAllApplications] = useState<BountyApplication[]>(
    [],
  );
  const [bountyApplications, setBountyApplications] = useState<
    Record<string, BountyApplication[]>
  >({});
  const [balance, setBalance] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [paymentIDs, setPaymentIDs] = useState<string[] | undefined>(undefined);
  const [categories, setCategories] = useState<BountyCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const BOUNTIES_PER_PAGE = 10;
  const [bountiesPage, setBountiesPage] = useState(1);
  const [hasMoreBounties, setHasMoreBounties] = useState(true);
  const [totalBountyAmount, setTotalBountyAmount] = useState(0);
  const [totalBountyCount, setTotalBountyCount] = useState(0);
  const [zcashParams, setZcashParams] = useState<ZcashParams[]>([]);
  const [zcashParamsLoading, setZcashParamsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null);
  const [rescanStatus, setRescanStatus] = useState<string | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [paymentChain, setPaymentChain] = useState<string | undefined>(
    undefined,
  );
  const [paymentServerUrl, setPaymentServerUrl] = useState<string | undefined>(
    undefined,
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const getPublicHeaders = () => ({
    "Content-Type": "application/json",
  });

  // ==================== Role Switching ====================

  const switchRole = async (): Promise<void> => {
    if (!currentUser || !currentUser.isRobin) return;

    const newRole = currentUser.role === "ADMIN" ? "CLIENT" : "ADMIN";

    setIsSwitchingRole(true);
    try {
      const res = await fetch(`${backendUrl}/api/bounties/switch-role`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to switch role");
      }

      const data = await res.json();
      setCurrentUser(data.user);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
    } catch (error) {
      console.error("Failed to switch role:", error);
      throw error;
    } finally {
      setIsSwitchingRole(false);
    }
  };

  // ==================== Sync Status & Rescan ====================

  const fetchSyncStatus = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    setSyncStatusLoading(true);
    setSyncStatusError(null);
    try {
      const res = await fetch(`${backendUrl}/api/transactions/sync-status`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch sync status");

      const data = await res.json();
      setSyncStatus(data);
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
      setSyncStatusError(
        error instanceof Error ? error.message : "Sync status unavailable",
      );
    } finally {
      setSyncStatusLoading(false);
    }
  };

  const rescanWallet = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    setRescanLoading(true);
    setSyncStatusError(null);
    try {
      const res = await fetch(`${backendUrl}/api/transactions/rescan`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Rescan failed");
      setRescanStatus("Rescan Success");
    } catch (error) {
      console.error("Failed to rescan wallet:", error);
      setSyncStatusError(
        error instanceof Error ? error.message : "Rescan failed",
      );
    } finally {
      setRescanLoading(false);
    }
  };

  // ==================== Zcash Params ====================

  const importWallet = async (
    data: ImportWalletData,
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    if (!currentUser)
      return { success: false, message: "User not authenticated" };

    try {
      const res = await fetch(`${backendUrl}/api/zcash/import-wallet`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const response = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: response.message || "Failed to import wallet",
        };
      }

      if (response.data) {
        setZcashParams((prev) => [...prev, response.data]);
      }

      try {
        await setDefaultWallet(data.accountName);
      } catch (e) {
        console.warn("Wallet imported but failed to set as default:", e);
      }

      await fetchZcashParams();

      return {
        success: true,
        message: response.message || "Wallet imported successfully",
        data: response.data,
      };
    } catch (error) {
      console.error("Failed to import wallet:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const fetchZcashParams = async () => {
    if (!currentUser) return;

    setZcashParamsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/zcash/params`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch Zcash parameters");

      const response = await res.json();
      setZcashParams(response.data || []);
    } catch (error) {
      console.error("Failed to fetch Zcash parameters:", error);
      setZcashParams([]);
    } finally {
      setZcashParamsLoading(false);
    }
  };

  const fetchAllZcashParams = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    setZcashParamsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/zcash/params/all`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch all Zcash parameters");

      const response = await res.json();
      setZcashParams(response.data || []);
    } catch (error) {
      console.error("Failed to fetch all Zcash parameters:", error);
      setZcashParams([]);
    } finally {
      setZcashParamsLoading(false);
    }
  };

  const getZcashParam = async (
    accountName: string,
  ): Promise<ZcashParams | null> => {
    if (!currentUser) return null;

    try {
      const res = await fetch(`${backendUrl}/api/zcash/params/${accountName}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch Zcash parameter");
      }

      const response = await res.json();
      return response.data;
    } catch (error) {
      console.error("Failed to fetch Zcash parameter:", error);
      return null;
    }
  };

  const createZcashParams = async (
    data: Omit<
      ZcashParams,
      "id" | "ownerId" | "createdAt" | "updatedAt" | "owner"
    >,
  ): Promise<ZcashParams> => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(`${backendUrl}/api/zcash/params`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to create Zcash parameters");
    }

    const response = await res.json();
    setZcashParams((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateZcashParams = async (
    accountName: string,
    data: Partial<
      Omit<ZcashParams, "id" | "ownerId" | "createdAt" | "updatedAt" | "owner">
    >,
  ): Promise<ZcashParams> => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(`${backendUrl}/api/zcash/params/${accountName}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update Zcash parameters");
    }

    const response = await res.json();
    setZcashParams((prev) =>
      prev.map((param) =>
        param.accountName === accountName ? response.data : param,
      ),
    );
    return response.data;
  };

  const deleteZcashParams = async (accountName: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(`${backendUrl}/api/zcash/params/${accountName}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to delete Zcash parameters");
    }

    setZcashParams((prev) =>
      prev.filter((param) => param.accountName !== accountName),
    );
  };

  const setDefaultWallet = async (
    accountName: string,
    teamId?: string,
  ): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Only admins can set a default wallet");
    }

    const res = await fetch(
      `${backendUrl}/api/zcash/params/${accountName}/set-default`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ teamId: teamId ?? null }),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to set default wallet");
    }

    setZcashParams((prev) =>
      prev.map((param) => ({
        ...param,
        isDefault: param.accountName === accountName,
      })),
    );
  };

  const upsertZcashParams = async (
    data: Omit<
      ZcashParams,
      "id" | "ownerId" | "createdAt" | "updatedAt" | "owner"
    >,
  ): Promise<ZcashParams> => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(`${backendUrl}/api/zcash/params/upsert`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to save Zcash parameters");
    }

    const response = await res.json();
    const savedParam = response.data;

    setZcashParams((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.accountName === data.accountName,
      );
      if (existingIndex >= 0) {
        return prev.map((p, i) => (i === existingIndex ? savedParam : p));
      }
      return [...prev, savedParam];
    });

    return savedParam;
  };

  const testZcashConnection = async (
    accountName: string,
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    if (!currentUser)
      return { success: false, message: "User not authenticated" };

    try {
      const res = await fetch(
        `${backendUrl}/api/zcash/test-connection/${accountName}`,
        { method: "POST", headers: getAuthHeaders() },
      );

      const response = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: response.message || "Failed to test connection",
        };
      }

      return {
        success: true,
        message: response.message || "Connection successful",
        data: response.data,
      };
    } catch (error) {
      console.error("Failed to test Zcash connection:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // ==================== Payment ====================

  const authorizeBatchPayment = async (
    bountyId: string,
    scheduledFor: Date,
  ) => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    try {
      const res = await fetch(
        `${backendUrl}/api/bounties/${bountyId}/authorize-payment`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            paymentAuthorized: true,
            paymentScheduled: {
              type: "sunday_batch",
              scheduledFor: scheduledFor.toISOString(),
            },
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to authorize batch payment");

      const updated = await res.json();
      setBounties((prev) => prev.map((b) => (b.id === bountyId ? updated : b)));

      if (updated.paymentScheduled?.type === "instant") {
        await processInstantPayment(bountyId);
      }
    } catch (error) {
      console.error("Failed to authorize batch payment:", error);
      throw error;
    }
  };

  const processInstantPayment = async (bountyId: string) => {
    const bounty = bounties.find((b) => b.id === bountyId);
    if (!bounty || !bounty.assigneeUser?.z_address) return;

    try {
      await fetch(`${backendUrl}/api/bounties/process-instant-payment`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          address: bounty.assigneeUser.z_address,
          amount: Math.floor(bounty.bountyAmount * 100000000),
          memo: `Bounty: ${bounty.title} (ID: ${bounty.id})`,
          bountyId,
        }),
      });
    } catch (error) {
      console.error("Failed to process instant payment:", error);
    }
  };

  const authorizeDuePayment = async (bountyIds: string[]) => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, paidCount: 0, skipped: [] };
    }

    try {
      const res = await fetch(
        `${backendUrl}/api/transactions/authorize-payment`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ bountyIds }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        const message = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Failed to authorize payment";
        throw new Error(message);
      }

      const data = await res.json();
      await fetchBounties();

      return {
        success: true,
        paidCount: data.paidCount,
        skipped: data.skipped || [],
      };
    } catch (error) {
      console.error("Failed to authorize payment:", error);
      throw error;
    }
  };

  const fetchTransactionHashes = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/transactions/`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentIDs(data.transactions);
        setPaymentChain(data.chain);
        setPaymentServerUrl(data.serverUrl);
      }
    } catch (error) {
      console.error("Failed to fetch transaction hashes:", error);
    }
  };

  const authorizePayment = async (id: string) => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    try {
      const res = await fetch(
        `${backendUrl}/api/bounties/${id}/authorize-payment`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            paymentAuthorized: true,
            paymentScheduled: { type: "instant" },
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to authorize payment");

      const updated = await res.json();
      setBounties((prev) => prev.map((b) => (b.id === id ? updated : b)));
      await processInstantPayment(id);
    } catch (error) {
      console.error("Failed to authorize payment:", error);
      throw error;
    }
  };

  const getPendingBatchPayments = (): Array<{
    address: string;
    amount: number;
    memo?: string;
  }> => {
    return bounties
      .filter(
        (b) =>
          b.paymentAuthorized &&
          b.paymentScheduled?.type === "sunday_batch" &&
          b.assigneeUser?.z_address &&
          b.status === "DONE" &&
          b.isApproved &&
          !b.isPaid,
      )
      .map((b) => ({
        address: b.assigneeUser!.z_address!,
        amount: Math.floor(b.bountyAmount * 100000000),
        memo: `Bounty: ${b.title} (ID: ${b.id})`,
      }));
  };

  const processBatchPayments = async (): Promise<{
    success: boolean;
    batchId?: string;
    message: string;
  }> => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, message: "Unauthorized" };
    }

    try {
      const batchPayments = getPendingBatchPayments();

      if (batchPayments.length === 0) {
        return {
          success: true,
          message: "No pending batch payments to process",
        };
      }

      const res = await fetch(
        `${backendUrl}/api/bounties/process-batch-payments`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payments: batchPayments,
            batchTimestamp: new Date().toISOString(),
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to process batch payments");
      }

      const result = await res.json();

      if (result.success) {
        const batchBountyIds = bounties
          .filter(
            (b) =>
              b.paymentAuthorized &&
              b.paymentScheduled?.type === "sunday_batch" &&
              !b.isPaid,
          )
          .map((b) => b.id);

        for (const bountyId of batchBountyIds) {
          await fetch(`${backendUrl}/api/bounties/${bountyId}/mark-paid`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              isPaid: true,
              paymentBatchId: result.batchId,
              paidAt: new Date().toISOString(),
            }),
          });
        }

        await fetchBounties();
      }

      return result;
    } catch (error) {
      console.error("Failed to process batch payments:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  // ==================== Categories ====================

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/bounties/categories`, {
        headers: getPublicHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      setCategories(await res.json());
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const createCategory = async (name: string): Promise<BountyCategory> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");

    const res = await fetch(`${backendUrl}/api/bounties/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create category");
    }

    const newCategory = await res.json();
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = async (
    id: number,
    name: string,
  ): Promise<BountyCategory> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");

    const res = await fetch(`${backendUrl}/api/bounties/categories/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to update category");
    }

    const updatedCategory = await res.json();
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? updatedCategory : cat)),
    );
    return updatedCategory;
  };

  const deleteCategory = async (id: number): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");

    const res = await fetch(`${backendUrl}/api/bounties/categories/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to delete category");
    }

    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  // ==================== Users ====================

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/bounties/users`, {
        headers: getPublicHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
      setNonAdminUsers(data.filter((u: User) => u.role === "CLIENT"));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  // ==================== Applications ====================

  const fetchBountyApplications = async (bountyId: string) => {
    if (!currentUser) return [];

    try {
      const res = await fetch(
        `${backendUrl}/api/bounties/${bountyId}/applications`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!res.ok) throw new Error("Failed to fetch bounty applications");

      const data = await res.json();
      setBountyApplications((prev) => ({ ...prev, [bountyId]: data }));
      return data;
    } catch (error) {
      console.error("Failed to fetch bounty applications:", error);
      return [];
    }
  };

  const fetchUserApplications = async () => {
    if (!currentUser) return;

    try {
      const res = await fetch(`${backendUrl}/api/bounties/my-applications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch applications");
      setApplications(await res.json());
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    }
  };

  const fetchAllUsersApplications = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    try {
      const res = await fetch(`${backendUrl}/api/bounties/all-applications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch applications");
      setAllApplications(await res.json());
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    }
  };

  const getUserApplicationForBounty = (
    bountyId: string,
  ): BountyApplication | null =>
    applications.find((app) => app.bountyId === bountyId) || null;

  const getAllApplicationsForBounty = (
    bountyId: string,
  ): BountyApplication[] => {
    if (bountyApplications[bountyId]) return bountyApplications[bountyId];
    if (allApplications.length > 0)
      return allApplications.filter((app) => app.bountyId === bountyId);
    fetchBountyApplications(bountyId);
    return [];
  };

  const acceptApplication = async (applicationId: string) => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(
      `${backendUrl}/api/bounties/applications/${applicationId}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "accepted" }),
      },
    );

    if (!res.ok) throw new Error("Failed to accept application");

    const updatedApplication = await res.json();
    await fetchBountyApplications(updatedApplication.bountyId);
    await fetchBounties();
    return updatedApplication;
  };

  const rejectApplication = async (applicationId: string) => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(
      `${backendUrl}/api/bounties/applications/${applicationId}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "rejected" }),
      },
    );

    if (!res.ok) throw new Error("Failed to reject application");

    const updatedApplication = await res.json();
    await fetchBountyApplications(updatedApplication.bountyId);
    return updatedApplication;
  };

  const submitWork = async (
    bountyId: string,
    submissionData: { description: string; deliverableUrl?: string },
  ) => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(`${backendUrl}/api/bounties/${bountyId}/submit`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(submissionData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to submit work");
    }

    const { bounty: updatedBounty } = await res.json();

    // Patch just this one bounty in state — no full re-fetch
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? updatedBounty : b)),
    );
  };

  const fetchAllSubmissions = async (): Promise<WorkSubmission[]> => {
    if (!currentUser || currentUser.role !== "ADMIN") return [];
    try {
      const res = await fetch(`${backendUrl}/api/bounties/submissions/all`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch all submissions");
      return res.json();
    } catch (error) {
      console.error("Failed to fetch all submissions:", error);
      return [];
    }
  };

  const fetchWorkSubmissions = async (bountyId: string) => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(
      `${backendUrl}/api/bounties/${bountyId}/submissions`,
      {
        headers: getAuthHeaders(),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to fetch work submissions");
    }

    return res.json();
  };

  const fetchBalance = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    try {
      const res = await fetch(`${backendUrl}/api/transactions/balance`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setBalance(await res.json());
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const fetchAddresses = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    try {
      const res = await fetch(`${backendUrl}/api/transactions/addresses`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAddress(data.encoded_address);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  };

  const reviewWorkSubmission = async (
    submissionId: string,
    reviewData: {
      status: "approved" | "rejected" | "needs_revision";
      reviewNotes?: string;
    },
  ) => {
    if (!currentUser) throw new Error("User not authenticated");

    const res = await fetch(
      `${backendUrl}/api/bounties/submissions/${submissionId}/review`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(reviewData),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to review submission");
    }

    await fetchBounties();
    return res.json();
  };

  const getAllApplicationForBounty = (
    bountyId: string,
  ): BountyApplication | null =>
    allApplications.find((app) => app.bountyId === bountyId) || null;

  // ==================== Teams ====================

  const fetchTeams = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;
    setTeamsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/teams`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch teams");
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const createTeam = async (data: {
    name: string;
    description?: string;
  }): Promise<Team> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create team");
    setTeams((prev) => [json, ...prev]);
    return json;
  };

  const updateTeam = async (
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Team> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to update team");
    setTeams((prev) => prev.map((t) => (t.id === id ? json : t)));
    return json;
  };

  const deleteTeam = async (id: string): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Failed to delete team");
    }
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const addTeamMembers = async (
    teamId: string,
    userIds: string[],
    role = "MEMBER",
  ): Promise<TeamMember[]> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${teamId}/members`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ userIds, role }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to add members");
    const { members } = json;
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const merged = [
          ...t.members.filter(
            (m) => !members.find((nm: TeamMember) => nm.userId === m.userId),
          ),
          ...members,
        ];
        return { ...t, members: merged };
      }),
    );
    return members;
  };

  const updateTeamMemberRole = async (
    teamId: string,
    userId: string,
    role: string,
  ): Promise<TeamMember> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(
      `${backendUrl}/api/teams/${teamId}/members/${userId}`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to update role");
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          members: t.members.map((m) =>
            m.userId === userId
              ? { ...m, role: role as TeamMember["role"] }
              : m,
          ),
        };
      }),
    );
    return json;
  };

  const removeTeamMember = async (
    teamId: string,
    userId: string,
  ): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(
      `${backendUrl}/api/teams/${teamId}/members/${userId}`,
      { method: "DELETE", headers: getAuthHeaders() },
    );
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Failed to remove member");
    }
    setTeams((prev) =>
      prev.map((t) =>
        t.id !== teamId
          ? t
          : { ...t, members: t.members.filter((m) => m.userId !== userId) },
      ),
    );
  };

  const createTeamWallet = async (
    teamId: string,
    data: { accountName: string; chain?: string; serverUrl?: string },
  ): Promise<TeamWallet> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${teamId}/wallet`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create wallet");
    setTeams((prev) =>
      prev.map((t) => (t.id !== teamId ? t : { ...t, wallet: json.wallet })),
    );
    return json.wallet;
  };

  const importTeamWallet = async (
    teamId: string,
    data: {
      accountName: string;
      seedPhrase: string;
      chain?: string;
      serverUrl?: string;
      birthdayHeight?: number;
    },
  ): Promise<TeamWallet> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${teamId}/wallet/import`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to import wallet");
    setTeams((prev) =>
      prev.map((t) => (t.id !== teamId ? t : { ...t, wallet: json.wallet })),
    );
    return json.wallet;
  };

  const deleteTeamWallet = async (teamId: string): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN")
      throw new Error("Unauthorized");
    const res = await fetch(`${backendUrl}/api/teams/${teamId}/wallet`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Failed to delete wallet");
    }
    setTeams((prev) =>
      prev.map((t) => (t.id !== teamId ? t : { ...t, wallet: null })),
    );
  };

  const currentTeam =
    teams.find((t) => t.members.some((m) => m.userId === currentUser?.id)) ??
    null;

  // ==================== Init ====================

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem("authToken");

      await Promise.all([
        fetchBounties(),
        fetchUsers(),
        fetchCategories(),
        fetchTotalStats(),
      ]);

      if (savedToken) {
        try {
          const res = await fetch(`${backendUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });

          if (!res.ok) throw new Error("Token invalid");

          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        } catch (error) {
          console.error("Token validation failed:", error);
          localStorage.removeItem("authToken");
          localStorage.removeItem("currentUser");
          setCurrentUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserApplications();
      fetchAllUsersApplications();
      fetchZcashParams();
      if (currentUser.role === "ADMIN") fetchTeams();
    } else {
      setApplications([]);
      setAllApplications([]);
      setZcashParams([]);
      setTeams([]);
      setSyncStatus(null);
      setSyncStatusError(null);
    }
  }, [currentUser]);

  // ==================== WebSocket ====================

  useEffect(() => {
    if (!currentUser) return;

    let ws: WebSocket;
    let retryDelay = 1000;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let destroyed = false;

    const userId = currentUser.id;
    const userName = currentUser.name;

    function connect() {
      ws = new WebSocket(`${backendWebSpocketUrl}`);

      ws.onopen = () => {
        retryDelay = 1000;
        ws.send(JSON.stringify({ type: "join", userId, userName }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "new_bounty":
            setBounties((prev) => [msg.payload, ...prev]);
            break;
          case "bounty_updated":
          case "bounty_status_changed":
          case "bounty_approved":
          case "payment_authorized":
          case "bounty_payment_authorized":
          case "bounty_marked_paid":
            setBounties((prev) =>
              prev.map((b) => (b.id === msg.payload.id ? msg.payload : b)),
            );
            break;
          case "application_created":
            if (msg.payload.applicantId === currentUser?.id) {
              setApplications((prev) => [...prev, msg.payload]);
            }
            setAllApplications((prev) => [...prev, msg.payload]);
            setBountyApplications((prev) => ({
              ...prev,
              [msg.payload.bountyId]: [
                ...(prev[msg.payload.bountyId] || []),
                msg.payload,
              ],
            }));
            break;
          case "application_updated":
            setApplications((prev) =>
              prev.map((app) =>
                app.id === msg.payload.id ? msg.payload : app,
              ),
            );
            setAllApplications((prev) =>
              prev.map((app) =>
                app.id === msg.payload.id ? msg.payload : app,
              ),
            );
            setBountyApplications((prev) => ({
              ...prev,
              [msg.payload.bountyId]: (prev[msg.payload.bountyId] || []).map(
                (app) => (app.id === msg.payload.id ? msg.payload : app),
              ),
            }));
            fetchBounties();
            break;
          case "application_deleted":
            setApplications((prev) =>
              prev.filter((app) => app.id !== msg.payload.id),
            );
            setAllApplications((prev) =>
              prev.filter((app) => app.id !== msg.payload.id),
            );
            setBountyApplications((prev) => ({
              ...prev,
              [msg.payload.bountyId]: (prev[msg.payload.bountyId] || []).filter(
                (app) => app.id !== msg.payload.id,
              ),
            }));
            break;
          case "payment_processed":
          case "batch_payment_processed":
          case "instant_payment_processed":
          case "bounty_paid":
          case "work_submitted":
          case "submission_reviewed":
          case "bounty_assignees_updated":
            fetchBounties();
            fetchTransactionHashes();
            fetchBalance();
            break;
          case "balance_updated":
          case "balance_fetched":
            setBalance(msg.payload.balance);
            break;
          case "sync_status":
            setSyncStatus(msg.payload.data);
            setSyncStatusError(null);
            break;
          case "account_created":
            fetchZcashParams();
            break;
          case "addresses_fetched":
            setAddress(msg.payload.addresses?.encoded_address);
            break;
          case "category_created":
            setCategories((prev) => [...prev, msg.payload]);
            break;
          case "category_updated":
            setCategories((prev) =>
              prev.map((cat) =>
                cat.id === msg.payload.id ? msg.payload : cat,
              ),
            );
            break;
          case "category_deleted":
            setCategories((prev) =>
              prev.filter((cat) => cat.id !== msg.payload.id),
            );
            break;
          case "team_created":
            setTeams((prev) => [msg.payload, ...prev]);
            break;
          case "team_updated":
            setTeams((prev) =>
              prev.map((t) => (t.id === msg.payload.id ? msg.payload : t)),
            );
            break;
          case "team_deleted":
            setTeams((prev) => prev.filter((t) => t.id !== msg.payload.id));
            fetchZcashParams();
            fetchTeams();
            break;
          case "team_members_updated":
            setTeams((prev) =>
              prev.map((t) => {
                if (t.id !== msg.payload.teamId) return t;
                const merged = [
                  ...t.members.filter(
                    (m) =>
                      !msg.payload.members.find(
                        (nm: TeamMember) => nm.userId === m.userId,
                      ),
                  ),
                  ...msg.payload.members,
                ];
                return { ...t, members: merged };
              }),
            );
            fetchZcashParams();
            break;
          case "team_member_removed":
            setTeams((prev) =>
              prev.map((t) =>
                t.id !== msg.payload.teamId
                  ? t
                  : {
                      ...t,
                      members: t.members.filter(
                        (m) => m.userId !== msg.payload.userId,
                      ),
                    },
              ),
            );
            break;
          case "team_wallet_created":
          case "team_wallet_imported":
            setTeams((prev) =>
              prev.map((t) =>
                t.id !== msg.payload.teamId
                  ? t
                  : { ...t, wallet: msg.payload.wallet },
              ),
            );
            fetchZcashParams();
            fetchTeams();
            break;
          case "team_wallet_deleted":
            setTeams((prev) =>
              prev.map((t) =>
                t.id !== msg.payload.teamId ? t : { ...t, wallet: null },
              ),
            );
            break;
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        if (destroyed) return;
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimeout);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [currentUser?.id]);

  // ==================== Bounties ====================

  const fetchBounties = async (reset = true) => {
    setBountiesLoading(true);
    try {
      const page = reset ? 1 : bountiesPage;
      const res = await fetch(
        `${backendUrl}/api/bounties?page=${page}&limit=${BOUNTIES_PER_PAGE}`,
        { headers: getPublicHeaders() },
      );

      if (!res.ok) throw new Error("Failed to fetch bounties");

      const data = await res.json();
      // Backend now returns bounties with createdByUser and assigneeUser already joined
      const incoming: Bounty[] = Array.isArray(data) ? data : (data.data ?? []);
      const total: number = data.total ?? incoming.length;

      if (reset) {
        setBounties(incoming);
        setBountiesPage(2);
      } else {
        setBounties((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          return [...prev, ...incoming.filter((b) => !existingIds.has(b.id))];
        });
        setBountiesPage((p) => p + 1);
      }

      setHasMoreBounties(
        incoming.length === BOUNTIES_PER_PAGE &&
          bounties.length + incoming.length < total,
      );
    } catch (error) {
      console.error("Failed to fetch bounties:", error);
    } finally {
      setBountiesLoading(false);
    }
  };

  const loadMoreBounties = async () => {
    if (!hasMoreBounties || bountiesLoading) return;
    await fetchBounties(false);
  };

  const fetchTotalStats = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/bounties/stats/totals`, {
        headers: getPublicHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTotalBountyAmount(data.totalBountyAmount ?? 0);
      setTotalBountyCount(data.totalBountyCount ?? 0);
    } catch (error) {
      console.error("Failed to fetch bounty stats:", error);
    }
  };

  const fetchBountyById = async (id: string): Promise<Bounty | null> => {
    try {
      const res = await fetch(`${backendUrl}/api/bounties/${id}`, {
        headers: getPublicHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    } catch (error) {
      console.error("Failed to fetch bounty:", error);
      return null;
    }
  };

  const createBounty = async (data: BountyFormData) => {
    if (!currentUser) return;

    const res = await fetch(`${backendUrl}/api/bounties`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        bountyAmount: data.bountyAmount,
        timeToComplete: data.timeToComplete,
        assignee:
          data.assignee === "none"
            ? currentUser.role === "ADMIN"
              ? null
              : currentUser.id
            : data.assignee,
        createdBy: currentUser.id,
        isApproved: currentUser.role === "ADMIN",
        categoryId: data.category,
      }),
    });

    if (!res.ok) throw new Error("Failed to create bounty");

    // Response already includes createdByUser from the backend
    const created = await res.json();
    setBounties((prev) => [created, ...prev]);
  };

  const updateBounty = async (
    id: string,
    data: Partial<BountyFormData> & { userIds?: string[] },
  ) => {
    if (!currentUser) return;

    const res = await fetch(`${backendUrl}/api/bounties/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.bountyAmount && { bountyAmount: data.bountyAmount }),
        ...(data.timeToComplete && { timeToComplete: data.timeToComplete }),
        ...(data.assignee !== undefined && {
          assignees: data.assignee === "none" ? null : data.userIds,
        }),
      }),
    });

    if (!res.ok) throw new Error("Failed to update bounty");

    const updated = await res.json();
    setBounties((prev) => prev.map((b) => (b.id === id ? updated : b)));

    if (data.userIds !== undefined) {
      const assignRes = await fetch(
        `${backendUrl}/api/bounties/${id}/assignees`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ userIds: data.userIds }),
        },
      );

      if (!assignRes.ok) {
        const errData = await assignRes.json();
        throw new Error(errData.error || "Failed to update assignees");
      }

      await fetchBounties();
    }
  };

  const updateBountyStatus = async (
    id: string,
    status: Bounty["status"],
    winnerId?: string,
  ) => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    const res = await fetch(`${backendUrl}/api/bounties/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ...(winnerId && { winnerId }) }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      if (errorData.requiresWinner) {
        throw Object.assign(new Error("Winner selection required"), {
          requiresWinner: true,
          assignees: errorData.assignees,
        });
      }
      throw new Error(errorData.error || "Failed to update bounty status");
    }

    const updated = await res.json();
    setBounties((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const approveBounty = async (id: string, approved: boolean) => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    const res = await fetch(`${backendUrl}/api/bounties/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isApproved: approved }),
    });

    if (!res.ok) throw new Error("Failed to approve bounty");

    const updated = await res.json();
    setBounties((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBounty = async (id: string) => {
    if (!currentUser || currentUser.role !== "ADMIN") return;

    const res = await fetch(`${backendUrl}/api/bounties/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error("Failed to delete bounty");
    setBounties((prev) => prev.filter((b) => b.id !== id));
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; user?: any }> => {
    try {
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return { success: false };

      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setCurrentUser(data.user);

      await Promise.all([
        fetchBounties(),
        fetchUsers(),
        fetchCategories(),
        fetchTotalStats(),
      ]);

      return { success: true, user: data.user };
    } catch (err) {
      console.error("Login failed:", err);
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setApplications([]);
    setAllApplications([]);
    setZcashParams([]);
    setSyncStatus(null);
    setSyncStatusError(null);
    fetchBounties();
    fetchCategories();
    fetchUsers();
  };

  const applyToBounty = async (bountyId: string, message: string) => {
    if (!currentUser) return;

    const res = await fetch(`${backendUrl}/api/bounties/apply`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ bountyId, applicantId: currentUser.id, message }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to apply");
    }

    const newApplication = await res.json();
    setApplications((prev) => [...prev, newApplication]);
    setAllApplications((prev) => [...prev, newApplication]);
    await fetchBounties();
  };

  const editBounty = (id: string, data: Partial<BountyFormData>) => {
    updateBounty(id, data);
  };

  const verifyZaddress = async (z_address: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`${backendUrl}/auth/verify-zaddress`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ z_address }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to verify zaddress");
      }

      const data = await res.json();
      return data.isVerified as boolean;
    } catch (error) {
      console.error("Failed to verify zaddress:", error);
      return false;
    }
  };

  const zAddressUpdate = async (z_address: string) => {
    if (!currentUser) return;

    const res = await fetch(`${backendUrl}/auth/update-zaddress`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ z_address }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to add zaddress");
    }

    return true;
  };

  const fetchExportPayments = async (
    from?: string,
    to?: string,
  ): Promise<any[]> => {
    if (!currentUser || currentUser.role !== "ADMIN") return [];
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(
        `${backendUrl}/api/bounties/export-payments?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch export data");
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Failed to fetch export payments:", error);
      return [];
    }
  };

  const updateUserOfac = async (
    userId: string,
    ofacVerified: boolean,
  ): Promise<void> => {
    if (!currentUser || currentUser.role !== "ADMIN") return;
    const res = await fetch(`${backendUrl}/auth/users/${userId}/ofac`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ofacVerified }),
    });
    if (!res.ok) throw new Error("Failed to update OFAC status");
    await fetchUsers();
  };

  return (
    <BountyContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        setCurrentUser,
        switchRole,
        isSwitchingRole,
        categories,
        categoriesLoading,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        bounties, // now comes directly from the backend with all relations included
        bountiesLoading,
        createBounty,
        updateBounty,
        updateBountyStatus,
        approveBounty,
        authorizePayment,
        paymentIDs,
        paymentChain,
        paymentServerUrl,
        fetchTransactionHashes,
        authorizeDuePayment,
        deleteBounty,
        fetchBounties,
        loadMoreBounties,
        hasMoreBounties,
        bountiesPage,
        totalBountyAmount,
        totalBountyCount,
        fetchBountyById,
        applyToBounty,
        editBounty,
        users,
        nonAdminUsers,
        usersLoading,
        fetchUsers,
        applications,
        fetchUserApplications,
        fetchAllUsersApplications,
        getAllApplicationForBounty,
        fetchBountyApplications,
        getUserApplicationForBounty,
        getAllApplicationsForBounty,
        acceptApplication,
        rejectApplication,
        allApplications,
        bountyApplications,
        submitWork,
        fetchAllSubmissions,
        fetchWorkSubmissions,
        reviewWorkSubmission,
        authorizeBatchPayment,
        processBatchPayments,
        getPendingBatchPayments,
        zAddressUpdate,
        verifyZaddress,
        balance,
        fetchBalance,
        address,
        fetchAddresses,
        syncStatus,
        syncStatusLoading,
        syncStatusError,
        rescanStatus,
        fetchSyncStatus,
        rescanWallet,
        rescanLoading,
        zcashParams,
        zcashParamsLoading,
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
        fetchExportPayments,
        updateUserOfac,
        teams,
        teamsLoading,
        fetchTeams,
        createTeam,
        updateTeam,
        deleteTeam,
        addTeamMembers,
        updateTeamMemberRole,
        removeTeamMember,
        createTeamWallet,
        importTeamWallet,
        deleteTeamWallet,
        currentTeam,
      }}
    >
      {children}
    </BountyContext.Provider>
  );
}

export function useBounty() {
  const context = useContext(BountyContext);
  if (context === undefined) {
    throw new Error("useBounty must be used within a BountyProvider");
  }
  return context;
}
