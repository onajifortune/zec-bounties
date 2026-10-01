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
import type { Bounty, BountyApplication } from "../types";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useBounties } from "../bounties/BountiesContext";
import { useSocketEvents } from "../socket/useSocket";

const enc = encodeURIComponent;

export interface ApplicationsContextType {
  /** The current user's own applications. */
  applications: BountyApplication[];
  /** Admin: every user's applications. */
  allApplications: BountyApplication[];
  /** Per-bounty cache, filled by fetchBountyApplications. */
  bountyApplications: Record<string, BountyApplication[]>;

  fetchUserApplications: () => Promise<void>;
  fetchAllUsersApplications: () => Promise<void>;
  fetchBountyApplications: (bountyId: string) => Promise<BountyApplication[]>;

  getUserApplicationForBounty: (bountyId: string) => BountyApplication | null;
  /**
   * Cached list for a bounty. If nothing is cached it returns [] and loads
   * in the background (deduped, never during render). Prefer the
   * useBountyApplications(bountyId) hook in new code.
   */
  getAllApplicationsForBounty: (bountyId: string) => BountyApplication[];
  getAllApplicationForBounty: (bountyId: string) => BountyApplication | null;

  applyToBounty: (bountyId: string, message: string) => Promise<void>;
  acceptApplication: (applicationId: string) => Promise<BountyApplication>;
  rejectApplication: (applicationId: string) => Promise<BountyApplication>;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(
  undefined,
);

/** Replace by id if present, otherwise append. Makes HTTP + WS echoes safe. */
function upsert(list: BountyApplication[], item: BountyApplication) {
  return list.some((a) => a.id === item.id)
    ? list.map((a) => (a.id === item.id ? item : a))
    : [...list, item];
}

export function ApplicationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  const { refreshBounty } = useBounties();
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const userId = currentUser?.id;
  const role = currentUser?.role;

  const [applications, setApplications] = useState<BountyApplication[]>([]);
  const [allApplications, setAllApplications] = useState<BountyApplication[]>(
    [],
  );
  const [bountyApplications, setBountyApplications] = useState<
    Record<string, BountyApplication[]>
  >({});

  // Bounties whose lazy background load is in flight (dedupe).
  const requested = useRef<Set<string>>(new Set());

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchBountyApplications = useCallback(async (bountyId: string) => {
    if (!userRef.current) return [];
    try {
      const data = await api.get<BountyApplication[]>(
        `/api/bounties/${enc(bountyId)}/applications`,
        { fallbackError: "Failed to fetch bounty applications" },
      );
      setBountyApplications((prev) => ({ ...prev, [bountyId]: data }));
      return data;
    } catch (error) {
      console.error("Failed to fetch bounty applications:", error);
      return [];
    }
  }, []);

  const fetchUserApplications = useCallback(async () => {
    if (!userRef.current) return;
    try {
      setApplications(
        await api.get<BountyApplication[]>("/api/bounties/my-applications", {
          fallbackError: "Failed to fetch applications",
        }),
      );
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    }
  }, []);

  const fetchAllUsersApplications = useCallback(async () => {
    if (userRef.current?.role !== "ADMIN") return;
    try {
      setAllApplications(
        await api.get<BountyApplication[]>("/api/bounties/all-applications", {
          fallbackError: "Failed to fetch applications",
        }),
      );
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    }
  }, []);

  // ── Selectors ──────────────────────────────────────────────────────────────

  const getUserApplicationForBounty = useCallback(
    (bountyId: string) =>
      applications.find((a) => a.bountyId === bountyId) ?? null,
    [applications],
  );

  const getAllApplicationsForBounty = useCallback(
    (bountyId: string): BountyApplication[] => {
      if (bountyApplications[bountyId]) return bountyApplications[bountyId];

      if (allApplications.length > 0) {
        return allApplications.filter((a) => a.bountyId === bountyId);
      }

      // Not cached: load in the background. Deferred so no state is set while
      // a component is rendering, and deduped so re-renders don't each fire a
      // request (the old version did both).
      if (!requested.current.has(bountyId)) {
        requested.current.add(bountyId);
        Promise.resolve()
          .then(() => fetchBountyApplications(bountyId))
          .finally(() => requested.current.delete(bountyId));
      }
      return [];
    },
    [bountyApplications, allApplications, fetchBountyApplications],
  );

