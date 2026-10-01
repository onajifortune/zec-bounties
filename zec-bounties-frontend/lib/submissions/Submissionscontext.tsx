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
import type { WorkSubmission } from "../types";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useBounties } from "../bounties/BountiesContext";
import { useSocketEvents } from "../socket/useSocket";

const enc = encodeURIComponent;

export interface SubmissionsContextType {
  /** The current user's own submissions. */
  submissions: WorkSubmission[];
  /** Admin: every submission. */
  allSubmissions: WorkSubmission[];
  /** Per-bounty cache, filled by fetchBountySubmissions. */
  bountySubmissions: Record<string, WorkSubmission[]>;

  fetchUserSubmissions: () => Promise<void>;
  fetchAllSubmissions: () => Promise<WorkSubmission[]>;
  fetchBountySubmissions: (bountyId: string) => Promise<WorkSubmission[]>;
  /** Uncached read that throws on failure (creator/admin). */
  fetchWorkSubmissions: (bountyId: string) => Promise<WorkSubmission[]>;

  getUserSubmissionForBounty: (bountyId: string) => WorkSubmission | null;
  /**
   * Cached list for a bounty. If nothing is cached it returns [] and loads in
   * the background (deduped, never during render). Prefer the
   * useBountySubmissions(bountyId) hook in new code.
   */
  getAllSubmissionsForBounty: (bountyId: string) => WorkSubmission[];

  submitWork: (
    bountyId: string,
    submissionData: { description: string; deliverableUrl?: string },
  ) => Promise<void>;
  editSubmission: (
    submissionId: string,
    data: { description: string; deliverableUrl?: string },
  ) => Promise<WorkSubmission>;
  reviewWorkSubmission: (
    submissionId: string,
    reviewData: {
      status: "approved" | "rejected" | "needs_revision";
      reviewNotes?: string;
    },
  ) => Promise<any>;
  rejectOtherSubmissions: (submissionId: string) => Promise<void>;
}

const SubmissionsContext = createContext<SubmissionsContextType | undefined>(
  undefined,
);

function upsert(list: WorkSubmission[], item: WorkSubmission) {
  return list.some((s) => s.id === item.id)
    ? list.map((s) => (s.id === item.id ? item : s))
    : [...list, item];
}

