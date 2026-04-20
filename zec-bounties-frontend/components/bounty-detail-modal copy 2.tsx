"use client";

import { Bounty, WorkSubmission } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Users,
  Shield,
  MessageSquare,
  CheckCircle2,
  Send,
  Coins,
  LinkIcon,
  AlertCircle,
  UserCheck,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useBounty } from "@/lib/bounty-context";
import { format } from "date-fns";

interface BountyDetailModalProps {
  bounty: Bounty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ─── Status color maps ─── */
const difficultyColor: Record<string, string> = {
  EASY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  MEDIUM:
    "bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300",
  HARD: "bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300",
};

const submissionStatusStyle: Record<string, string> = {
  approved:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  rejected:
    "bg-rose-100   text-rose-700   border-rose-200   dark:bg-rose-900/30   dark:text-rose-300   dark:border-rose-700",
  needs_revision:
    "bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-700",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

const applicationStatusStyle: Record<string, string> = {
  accepted:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  rejected:
    "bg-rose-100   text-rose-700   border-rose-200   dark:bg-rose-900/30   dark:text-rose-300   dark:border-rose-700",
  pending:
    "bg-sky-100    text-sky-700    border-sky-200    dark:bg-sky-900/30    dark:text-sky-300    dark:border-sky-700",
};

/* ─── Shared small components ─── */

function SideCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-3 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SideLabel({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text}
      </span>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ─── Collapsible assignees card ─── */
const VISIBLE_COUNT = 4;

function AssigneesCard({
  assignees,
  workSubmissions,
  currentUserId,
}: {
  assignees: Array<{
    userId: string;
    user?: { name?: string; avatar?: string } | null;
  }>;
  workSubmissions: WorkSubmission[];
  currentUserId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflow = assignees.length - VISIBLE_COUNT;

  return (
    <SideCard>
      <SideLabel icon={UserCheck} text="Assigned To" />

      {/* Collapsed: stacked avatars + count */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2.5 group w-full text-left mt-0.5"
        >
          <div className="flex -space-x-2 shrink-0">
            {assignees.slice(0, VISIBLE_COUNT).map((a) => (
              <Avatar key={a.userId} className="h-7 w-7 ring-2 ring-background">
                <AvatarImage src={a.user?.avatar || "/placeholder-user.jpg"} />
                <AvatarFallback className="text-[10px] font-semibold bg-muted">
                  {a.user?.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                +{overflow}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {assignees.length} assignee{assignees.length !== 1 ? "s" : ""}
            </p>
            {overflow > 0 && (
              <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                Tap to see all ↓
              </p>
            )}
          </div>
        </button>
      )}

      {/* Expanded: compact scrollable list */}
      {expanded && (
        <div className="mt-1">
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {assignees.map((a) => {
              const hasSubmitted = workSubmissions.some(
                (s) => s.submittedBy === a.userId,
              );
              const isYou = a.userId === currentUserId;
              return (
                <div
                  key={a.userId}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage
                      src={a.user?.avatar || "/placeholder-user.jpg"}
                    />
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {a.user?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate flex-1 min-w-0">
                    {a.user?.name || "Unknown"}
                    {isYou && (
                      <span className="ml-1 text-muted-foreground">(you)</span>
                    )}
                  </span>
                  {hasSubmitted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground pt-2 transition-colors"
          >
            Collapse ↑
          </button>
        </div>
      )}
    </SideCard>
  );
}

/* ─── Main export ─── */
export function BountyDetailModal({
  bounty,
  open,
  onOpenChange,
}: BountyDetailModalProps) {
  const {
    currentUser,
    applyToBounty,
    getUserApplicationForBounty,
    fetchWorkSubmissions,
    submitWork,
  } = useBounty();

  const [applicationMessage, setApplicationMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workSubmissions, setWorkSubmissions] = useState<WorkSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    if (!open || !bounty || !currentUser) return;
    const isAssigned =
      bounty.assignees?.some((a) => a.userId === currentUser.id) ||
      bounty.assignee === currentUser.id;
    if (!isAssigned) return;
    setSubmissionsLoading(true);
    fetchWorkSubmissions(bounty.id)
      .then((data) => setWorkSubmissions(data ?? []))
      .catch(() => setWorkSubmissions([]))
      .finally(() => setSubmissionsLoading(false));
  }, [open, bounty?.id, currentUser?.id]);

  if (!bounty) return null;

  const userApplication = currentUser
    ? getUserApplicationForBounty(bounty.id)
    : null;
  const isAssignedToCurrentUser =
    currentUser &&
    (bounty.assignees?.some((a) => a.userId === currentUser.id) ||
      bounty.assignee === currentUser.id);
  const userWorkSubmission = currentUser
    ? (workSubmissions.find((s) => s.submittedBy === currentUser.id) ?? null)
    : null;
  const hasCurrentUserSubmitted = !!userWorkSubmission;

  const canSubmitWork =
    isAssignedToCurrentUser &&
    !hasCurrentUserSubmitted &&
    !submissionsLoading &&
    bounty.status !== "DONE" &&
    bounty.status !== "CANCELLED";

  const canApply =
    currentUser &&
    bounty.createdBy !== currentUser.id &&
    !userApplication &&
    !isAssignedToCurrentUser;
  const hasApplied = !!userApplication;

  const handleApply = async () => {
    if (!applicationMessage.trim()) return;
    setIsApplying(true);
    try {
      await applyToBounty(bounty.id, applicationMessage);
      setApplicationMessage("");
      toast.success("Application submitted!");
    } catch {
      toast.error("Failed to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSubmitWork = async () => {
    if (!submissionDescription.trim() || !deliverableUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await submitWork(bounty.id, {
        description: submissionDescription,
        deliverableUrl,
      });
      setSubmissionDescription("");
      setDeliverableUrl("");
      toast.success("Work submitted!");
      setWorkSubmissions((prev) => [
        ...prev,
        {
          id: "optimistic",
          bountyId: bounty.id,
          submittedBy: currentUser!.id,
          description: submissionDescription,
          deliverableUrl,
          status: "pending",
          submittedAt: new Date().toISOString(),
          reviewNotes: null,
          reviewedAt: null,
          reviewedBy: null,
          submitterUser: null,
          reviewerUser: null,
          attachments: [],
        } as any,
      ]);
    } catch {
      toast.error("Failed to submit work");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setApplicationMessage("");
    setSubmissionDescription("");
    setDeliverableUrl("");
    setWorkSubmissions([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl p-0 focus:outline-none">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-5 py-4 sm:px-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {bounty.categoryId}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${difficultyColor[bounty.difficulty] ?? "bg-muted text-muted-foreground"}`}
              >
                {bounty.difficulty}
              </span>
              {isAssignedToCurrentUser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  <UserCheck className="h-3 w-3" /> Assigned to You
                </span>
              )}
            </div>

            <DialogTitle className="text-lg sm:text-xl font-bold leading-snug">
              {bounty.title}
            </DialogTitle>

            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(bounty.dateCreated, "MMM dd, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {bounty.applications?.length || 0} application
                  {bounty.applications?.length !== 1 ? "s" : ""}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
            {/* ── Sidebar: top on mobile as a horizontal strip, right col on desktop ── */}
            <aside className="flex flex-row flex-wrap gap-2 md:flex-col md:col-span-1 md:order-last md:gap-3">
              {/* Reward */}
              <SideCard className="flex-1 min-w-[110px] bg-gradient-to-br from-primary/5 to-background">
                <SideLabel icon={Coins} text="Reward" />
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold tracking-tight tabular-nums">
                    {bounty.bountyAmount}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    ZEC
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  On successful review
                </p>
              </SideCard>

              {/* Issuer */}
              <SideCard className="flex-1 min-w-[110px]">
                <SideLabel icon={Shield} text="Issuer" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 ring-2 ring-primary/20 shrink-0">
                    <AvatarImage
                      src={
                        bounty.createdByUser?.avatar || "/placeholder-user.jpg"
                      }
                    />
                    <AvatarFallback className="text-[10px] font-semibold">
                      {bounty.createdByUser?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-semibold truncate">
                    {bounty.createdByUser?.name || "Unknown"}
                  </p>
                </div>
              </SideCard>

              {/* Assignees — full width in both layouts */}
              {bounty.assignees && bounty.assignees.length > 0 && (
                <div className="w-full">
                  <AssigneesCard
                    assignees={bounty.assignees}
                    workSubmissions={workSubmissions}
                    currentUserId={currentUser?.id}
                  />
                </div>
              )}
            </aside>

            {/* ── Main content ── */}
            <div className="md:col-span-2 flex flex-col gap-4">
              {/* Description */}
              <SideCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Description
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {bounty.description}
                </p>
              </SideCard>

              {/* ── Submit Work ── */}
              {canSubmitWork && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                      <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                        Submit Your Work
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        You're assigned — share your deliverable below.
                      </p>
                    </div>
                  </div>

                  <Field label="Work Description" required>
                    <Textarea
                      id="submission-description"
                      placeholder="Describe what you completed and any important notes…"
                      value={submissionDescription}
                      onChange={(e) => setSubmissionDescription(e.target.value)}
                      className="min-h-[80px] resize-none bg-white dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700 focus-visible:ring-emerald-500 text-sm"
                    />
                  </Field>

                  <Field
                    label="Deliverable URL"
                    required
                    hint="GitHub, Google Drive, deployed app, etc."
                  >
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        id="deliverable-url"
                        type="url"
                        placeholder="https://github.com/username/repo"
                        value={deliverableUrl}
                        onChange={(e) => setDeliverableUrl(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </Field>

                  <Button
                    onClick={handleSubmitWork}
                    disabled={
                      !submissionDescription.trim() ||
                      !deliverableUrl.trim() ||
                      isSubmitting
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 text-sm font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-2" />
                        Submit Work
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* ── Already submitted ── */}
              {isAssignedToCurrentUser && hasCurrentUserSubmitted && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                        Work Submitted
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${submissionStatusStyle[userWorkSubmission?.status ?? "pending"]}`}
                    >
                      {userWorkSubmission?.status ?? "pending"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Your Submission
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {userWorkSubmission?.description}
                    </p>
                  </div>

                  {userWorkSubmission?.deliverableUrl && (
                    <div className="flex items-start gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <a
                        href={userWorkSubmission.deliverableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline underline-offset-2 break-all"
                      >
                        {userWorkSubmission.deliverableUrl}
                      </a>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Submitted{" "}
                    {userWorkSubmission?.submittedAt
                      ? format(
                          new Date(userWorkSubmission.submittedAt),
                          "PPP 'at' p",
                        )
                      : "Unknown"}
                  </p>

                  {userWorkSubmission?.status === "needs_revision" &&
                    userWorkSubmission.reviewNotes && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                          Revision Notes
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {userWorkSubmission.reviewNotes}
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* ── Apply form ── */}
              {canApply && (
                <div className="rounded-xl border p-4 space-y-3 bg-card">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        Apply for this Bounty
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Tell the issuer why you're the best fit.
                      </p>
                    </div>
                  </div>

                  <Field label="Application Message" required>
                    <Textarea
                      id="application-message"
                      placeholder="Describe your relevant experience and approach…"
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      className="min-h-[100px] resize-none text-sm"
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-lg h-9 text-sm font-semibold"
                      onClick={handleApply}
                      disabled={!applicationMessage.trim() || isApplying}
                    >
                      {isApplying ? "Applying…" : "Submit Application"}
                      {!isApplying && (
                        <CheckCircle2 className="ml-2 h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg h-9 w-9 shrink-0"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Application status ── */}
              {hasApplied && (
                <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span className="font-semibold text-sky-800 dark:text-sky-200 text-sm">
                        Your Application
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${applicationStatusStyle[userApplication?.status ?? "pending"]}`}
                    >
                      {userApplication?.status || "pending"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Your Message
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {userApplication?.message}
                    </p>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Applied{" "}
                    {userApplication?.appliedAt
                      ? format(
                          new Date(userApplication.appliedAt),
                          "PPP 'at' p",
                        )
                      : "Unknown"}
                  </p>

                  {userApplication?.status === "pending" && (
                    <p className="text-xs text-sky-700 dark:text-sky-300">
                      Being reviewed by the bounty creator.
                    </p>
                  )}
                  {userApplication?.status === "accepted" && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      🎉 Your application has been accepted!
                    </p>
                  )}
                  {userApplication?.status === "rejected" && (
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Your application was not selected.
                    </p>
                  )}
                </div>
              )}

              {/* ── Cannot apply notice ── */}
              {!canApply &&
                !hasApplied &&
                !isAssignedToCurrentUser &&
                (() => {
                  const msg = !currentUser
                    ? "Please log in to apply for this bounty."
                    : bounty.createdBy === currentUser.id
                      ? "You cannot apply to your own bounty."
                      : null;
                  return msg ? (
                    <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-3.5">
                      <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">{msg}</p>
                    </div>
                  ) : null;
                })()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
