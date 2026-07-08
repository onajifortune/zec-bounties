"use client";

import { useState, useMemo, useEffect } from "react";
import { useBounty } from "@/lib/bounty-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Zap, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getAddressReceivers, initAddressDecoder } from "@/lib/decodeAddress";
import { confirmedTotal, fmt } from "@/lib/utils";
import { backendUrl } from "@/lib/configENV";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminNavbar } from "@/components/layout/admin/navbar";

type SortKey = "completed" | "submitted" | "completionRate" | "totalEarned";
type ChartType = "contributors" | "earned" | "addressTypes";

export default function KpisDashboard() {
  const {
    currentUser,
    bounties,
    balance,
    syncStatus,
    fetchBalance,
    rescanWallet,
  } = useBounty();

  const isAdmin = currentUser?.role === "ADMIN";

  const [viewMode, setViewMode] = useState<"public" | "admin">(
    isAdmin ? "admin" : "public",
  );

  const [sortKey, setSortKey] = useState<SortKey>("completed");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [showAllUsers, setShowAllUsers] = useState(false);

  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanMessage, setRescanMessage] = useState("");
  const [rescanError, setRescanError] = useState("");

  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(true);
  const [selectedChart, setSelectedChart] = useState<ChartType>("contributors");

  // === Basic counts from bounties ===
  const totalBounties = bounties.length;
  const completedBounties = bounties.filter((b) => b.status === "DONE").length;
  const activeBounties = bounties.filter(
    (b) => b.status === "TO_DO" || b.status === "IN_PROGRESS",
  ).length;

  const uniqueContributors = new Set(
    bounties.filter((b) => b.assigneeUser).map((b) => b.assigneeUser!.id),
  ).size;

  // Reset showAllUsers when switching to Public
  useEffect(() => {
    if (viewMode === "public" && showAllUsers) {
      setShowAllUsers(false);
    }
  }, [viewMode]);

  // Fetch top contributors
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingContributors(true);
        if (isAdmin) await initAddressDecoder();

        const params = showAllUsers ? "?all=true" : "";
        const res = await fetch(
          `${backendUrl}/api/kpis/top-contributors${params}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch");

        let data = await res.json();

        if (isAdmin) {
          data = data.map((user: any) => {
            if (user.UA_address) {
              try {
                const decoded = getAddressReceivers(user.UA_address);
                return { ...user, addressType: decoded.type };
              } catch {
                return user;
              }
            }
            return user;
          });
        }

        setTopContributors(data);
      } catch (error) {
        console.error(error);
        setTopContributors([]);
      } finally {
        setLoadingContributors(false);
      }
    };

    loadData();
  }, [isAdmin, showAllUsers]);

  // === sortedContributors (must come before totalZecPaid) ===
  const sortedContributors = useMemo(() => {
    return [...topContributors].sort((a, b) => {
      let valA: number, valB: number;
      if (sortKey === "completed") {
        valA = a.completed;
        valB = b.completed;
      } else if (sortKey === "submitted") {
        valA = a.submitted;
        valB = b.submitted;
      } else if (sortKey === "totalEarned") {
        valA = a.totalEarned || 0;
        valB = b.totalEarned || 0;
      } else {
        valA = a.submitted > 0 ? (a.completed / a.submitted) * 100 : 0;
        valB = b.submitted > 0 ? (b.completed / b.submitted) * 100 : 0;
      }
      return sortDirection === "desc" ? valB - valA : valA - valB;
    });
  }, [topContributors, sortKey, sortDirection]);

  // === Total ZEC Paid (now correctly after sortedContributors) ===
  const totalZecPaid = useMemo(() => {
    return sortedContributors.reduce((sum, user) => {
      return sum + (user.totalEarned || 0);
    }, 0);
  }, [sortedContributors]);

  // === Analytics Data ===
  const contributorsOverTime = useMemo(() => {
    if (!topContributors || topContributors.length === 0) return [];
    return topContributors.slice(0, 12).map((user, index) => ({
      name: user.name,
      count: index + 1,
    }));
  }, [topContributors]);

  const earnedOverTime = useMemo(() => {
    if (!topContributors || topContributors.length === 0) return [];
    let cumulative = 0;
    return topContributors.slice(0, 12).map((user) => {
      cumulative += user.totalEarned || 0;
      return {
        month: user.name,
        total: cumulative / 100_000_000,
      };
    });
  }, [topContributors]);

  const addressTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    topContributors.forEach((user) => {
      const type = user.addressType || "None";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [topContributors]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  // Button handlers
  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    setRescanMessage("");
    setRescanError("");
    try {
      await fetchBalance();
      setRescanMessage("Balance refreshed");
      setTimeout(() => setRescanMessage(""), 2000);
    } catch {
      setRescanError("Failed to refresh balance");
      setTimeout(() => setRescanError(""), 3000);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    setRescanMessage("");
    setRescanError("");
    try {
      await rescanWallet();
      setRescanMessage("Rescan triggered successfully");
      setTimeout(() => setRescanMessage(""), 3000);
    } catch {
      setRescanError("Failed to trigger rescan");
      setTimeout(() => setRescanError(""), 3000);
    } finally {
      setIsRescanning(false);
    }
  };

  // NOTE: these badges intentionally keep fixed brand colors (emerald/blue/indigo/slate)
  // since they encode a semantic address-type meaning, not a light/dark theme concern.
  const getAddressTypeBadge = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("orchard") && normalized.includes("sapling"))
      return "bg-gradient-to-r from-emerald-500 to-blue-500 text-white";
    if (normalized.includes("orchard"))
      return "bg-gradient-to-r from-emerald-500 to-green-600 text-white";
    if (normalized.includes("sapling"))
      return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
    if (normalized.includes("transparent"))
      return "bg-gradient-to-r from-slate-500 to-slate-600 text-white";
    if (normalized === "ua + z" || normalized === "full")
      return "bg-gradient-to-r from-emerald-500 to-blue-500 text-white";
    if (normalized === "ua only")
      return "bg-gradient-to-r from-emerald-500 to-green-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  const getDisplayAddressType = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("orchard") && normalized.includes("sapling"))
      return "Orchard + Sapling";
    if (normalized.includes("orchard")) return "Orchard";
    if (normalized.includes("sapling")) return "Sapling";
    if (normalized.includes("transparent")) return "Transparent";
    if (normalized === "ua + z" || normalized === "full")
      return "Orchard + Sapling";
    if (normalized === "ua only") return "Orchard";
    return type;
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="max-w-7xl mx-auto px-6 py-8 bg-background min-h-screen text-foreground">
          {/* Header */}
          <div className="flex flex-col imd:flex-row imd:items-center justify-between mb-8 gap-4 imd:gap-0">
            <div>
              <h1 className="text-xl imd:text-4xl font-bold tracking-tight">
                Platform Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Key metrics and leaderboards
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
                <Button
                  variant={viewMode === "public" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("public")}
                >
                  Public
                </Button>
                <Button
                  variant={viewMode === "admin" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("admin")}
                >
                  Admin
                </Button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Bounties", value: totalBounties },
              {
                label: "Completed",
                value: completedBounties,
                color: "text-emerald-500 dark:text-emerald-400",
              },
              {
                label: "Active",
                value: activeBounties,
                color: "text-yellow-500 dark:text-yellow-400",
              },
              {
                label: "Total ZEC Paid",
                value: (totalZecPaid / 100_000_000).toFixed(4),
                color: "text-primary",
              },
              { label: "Unique Contributors", value: uniqueContributors },
            ].map((stat, i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-4xl font-bold tracking-tighter ${stat.color || ""}`}
                  >
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Contributors / All Users Table */}
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {showAllUsers ? "All Users" : "Top Contributors (Top 25)"}
                </CardTitle>

                <div className="w-[170px] flex justify-end">
                  {isAdmin && viewMode === "admin" && (
                    <Button
                      variant={showAllUsers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowAllUsers(!showAllUsers)}
                    >
                      {showAllUsers
                        ? "Show Top Contributors"
                        : "Show All Users"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingContributors ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead className="w-12">Avatar</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => toggleSort("completed")}
                      >
                        Completed <ArrowUpDown className="w-4 h-4" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => toggleSort("submitted")}
                      >
                        Submitted <ArrowUpDown className="w-4 h-4" />
                      </TableHead>
                      {viewMode === "admin" && (
                        <TableHead>Address Type</TableHead>
                      )}
                      {viewMode === "admin" && (
                        <TableHead
                          className="cursor-pointer select-none text-right hover:text-foreground"
                          onClick={() => toggleSort("totalEarned")}
                        >
                          Total ZEC Earned <ArrowUpDown className="w-4 h-4" />
                        </TableHead>
                      )}
                      {viewMode === "admin" && (
                        <TableHead
                          className="cursor-pointer select-none text-right hover:text-foreground"
                          onClick={() => toggleSort("completionRate")}
                        >
                          Completion % <ArrowUpDown className="w-4 h-4" />
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedContributors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={viewMode === "admin" ? 8 : 5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No data available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedContributors.map((user, index) => {
                        const rate =
                          user.submitted > 0
                            ? Math.round(
                                (user.completed / user.submitted) * 100,
                              )
                            : 0;
                        return (
                          <TableRow
                            key={index}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <TableCell>#{index + 1}</TableCell>
                            <TableCell>
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-border"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                  {user.name?.[0]}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.completed}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.submitted}
                            </TableCell>

                            {viewMode === "admin" && (
                              <TableCell>
                                <span
                                  className={`px-2.5 py-0.5 text-xs rounded-full ${getAddressTypeBadge(user.addressType)}`}
                                >
                                  {getDisplayAddressType(user.addressType)}
                                </span>
                              </TableCell>
                            )}

                            {viewMode === "admin" && (
                              <TableCell className="text-right font-medium">
                                {user.totalEarned
                                  ? user.totalEarned.toFixed(4)
                                  : "0.0000"}
                              </TableCell>
                            )}

                            {viewMode === "admin" && (
                              <TableCell className="text-right font-medium">
                                {rate}%
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Analytics Section */}
          {viewMode === "admin" && (
            <Card className="bg-card border-border mb-8">
              <CardHeader>
                <div className="flex flex-col imd:flex-row gap-4 imd:gap-0 items-baseline justify-between">
                  <CardTitle>Analytics</CardTitle>
                  <select
                    value={selectedChart}
                    onChange={(e) =>
                      setSelectedChart(e.target.value as ChartType)
                    }
                    className="bg-background border border-input text-foreground rounded px-3 py-1 text-sm"
                  >
                    <option value="contributors">Contributors Over Time</option>
                    <option value="earned">Total ZEC Earned Over Time</option>
                    <option value="addressTypes">
                      Address Type Distribution
                    </option>
                  </select>
                </div>
              </CardHeader>

              <CardContent className="h-[320px]">
                {selectedChart === "contributors" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributorsOverTime}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--chart-1)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedChart === "earned" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earnedOverTime}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedChart === "addressTypes" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={addressTypeDistribution}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis dataKey="type" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--chart-4)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Wallet Widget */}
          {viewMode === "admin" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Wallet &amp; Node
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Balance
                    </p>
                    <p className="text-4xl font-bold tracking-tighter">
                      {balance
                        ? `${fmt(confirmedTotal(balance))} ZEC`
                        : `0.0000 ZEC`}
                    </p>
                  </div>
                  <Button
                    onClick={handleRefreshBalance}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshingBalance}
                  >
                    {isRefreshingBalance ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>

                {syncStatus && (
                  <div className="text-sm text-muted-foreground">
                    Sync Progress:{" "}
                    {syncStatus.percentage_total_blocks_scanned?.toFixed(1)}%
                  </div>
                )}

                <Button
                  onClick={handleRescan}
                  className="w-full"
                  disabled={isRescanning}
                >
                  {isRescanning ? "Rescanning..." : "Trigger Rescan"}
                </Button>

                {rescanMessage && (
                  <p className="text-sm text-center text-emerald-500 dark:text-emerald-400">
                    {rescanMessage}
                  </p>
                )}
                {rescanError && (
                  <p className="text-sm text-center text-destructive">
                    {rescanError}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