export function SubmissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  const { refreshBounty, fetchBounties } = useBounties();
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const userId = currentUser?.id;
  const role = currentUser?.role;

  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<WorkSubmission[]>([]);
  const [bountySubmissions, setBountySubmissions] = useState<
    Record<string, WorkSubmission[]>
  >({});

  const requested = useRef<Set<string>>(new Set());

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchUserSubmissions = useCallback(async () => {
    if (!userRef.current) return;
    try {
      setSubmissions(
        await api.get<WorkSubmission[]>("/api/bounties/my-submissions", {
          fallbackError: "Failed to fetch submissions",
        }),
      );
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  }, []);

  const fetchAllSubmissions = useCallback(async (): Promise<
    WorkSubmission[]
  > => {
    if (userRef.current?.role !== "ADMIN") return [];
    try {
      const data = await api.get<WorkSubmission[]>(
        "/api/bounties/submissions/all",
        { fallbackError: "Failed to fetch all submissions" },
      );
      setAllSubmissions(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch all submissions:", error);
      return [];
    }
  }, []);

  const fetchBountySubmissions = useCallback(async (bountyId: string) => {
    if (!userRef.current) return [];
    try {
      const data = await api.get<WorkSubmission[]>(
        `/api/bounties/${enc(bountyId)}/submissions`,
        { fallbackError: "Failed to fetch bounty submissions" },
      );
      setBountySubmissions((prev) => ({ ...prev, [bountyId]: data }));
      return data;
    } catch (error) {
      console.error("Failed to fetch bounty submissions:", error);
      return [];
    }
  }, []);

  const fetchWorkSubmissions = useCallback(async (bountyId: string) => {
    if (!userRef.current) throw new Error("User not authenticated");
    try {
      return await api.get<WorkSubmission[]>(
        `/api/bounties/${enc(bountyId)}/submissions`,
        { fallbackError: "Failed to fetch work submissions" },
      );
    } catch (error) {
      console.error("Failed to fetch work submissions:", error);
      throw error;
    }
  }, []);

  // ── Selectors ──────────────────────────────────────────────────────────────

  const getUserSubmissionForBounty = useCallback(
    (bountyId: string) =>
      submissions.find((s) => s.bountyId === bountyId) ?? null,
    [submissions],
  );

  const getAllSubmissionsForBounty = useCallback(
    (bountyId: string): WorkSubmission[] => {
      if (bountySubmissions[bountyId]) return bountySubmissions[bountyId];

      if (allSubmissions.length > 0) {
        return allSubmissions.filter((s) => s.bountyId === bountyId);
      }

      if (!requested.current.has(bountyId)) {
        requested.current.add(bountyId);
        Promise.resolve()
          .then(() => fetchBountySubmissions(bountyId))
          .finally(() => requested.current.delete(bountyId));
      }
      return [];
    },
    [bountySubmissions, allSubmissions, fetchBountySubmissions],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const submitWork = useCallback(
    async (
      bountyId: string,
      submissionData: { description: string; deliverableUrl?: string },
    ) => {
      if (!userRef.current) throw new Error("User not authenticated");
      try {
        await api.post(
          `/api/bounties/${enc(bountyId)}/submit`,
          submissionData,
          { fallbackError: "Failed to submit work" },
        );
        await refreshBounty(bountyId);
      } catch (error) {
        console.error("Failed to submit work:", error);
        throw error;
      }
    },
    [refreshBounty],
  );

  const replaceSubmission = useCallback((p: WorkSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === p.id ? p : s)));
    setAllSubmissions((prev) => prev.map((s) => (s.id === p.id ? p : s)));
    setBountySubmissions((prev) =>
      prev[p.bountyId]
        ? {
            ...prev,
            [p.bountyId]: prev[p.bountyId].map((s) => (s.id === p.id ? p : s)),
          }
        : prev,
    );
  }, []);

  const editSubmission = useCallback(
    async (
      submissionId: string,
      data: { description: string; deliverableUrl?: string },
    ) => {
      if (!userRef.current) throw new Error("User not authenticated");
      try {
        const result = await api.patch<{ workSubmission: WorkSubmission }>(
          `/api/bounties/submissions/${enc(submissionId)}`,
          data,
          { fallbackError: "Failed to edit submission" },
        );
        replaceSubmission(result.workSubmission);
        return result.workSubmission;
      } catch (error) {
        console.error("Failed to edit submission:", error);
        throw error;
      }
    },
    [replaceSubmission],
  );

  const reviewWorkSubmission = useCallback(
    async (
      submissionId: string,
      reviewData: {
        status: "approved" | "rejected" | "needs_revision";
        reviewNotes?: string;
      },
    ) => {
      if (!userRef.current) throw new Error("User not authenticated");
      try {
        const result = await api.patch(
          `/api/bounties/submissions/${enc(submissionId)}/review`,
          reviewData,
          { fallbackError: "Failed to review submission" },
        );
        await fetchBounties();
        return result;
      } catch (error) {
        console.error("Failed to review submission:", error);
        throw error;
      }
    },
    [fetchBounties],
  );

  const rejectOtherSubmissions = useCallback(
    async (submissionId: string) => {
      if (!userRef.current) throw new Error("User not authenticated");
      try {
        await api.patch(
          `/api/bounties/submissions/${enc(submissionId)}/reject-others`,
          undefined,
          { fallbackError: "Failed to reject other submissions" },
        );
        await fetchBounties();
      } catch (error) {
        console.error("Failed to reject other submissions:", error);
        throw error;
      }
    },
    [fetchBounties],
  );

  // ── Session lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchUserSubmissions();
      fetchAllSubmissions(); // no-ops unless admin
    } else {
      setSubmissions([]);
      setAllSubmissions([]);
      setBountySubmissions({});
      requested.current.clear();
    }
  }, [userId, role, fetchUserSubmissions, fetchAllSubmissions]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  // Per-bounty cache is only touched when that bounty's list is already loaded
  // (see ApplicationsContext for why). The bounty list itself refetches on
  // these events inside BountiesProvider.
  useSocketEvents({
    work_submitted: (p: WorkSubmission & { submittedBy?: string }) => {
      if (p.submittedBy === userRef.current?.id) {
        setSubmissions((prev) => upsert(prev, p));
      }
      setAllSubmissions((prev) =>
        prev.some((s) => s.id === p.id) ? prev : [p, ...prev],
      );
      setBountySubmissions((prev) =>
        prev[p.bountyId]
          ? { ...prev, [p.bountyId]: upsert(prev[p.bountyId], p) }
          : prev,
      );
    },
    submission_reviewed: replaceSubmission,
    submission_edited: replaceSubmission,
    submissions_rejected_others: (p: {
      bountyId: string;
      keptSubmissionId: string;
    }) => {
      setAllSubmissions((prev) =>
        prev.map((s) =>
          s.bountyId === p.bountyId &&
          s.id !== p.keptSubmissionId &&
          s.status === "pending"
            ? { ...s, status: "rejected" }
            : s,
        ),
      );
      setBountySubmissions((prev) =>
        prev[p.bountyId]
          ? {
              ...prev,
              [p.bountyId]: prev[p.bountyId].map((s) =>
                s.id !== p.keptSubmissionId && s.status === "pending"
                  ? { ...s, status: "rejected" }
                  : s,
              ),
            }
          : prev,
      );
    },
  });

  const value = useMemo<SubmissionsContextType>(
    () => ({
      submissions,
      allSubmissions,
      bountySubmissions,
      fetchUserSubmissions,
      fetchAllSubmissions,
      fetchBountySubmissions,
      fetchWorkSubmissions,
      getUserSubmissionForBounty,
      getAllSubmissionsForBounty,
      submitWork,
      editSubmission,
      reviewWorkSubmission,
      rejectOtherSubmissions,
    }),
    [
      submissions,
      allSubmissions,
      bountySubmissions,
      fetchUserSubmissions,
      fetchAllSubmissions,
      fetchBountySubmissions,
      fetchWorkSubmissions,
      getUserSubmissionForBounty,
      getAllSubmissionsForBounty,
      submitWork,
      editSubmission,
      reviewWorkSubmission,
      rejectOtherSubmissions,
    ],
  );

  return (
    <SubmissionsContext.Provider value={value}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (ctx === undefined) {
    throw new Error("useSubmissions must be used within a SubmissionsProvider");
  }
  return ctx;
}

/** Submissions for one bounty. Loads (and refreshes) in an effect. */
export function useBountySubmissions(bountyId: string | undefined) {
  const { bountySubmissions, fetchBountySubmissions } = useSubmissions();

  useEffect(() => {
    if (bountyId) fetchBountySubmissions(bountyId);
  }, [bountyId, fetchBountySubmissions]);

  return bountyId ? (bountySubmissions[bountyId] ?? []) : [];
}
