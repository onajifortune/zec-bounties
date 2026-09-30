// app/admin/teams/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateTeamPanel } from "@/components/teams/create-team-panel";
import {
  gradientFor,
  initials,
  StatTile,
  useTeamsApi,
} from "@/components/admin/teams/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Loader2,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import type { Team } from "@/lib/types";
import { toast } from "sonner";

export default function AdminTeamsPage() {
  const router = useRouter();
  const { api } = useTeamsApi();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Team[]>("/");
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [teams, search]);

  const stats = useMemo(
    () => ({
      members: teams.reduce((s, t) => s + t.members.length, 0),
      unverified: teams.filter((t) => !t.isVerified).length,
      wallets: teams.filter((t) => !!t.wallet).length,
    }),
    [teams],
  );

  return (
    <>
      <div className="px-4 py-8 xl:container xl:mx-auto">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-widest text-primary">
              Admin console
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight">
              All teams
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Verify teams, manage members, and oversee shared wallets.
            </p>
          </div>
          <Button
            className="shrink-0 rounded-full shadow-lg shadow-primary/20"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> New team
          </Button>
        </div>

        {teams.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 imd:grid-cols-4">
            <StatTile
              icon={Building2}
              label="Teams"
              value={teams.length}
              tone="bg-primary/10 text-primary"
            />
            <StatTile
              icon={Users}
              label="Total members"
              value={stats.members}
              tone="bg-chart-2/10 text-chart-2"
            />
            <StatTile
              icon={AlertTriangle}
              label="Awaiting verification"
              value={stats.unverified}
              tone="bg-amber-500/10 text-amber-600"
            />
            <StatTile
              icon={Wallet}
              label="Wallets set up"
              value={stats.wallets}
              tone="bg-chart-5/10 text-chart-5"
            />
          </div>
        )}

        {teams.length > 0 && (
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-6 h-10 max-w-sm rounded-full px-4"
          />
        )}

        {loading && teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/20 px-8 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              No teams yet
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create the first team to start posting bounties and pooling a
              shared wallet.
            </p>
            <Button className="mt-2" onClick={() => setCreateOpen(true)}>
              Create a team
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
            No teams match "{search}".
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 imd:grid-cols-4">
            {filtered.map((team) => {
              const admins = team.members.filter((m) =>
                ["OWNER", "ADMIN"].includes(m.role),
              ).length;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => router.push(`/admin/teams/${team.id}`)}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div
                    className={`h-16 shrink-0 bg-gradient-to-br ${gradientFor(team.id)}`}
                  />
                  <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
                    <div className="-mt-8 flex items-end justify-between gap-3">
                      <Avatar className="h-16 w-16 shrink-0 border-4 border-card shadow-sm">
                        {team.logo && (
                          <AvatarImage
                            src={team.logo}
                            alt={`${team.name} logo`}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="text-base font-semibold">
                          {initials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge
                        variant="outline"
                        className={`mb-1 shrink-0 ${
                          team.isVerified
                            ? "border-green-500/30 bg-green-500/10 text-green-600"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {team.isVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-lg font-semibold">{team.name}</span>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {team.description || "No description yet."}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t pt-4 text-xs">
                      <div>
                        <div className="text-muted-foreground">Members</div>
                        <div className="mt-1 text-sm font-medium">
                          {team.members.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Admins</div>
                        <div className="mt-1 text-sm font-medium">{admins}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Wallet</div>
                        <div className="mt-1 text-sm font-medium">
                          {team.wallet ? "Set up" : "Not set up"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-sm font-medium text-primary">
                      <span>Open console</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateTeamPanel
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(team) => router.push(`/admin/teams/${team.id}`)}
      />
    </>
  );
}
