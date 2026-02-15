"use client";

import { Navbar } from "@/components/layout/navbar";
import { DUMMY_BOUNTIES } from "@/lib/data";
import { BountyCard } from "@/components/bounty-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useBounty } from "@/lib/bounty-context";
import { useState } from "react";

export default function MyBountiesPage() {
  const { bounties, currentUser } = useBounty();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // state for detail modal
  const userBounties =
    currentUser?.role === "ADMIN"
      ? bounties
      : bounties.filter(
          (b) =>
            b.createdBy === currentUser?.id || b.assignee === currentUser?.id,
        );
  const activeBounties = userBounties.filter(
    (b) => b.status === "IN_PROGRESS" || b.status === "IN_REVIEW",
  );
  const completedBounties = userBounties.filter((b) => b.status === "DONE");

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="imd:container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold mb-2">My Bounties</h1>
            <p className="text-muted-foreground">
              Manage your active submissions and history.
            </p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-muted/50 mb-8">
              <TabsTrigger value="active">
                Active ({activeBounties.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({completedBounties.length})
              </TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            </TabsList>

            <TabsContent
              value="active"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activeBounties.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
              ))}
              {activeBounties.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl">
                  <p className="text-muted-foreground">
                    No active bounties. Start hunting in the marketplace!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="history"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {completedBounties.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  );
}
