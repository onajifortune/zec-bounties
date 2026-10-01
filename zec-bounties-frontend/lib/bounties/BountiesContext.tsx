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
import type { Bounty, BountyFormData } from "../types";
import { api, ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useSocketEvents } from "../socket/useSocket";
import { socketClient } from "../socket/socketClient";

const BOUNTIES_PER_PAGE = 10;
const MAX_PAGE_SIZE = 50; // backend hard cap

const enc = encodeURIComponent;

// ── Types ────────────────────────────────────────────────────────────────────

export type BountyChain = "MAIN" | "TEST" | "ALL";

export interface FetchBountiesOpts {
  chain?: BountyChain;
  teamId?: string;
  user?: string;
}

export interface BountyQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string | null;
}

export interface UnassignedBounty {
  id: string;
  title: string;
  bountyAmount: number;
  dateCreated: string;
}

export type CreateBountyInput = BountyFormData & { teamId?: string };

export type UpdateBountyInput = Partial<BountyFormData> & {
  userIds?: string[];
  notifyUsers?: boolean;
};

export interface BountiesContextType {
  /**
   * Raw list. `userApplication` is NOT merged in here (that needs the
   * Applications provider) — the facade / a selector hook does that.
   */
  bounties: Bounty[];
  bountiesLoading: boolean;
  /** True once the first bounty fetch after auth resolved has finished. */
  bountiesReady: boolean;
  hasMoreBounties: boolean;
  bountiesPage: number;
  fetchBounties: (reset?: boolean, opts?: FetchBountiesOpts) => Promise<void>;
  loadMoreBounties: () => Promise<void>;
  loadAllBounties: () => Promise<void>;
  fetchBountyById: (id: string) => Promise<Bounty | null>;
  /** Re-fetch one bounty and patch it into the list if it's there. */
  refreshBounty: (id: string) => Promise<void>;

  // Mine + quota
  myBounties: Bounty[];
  myBountiesLoading: boolean;
  fetchMyBounties: () => Promise<void>;
  bountyQuota: BountyQuota | null;
  fetchBountyQuota: () => Promise<void>;

  // Admin stats
  totalBountyAmount: number;
  totalBountyCount: number;
  totalActiveCount: number;
  statusCounts: Record<string, number>;
  unpaidDoneCount: number;
  fetchTotalStats: () => Promise<void>;

  // Mutations
  createBounty: (data: CreateBountyInput) => Promise<void>;
  updateBounty: (id: string, data: UpdateBountyInput) => Promise<void>;
  editBounty: (id: string, data: Partial<BountyFormData>) => void;
  updateBountyStatus: (
    id: string,
    status: Bounty["status"],
    winnerId?: string,
  ) => Promise<void>;
  approveBounty: (id: string, approved: boolean) => Promise<void>;
  deleteBounty: (id: string) => Promise<void>;

  // Admin: move teamless bounties onto a team
  unassignedBounties: UnassignedBounty[];
  unassignedBountiesLoading: boolean;
  fetchUnassignedBounties: () => Promise<void>;
  assignUnassignedBountiesToTeam: (
    teamId: string,
    bountyIds: string[],
  ) => Promise<{ movedCount: number }>;
}

const BountiesContext = createContext<BountiesContextType | undefined>(
  undefined,
);

// ── Provider ─────────────────────────────────────────────────────────────────

