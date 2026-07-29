"use client";

/**
 * ── Notes for wiring this into the repo ─────────────────────────────────────
 *
 * This replaces the old "Teams" admin page. The data model underneath is
 * unchanged (Team / TeamMember / TeamWallet, `/api/teams` routes) — only the
 * framing and layout changed: communities are now the primary object, and
 * their bounty program is the first thing you see, not something buried in
 * a dropdown menu.
 *
 * Two things this file assumes but doesn't have real backend contracts for
 * yet, since they weren't in scope of the original file — flagged inline
 * with TODO(backend):
 *   1. `GET /api/teams/:id/bounties` — bounties scoped to a community.
 *      Falls back to filtering `useBounty().bounties` by `teamId` if the
 *      dedicated endpoint 404s, so this works either way.
 *   2. "Create bounty" links to `/admin/bounties/new?teamId=...` — point
 *      this at wherever bounty creation actually lives.
 *
 * Colors are untouched — every value below is one of the existing tokens
 * from globals.css (--primary, --muted, --chart-1..5, --border, etc). The
 * redesign is structural, not a re-skin.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminNavbar } from "@/components/layout/admin/navbar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useBounty } from "@/lib/bounty-context";
import { backendUrl } from "@/lib/configENV";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  UserPlus,
  UserMinus,
  Wallet,
  Shield,
  Crown,
  User,
  Loader2,
  Building2,
  AlertTriangle,
  Check,
  X,
  Edit2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Target,
  Coins,
  Search,
  Sparkles,
  Copy,
  CheckCircle2,
  Clock,
  Inbox,
} from "lucide-react";
import type { Balance } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface TeamWallet {
  id: string;
  teamId: string;
  accountName: string;
  chain: string;
  serverUrl: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  wallet?: TeamWallet | null;
}

/** A bounty scoped to a community's bounty program. TODO(backend): confirm
 *  field names line up with the real Bounty model — this is intentionally
 *  minimal so it degrades gracefully if a field is missing. */
