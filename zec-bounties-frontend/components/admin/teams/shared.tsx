// components/admin/teams/shared.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ElementType, ReactNode } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  Shield,
  Crown,
  User,
  Loader2,
  Building2,
  UserPlus,
  Check,
  Eye,
  EyeOff,
  XIcon,
  Link2,
  ExternalLink,
} from "lucide-react";
import { RxDiscordLogo } from "react-icons/rx";
import type { Team } from "@/lib/types";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: { id: string; name: string; email: string; avatar?: string };
}

export interface TeamWallet {
  id: string;
  teamId: string;
  accountName: string;
  chain: string;
  serverUrl: string;
  createdAt: string;
}

// ── Visual helpers ────────────────────────────────────────────────────────────

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const GRADIENT_PRESETS = [
  "from-primary/60 via-primary/20 to-transparent",
  "from-chart-2/60 via-chart-2/20 to-transparent",
  "from-chart-4/60 via-chart-4/20 to-transparent",
  "from-chart-5/60 via-chart-5/20 to-transparent",
  "from-chart-3/60 via-chart-3/20 to-transparent",
] as const;

export function gradientFor(teamId: string) {
  const hash = teamId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return GRADIENT_PRESETS[hash % GRADIENT_PRESETS.length];
}

export function roleBadgeClass(role: string) {
  if (role === "OWNER") return "text-primary border-primary/30 bg-primary/10";
  if (role === "ADMIN") return "text-foreground border-border bg-muted/40";
  return "text-muted-foreground border-border bg-transparent";
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-lg font-bold capitalize">{value}</div>
      </div>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RoleBadge({ role }: { role: TeamMember["role"] }) {
  const cfg = {
    OWNER: { icon: Crown, label: "Owner" },
    ADMIN: { icon: Shield, label: "Admin" },
    MEMBER: { icon: User, label: "Member" },
  }[role];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] font-medium ${roleBadgeClass(role)}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

// ── API helper ────────────────────────────────────────────────────────────────

export function useTeamsApi() {
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

// ── Social links ──────────────────────────────────────────────────────────────

export function SocialLinksCard({ team }: { team: Team }) {
  const links = [
    team.twitterUrl && { href: team.twitterUrl, icon: XIcon },
    team.discordUrl && { href: team.discordUrl, icon: RxDiscordLogo },
    ...(team.additionalLinks ?? []).map((href) => ({ href, icon: Link2 })),
  ].filter(Boolean) as { href: string; icon: ElementType }[];

  return (
    <Section title="Social & links">
      {links.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No social links provided for this team.
        </p>
      ) : (
        <div className="divide-y">
          {links.map(({ href, icon: Icon }, i) => (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{href}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Verification ──────────────────────────────────────────────────────────────

export function VerificationCard({ team }: { team: Team }) {
  const { teamVerifications, fetchTeamVerification, verifyTeam, unverifyTeam } =
    useBounty();
  const status = teamVerifications[team.id] ?? null;
  const [loading, setLoading] = useState(!status);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!status) {
      setLoading(true);
      fetchTeamVerification(team.id).finally(() => setLoading(false));
    }
  }, [team.id]);

  const handleToggle = async () => {
    setActing(true);
    try {
      status?.verifiedByMe
        ? await unverifyTeam(team.id)
        : await verifyTeam(team.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading verification...
      </div>
    );
  }

  const pct = Math.min(
    100,
    (status.verificationCount / status.requiredVerifications) * 100,
  );

  return (
    <Section
      title="Verification"
      action={
        <Button
          size="sm"
          variant={status.verifiedByMe ? "outline" : "default"}
          className="h-7 rounded-full text-xs"
          onClick={handleToggle}
          disabled={acting}
        >
          {acting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status.verifiedByMe ? (
            "Remove my verification"
          ) : (
            "Verify team"
          )}
        </Button>
      }
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              status.isVerified
                ? "border-green-500/30 bg-green-500/10 text-green-600"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600"
            }
          >
            {status.isVerified ? "Verified" : "Unverified"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {status.verificationCount}/{status.requiredVerifications} admin
            sign-offs
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              status.isVerified ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!status.isVerified && (
          <p className="text-xs text-muted-foreground">
            This team can't post bounties until {status.requiredVerifications}{" "}
            admins verify it.
          </p>
        )}
      </div>
    </Section>
  );
}

// ── Edit Team Modal ───────────────────────────────────────────────────────────

export function TeamFormModal({
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
    if (!name.trim()) return toast.error("Team name is required");
    setLoading(true);
    try {
      const body = JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
      });
      const result: Team = team
        ? await api(`/${team.id}`, { method: "PATCH", body })
        : await api("/", { method: "POST", body });
      toast.success(team ? "Team updated" : "Team created");
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
      <DialogContent className="w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {team ? "Edit Team" : "Create New Team"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Team Name *</Label>
            <Input
              placeholder="e.g. Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              placeholder="Optional description"
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {team ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Members Modal ─────────────────────────────────────────────────────────

export function AddMembersModal({
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
      return toast.error("Select at least one user");
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
      <DialogContent className="w-[calc(100vw-2rem)] rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members to {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Search users..."
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

          <div className="max-h-56 divide-y overflow-y-auto rounded-lg border sm:max-h-64">
            {available.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No users match your search"
                  : "All users are already members"}
              </div>
            ) : (
              available.map((user: any) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggle(user.id)}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        selected ? "border-primary bg-primary" : "border-border"
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
                      <div className="truncate text-sm font-medium">
                        {user.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
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
              {selectedIds.length} user{selectedIds.length > 1 ? "s" : ""}{" "}
              selected
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selectedIds.length > 0 ? `(${selectedIds.length})` : "Members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Team Wallet Modal ─────────────────────────────────────────────────────────

export function TeamWalletModal({
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
        tab === "import" ? "Wallet imported successfully" : "Wallet created",
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
      <DialogContent className="w-[calc(100vw-2rem)] rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {team.wallet ? "Replace" : "Add"} Team Wallet for {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["new", "import"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
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
                placeholder="e.g. Team Main"
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
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-3 py-2">
                        <span className="select-none break-all text-sm leading-relaxed tracking-[0.3em] text-foreground">
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
                      className={`resize-none pr-10 font-mono text-sm ${
                        !showSeed && seedPhrase
                          ? "text-transparent caret-foreground"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSeed((v) => !v)}
                      className="absolute right-2 top-2 z-20 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tab === "import" ? "Import Wallet" : "Create Wallet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
