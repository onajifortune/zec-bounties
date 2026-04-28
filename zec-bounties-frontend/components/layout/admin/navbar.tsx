"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  Bell,
  Search,
  Wallet,
  Menu,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderSync,
  ShieldCheck,
  User,
  Users,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useState } from "react";
import { WalletTopupModal } from "@/components/wallet-topup-modal";
import { useBounty } from "@/lib/bounty-context";
import type { SyncStatus } from "@/lib/bounty-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Active wallet type pill — always visible in the navbar ─────────────────
//
// This is the key addition: a persistent, coloured pill that shows whether the
// active wallet is a Team or Personal wallet. It never hides. The user always
// knows what context they are operating in.
//
function ActiveWalletTypePill() {
  const { zcashParams, currentTeam } = useBounty();
  if (!zcashParams || zcashParams.length === 0) return null;

  const active =
    zcashParams.find((p) => p.isDefault) ?? zcashParams[zcashParams.length - 1];
  if (!active) return null;

  const isTeam = !!(active.isTeam && active.teamId);
  const teamName = isTeam && currentTeam ? currentTeam.name : null;
  const accountLabel = active.accountName || "Wallet";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold cursor-default select-none transition-colors",
            isTeam
              ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-300"
              : "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300",
          )}
        >
          {isTeam ? (
            <Building2 className="h-3 w-3 shrink-0" />
          ) : (
            <User className="h-3 w-3 shrink-0" />
          )}
          <span className="hidden lg:inline">
            {isTeam ? (teamName ?? "Team") : accountLabel}
          </span>
          <span
            className={cn(
              "hidden xl:inline text-[10px] font-normal px-1.5 py-0.5 rounded",
              isTeam
                ? "bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-400"
                : "bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-400",
            )}
          >
            {isTeam ? "Team wallet" : "Personal"}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[200px]">
        <p className="font-semibold mb-0.5">
          {isTeam ? "Team wallet" : "Personal wallet"}
        </p>
        <p className="text-muted-foreground">{accountLabel}</p>
        {teamName && <p className="text-muted-foreground">Team: {teamName}</p>}
        <p className="text-muted-foreground capitalize">
          {active.chain ?? "mainnet"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Sync status badge ──────────────────────────────────────────────────────
function SyncStatusBadge({ status }: { status: SyncStatus | null }) {
  if (!status) return null;
  const pct =
    status.percentage_total_blocks_scanned ||
    status.percentage_total_outputs_scanned;
  const done = pct === 100 || status.in_progress === false;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border text-xs font-mono">
      {done ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
      ) : (
        <Activity className="h-3 w-3 text-amber-400 animate-pulse shrink-0" />
      )}
      <span className="hidden xl:inline text-muted-foreground">Sync</span>
      <span className={done ? "text-emerald-500" : "text-amber-400"}>
        {pct != null
          ? `${Number(pct).toFixed(2)}%`
          : status.in_progress
            ? "…"
            : "—"}
      </span>
      {status.synced_blocks != null && status.total_blocks != null && (
        <span className="hidden 2xl:inline text-muted-foreground/60">
          ({status.synced_blocks}/{status.total_blocks})
        </span>
      )}
    </div>
  );
}