interface CommunityBounty {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED";
  reward?: number;
  chain?: string;
  createdAt: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

function useTeamsApi() {
  const getHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const api = useCallback(
    async <T = any,>(path: string, options: RequestInit = {}): Promise<T> => {
      const res = await fetch(`${backendUrl}/api/teams${path}`, {
        ...options,
        headers: { ...getHeaders(), ...(options.headers || {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [],
  );

  return { api };
}

// ── Small shared bits ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: TeamMember["role"] }) {
  const cfg = {
    OWNER: {
      icon: Crown,
      label: "Owner",
      class: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    },
    ADMIN: {
      icon: Shield,
      label: "Admin",
      class: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    },
    MEMBER: {
      icon: User,
      label: "Member",
      class: "bg-muted text-muted-foreground border-border",
    },
  }[role];

  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] font-medium ${cfg.class}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

const BOUNTY_STATUS_CFG: Record<
  CommunityBounty["status"],
  { label: string; class: string; icon: typeof Clock }
> = {
  OPEN: {
    label: "Open",
    class: "bg-chart-2/10 text-chart-2 border-chart-2/30",
    icon: Sparkles,
  },
  IN_PROGRESS: {
    label: "In progress",
    class: "bg-chart-1/10 text-chart-1 border-chart-1/30",
    icon: Clock,
  },
  IN_REVIEW: {
    label: "In review",
    class: "bg-chart-5/10 text-chart-5 border-chart-5/30",
    icon: Eye,
  },
  COMPLETED: {
    label: "Completed",
    class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    class: "bg-muted text-muted-foreground border-border",
    icon: X,
  },
};

function BountyStatusBadge({ status }: { status: CommunityBounty["status"] }) {
  const cfg = BOUNTY_STATUS_CFG[status] ?? BOUNTY_STATUS_CFG.OPEN;
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] font-medium ${cfg.class}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

function StatBlock({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in oklch, ${accent ?? "var(--primary)"} 12%, transparent)`,
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: accent ?? "var(--primary)" }}
        />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-tight truncate">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Create / Edit Community Modal ─────────────────────────────────────────────

function CommunityFormModal({
  open,
  onOpenChange,
  team,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team?: Team | null;
  onSuccess: (team: Team) => void;
}) {
  const { api } = useTeamsApi();
  const [name, setName] = useState(team?.name || "");
  const [description, setDescription] = useState(team?.description || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(team?.name || "");
      setDescription(team?.description || "");
    }
  }, [open, team]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Community name is required");
    setLoading(true);
    try {
      let result: Team;
      if (team) {
        result = await api(`/${team.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });
      } else {
        result = await api("/", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });
      }
      toast.success(team ? "Community updated" : "Community created");
      onSuccess(result);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {team ? "Edit Community" : "Start a New Community"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Community Name *</Label>
            <Input
              placeholder="e.g. Core Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>What is this community for?</Label>
            <Textarea
              rows={3}
              placeholder="Give contributors a sense of what this group works on"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {team ? "Save Changes" : "Create Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Members Modal ─────────────────────────────────────────────────────────

function AddMembersModal({
  open,
  onOpenChange,
  team,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team: Team;
  onSuccess: (members: TeamMember[]) => void;
}) {
  const { api } = useTeamsApi();
  const { users } = useBounty();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSearch("");
      setRole("MEMBER");
    }
  }, [open]);

  const currentMemberIds = team.members.map((m) => m.userId);
  const available = users.filter(
    (u: any) =>
      !currentMemberIds.includes(u.id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAdd = async () => {
    if (selectedIds.length === 0)
      return toast.error("Select at least one person to invite");
    setLoading(true);
    try {
      const { members } = await api<{ members: TeamMember[] }>(
        `/${team.id}/members`,
        {
          method: "POST",
          body: JSON.stringify({ userIds: selectedIds, role }),
        },
      );
      toast.success(`Added ${members.length} member(s)`);
      onSuccess(members);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg divide-y max-h-56 sm:max-h-64 overflow-y-auto">
            {available.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No one matches your search"
                  : "Everyone is already a member"}
              </div>
            ) : (
              available.map((user: any) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggle(user.id)}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        selected ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {selected && (
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      )}
                    </div>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-[10px]">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} selected
            </p>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={loading || selectedIds.length === 0}
            className="flex-1 sm:flex-none"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Invite {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Treasury (wallet) Modal ────────────────────────────────────────────────────

function TreasuryModal({
  open,
  onOpenChange,
  team,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team: Team;
  onSuccess: (wallet: TeamWallet) => void;
}) {
  const { api } = useTeamsApi();
  const [tab, setTab] = useState<"new" | "import">("new");
  const [accountName, setAccountName] = useState("");
  const [chain, setChain] = useState("mainnet");
  const [serverUrl, setServerUrl] = useState("https://zec.rocks:443");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [birthdayHeight, setBirthdayHeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab("new");
      setAccountName("");
      setChain("mainnet");
      setServerUrl("https://zec.rocks:443");
      setSeedPhrase("");
      setBirthdayHeight("");
      setShowSeed(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!accountName.trim()) return toast.error("Account name is required");
    if (tab === "import" && !seedPhrase.trim())
      return toast.error("Seed phrase is required");

    setLoading(true);
    try {
      const endpoint =
        tab === "import" ? `/${team.id}/wallet/import` : `/${team.id}/wallet`;
      const body: any = { accountName: accountName.trim(), chain, serverUrl };
      if (tab === "import") {
        body.seedPhrase = seedPhrase.trim();
        if (birthdayHeight) body.birthdayHeight = parseInt(birthdayHeight);
      }

      const { wallet } = await api<{ wallet: TeamWallet }>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success(
        tab === "import"
          ? "Treasury imported successfully"
          : "Treasury created",
      );
      onSuccess(wallet);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {team.wallet ? "Replace" : "Set Up"} Treasury for {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["new", "import"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === t
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "new" ? "New Wallet" : "Import Seed"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input
                placeholder="e.g. Community Treasury"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Chain</Label>
                <Select
                  value={chain}
                  onValueChange={(v) => {
                    setChain(v);
                    setServerUrl(
                      v === "mainnet"
                        ? "https://zec.rocks:443"
                        : "https://testnet.zec.rocks:443",
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Server URL</Label>
                <Input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://zec.rocks:443"
                />
              </div>
            </div>

            {tab === "import" && (
              <>
                <div className="space-y-1.5">
                  <Label>Seed Phrase (24 words) *</Label>
                  <div className="relative">
                    {!showSeed && seedPhrase && (
                      <div className="absolute inset-0 z-10 flex items-center px-3 py-2 pointer-events-none">
                        <span className="text-sm tracking-[0.3em] text-foreground select-none break-all leading-relaxed">
                          {"•".repeat(
                            seedPhrase.trim().split(/\s+/).filter(Boolean)
                              .length * 4,
                          )}
                        </span>
                      </div>
                    )}
                    <Textarea
                      rows={3}
                      placeholder={
                        showSeed ? "Enter your 24-word seed phrase..." : ""
                      }
                      value={seedPhrase}
                      onChange={(e) => setSeedPhrase(e.target.value)}
                      className={`font-mono text-sm resize-none pr-10 ${
                        !showSeed && seedPhrase
                          ? "text-transparent caret-foreground"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSeed((v) => !v)}
                      className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors z-20"
                    >
                      {showSeed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Your seed phrase is never stored.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Birthday Height (optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={birthdayHeight}
                    onChange={(e) => setBirthdayHeight(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tab === "import" ? "Import Treasury" : "Create Treasury"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bounty Program tab ─────────────────────────────────────────────────────────

function BountyProgramTab({ team }: { team: Team }) {
  const { api } = useTeamsApi();
  const { bounties: allBounties } = useBounty() as { bounties?: any[] };
  const [bounties, setBounties] = useState<CommunityBounty[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBounties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO(backend): confirm this route exists — falls back below if not.
      const data = await api<{ bounties: CommunityBounty[] }>(
        `/${team.id}/bounties`,
      );
      setBounties(data.bounties ?? []);
    } catch {
      // Fall back to filtering the bounty list already in context.
      const fallback = (allBounties ?? []).filter(
        (b: any) => b.teamId === team.id,
      );
      setBounties(fallback);
      if (fallback.length === 0) setError(null);
    } finally {
      setLoading(false);
    }
  }, [api, team.id, allBounties]);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  const stats = useMemo(() => {
    const list = bounties ?? [];
    const active = list.filter(
      (b) => b.status === "IN_PROGRESS" || b.status === "IN_REVIEW",
    ).length;
    const open = list.filter((b) => b.status === "OPEN").length;
    const completed = list.filter((b) => b.status === "COMPLETED").length;
    const paidOut = list
      .filter((b) => b.status === "COMPLETED")
      .reduce((sum, b) => sum + (b.reward ?? 0), 0);
    return { active, open, completed, paidOut, total: list.length };
  }, [bounties]);

  return (
    <div className="space-y-4">
      {/* Program stats — the headline content of a community */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border rounded-xl overflow-hidden bg-card">
        <StatBlock
          label="Open"
          value={stats.open}
          icon={Sparkles}
          accent="var(--chart-2)"
        />
        <StatBlock
          label="Active"
          value={stats.active}
          icon={Clock}
          accent="var(--chart-1)"
        />
        <StatBlock
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          accent="var(--chart-4)"
        />
        <StatBlock
          label="Paid out"
          value={`${stats.paidOut.toFixed(2)} ZEC`}
          icon={Coins}
          accent="var(--chart-5)"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bounties ({stats.total})</h3>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() =>
            // TODO(backend/routing): point this at the real bounty-creation flow
            (window.location.href = `/admin/bounties/new?teamId=${team.id}`)
          }
        >
          <Plus className="h-3.5 w-3.5" /> New Bounty
        </Button>
      </div>

      <div className="border rounded-xl divide-y overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (bounties ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No bounties yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Post the first bounty to get this community's program moving.
            </p>
          </div>
        ) : (
          bounties!.map((b) => (
            <a
              key={b.id}
              href={`/admin/bounties/${b.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <Target className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{b.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(b.createdAt), "MMM d, yyyy")}
                  {typeof b.reward === "number"
                    ? ` · ${b.reward.toFixed(2)} ZEC`
                    : ""}
                </div>
              </div>
              <BountyStatusBadge status={b.status} />
            </a>
          ))
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Members tab ────────────────────────────────────────────────────────────────

function MembersTab({
  team,
  onUpdate,
  onOpenInvite,
}: {
  team: Team;
  onUpdate: (updated: Team) => void;
  onOpenInvite: () => void;
}) {
  const { api } = useTeamsApi();
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string) => {
    setDeletingMember(userId);
    try {
      await api(`/${team.id}/members/${userId}`, { method: "DELETE" });
      onUpdate({
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
      onUpdate({
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Members ({team.members.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={onOpenInvite}
        >
          <UserPlus className="h-3.5 w-3.5" /> Invite
        </Button>
      </div>

      <div className="border rounded-xl divide-y overflow-hidden">
        {team.members.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No members yet
          </div>
        ) : (
          team.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={member.user.avatar} />
                <AvatarFallback className="text-xs">
                  {member.user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium truncate">
                    {member.user.name}
                  </span>
                  <RoleBadge role={member.role} />
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </div>
              </div>

              {member.role !== "OWNER" && (
                <div className="flex items-center gap-1 shrink-0">
                  <div className="hidden sm:block">
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member.userId, v as TeamMember["role"])
                      }
                      disabled={updatingRole === member.userId}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
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
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  );
}

// ── Treasury tab ──────────────────────────────────────────────────────────────

function TreasuryTab({
  team,
  onUpdate,
  onOpenTreasury,
}: {
  team: Team;
  onUpdate: (updated: Team) => void;
  onOpenTreasury: () => void;
}) {
  const { api } = useTeamsApi();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const confirmedTotal = (b: Balance) =>
    ((b.confirmed_orchard_balance ?? 0) +
      (b.confirmed_sapling_balance ?? 0) +
      (b.confirmed_transparent_balance ?? 0)) /
    1e8;

  const fmt = (n: number) => n.toFixed(4);

  const fetchBalance = useCallback(async () => {
    if (!team.wallet) return;
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
  }, [api, team.id, team.wallet]);

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, team.wallet?.id]);

  const handleDeleteWallet = async () => {
    try {
      await api(`/${team.id}/wallet`, { method: "DELETE" });
      onUpdate({ ...team, wallet: null });
      setBalance(null);
      toast.success("Treasury removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopy = () => {
    if (!team.wallet) return;
    navigator.clipboard.writeText(team.wallet.accountName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!team.wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-xl">
        <div className="h-12 w-12 rounded-xl bg-muted border flex items-center justify-center mb-3">
          <Wallet className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">No treasury set up</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Add a wallet so this community can pay out bounties directly.
        </p>
        <Button className="mt-4 gap-2" size="sm" onClick={onOpenTreasury}>
          <Plus className="h-4 w-4" /> Set Up Treasury
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-xl p-4 space-y-4 bg-card">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {team.wallet.accountName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {team.wallet.chain} · {team.wallet.serverUrl}
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Copy account name"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {team.wallet.chain}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Balance</span>
            {balanceLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : balanceError ? (
              <span className="text-xs text-destructive">{balanceError}</span>
            ) : balance !== null ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-base font-mono font-semibold cursor-default underline decoration-dotted underline-offset-2">
                      {fmt(confirmedTotal(balance))} ZEC
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-xs space-y-1.5 min-w-[180px]"
                  >
                    <p className="font-semibold text-foreground mb-1">
                      Confirmed balances
                    </p>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Orchard</span>
                      <span className="font-mono">
                        {fmt(balance.confirmed_orchard_balance / 1e8)} ZEC
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Sapling</span>
                      <span className="font-mono">
                        {fmt(balance.confirmed_sapling_balance / 1e8)} ZEC
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Transparent</span>
                      <span className="font-mono">
                        {fmt(balance.confirmed_transparent_balance / 1e8)} ZEC
                      </span>
                    </div>
                    <div className="border-t pt-1 flex justify-between gap-4 font-semibold">
                      <span>Total</span>
                      <span className="font-mono">
                        {fmt(confirmedTotal(balance))} ZEC
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchBalance}
            disabled={balanceLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${balanceLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={onOpenTreasury}
        >
          <Wallet className="h-3.5 w-3.5" /> Replace Treasury
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={handleDeleteWallet}
        >
          <X className="h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab({
  team,
  onEdit,
  onDelete,
}: {
  team: Team;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Community details</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Name and description shown to contributors
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onEdit}
        >
          <Edit2 className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      <div className="border border-destructive/30 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-destructive">
            Delete community
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Removes all members and the treasury. Cannot be undone.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

// ── Community Profile (detail view) ────────────────────────────────────────────

type CommunityTab = "program" | "members" | "treasury" | "settings";

function CommunityProfile({
  team,
  onUpdate,
  onDelete,
  onBack,
}: {
  team: Team;
  onUpdate: (updated: Team) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const { api } = useTeamsApi();
  const [tab, setTab] = useState<CommunityTab>("program");
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [treasuryOpen, setTreasuryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteTeam = async () => {
    setDeleteLoading(true);
    try {
      await api(`/${team.id}`, { method: "DELETE" });
      toast.success("Community deleted");
      onDelete(team.id);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTreasuryCreated = (wallet: TeamWallet) => {
    onUpdate({ ...team, wallet });
  };

  const tabs: { id: CommunityTab; label: string; icon: typeof Target }[] = [
    { id: "program", label: "Bounty Program", icon: Target },
    { id: "members", label: "Members", icon: Users },
    { id: "treasury", label: "Treasury", icon: Wallet },
    { id: "settings", label: "Settings", icon: Edit2 },
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 -ml-2 mb-4 text-sm text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All communities
      </Button>

      {/* Profile header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
            {team.name[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight truncate">
              {team.name}
            </h1>
            {team.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {team.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Est. {format(new Date(team.createdAt), "MMM d, yyyy")} ·{" "}
              {team.members.length} member{team.members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Community</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddMembersOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Invite Members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Community
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-5 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "members" && (
                <span className="text-[10px] text-muted-foreground">
                  ({team.members.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "program" && <BountyProgramTab team={team} />}
      {tab === "members" && (
        <MembersTab
          team={team}
          onUpdate={onUpdate}
          onOpenInvite={() => setAddMembersOpen(true)}
        />
      )}
      {tab === "treasury" && (
        <TreasuryTab
          team={team}
          onUpdate={onUpdate}
          onOpenTreasury={() => setTreasuryOpen(true)}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          team={team}
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteConfirmOpen(true)}
        />
      )}

      {/* Modals */}
      <CommunityFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        team={team}
        onSuccess={onUpdate}
      />

      <AddMembersModal
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
        team={team}
        onSuccess={(newMembers) =>
          onUpdate({
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

      <TreasuryModal
        open={treasuryOpen}
        onOpenChange={setTreasuryOpen}
        team={team}
        onSuccess={handleTreasuryCreated}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Community
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{team.name}</strong>? This
            will permanently remove all members and the treasury. This cannot be
            undone.
          </p>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Community Card (grid item) ─────────────────────────────────────────────────

function CommunityCard({ team, onOpen }: { team: Team; onOpen: () => void }) {
  const admins = team.members.filter((m) =>
    ["OWNER", "ADMIN"].includes(m.role),
  );
  return (
    <button
      onClick={onOpen}
      className="group text-left border rounded-xl bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base font-bold text-primary shrink-0">
            {team.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {team.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 min-h-[2rem]">
              {team.description || "No description yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {team.members.length}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" /> {admins.length} admin
            {admins.length !== 1 ? "s" : ""}
          </span>
          {team.wallet ? (
            <span className="flex items-center gap-1 ml-auto">
              <Wallet className="h-3 w-3" /> {team.wallet.chain}
            </span>
          ) : (
            <span className="ml-auto text-muted-foreground/60">
              No treasury
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCommunitiesPage() {
  useRoleGuard("ADMIN");

  const { api } = useTeamsApi();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Team[]>("/");
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load communities");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const totalMembers = useMemo(
    () => new Set(teams.flatMap((t) => t.members.map((m) => m.userId))).size,
    [teams],
  );
  const totalWithTreasury = useMemo(
    () => teams.filter((t) => t.wallet).length,
    [teams],
  );

  const handleTeamCreated = (team: Team) => {
    setTeams((prev) => [team, ...prev]);
    setSelectedTeamId(team.id);
  };

  const handleTeamUpdated = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTeamDeleted = (id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    if (selectedTeamId === id) setSelectedTeamId(null);
  };

  return (
    <ProtectedRoute requireAdmin>
      <main className="min-h-screen bg-background">
        <AdminNavbar isAdmin />

        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
          {selectedTeam ? (
            <CommunityProfile
              key={selectedTeam.id}
              team={selectedTeam}
              onUpdate={handleTeamUpdated}
              onDelete={handleTeamDeleted}
              onBack={() => setSelectedTeamId(null)}
            />
          ) : (
            <>
              {/* Section header — communities as a first-class area */}
              <div className="flex flex-col sam:flex-row sam:items-end sam:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Communities
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Groups that run their own bounty program, members, and
                    treasury.
                  </p>
                </div>
                <Button
                  className="gap-1.5 shrink-0"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" /> New Community
                </Button>
              </div>

              {/* Aggregate stats */}
              <div className="grid grid-cols-3 divide-x border rounded-xl overflow-hidden bg-card mb-6">
                <StatBlock
                  label="Communities"
                  value={teams.length}
                  icon={Building2}
                />
                <StatBlock
                  label="Contributors"
                  value={totalMembers}
                  icon={Users}
                  accent="var(--chart-1)"
                />
                <StatBlock
                  label="With treasury"
                  value={totalWithTreasury}
                  icon={Wallet}
                  accent="var(--chart-4)"
                />
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search communities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm max-w-sm"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-xl border-dashed">
                  <Building2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">
                    {search ? "No communities match" : "No communities yet"}
                  </p>
                  {!search && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Create the first community to start running a bounty
                        program with its own members and treasury.
                      </p>
                      <Button
                        className="mt-4 gap-2"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="h-4 w-4" /> Create Community
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sam:grid-cols-2 imd:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredTeams.map((team) => (
                    <CommunityCard
                      key={team.id}
                      team={team}
                      onOpen={() => setSelectedTeamId(team.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <CommunityFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={handleTeamCreated}
        />
      </main>
    </ProtectedRoute>
  );
}
