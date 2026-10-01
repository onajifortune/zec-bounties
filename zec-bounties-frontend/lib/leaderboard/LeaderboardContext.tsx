"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api";
import type { LeaderboardEntry } from "../types";

export interface LeaderboardParams {
  timeRange?: "all" | "30d" | "90d";
  chain?: "MAIN" | "TEST" | "ALL";
  limit?: number;
}

export interface LeaderboardContextType {
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  fetchLeaderboard: (params?: LeaderboardParams) => Promise<void>;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(
  undefined,
);

export function LeaderboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const reqId = useRef(0);

  // Public route — no auth required. Only the latest request may write state,
  // so quickly switching the time range can't show an older response.
  const fetchLeaderboard = useCallback(async (params?: LeaderboardParams) => {
    const id = ++reqId.current;
    setLeaderboardLoading(true);
    try {
      const data = await api.get<LeaderboardEntry[]>("/api/leaderboard", {
        auth: false,
        query: {
          timeRange: params?.timeRange,
          chain: params?.chain,
          limit: params?.limit,
        },
        fallbackError: "Failed to fetch leaderboard",
      });
      if (id === reqId.current) setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      if (id === reqId.current) setLeaderboard([]);
    } finally {
      if (id === reqId.current) setLeaderboardLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ leaderboard, leaderboardLoading, fetchLeaderboard }),
    [leaderboard, leaderboardLoading, fetchLeaderboard],
  );

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard() {
  const ctx = useContext(LeaderboardContext);
  if (ctx === undefined) {
    throw new Error("useLeaderboard must be used within a LeaderboardProvider");
  }
  return ctx;
}