export function BountiesProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: authLoading } = useAuth();
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const userId = currentUser?.id;
  const role = currentUser?.role;

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [bountiesLoading, setBountiesLoading] = useState(false);
  const [bountiesReady, setBountiesReady] = useState(false);
  const [bountiesPage, setBountiesPage] = useState(1);
  const [hasMoreBounties, setHasMoreBounties] = useState(true);

  const [myBounties, setMyBounties] = useState<Bounty[]>([]);
  const [myBountiesLoading, setMyBountiesLoading] = useState(false);
  const [bountyQuota, setBountyQuota] = useState<BountyQuota | null>(null);

  const [totalBountyAmount, setTotalBountyAmount] = useState(0);
  const [totalBountyCount, setTotalBountyCount] = useState(0);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [unpaidDoneCount, setUnpaidDoneCount] = useState(0);

  const [unassignedBounties, setUnassignedBounties] = useState<
    UnassignedBounty[]
  >([]);
  const [unassignedBountiesLoading, setUnassignedBountiesLoading] =
    useState(false);

  // Mirrors so the stable callbacks below never read stale state.
  const pageRef = useRef(1);
  const countRef = useRef(0);
  countRef.current = bounties.length;
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMoreBounties;
  const loadingRef = useRef(false);
  loadingRef.current = bountiesLoading;

  // Latest request wins: a newer fetch invalidates older in-flight ones.
  const reqId = useRef(0);
  // `user` filter sticks across calls once a page passes it.
  const listUserRef = useRef("");

  const setPage = (n: number) => {
    pageRef.current = n;
    setBountiesPage(n);
  };

  const defaultChain = (): BountyChain =>
    userRef.current?.role === "ADMIN" ? "ALL" : "MAIN";

  // ── List ───────────────────────────────────────────────────────────────────
  // Sends the auth token when present: the backend uses optionalAuthenticate
  // so logged-in users also get their team's private bounties. Never switch
  // this to public headers.

  const fetchBounties = useCallback(
    async (reset = true, opts?: FetchBountiesOpts) => {
      if (opts && "user" in opts) {
        listUserRef.current = String(opts.user || "").trim();
      }
      const id = ++reqId.current;
      setBountiesLoading(true);
      try {
        const page = reset ? 1 : pageRef.current;
        const data = await api.get<any>("/api/bounties", {
          query: {
            page,
            limit: BOUNTIES_PER_PAGE,
            chain: opts?.chain ?? defaultChain(),
            teamId: opts?.teamId,
            user: listUserRef.current,
          },
          fallbackError: "Failed to fetch bounties",
        });
        if (id !== reqId.current) return; // superseded

        const incoming: Bounty[] = Array.isArray(data)
          ? data
          : (data.data ?? []);
        const total: number = data.total ?? incoming.length;
        const existingCount = reset ? 0 : countRef.current;

        if (reset) {
          setBounties(incoming);
          setPage(2);
        } else {
          setBounties((prev) => {
            const seen = new Set(prev.map((b) => b.id));
            return [...prev, ...incoming.filter((b) => !seen.has(b.id))];
          });
          setPage(page + 1);
        }

        setHasMoreBounties(
          incoming.length === BOUNTIES_PER_PAGE &&
            existingCount + incoming.length < total,
        );
      } catch (error) {
        console.error("Failed to fetch bounties:", error);
      } finally {
        if (id === reqId.current) setBountiesLoading(false);
      }
    },
    [],
  );

  const loadMoreBounties = useCallback(async () => {
    if (!hasMoreRef.current || loadingRef.current) return;
    await fetchBounties(false);
  }, [fetchBounties]);

  /** Fetches every page (backend cap 50/page) and replaces the list. */
  const loadAllBounties = useCallback(async () => {
    if (loadingRef.current) return;
    const id = ++reqId.current;
    setBountiesLoading(true);
    try {
      const chain = defaultChain();
      const collected: Bounty[] = [];
      let page = 1;

      while (true) {
        const data = await api.get<any>("/api/bounties", {
          query: {
            page,
            limit: MAX_PAGE_SIZE,
            chain,
            user: listUserRef.current,
          },
          fallbackError: "Failed to fetch bounties",
        });
        if (id !== reqId.current) return; // superseded

        const incoming: Bounty[] = Array.isArray(data)
          ? data
          : (data.data ?? []);
        const total: number = data.total ?? incoming.length;
        const seen = new Set(collected.map((b) => b.id));
        collected.push(...incoming.filter((b) => !seen.has(b.id)));

        if (
          incoming.length === 0 ||
          collected.length >= total ||
          incoming.length < MAX_PAGE_SIZE
        ) {
          break;
        }
        page += 1;
      }

      setBounties(collected);
      setPage(page + 1);
      setHasMoreBounties(false);
    } catch (error) {
      console.error("Failed to fetch all bounties:", error);
    } finally {
      if (id === reqId.current) setBountiesLoading(false);
    }
  }, []);

  const fetchBountyById = useCallback(
    async (id: string): Promise<Bounty | null> => {
      try {
        return await api.get<Bounty>(`/api/bounties/${enc(id)}`);
      } catch (error) {
        console.error("Failed to fetch bounty:", error);
        return null;
      }
    },
    [],
  );

  const refreshBounty = useCallback(
    async (id: string) => {
      const fresh = await fetchBountyById(id);
      if (!fresh) return;
      setBounties((prev) =>
        prev.some((b) => b.id === id)
          ? prev.map((b) => (b.id === id ? fresh : b))
          : prev,
      );
    },
    [fetchBountyById],
  );

  // ── Mine + quota ───────────────────────────────────────────────────────────

  const fetchMyBounties = useCallback(async () => {
    if (!userRef.current) return;
    setMyBountiesLoading(true);
    try {
      const data = await api.get<{ data?: Bounty[] }>("/api/bounties/mine", {
        fallbackError: "Failed to fetch your bounties",
      });
      setMyBounties(data.data ?? []);
    } catch (error) {
      console.error("Failed to fetch my bounties:", error);
    } finally {
      setMyBountiesLoading(false);
    }
  }, []);

  const fetchBountyQuota = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    if (user.role === "ADMIN") {
      setBountyQuota(null);
      return;
    }
    try {
      setBountyQuota(
        await api.get<BountyQuota>("/api/bounties/mine/quota", {
          fallbackError: "Failed to fetch bounty quota",
        }),
      );
    } catch (error) {
      console.error("Failed to fetch bounty quota:", error);
    }
  }, []);

  // ── Admin stats ────────────────────────────────────────────────────────────

  const fetchTotalStats = useCallback(async () => {
    if (userRef.current?.role !== "ADMIN") return;
    try {
      const data = await api.get<any>("/api/bounties/stats/totals");
      setTotalBountyAmount(data.totalBountyAmount ?? 0);
      setTotalBountyCount(data.totalBountyCount ?? 0);
      setTotalActiveCount(
        (data.statusCounts?.IN_PROGRESS ?? 0) +
          (data.statusCounts?.IN_REVIEW ?? 0),
      );
      setStatusCounts(data.statusCounts ?? {});
      setUnpaidDoneCount(data.unpaidDoneCount ?? 0);
    } catch (error) {
      console.error("Failed to fetch bounty stats:", error);
    }
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createBounty = useCallback(
    async (data: CreateBountyInput) => {
      const user = userRef.current;
      if (!user) return;

      try {
        // Team bounties use the dedicated team route (recipients-scoped
        // broadcast, membership + verification checks). Everything else goes
        // through the general marketplace route.
        const path = data.teamId
          ? `/api/teams/${enc(data.teamId)}/bounties`
          : "/api/bounties";

        const created = await api.post<Bounty>(
          path,
          {
            title: data.title,
            description: data.description,
            bountyAmount: data.bountyAmount,
            timeToComplete: data.timeToComplete,
            assignee:
              data.assignee === "none"
                ? user.role === "ADMIN" || data.teamId
                  ? null
                  : user.id
                : data.assignee,
            categoryId: data.category,
            chain: data.chain,
            // For team bounties the team comes from the URL, not the body.
            ...(!data.teamId && { teamId: null }),
          },
          { fallbackError: "Failed to create bounty" },
        );

        setBounties((prev) =>
          prev.some((b) => b.id === created.id) ? prev : [created, ...prev],
        );

        // Tell other domains (e.g. a loaded team's bounty cache) right away,
        // exactly as if the server's broadcast had arrived. Handlers dedupe.
        socketClient.emitLocal("new_bounties", created);

        fetchBountyQuota();
      } catch (error) {
        console.error("Failed to create bounty:", error);
        throw error;
      }
    },
    [fetchBountyQuota],
  );

  const updateBounty = useCallback(
    async (id: string, data: UpdateBountyInput) => {
      if (!userRef.current) return;

      try {
        await api.put(
          `/api/bounties/${enc(id)}`,
          {
            ...(data.title && { title: data.title }),
            ...(data.description && { description: data.description }),
            ...(data.bountyAmount && { bountyAmount: data.bountyAmount }),
            ...(data.timeToComplete && { timeToComplete: data.timeToComplete }),
            ...(data.chain && { chain: data.chain }),
            notifyUsers: data.notifyUsers ?? false,
          },
          { fallbackError: "Failed to update bounty" },
        );

        if (data.userIds !== undefined) {
          await api.post(
            `/api/bounties/${enc(id)}/assignees`,
            {
              userIds: data.userIds,
              notifyUsers: data.notifyUsers ?? false,
            },
            { fallbackError: "Failed to update assignees" },
          );
        }

        await refreshBounty(id);
      } catch (error) {
        console.error("Failed to update bounty:", error);
        throw error;
      }
    },
    [refreshBounty],
  );

  // Fire-and-forget wrapper kept for existing callers. updateBounty already
  // logs, so just make sure a rejection isn't left unhandled.
  const editBounty = useCallback(
    (id: string, data: Partial<BountyFormData>) => {
      updateBounty(id, data).catch(() => {});
    },
    [updateBounty],
  );

  const updateBountyStatus = useCallback(
    async (id: string, status: Bounty["status"], winnerId?: string) => {
      if (userRef.current?.role !== "ADMIN") return;

      try {
        const updated = await api.patch<Bounty>(
          `/api/bounties/${enc(id)}/status`,
          { status, ...(winnerId && { winnerId }) },
          { fallbackError: "Failed to update bounty status" },
        );
        setBounties((prev) => prev.map((b) => (b.id === id ? updated : b)));
        await fetchTotalStats();
      } catch (error) {
        // Surface the requiresWinner signal so the UI can react
        if (error instanceof ApiError && error.data?.requiresWinner) {
          throw Object.assign(new Error("Winner selection required"), {
            requiresWinner: true,
            assignees: error.data.assignees,
          });
        }
        console.error("Failed to update bounty status:", error);
        throw error;
      }
    },
    [fetchTotalStats],
  );

  const approveBounty = useCallback(
    async (id: string, approved: boolean) => {
      if (userRef.current?.role !== "ADMIN") return;

      try {
        await api.put(
          `/api/bounties/${enc(id)}`,
          { isApproved: approved },
          { fallbackError: "Failed to approve bounty" },
        );
        // Re-fetch so the assignees array is fresh
        await fetchBounties();
      } catch (error) {
        console.error("Failed to approve bounty:", error);
        throw error;
      }
    },
    [fetchBounties],
  );

  const deleteBounty = useCallback(async (id: string) => {
    if (userRef.current?.role !== "ADMIN") return;

    try {
      await api.delete(`/api/bounties/${enc(id)}`, {
        fallbackError: "Failed to delete bounty",
      });
      setBounties((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete bounty:", error);
      throw error;
    }
  }, []);

  // ── Admin: unassigned bounties ─────────────────────────────────────────────

  const fetchUnassignedBounties = useCallback(async () => {
    if (userRef.current?.role !== "ADMIN") return;
    setUnassignedBountiesLoading(true);
    try {
      const data = await api.get<{ bounties?: UnassignedBounty[] }>(
        "/api/bounties/unassigned",
        { fallbackError: "Failed to fetch unassigned bounties" },
      );
      setUnassignedBounties(data.bounties ?? []);
    } catch (error) {
      console.error("Failed to fetch unassigned bounties:", error);
    } finally {
      setUnassignedBountiesLoading(false);
    }
  }, []);

  const assignUnassignedBountiesToTeam = useCallback(
    async (teamId: string, bountyIds: string[]) => {
      if (userRef.current?.role !== "ADMIN") throw new Error("Unauthorized");
      if (bountyIds.length === 0) return { movedCount: 0 };

      const json = await api.patch<{ movedCount?: number }>(
        "/api/bounties/unassigned/assign-team",
        { teamId, bountyIds },
        { fallbackError: "Failed to move bounties" },
      );

      // Optimistic: drop the moved ones locally instead of refetching the list.
      setUnassignedBounties((prev) =>
        prev.filter((b) => !bountyIds.includes(b.id)),
      );
      await fetchBounties();

      return { movedCount: json.movedCount ?? bountyIds.length };
    },
    [fetchBounties],
  );

  // ── Session lifecycle ──────────────────────────────────────────────────────

  // Public list: load once auth has resolved, and again whenever the session
  // (user or role) changes — initial load, login, logout, role switch.
  useEffect(() => {
    if (authLoading) return;
    fetchBounties().finally(() => setBountiesReady(true));
  }, [authLoading, userId, role, fetchBounties]);

  // Per-user data
  useEffect(() => {
    if (userId) {
      fetchMyBounties();
      fetchBountyQuota();
    } else {
      setMyBounties([]);
      setBountyQuota(null);
      setUnassignedBounties([]);
    }
  }, [userId, role, fetchMyBounties, fetchBountyQuota]);

  // Admin stats
  useEffect(() => {
    if (role === "ADMIN") {
      fetchTotalStats();
    } else {
      setTotalBountyAmount(0);
      setTotalBountyCount(0);
      setTotalActiveCount(0);
      setStatusCounts({});
      setUnpaidDoneCount(0);
    }
  }, [userId, role, fetchTotalStats]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  // Only what changes this provider's state. Team caches, payment records,
  // wallet balance etc. subscribe to the same events in their own providers.

  const replaceBounty = (p: Bounty) =>
    setBounties((prev) => prev.map((b) => (b.id === p.id ? p : b)));

  useSocketEvents({
    new_bounties: (p) => {
      setBounties((prev) =>
        prev.some((b) => b.id === p.id) ? prev : [p, ...prev],
      );
      fetchTotalStats();
    },
    bounty_updated: replaceBounty,
    bounty_status_changed: replaceBounty,
    bounty_approved: replaceBounty,
    bounty_marked_paid: replaceBounty,
    bounty_payment_authorized: replaceBounty,

    // Two shapes share this event: per-bounty (a bounty, has .id) and bulk
    // payout (bountyIds + txids, no .id).
    payment_authorized: (p) => {
      if (p.id) replaceBounty(p);
      else fetchBounties();
    },

    // Events that change bounty status/assignees without sending the bounty.
    bounty_paid: () => fetchBounties(),
    bounty_assignees_updated: () => fetchBounties(),
    work_submitted: () => fetchBounties(),
    submission_reviewed: () => fetchBounties(),
    team_bounties_privacy_changed: () => fetchBounties(),
    user_updated: () => fetchBounties(),
    bounties_exported: () => fetchTotalStats(),

    // Bounties embed a { id, name, logo } snapshot of their team — keep it in
    // sync so cards/modals update live without a refetch.
    team_updated: (p) =>
      setBounties((prev) =>
        prev.map((b) =>
          b.teamId === p.id
            ? { ...b, team: { id: p.id, name: p.name, logo: p.logo } }
            : b,
        ),
      ),
  });

  const value = useMemo<BountiesContextType>(
    () => ({
      bounties,
      bountiesLoading,
      bountiesReady,
      hasMoreBounties,
      bountiesPage,
      fetchBounties,
      loadMoreBounties,
      loadAllBounties,
      fetchBountyById,
      refreshBounty,
      myBounties,
      myBountiesLoading,
      fetchMyBounties,
      bountyQuota,
      fetchBountyQuota,
      totalBountyAmount,
      totalBountyCount,
      totalActiveCount,
      statusCounts,
      unpaidDoneCount,
      fetchTotalStats,
      createBounty,
      updateBounty,
      editBounty,
      updateBountyStatus,
      approveBounty,
      deleteBounty,
      unassignedBounties,
      unassignedBountiesLoading,
      fetchUnassignedBounties,
      assignUnassignedBountiesToTeam,
    }),
    [
      bounties,
      bountiesLoading,
      bountiesReady,
      hasMoreBounties,
      bountiesPage,
      fetchBounties,
      loadMoreBounties,
      loadAllBounties,
      fetchBountyById,
      refreshBounty,
      myBounties,
      myBountiesLoading,
      fetchMyBounties,
      bountyQuota,
      fetchBountyQuota,
      totalBountyAmount,
      totalBountyCount,
      totalActiveCount,
      statusCounts,
      unpaidDoneCount,
      fetchTotalStats,
      createBounty,
      updateBounty,
      editBounty,
      updateBountyStatus,
      approveBounty,
      deleteBounty,
      unassignedBounties,
      unassignedBountiesLoading,
      fetchUnassignedBounties,
      assignUnassignedBountiesToTeam,
    ],
  );

  return (
    <BountiesContext.Provider value={value}>
      {children}
    </BountiesContext.Provider>
  );
}

export function useBounties() {
  const ctx = useContext(BountiesContext);
  if (ctx === undefined) {
    throw new Error("useBounties must be used within a BountiesProvider");
  }
  return ctx;
}
