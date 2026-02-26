"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NewBountyModal } from "@/components/new-bounty-modal";
import { BountyDetailModal } from "@/components/bounty-detail-modal";
import { Bounty } from "@/lib/types";
import { useBounty } from "@/lib/bounty-context";
import type { BountyStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function MarketplacePage() {
  const { bounties, currentUser, categories, bountiesLoading, isLoading } =
    useBounty();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BountyStatus | "all">("all");
  const [isNewBountyModalOpen, setIsNewBountyModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(6);
  const [isInitialized, setIsInitialized] = useState(false);

  // Convert categories to display format (add "All" option)
  const displayCategories = ["All", ...categories.map((cat) => cat.name)];

  // ⭐ Track when data is actually loaded
  useEffect(() => {
    if (!bountiesLoading && bounties.length >= 0) {
      setIsInitialized(true);
    }
  }, [bountiesLoading, bounties]);

  // ⭐ Reset initialization state when user logs out
  useEffect(() => {
    if (!currentUser) {
      // User logged out - reset to show loading briefly while data re-fetches
      setIsInitialized(false);
    }
  }, [currentUser]);

  const filteredBounties = useMemo(() => {
    let filtered = bounties;

    // Category filter
    if (activeCategory !== "All") {
      filtered = filtered.filter(
        (bounty) => bounty.categoryId === activeCategory,
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bounty) =>
          bounty.title.toLowerCase().includes(searchLower) ||
          bounty.description.toLowerCase().includes(searchLower) ||
          bounty.createdByUser?.name?.toLowerCase().includes(searchLower),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bounty) => bounty.status === statusFilter);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(),
    );
  }, [bounties, searchQuery, activeCategory, statusFilter]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(6);
  }, [activeCategory, searchQuery, statusFilter]);

  // Get bounties to display (limited by displayCount)
  const displayedBounties = filteredBounties.slice(0, displayCount);
  const hasMore = displayCount < filteredBounties.length;

  // Get count for each category
  const getCategoryCount = (categoryName: string) => {
    if (categoryName === "All") {
      return bounties.length;
    }
    return bounties.filter((bounty) => bounty.categoryId === categoryName)
      .length;
  };

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 6);
  };

  // Handler for actions that require authentication
  const handleNewBounty = () => {
    if (!currentUser) {
      router.push("/login?redirect=/home");
      return;
    }
    setIsNewBountyModalOpen(true);
  };

  const handleMySubmissions = () => {
    if (!currentUser) {
      router.push("/login?redirect=/my-bounties");
      return;
    }
    router.push("/my-bounties");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="imd:container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              {currentUser ? "Welcome!" : "Browse Bounties"}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              {currentUser
                ? "Complete tasks to earn ZEC. You could also create yours and get ZEC for it."
                : "Explore available bounties. Sign in to apply and start earning ZEC."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="rounded-full shadow-lg shadow-primary/20"
              onClick={handleNewBounty}
            >
              <Plus className="mr-2 h-4 w-4" /> New Bounty
            </Button>
            {currentUser ? (
              <Link href="/my-bounties">
                <Button
                  variant="outline"
                  className="rounded-full bg-transparent"
                >
                  My Submissions <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="rounded-full bg-transparent"
                onClick={() => router.push("/login?redirect=/home")}
              >
                Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar filters */}
          <aside className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4" /> Categories
              </h3>
              <div className="flex flex-col gap-1">
                {displayCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "secondary" : "ghost"}
                    onClick={() => setActiveCategory(cat)}
                    className={`justify-start px-3 h-9 ${
                      activeCategory === cat
                        ? "font-bold text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {cat}
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {getCategoryCount(cat)}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* {!currentUser && (
              <div className="rounded-xl border bg-card/30 p-4 border-dashed">
                <h4 className="font-semibold text-sm mb-2">
                  Join the Platform
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Sign in to apply for bounties, create your own, and start
                  earning ZEC.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs bg-transparent"
                  onClick={() => router.push("/login?redirect=/home")}
                >
                  Sign In
                </Button>
              </div>
            )} */}
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <h2 className="text-xl font-bold">
                {activeCategory === "All"
                  ? "All Bounties"
                  : `${activeCategory} Bounties`}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isInitialized ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading bounties...</p>
              </div>
            ) : filteredBounties.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    : "flex flex-col gap-4"
                }
              >
                {displayedBounties.map((bounty) => (
                  <BountyCard
                    key={bounty.id}
                    bounty={bounty}
                    viewMode={viewMode}
                    onClick={() => {
                      setSelectedBounty(bounty);
                      setIsDetailModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">
                  No bounties found
                  {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
                  {searchQuery ? " matching your search" : ""}.
                </p>
              </div>
            )}

            {hasMore && isInitialized && (
              <div className="pt-8 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-full px-8 bg-transparent"
                  onClick={handleLoadMore}
                >
                  Load More Bounties
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
