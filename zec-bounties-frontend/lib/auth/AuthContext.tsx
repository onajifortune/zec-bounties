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
import type { User, RecoveryData } from "../types";
import { api, ApiError, AUTH_TOKEN_KEY } from "../api";
import { useSocketConnection, useSocketEvents } from "../socket/useSocket";

const USER_KEY = "currentUser";

type Role = "ADMIN" | "CLIENT" | "HUNTER" | "TEAM";

export interface AuthContextType {
  currentUser: User | null;
  /** True until the saved token (if any) has been validated. */
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; user?: any }>;
  logout: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;

  // Role
  selectRole: (role: "HUNTER" | "TEAM") => Promise<boolean>;
  /** isRobin users only */
  switchRole: (role: Role) => Promise<void>;
  isSwitchingRole: boolean;

  // Recovery
  requestRecoveryOtp: () => Promise<{ message: string; email: string }>;
  verifyRecoveryOtp: (
    otp: string,
    accountName: string,
  ) => Promise<RecoveryData>;

  // Profile
  nicknameUpdate: (nickname: string) => Promise<boolean | undefined>;
  disconnectDiscord: () => Promise<boolean>;
  emailNotificationsUpdate: (enabled: boolean) => Promise<boolean | undefined>;
  zAddressUpdate: (z_address: string) => Promise<boolean | undefined>;
  uaAddressUpdate: (UA_address: string) => Promise<boolean | undefined>;
  verifyZaddress: (z_address: string) => Promise<boolean | undefined>;
  verifyUaddress: (z_address: string) => Promise<boolean | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

