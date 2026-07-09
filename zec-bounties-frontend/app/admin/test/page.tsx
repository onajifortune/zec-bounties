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
import { ArrowUpDown, Zap } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getAddressReceivers, initAddressDecoder } from "@/lib/decodeAddress";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminNavbar } from "@/components/layout/admin/navbar";
import { backendUrl } from "@/lib/configENV";
import { confirmedTotal, fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SortKey = "completed" | "submitted" | "completionRate" | "totalEarned";
type ChartType = "contributors" | "earned" | "bountyTypes" | "addressTypes";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

export default function KpisDashboard() {
  const {
    currentUser,
    balance,
    syncStatus,
    fetchBalance,
    rescanWallet,
    zcashParams,
    teams,
    setDefaultWallet,
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

  const [contributorsOverTimeData, setContributorsOverTimeData] = useState<
    any[]
  >([]);
  const [bountyTypesOverTime, setBountyTypesOverTime] = useState<any[]>([]);

  // === Wallet Selector ===
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  const availableWallets = useMemo(() => {
    if (!zcashParams) return [];
    return zcashParams.map((p: any) => {
      const team = teams?.find((t: any) => t.id === p.teamId);
      return { ...p, teamName: team?.name };
    });
  }, [zcashParams, teams]);

  const currentWallet = useMemo(() => {
    return (
      availableWallets.find((w: any) => w.id === selectedWalletId) ||
      availableWallets.find((w: any) => w.isDefault) ||
      availableWallets[0]
    );
  }, [availableWallets, selectedWalletId]);

  useEffect(() => {
    if (availableWallets.length > 0 && !selectedWalletId) {
      const defaultWallet =
        availableWallets.find((w: any) => w.isDefault) || availableWallets[0];
      if (defaultWallet) setSelectedWalletId(defaultWallet.id);
    }
  }, [availableWallets]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleWalletChange = async (walletId: string) => {
    const wallet = availableWallets.find((w: any) => w.id === walletId);
    if (!wallet) return;

    setSelectedWalletId(walletId);
    try {
      await setDefaultWallet(wallet.accountName, wallet.teamId);
    } catch (error) {
      console.error("Failed to switch wallet:", error);
    }
  };

  // Reset showAllUsers
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

  // Fetch time series data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/kpis/contributors-over-time`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          },
        );
        if (res.ok) setContributorsOverTimeData(await res.json());
      } catch {}
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (viewMode !== "admin") return;

    const fetchBountyTypes = async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/kpis/bounty-types-over-time`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          },
        );
        if (res.ok) setBountyTypesOverTime(await res.json());
      } catch {}
    };
    fetchBountyTypes();
  }, [viewMode]);

  // Derived values
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

  const totalBounties = useMemo(
    () => topContributors.reduce((sum, u) => sum + (u.submitted || 0), 0),
    [topContributors],
  );

  const completedBounties = useMemo(
    () => topContributors.reduce((sum, u) => sum + (u.completed || 0), 0),
    [topContributors],
  );

  const activeBounties = totalBounties - completedBounties;
  const uniqueContributors = topContributors.length;

  const totalZecPaid = useMemo(
    () => sortedContributors.reduce((sum, u) => sum + (u.totalEarned || 0), 0),
    [sortedContributors],
  );

  const earnedOverTime = useMemo(() => {
    if (!topContributors.length) return [];
    let cumulative = 0;
    return topContributors.slice(0, 12).map((user) => {
      cumulative += user.totalEarned || 0;
      return { month: user.name, total: cumulative };
    });
  }, [topContributors]);

  const addressTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    topContributors.forEach((u) => {
      const type = u.addressType || "None";
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

  // Handlers
  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    setRescanMessage("");
    setRescanError("");

    try {
      await fetchBalance();
      await new Promise((r) => setTimeout(r, 400));
      setRescanMessage("Balance refreshed");
      setTimeout(() => setRescanMessage(""), 2500);
    } catch {
      setRescanError("Failed to refresh");
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
      setRescanMessage("Rescan triggered");
      setTimeout(() => setRescanMessage(""), 4000);
    } catch {
      setRescanError("Failed to rescan");
      setTimeout(() => setRescanError(""), 3000);
    } finally {
      setIsRescanning(false);
    }
  };

  // Address Type Helpers (fixed semantic colors — not theme-dependent)
  const getAddressTypeBadge = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized === "none")
      return "bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30";
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
    if (normalized === "none") return "No UA";
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Platform Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Key metrics and leaderboards
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
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

          {/* Top Stats Cards */}
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
                value: totalZecPaid.toFixed(4),
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

          {/* Table */}
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
                        className="cursor-pointer"
                        onClick={() => toggleSort("completed")}
                      >
                        Completed <ArrowUpDown className="inline w-4 h-4" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("submitted")}
                      >
                        Submitted <ArrowUpDown className="inline w-4 h-4" />
                      </TableHead>
                      {viewMode === "admin" && (
                        <TableHead>Address Type</TableHead>
                      )}
                      {viewMode === "admin" && (
                        <TableHead
                          className="text-right cursor-pointer"
                          onClick={() => toggleSort("totalEarned")}
                        >
                          Total ZEC Earned{" "}
                          <ArrowUpDown className="inline w-4 h-4" />
                        </TableHead>
                      )}
                      {viewMode === "admin" && (
                        <TableHead
                          className="text-right cursor-pointer"
                          onClick={() => toggleSort("completionRate")}
                        >
                          Completion %{" "}
                          <ArrowUpDown className="inline w-4 h-4" />
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
                <div className="flex items-center justify-between">
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
                    <option value="bountyTypes">Bounty Types Over Time</option>
                    <option value="addressTypes">
                      Address Type Distribution
                    </option>
                  </select>
                </div>
              </CardHeader>

              <CardContent className="h-[340px]">
                {selectedChart === "contributors" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={contributorsOverTimeData}>
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
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="cumulativeContributors"
                        name="Cumulative Contributors"
                        stroke="var(--chart-1)"
                        fill="var(--chart-1)"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
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
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="total"
                        name="Total ZEC Earned"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                        activeBar={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedChart === "bountyTypes" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bountyTypesOverTime}>
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
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Legend />
                      {bountyTypesOverTime.length > 0 &&
                        Object.keys(bountyTypesOverTime[0])
                          .filter((k) => k !== "month")
                          .map((category, index) => (
                            <Bar
                              key={index}
                              dataKey={category}
                              stackId="a"
                              fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                            />
                          ))}
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
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Count"
                        fill="var(--chart-4)"
                        radius={[4, 4, 0, 0]}
                        activeBar={false}
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
                  <Zap className="w-5 h-5 text-primary" /> Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wallet Selector */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Active Wallet
                  </Label>
                  <Select
                    value={selectedWalletId}
                    onValueChange={handleWalletChange}
                  >
                    <SelectTrigger className="w-full min-w-[280px] bg-background border-input h-auto py-2.5">
                      <SelectValue>
                        {currentWallet ? (
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                                currentWallet.isTeam
                                  ? "bg-violet-500/20 text-violet-500 dark:text-violet-400"
                                  : "bg-sky-500/20 text-sky-500 dark:text-sky-400",
                              )}
                            >
                              {getInitials(currentWallet.accountName || "UA")}
                            </div>
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="text-sm font-medium truncate max-w-[220px]">
                                {currentWallet.accountName || "Unnamed Wallet"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {currentWallet.isTeam ? "Team" : "Personal"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          "No wallet selected"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[320px]">
                      {availableWallets.map((wallet: any) => (
                        <SelectItem
                          key={wallet.id}
                          value={wallet.id}
                          className="py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                                wallet.isTeam
                                  ? "bg-violet-500/20 text-violet-500 dark:text-violet-400"
                                  : "bg-sky-500/20 text-sky-500 dark:text-sky-400",
                              )}
                            >
                              {getInitials(wallet.accountName || "UA")}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {wallet.accountName || "Unnamed"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {wallet.isTeam ? "Team" : "Personal"}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Balance */}
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

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleRefreshBalance}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshingBalance}
                    className="flex-1"
                  >
                    {isRefreshingBalance ? "Refreshing..." : "Refresh Balance"}
                  </Button>
                  <Button
                    onClick={handleRescan}
                    variant="outline"
                    size="sm"
                    disabled={isRescanning}
                    className="flex-1"
                  >
                    {isRescanning ? "Rescanning..." : "Rescan"}
                  </Button>
                </div>

                {rescanMessage && (
                  <p className="text-sm text-emerald-500 dark:text-emerald-400 text-center">
                    {rescanMessage}
                  </p>
                )}
                {rescanError && (
                  <p className="text-sm text-destructive text-center">
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