// ── Role toggle ────────────────────────────────────────────────────────────
function RoleToggleButton({ compact = false }: { compact?: boolean }) {
  const { currentUser, switchRole, isSwitchingRole } = useBounty();
  const router = useRouter();
  if (!currentUser?.isRobin) return null;

  const isAdmin = currentUser.role === "ADMIN";
  const handleSwitch = async () => {
    await switchRole();
    router.push(isAdmin ? "/home" : "/admin");
  };

  if (compact) {
    return (
      <Button
        variant="outline"
        className="gap-2 justify-start"
        onClick={handleSwitch}
        disabled={isSwitchingRole}
      >
        {isSwitchingRole ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAdmin ? (
          <User className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {isSwitchingRole
          ? "Switching..."
          : isAdmin
            ? "Switch to Client"
            : "Switch to Admin"}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium border-dashed"
          onClick={handleSwitch}
          disabled={isSwitchingRole}
        >
          {isSwitchingRole ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isAdmin ? (
            <User className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {isSwitchingRole ? "..." : isAdmin ? "Client" : "Admin"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isAdmin ? "Switch to Client view" : "Switch to Admin view"}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Main navbar ────────────────────────────────────────────────────────────
export function AdminNavbar({
  isAdmin = true,
  searchQuery,
  onSearchChange,
}: {
  isAdmin?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [topupOpen, setTopupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    currentUser,
    currentTeam,
    zcashParams,
    logout,
    balance,
    fetchBalance,
    fetchAddresses,
    syncStatus,
    rescanStatus,
    syncStatusError,
    fetchSyncStatus,
    rescanWallet,
    rescanLoading,
  } = useBounty();

  // Derive active wallet for mobile sheet
  const activeWallet =
    zcashParams?.find((p) => p.isDefault) ??
    (zcashParams && zcashParams.length > 0
      ? zcashParams[zcashParams.length - 1]
      : null);
  const activeIsTeam = !!(activeWallet?.isTeam && activeWallet?.teamId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchAddresses(), fetchBalance()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncStatus = async () => {
    setIsSyncing(true);
    try {
      await fetchSyncStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight mr-4 md:mr-6">
            <Link
              href="https://zechub.wiki"
              prefetch
              target="_blank"
              className="transition-colors hover:text-primary"
            >
              <img
                src="ZecHubBlue.png"
                alt="ZecHub"
                style={{ height: "3rem" }}
              />
            </Link>
            <Link
              href="/admin"
              prefetch
              className="transition-colors hover:text-primary"
            >
              <span className="hidden sm:inline">ZEC Bounties</span>
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden xl:flex items-center space-x-4 text-sm font-medium mr-auto">
            <Link
              href="/admin/dashboard"
              prefetch
              className="transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/bounties"
              className="transition-colors hover:text-primary"
            >
              Bounties
            </Link>
            <Link
              href="/admin/export"
              className="transition-colors hover:text-primary"
            >
              Export
            </Link>
            <Link
              href="/admin/teams"
              prefetch
              className="transition-colors hover:text-primary"
            >
              Teams
            </Link>
          </div>

          {/* Desktop right side */}
          <div className="hidden xl:flex items-center gap-1.5 ml-auto">
            {/* Search */}
            <div className="relative max-w-sm mr-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search bounties..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-8 h-9 w-[180px] lg:w-[260px] bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>

            <TooltipProvider delayDuration={300}>
              {/* Sync / rescan status */}
              {syncStatus || syncStatusError ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {syncStatusError ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border text-xs font-mono text-destructive">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Error</span>
                        </div>
                      ) : (
                        <SyncStatusBadge status={syncStatus} />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="font-mono text-xs max-w-xs whitespace-pre-wrap"
                  >
                    {syncStatusError
                      ? syncStatusError
                      : JSON.stringify(syncStatus, null, 2)}
                  </TooltipContent>
                </Tooltip>
              ) : rescanStatus ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border text-xs font-mono text-emerald-500">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Rescan OK</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="font-mono text-xs max-w-xs whitespace-pre-wrap"
                  >
                    {typeof rescanStatus === "string"
                      ? rescanStatus
                      : JSON.stringify(rescanStatus, null, 2)}
                  </TooltipContent>
                </Tooltip>
              ) : null}

              {/* ── ACTIVE WALLET TYPE PILL — always visible ── */}
              <ActiveWalletTypePill />

              {/* Balance */}
              <Button
                variant="ghost"
                className="gap-2 h-9 text-xs font-mono"
                onClick={() => setTopupOpen(true)}
              >
                <Wallet className="h-4 w-4" />
                {balance ? `${(balance / 1e8).toFixed(4)} ZEC` : `0.0000 ZEC`}
              </Button>

              {/* Refresh */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-9 w-9"
                  >
                    <RefreshCw
                      className={cn("w-4 h-4", isRefreshing && "animate-spin")}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Refresh balance
                </TooltipContent>
              </Tooltip>

              {/* Sync status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSyncStatus}
                    disabled={isSyncing}
                    className="h-9 w-9"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Refresh sync status
                </TooltipContent>
              </Tooltip>

              {/* Rescan */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={rescanWallet}
                    disabled={rescanLoading}
                    className="h-9 w-9"
                  >
                    {rescanLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderSync className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Rescan wallet
                </TooltipContent>
              </Tooltip>

              {/* Role toggle */}
              <RoleToggleButton />

              {/* Theme */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          currentUser?.avatar ||
                          "/abstract-geometric-shapes.png"
                        }
                        alt="User"
                      />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{currentUser?.name}</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <div onClick={logout}>Log out</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>

          {/* Mobile right side */}
          <div className="flex xl:hidden items-center gap-2 ml-auto">
            {/* Mobile wallet type pill — compact, icon only on very small screens */}
            {activeWallet && (
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold",
                  activeIsTeam
                    ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-300"
                    : "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300",
                )}
              >
                {activeIsTeam ? (
                  <Building2 className="h-3 w-3 shrink-0" />
                ) : (
                  <User className="h-3 w-3 shrink-0" />
                )}
                <span className="hidden sm:inline text-[11px]">
                  {activeIsTeam ? "Team" : "Personal"}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-4">
                <SheetHeader>
                  <SheetTitle>Admin Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search bounties..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="pl-8 bg-muted/50 border-none focus-visible:ring-1"
                    />
                  </div>

                  {/* Active wallet type — prominent in mobile sheet */}
                  {activeWallet && (
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg border",
                        activeIsTeam
                          ? "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800"
                          : "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          activeIsTeam
                            ? "bg-violet-100 dark:bg-violet-900"
                            : "bg-sky-100 dark:bg-sky-900",
                        )}
                      >
                        {activeIsTeam ? (
                          <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        ) : (
                          <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs font-semibold truncate",
                            activeIsTeam
                              ? "text-violet-700 dark:text-violet-300"
                              : "text-sky-700 dark:text-sky-300",
                          )}
                        >
                          {activeWallet.accountName || "Active wallet"}
                        </p>
                        <p
                          className={cn(
                            "text-[11px]",
                            activeIsTeam
                              ? "text-violet-500 dark:text-violet-400"
                              : "text-sky-500 dark:text-sky-400",
                          )}
                        >
                          {activeIsTeam
                            ? `Team wallet · ${currentTeam?.name ?? "Team"}`
                            : "Personal wallet"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {[
                      { href: "/admin/dashboard", label: "Dashboard" },
                      { href: "/admin/bounties", label: "Bounties" },
                      { href: "/admin/export", label: "Export" },
                      { href: "/admin/teams", label: "Teams" },
                    ].map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t" />

                  {(syncStatus || syncStatusError) && (
                    <div className="px-1">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Sync Status
                      </p>
                      {syncStatusError ? (
                        <div className="flex items-center gap-2 text-xs text-destructive font-mono">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {syncStatusError}
                        </div>
                      ) : (
                        <SyncStatusBadge status={syncStatus} />
                      )}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="gap-2 justify-start font-mono"
                    onClick={() => {
                      setTopupOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Wallet className="h-4 w-4" />
                    {balance
                      ? `${(balance / 1e8).toFixed(4)} ZEC`
                      : `0.0000 ZEC`}
                  </Button>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5 flex-1 text-xs"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5",
                          isRefreshing && "animate-spin",
                        )}
                      />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 flex-1 text-xs"
                      onClick={handleSyncStatus}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 flex-1 text-xs"
                      onClick={rescanWallet}
                      disabled={rescanLoading}
                    >
                      {rescanLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FolderSync className="h-3.5 w-3.5" />
                      )}
                      Rescan
                    </Button>
                  </div>

                  <RoleToggleButton compact />

                  <Button variant="outline" className="gap-2 justify-start">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Button>

                  <div className="border-t" />

                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          currentUser?.avatar ||
                          "/abstract-geometric-shapes.png"
                        }
                        alt="User"
                      />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {currentUser?.name}
                    </span>
                  </div>

                  <div className="border-t" />
                  <Button
                    variant="ghost"
                    className="justify-start text-destructive"
                    asChild
                  >
                    <div onClick={logout}>Log out</div>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {isAdmin && (
        <WalletTopupModal open={topupOpen} onOpenChange={setTopupOpen} />
      )}
    </>
  );
}