function persistToken(token?: string | null) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // Lets every callback below stay referentially stable while still reading
  // the latest user.
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  const applyUser = useCallback((user: User) => {
    setCurrentUser(user);
    persistUser(user);
  }, []);

  // ── Session bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const data = await api.get<{ user: User }>("/auth/me", {
          fallbackError: "Token invalid",
        });
        if (cancelled) return;
        applyUser(data.user);
      } catch (error) {
        console.error("Token validation failed:", error);
        if (cancelled) return;
        persistToken(null);
        persistUser(null);
        setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  // Socket lives and dies with the session.
  useSocketConnection(currentUser?.id);

  // Keep our own user in sync with server pushes. (Refetching bounties/users
  // on this event stays in BountyProvider.)
  useSocketEvents({
    user_updated: (p) => {
      const prev = userRef.current;
      if (!prev || p.id !== prev.id) return;
      applyUser({ ...prev, ...p });
    },
  });

  // ── Login / logout ─────────────────────────────────────────────────────────
  // Other providers react to `currentUser` changing (they refetch / clear on
  // their own), so these no longer reach into bounty/team state.

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; user?: any }> => {
      try {
        const data = await api.post<{ token: string; user: User }>(
          "/auth/login",
          { email, password },
          { auth: false },
        );
        persistToken(data.token);
        applyUser(data.user);
        return { success: true, user: data.user };
      } catch (err) {
        // A rejected login (4xx) is an expected outcome, not an error to log.
        if (!(err instanceof ApiError)) console.error("Login failed:", err);
        return { success: false };
      }
    },
    [applyUser],
  );

  const logout = useCallback(() => {
    // Token first, so anything that refetches in response is anonymous.
    persistToken(null);
    persistUser(null);
    setCurrentUser(null);
  }, []);

  // ── Roles ──────────────────────────────────────────────────────────────────

  const selectRole = useCallback(
    async (role: "HUNTER" | "TEAM") => {
      if (!userRef.current) return false;
      try {
        const data = await api.patch<{ token?: string; user: User }>(
          "/auth/select-role",
          { role },
          { fallbackError: "Failed to update role" },
        );
        persistToken(data.token);
        applyUser(data.user);
        return true;
      } catch (error) {
        console.error("Failed to select role:", error);
        return false;
      }
    },
    [applyUser],
  );

  const switchRole = useCallback(
    async (role: Role): Promise<void> => {
      const user = userRef.current;
      if (!user || !user.isRobin) return;
      if (role === user.role) return;

      setIsSwitchingRole(true);
      try {
        const data = await api.patch<{ token?: string; user: User }>(
          "/api/bounties/switch-role",
          { role },
          { fallbackError: "Failed to switch role" },
        );
        if (data.token) persistToken(data.token);
        applyUser(data.user);
      } catch (error) {
        console.error("Failed to switch role:", error);
        throw error;
      } finally {
        setIsSwitchingRole(false);
      }
    },
    [applyUser],
  );

  // ── Recovery ───────────────────────────────────────────────────────────────

  const requestRecoveryOtp = useCallback(
    () =>
      api.post<{ message: string; email: string }>(
        "/auth/recovery/request-otp",
        undefined,
        { fallbackError: "Failed to send OTP" },
      ),
    [],
  );

  const verifyRecoveryOtp = useCallback(
    async (otp: string, accountName: string): Promise<RecoveryData> => {
      const res = await api.post<{ data: RecoveryData }>(
        "/auth/recovery/verify-otp",
        { otp, accountName },
        { fallbackError: "Verification failed" },
      );
      return res.data;
    },
    [],
  );

  // ── Profile ────────────────────────────────────────────────────────────────

  const nicknameUpdate = useCallback(
    async (nickname: string) => {
      if (!userRef.current) return;
      try {
        const data = await api.patch<{ user: User }>(
          "/auth/update-nickname",
          { nickname },
          { fallbackError: "Failed to update nickname" },
        );
        applyUser(data.user);
        return true;
      } catch (error) {
        console.error("Failed to update nickname:", error);
        return false;
      }
    },
    [applyUser],
  );

  const disconnectDiscord = useCallback(async () => {
    if (!userRef.current) return false;
    try {
      const data = await api.delete<{ user: User }>("/auth/discord", {
        fallbackError: "Failed to disconnect Discord",
      });
      applyUser(data.user);
      return true;
    } catch (error) {
      console.error("Failed to disconnect Discord:", error);
      return false;
    }
  }, [applyUser]);

  const emailNotificationsUpdate = useCallback(
    async (enabled: boolean) => {
      if (!userRef.current) return;
      try {
        const data = await api.patch<{ user: User }>(
          "/auth/update-email-notifications",
          { emailNotifications: enabled },
          { fallbackError: "Failed to update preference" },
        );
        applyUser(data.user);
        return true;
      } catch (error) {
        console.error("Failed to update email notifications:", error);
        return false;
      }
    },
    [applyUser],
  );

  const zAddressUpdate = useCallback(async (z_address: string) => {
    if (!userRef.current) return;
    try {
      await api.patch(
        "/auth/update-zaddress",
        { z_address },
        { fallbackError: "Failed to add zaddress" },
      );
      return true;
    } catch (error) {
      console.error("Failed to add zaddress:", error);
      return false;
    }
  }, []);

  const uaAddressUpdate = useCallback(async (UA_address: string) => {
    if (!userRef.current) return;
    try {
      await api.patch(
        "/auth/update-ua-address",
        { UA_address },
        { fallbackError: "Failed to update UA address" },
      );
      return true;
    } catch (error) {
      console.error("Failed to update UA address:", error);
      return false;
    }
  }, []);

  const verifyZaddress = useCallback(async (z_address: string) => {
    if (!userRef.current) return;
    try {
      const data = await api.post<{ isVerified: boolean }>(
        "/auth/verify-zaddress",
        { z_address },
        { fallbackError: "Failed to verify zaddress" },
      );
      return data.isVerified;
    } catch (error) {
      console.error("Failed to verify zaddress:", error);
      return false;
    }
  }, []);

  const verifyUaddress = useCallback(async (z_address: string) => {
    if (!userRef.current) return;
    try {
      const data = await api.post<{ isVerified: boolean }>(
        "/auth/verify-uaddress",
        { z_address },
        { fallbackError: "Failed to verify uaddress" },
      );
      return data.isVerified;
    } catch (error) {
      console.error("Failed to verify uaddress:", error);
      return false;
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      isLoading,
      login,
      logout,
      setCurrentUser,
      selectRole,
      switchRole,
      isSwitchingRole,
      requestRecoveryOtp,
      verifyRecoveryOtp,
      nicknameUpdate,
      disconnectDiscord,
      emailNotificationsUpdate,
      zAddressUpdate,
      uaAddressUpdate,
      verifyZaddress,
      verifyUaddress,
    }),
    [
      currentUser,
      isLoading,
      isSwitchingRole,
      login,
      logout,
      selectRole,
      switchRole,
      requestRecoveryOtp,
      verifyRecoveryOtp,
      nicknameUpdate,
      disconnectDiscord,
      emailNotificationsUpdate,
      zAddressUpdate,
      uaAddressUpdate,
      verifyZaddress,
      verifyUaddress,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
