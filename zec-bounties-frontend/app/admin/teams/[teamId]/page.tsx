// app/admin/teams/[teamId]/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeamBanner } from "@/components/teams/team-banner";
import {
  AddMembersModal,
  RoleBadge,
  Section,
  SocialLinksCard,
  StatTile,
  TeamFormModal,
  TeamWalletModal,
  VerificationCard,
  initials,
  useTeamsApi,
  type TeamMember,
  type TeamWallet,
} from "@/components/admin/teams/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  RefreshCw,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { confirmedTotal, fmt } from "@/lib/utils";
import type { Balance, Team } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "sonner";

const TABS = ["Overview", "Members", "Treasury", "Settings"] as const;
type Tab = (typeof TABS)[number];

export default function AdminTeamConsolePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const { api } = useTeamsApi();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const [editOpen, setEditOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // The API exposes the team list; find this team in it.
  const fetchTeam = useCallback(async () => {
    try {
      const data = await api<Team[]>("/");
      setTeam(data.find((t) => t.id === params.teamId) ?? null);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [api, params.teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const fetchBalance = useCallback(async () => {
    if (!team?.wallet) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const data = await api<{ balance: any }>(`/${team.id}/wallet/balance`);
      setBalance(data.balance ?? null);
    } catch (err: any) {
      setBalanceError(err.message);
    } finally {
      setBalanceLoading(false);
    }
  }, [api, team?.id, team?.wallet]);

  useEffect(() => {
    if (team?.wallet) fetchBalance();
    else {
      setBalance(null);
      setBalanceError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, team?.wallet?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading team...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="px-4 py-16 text-center xl:container xl:mx-auto">
        <p className="mb-4 text-muted-foreground">Team not found.</p>
        <Button variant="outline" onClick={() => router.push("/admin/teams")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to all teams
        </Button>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const updateTeam = (updated: Team) => setTeam(updated);

  const handleRemoveMember = async (userId: string) => {
    setDeletingMember(userId);
    try {
      await api(`/${team.id}/members/${userId}`, { method: "DELETE" });
      updateTeam({
        ...team,
        members: team.members.filter((m) => m.userId !== userId),
      });
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingMember(null);
    }
  };

  const handleRoleChange = async (userId: string, role: TeamMember["role"]) => {
    setUpdatingRole(userId);
    try {
      await api(`/${team.id}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      updateTeam({
        ...team,
        members: team.members.map((m) =>
          m.userId === userId ? { ...m, role } : m,
        ),
      });
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteTeam = async () => {
    setDeleteLoading(true);
    try {
      await api(`/${team.id}`, { method: "DELETE" });
      toast.success("Team deleted");
      router.push("/admin/teams");
    } catch (err: any) {
      toast.error(err.message);
      setDeleteLoading(false);
    }
  };

  const handleDeleteWallet = async () => {
    if (
      !confirm(
        `Remove the wallet for ${team.name}? This permanently deletes its data and can't be undone.`,
      )
    )
      return;
    try {
      await api(`/${team.id}/wallet`, { method: "DELETE" });
      updateTeam({ ...team, wallet: null });
      setBalance(null);
      toast.success("Wallet removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleWalletCreated = (wallet: TeamWallet) => {
    updateTeam({ ...team, wallet });
    setTimeout(() => {
      setBalance(null);
      setBalanceError(null);
      fetchBalance();
    }, 1500);
  };

  const adminCount = team.members.filter((m) =>
    ["OWNER", "ADMIN"].includes(m.role),
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="px-4 py-8 xl:container xl:mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/teams")}
          className="-ml-2 mb-6 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> All teams
        </Button>

        <TeamBanner teamId={team.id} bannerUrl={team.banner} canManage />

        <div className="mb-8 flex flex-col gap-4 imd:flex-row imd:items-start imd:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0 border">
              {team.logo && (
                <AvatarImage src={team.logo} alt={`${team.name} logo`} />
              )}
              <AvatarFallback className="text-lg font-semibold">
                {initials(team.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {team.name}
                </h1>
                <Badge
                  variant="outline"
                  className={
                    team.isVerified
                      ? "border-green-500/30 bg-green-500/10 text-green-600"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                  }
                >
                  {team.isVerified ? "Verified" : "Pending verification"}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                {team.description || "No description yet."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Created {format(new Date(team.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => setAddMembersOpen(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Add members
            </Button>
          </div>
        </div>

        <div
          className="mb-8 flex gap-1 overflow-x-auto border-b"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 imd:grid-cols-4">
              <StatTile
                icon={Users}
                label="Members"
                value={team.members.length}
                tone="bg-primary/10 text-primary"
              />
              <StatTile
                icon={Shield}
                label="Admins"
                value={adminCount}
                tone="bg-chart-2/10 text-chart-2"
              />
              <StatTile
                icon={Wallet}
                label="Wallet"
                value={team.wallet ? team.wallet.chain : "None"}
                tone="bg-chart-4/10 text-chart-4"
              />
              <StatTile
                icon={Check}
                label="Status"
                value={team.isVerified ? "Verified" : "Unverified"}
                tone={
                  team.isVerified
                    ? "bg-green-500/10 text-green-600"
                    : "bg-amber-500/10 text-amber-600"
                }
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <VerificationCard team={team} />
              <SocialLinksCard team={team} />
            </div>
          </div>
        )}

        {/* ── Members ── */}
        {activeTab === "Members" && (
          <Section
            title={`${team.members.length} members`}
            action={
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-full text-xs"
                onClick={() => setAddMembersOpen(true)}
              >
                <UserPlus className="h-3 w-3" /> Add
              </Button>
            }
          >
            <div className="divide-y">
              {team.members.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No members yet
                  </p>
                </div>
              ) : (
                team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <Avatar className="h-9 w-9 shrink-0 border">
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {initials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {member.user.name}
                        </span>
                        <RoleBadge role={member.role} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>

                    {member.role !== "OWNER" && (
                      <div className="flex shrink-0 items-center gap-1">
                        <div className="hidden sm:block">
                          <Select
                            value={member.role}
                            onValueChange={(v) =>
                              handleRoleChange(
                                member.userId,
                                v as TeamMember["role"],
                              )
                            }
                            disabled={updatingRole === member.userId}
                          >
                            <SelectTrigger className="h-7 w-24 rounded-full text-xs">
                              {updatingRole === member.userId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={deletingMember === member.userId}
                        >
                          {deletingMember === member.userId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Section>
        )}

        {/* ── Treasury ── */}
        {activeTab === "Treasury" &&
          (!team.wallet ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-8 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-chart-4/10 text-chart-4">
                <Wallet className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">No wallet set up</span>
              <p className="max-w-sm text-sm text-muted-foreground">
                Set up a shared wallet so bounty payouts for this team can be
                authorized on completion.
              </p>
              <Button className="mt-1" onClick={() => setWalletOpen(true)}>
                Set up wallet
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Account</div>
                  <div className="mt-1 text-sm font-medium">
                    {team.wallet.accountName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {team.wallet.serverUrl}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {team.wallet.chain}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={fetchBalance}
                    disabled={balanceLoading}
                    title="Refresh balance"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${balanceLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setWalletOpen(true)}
                  >
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-red-500/30 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    onClick={handleDeleteWallet}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                {balanceLoading ? (
                  <div className="text-3xl font-bold text-primary">…</div>
                ) : balanceError ? (
                  <p className="text-sm text-destructive">{balanceError}</p>
                ) : balance ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default text-3xl font-bold text-primary underline decoration-dotted underline-offset-4">
                          {fmt(confirmedTotal(balance))}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="min-w-[180px] space-y-1.5 text-xs"
                      >
                        <p className="mb-1 font-semibold">Confirmed balances</p>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Ironwood
                          </span>
                          <span className="font-mono">
                            {(
                              (balance.confirmed_ironwood_balance ??
                                balance.confirmed_orchard_balance ??
                                0) / 1e8
                            ).toFixed(4)}{" "}
                            ZEC
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Sapling</span>
                          <span className="font-mono">
                            {(balance.confirmed_sapling_balance / 1e8).toFixed(
                              4,
                            )}{" "}
                            ZEC
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Transparent
                          </span>
                          <span className="font-mono">
                            {(
                              balance.confirmed_transparent_balance / 1e8
                            ).toFixed(4)}{" "}
                            ZEC
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="text-3xl font-bold text-primary">—</div>
                )}
              </div>
            </div>
          ))}

        {/* ── Settings ── */}
        {activeTab === "Settings" && (
          <div className="m-auto max-w-2xl space-y-6">
            <Section
              title="Team details"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 rounded-full text-xs"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              }
            >
              <div className="space-y-4 p-5">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="mt-1 text-sm font-medium">{team.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Description
                  </div>
                  <div className="mt-1 text-sm">
                    {team.description || "No description yet."}
                  </div>
                </div>
              </div>
            </Section>

            <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h3 className="mb-1 text-sm font-semibold text-destructive">
                Danger zone
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Permanently delete {team.name}, its members and its wallet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-600"
              >
                Delete team
              </Button>
            </section>
          </div>
        )}
      </div>

      {/* Modals */}
      <TeamFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        team={team}
        onSuccess={(updated) => updateTeam({ ...team, ...updated })}
      />
      <AddMembersModal
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
        team={team}
        onSuccess={(newMembers) =>
          updateTeam({
            ...team,
            members: [
              ...team.members.filter(
                (m) => !newMembers.find((nm) => nm.userId === m.userId),
              ),
              ...newMembers,
            ],
          })
        }
      />
      <TeamWalletModal
        open={walletOpen}
        onOpenChange={setWalletOpen}
        team={team}
        onSuccess={handleWalletCreated}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Team
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{team.name}</strong>? This
            will permanently remove all members and the team wallet. This cannot
            be undone.
          </p>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={deleteLoading}
              className="flex-1 sm:flex-none"
            >
              {deleteLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
