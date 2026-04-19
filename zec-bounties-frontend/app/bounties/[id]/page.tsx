"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  ExternalLink,
  Loader2,
  Tag,
  User,
} from "lucide-react";
import { useBounty } from "@/lib/bounty-context";
import type { Bounty } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  TO_DO: "bg-slate-100 text-slate-700 border-slate-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-300",
  IN_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-300",
  DONE: "bg-green-100 text-green-700 border-green-300",
  CANCELLED: "bg-red-100 text-red-700 border-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export default function BountyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchBountyById } = useBounty();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchBountyById(id)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setBounty(data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !bounty) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-muted-foreground">
          Bounty not found.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  const primaryAssignee =
    bounty.assigneeUser ?? bounty.assignees?.[0]?.user ?? null;

  const deadlineDate = bounty.timeToComplete
    ? new Date(bounty.timeToComplete)
    : null;

  const createdDate = bounty.dateCreated ? new Date(bounty.dateCreated) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top nav bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground truncate">
            Bounty #{bounty.id.slice(0, 8)}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold leading-tight max-w-2xl">
              {bounty.title}
            </h1>
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 font-medium ${STATUS_STYLES[bounty.status] ?? ""}`}
            >
              {STATUS_LABELS[bounty.status] ?? bounty.status}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-foreground">
                {bounty.bountyAmount} ZEC
              </span>
            </span>

            {deadlineDate && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Deadline:{" "}
                {deadlineDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}

            {createdDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Created:{" "}
                {createdDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}

            {bounty.category?.name && (
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                {bounty.category.name}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Description */}
        {bounty.description && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {bounty.description}
            </p>
          </section>
        )}

        {/* Assignees */}
        {bounty.assignees && bounty.assignees.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {bounty.assignees.length === 1 ? "Assignee" : "Assignees"}
            </h2>
            <div className="flex flex-wrap gap-3">
              {bounty.assignees.map((a) => {
                const user = a.user;
                return (
                  <div
                    key={a.userId ?? user?.id}
                    className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/40"
                  >
                    <Avatar className="w-7 h-7">
                      {user?.avatar && (
                        <AvatarImage src={user.avatar} alt={user.name ?? ""} />
                      )}
                      <AvatarFallback className="text-xs">
                        {user?.name?.[0]?.toUpperCase() ?? (
                          <User className="w-3 h-3" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium leading-none">
                        {user?.name ?? "—"}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Creator */}
        {bounty.createdByUser && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Posted by
            </h2>
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                {bounty.createdByUser.avatar && (
                  <AvatarImage
                    src={bounty.createdByUser.avatar}
                    alt={bounty.createdByUser.name ?? ""}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {bounty.createdByUser.name?.[0]?.toUpperCase() ?? (
                    <User className="w-3 h-3" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {bounty.createdByUser.name}
              </span>
            </div>
          </section>
        )}

        {/* Payment info (visible when paid) */}
        {bounty.isPaid && bounty.paidAt && (
          <>
            <Separator />
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </h2>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Paid at
                  </p>
                  <p className="font-medium">
                    {new Date(bounty.paidAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {primaryAssignee?.z_address && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Shielded address
                    </p>
                    <p className="font-mono text-xs break-all">
                      {primaryAssignee.z_address}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