  const getAllApplicationForBounty = useCallback(
    (bountyId: string) =>
      allApplications.find((a) => a.bountyId === bountyId) ?? null,
    [allApplications],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const applyToBounty = useCallback(
    async (bountyId: string, message: string) => {
      const user = userRef.current;
      if (!user) return;

      try {
        const created = await api.post<BountyApplication>(
          "/api/bounties/apply",
          { bountyId, applicantId: user.id, message },
          { fallbackError: "Failed to apply" },
        );
        // upsert: the server's application_created push may land first
        setApplications((prev) => upsert(prev, created));
        setAllApplications((prev) => upsert(prev, created));

        await refreshBounty(bountyId);
      } catch (error) {
        console.error("Failed to apply to bounty:", error);
        throw error;
      }
    },
    [refreshBounty],
  );

  const setApplicationStatus = useCallback(
    async (
      applicationId: string,
      status: "accepted" | "rejected",
      fallbackError: string,
    ) => {
      if (!userRef.current) throw new Error("User not authenticated");

      try {
        const updated = await api.put<BountyApplication>(
          `/api/bounties/applications/${enc(applicationId)}`,
          { status },
          { fallbackError },
        );
        await fetchBountyApplications(updated.bountyId);
        await refreshBounty(updated.bountyId);
        return updated;
      } catch (error) {
        console.error(`Failed to ${status} application:`, error);
        throw error;
      }
    },
    [fetchBountyApplications, refreshBounty],
  );

  const acceptApplication = useCallback(
    (applicationId: string) =>
      setApplicationStatus(
        applicationId,
        "accepted",
        "Failed to accept application",
      ),
    [setApplicationStatus],
  );

  const rejectApplication = useCallback(
    (applicationId: string) =>
      setApplicationStatus(
        applicationId,
        "rejected",
        "Failed to reject application",
      ),
    [setApplicationStatus],
  );

  // ── Session lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchUserApplications();
      fetchAllUsersApplications(); // no-ops unless admin
    } else {
      setApplications([]);
      setAllApplications([]);
      setBountyApplications({}); // incl. anything an admin had cached
      requested.current.clear();
    }
  }, [userId, role, fetchUserApplications, fetchAllUsersApplications]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  // The per-bounty cache is only touched if that bounty's list was already
  // loaded. Creating a one-item list for an unloaded bounty would make
  // getAllApplicationsForBounty think it's complete and never fetch the rest.
  useSocketEvents({
    application_created: (p: BountyApplication) => {
      if (p.applicantId === userRef.current?.id) {
        setApplications((prev) => upsert(prev, p));
      }
      setAllApplications((prev) => upsert(prev, p));
      setBountyApplications((prev) =>
        prev[p.bountyId]
          ? { ...prev, [p.bountyId]: upsert(prev[p.bountyId], p) }
          : prev,
      );
    },
    application_updated: (p: BountyApplication) => {
      setApplications((prev) => prev.map((a) => (a.id === p.id ? p : a)));
      setAllApplications((prev) => prev.map((a) => (a.id === p.id ? p : a)));
      setBountyApplications((prev) =>
        prev[p.bountyId]
          ? {
              ...prev,
              [p.bountyId]: prev[p.bountyId].map((a) =>
                a.id === p.id ? p : a,
              ),
            }
          : prev,
      );
    },
    application_deleted: (p: BountyApplication) => {
      setApplications((prev) => prev.filter((a) => a.id !== p.id));
      setAllApplications((prev) => prev.filter((a) => a.id !== p.id));
      setBountyApplications((prev) =>
        prev[p.bountyId]
          ? {
              ...prev,
              [p.bountyId]: prev[p.bountyId].filter((a) => a.id !== p.id),
            }
          : prev,
      );
    },
  });

  const value = useMemo<ApplicationsContextType>(
    () => ({
      applications,
      allApplications,
      bountyApplications,
      fetchUserApplications,
      fetchAllUsersApplications,
      fetchBountyApplications,
      getUserApplicationForBounty,
      getAllApplicationsForBounty,
      getAllApplicationForBounty,
      applyToBounty,
      acceptApplication,
      rejectApplication,
    }),
    [
      applications,
      allApplications,
      bountyApplications,
      fetchUserApplications,
      fetchAllUsersApplications,
      fetchBountyApplications,
      getUserApplicationForBounty,
      getAllApplicationsForBounty,
      getAllApplicationForBounty,
      applyToBounty,
      acceptApplication,
      rejectApplication,
    ],
  );

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (ctx === undefined) {
    throw new Error(
      "useApplications must be used within an ApplicationsProvider",
    );
  }
  return ctx;
}

// ── Hooks for new code ───────────────────────────────────────────────────────

/** Applications for one bounty. Loads (and refreshes) in an effect. */
export function useBountyApplications(bountyId: string | undefined) {
  const { bountyApplications, fetchBountyApplications } = useApplications();

  useEffect(() => {
    if (bountyId) fetchBountyApplications(bountyId);
  }, [bountyId, fetchBountyApplications]);

  return bountyId ? (bountyApplications[bountyId] ?? []) : [];
}

/**
 * The bounty list with `userApplication` merged in (what the old context did
 * inside `populatedBounties`). Kept out of BountiesProvider so Bounties doesn't
 * depend on Applications.
 */
export function useBountiesWithApplication(): Bounty[] {
  const { bounties } = useBounties();
  const { applications } = useApplications();

  return useMemo(() => {
    const byBounty = new Map<string, BountyApplication>();
    for (const app of applications) {
      if (!byBounty.has(app.bountyId)) byBounty.set(app.bountyId, app);
    }
    return bounties.map((b) => ({
      ...b,
      userApplication: byBounty.get(b.id),
    }));
  }, [bounties, applications]);
}
