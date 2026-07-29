"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { BountyCard } from "@/components/bounty-card";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  List,
  Plus,
  Filter,
  ArrowRight,
  Loader2,
  ChevronsDown,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { NewBountyModal } from "@/components/new-bounty-modal";
import { BountyDetailModal } from "@/components/bounty-detail-modal";
import { Bounty } from "@/lib/types";
import { useBounty } from "@/lib/bounty-context";
import type { BountyStatus } from "@/lib/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRoleGuard } from "@/hooks/use-role-guard";

const KANBAN_COLUMNS: {
  status: BountyStatus;
  label: string;
  color: string;
  dotColor: string;
}[] = [
  {
    status: "TO_DO",
    label: "Todo",
    color: "border-t-slate-400",
    dotColor: "bg-slate-400",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    color: "border-t-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    status: "IN_REVIEW",
    label: "In Review",
    color: "border-t-yellow-500",
    dotColor: "bg-yellow-500",
  },
  {
    status: "DONE",
    label: "Done",
    color: "border-t-green-500",
    dotColor: "bg-green-500",
  },
];

function HomeContent() {
  const {
    bounties,
    currentUser,
    categories,
    bountiesLoading,
    loadMoreBounties,
    hasMoreBounties,
    communities,
    communitiesLoading,
    fetchCommunities,
  } = useBounty();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCommunity, setActiveCommunity] = useState<string>("All"); // NEW — teamId or "All"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewBountyModalOpen, setIsNewBountyModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (communities.length === 0) fetchCommunities();
  }, []); // NEW — communities load lazily, once

  const displayCategories = ["All", ...categories.map((c) => c.name)];

  const filteredBounties = useMemo(() => {
    let filtered = bounties;
    if (activeCategory !== "All")
      filtered = filtered.filter((b) => b.categoryId === activeCategory);
    if (activeCommunity !== "All")
      // NEW
      filtered = filtered.filter((b) => b.teamId === activeCommunity);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.createdByUser?.name?.toLowerCase().includes(q),
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(),
    );
  }, [bounties, searchQuery, activeCategory, activeCommunity]);

  const kanbanGroups = useMemo(
    () =>
      KANBAN_COLUMNS.map((col) => ({
        ...col,
        bounties: filteredBounties.filter((b) => b.status === col.status),
      })),
    [filteredBounties],
  );

  const getCategoryCount = (name: string) =>
    name === "All"
      ? bounties.length
      : bounties.filter((b) => b.categoryId === name).length;

  const getCommunityCount = (
    teamId: string, // NEW
  ) =>
    teamId === "All"
      ? bounties.length
      : bounties.filter((b) => b.teamId === teamId).length;

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      await loadMoreBounties();
    } finally {
      setIsLoadingMore(false);
    }
  }, [loadMoreBounties]);

  const handleNewBounty = () => {
    if (!currentUser?.UA_address) {
      toast.warning("Unified Address required", {
        description: "Add a UA to your profile before creating a bounty.",
        action: {
          label: "Go to profile",
          onClick: () => router.push("/profile"),
        },
        duration: 5000,
      });
      return;
    }
    setIsNewBountyModalOpen(true);
  };

  const canLoadMore =
    hasMoreBounties &&
    !searchQuery &&
    activeCategory === "All" &&
    activeCommunity === "All"; // NEW — load-more only makes sense on the unfiltered set

  useEffect(() => {
    if (!canLoadMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !bountiesLoading) {
          handleLoadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isLoadingMore, bountiesLoading, handleLoadMore]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="xl:container xl:mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Welcome!</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Complete tasks to earn ZEC. You could also create yours and get
              ZEC for it.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="rounded-full shadow-lg shadow-primary/20"
              onClick={handleNewBounty}
            >
              <Plus className="mr-2 h-4 w-4" /> New Bounty
            </Button>
            <Link href="/my-bounties">
              <Button variant="outline" className="rounded-full bg-transparent">
                My Bounties <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <NewBountyModal
          open={isNewBountyModalOpen}
          onOpenChange={setIsNewBountyModalOpen}
          onSuccess={() => setIsNewBountyModalOpen(false)}
          onCancel={() => setIsNewBountyModalOpen(false)}
        />
        <BountyDetailModal
          bounty={selectedBounty}
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
        />

        <div className="imd:flex imd:flex-row gap-8 min-w-0 grid grid-cols-1">
          <aside className="space-y-8 flex-shrink-0">
            <div className="imd:w-64">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4" /> Categories
              </h3>
              <div className="flex flex-col gap-1">
                {displayCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "secondary" : "ghost"}
                    onClick={() => setActiveCategory(cat)}
                    className={`justify-start px-3 h-9 ${activeCategory === cat ? "font-bold text-primary" : "text-muted-foreground hover:text-primary"}`}
                  >
                    {cat}
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {getCategoryCount(cat)}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-6 min-w-0 flex-1">
            {/* ...existing header row, kanban/list views, unchanged... */}
          </div>

          {/* NEW — right sidebar: Communities */}
          <aside className="space-y-8 flex-shrink-0">
            <div className="imd:w-64">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" /> Communities
              </h3>
              <div className="flex flex-col gap-1">
                <Button
                  variant={activeCommunity === "All" ? "secondary" : "ghost"}
                  onClick={() => setActiveCommunity("All")}
                  className={`justify-start px-3 h-9 ${activeCommunity === "All" ? "font-bold text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  All
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {getCommunityCount("All")}
                  </Badge>
                </Button>

                {communitiesLoading && communities.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading
                    communities...
                  </div>
                ) : communities.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No communities yet.
                  </p>
                ) : (
                  communities.map((team) => (
                    <Button
                      key={team.id}
                      variant={
                        activeCommunity === team.id ? "secondary" : "ghost"
                      }
                      onClick={() => setActiveCommunity(team.id)}
                      className={`justify-start px-3 h-9 ${activeCommunity === team.id ? "font-bold text-primary" : "text-muted-foreground hover:text-primary"}`}
                      title={team.description}
                    >
                      <span className="truncate">{team.name}</span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] shrink-0"
                      >
                        {getCommunityCount(team.id)}
                      </Badge>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  useRoleGuard("CLIENT");
  return (
    <ProtectedRoute blockAdmin>
      <HomeContent />
    </ProtectedRoute>
  );
}
