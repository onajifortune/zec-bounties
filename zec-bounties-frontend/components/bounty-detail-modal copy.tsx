"use client";

import { Bounty, WorkSubmission } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

/* ─── tiny helpers ─── */
const difficultyColor: Record<string, string> = {
  EASY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  MEDIUM:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  HARD: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const submissionStatusStyle: Record<string, string> = {
  approved:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  rejected:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  needs_revision:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

const applicationStatusStyle: Record<string, string> = {
  accepted:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  rejected:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  pending:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
};

/* ─── Section wrapper ─── */
function Section({
  icon: Icon,
  title,
  className = "",
  children,
}: {
  icon?: React.ElementType;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </h4>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Sidebar card ─── */
function SideCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ─── Input field wrapper ─── */
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
      toast.success("Application submitted successfully!");
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
      toast.success("Work submitted successfully!");
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
      <DialogContent
        className="
          w-full max-w-[95vw] sm:max-w-3xl
          max-h-[92dvh] overflow-y-auto
          rounded-2xl p-0
          focus:outline-none
        "
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-5 py-4 sm:px-7 sm:py-5">
          <DialogHeader>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {bounty.categoryId}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  difficultyColor[bounty.difficulty] ??
                  "bg-muted text-muted-foreground"
                }`}
              >
                {bounty.difficulty}
              </span>
              {isAssignedToCurrentUser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  <UserCheck className="h-3 w-3" /> Assigned to You
                </span>
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-bold leading-snug">
              {bounty.title}
            </DialogTitle>

            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {format(bounty.dateCreated, "MMM dd, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {bounty.applications?.length || 0} application
                  {bounty.applications?.length !== 1 ? "s" : ""}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {/* On mobile: sidebar floats above content */}
          <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-8">
            {/* ── Sidebar (shows first on mobile) ── */}
            <aside className="flex flex-col gap-4 md:col-span-1 md:order-last">
              {/* Reward */}
              <SideCard className="bg-gradient-to-br from-primary/5 via-primary/5 to-background">
                <Section icon={Coins} title="Reward">
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                      {bounty.bountyAmount}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      ZEC
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Paid upon successful review
                  </p>
                </Section>
              </SideCard>

              {/* Issuer */}
              <SideCard>
                <Section icon={Shield} title="Issuer">
                  <div className="flex items-center gap-3 mt-1">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarImage
                        src={
                          bounty.createdByUser?.avatar ||
                          "/placeholder-user.jpg"
                        }
                      />
                      <AvatarFallback className="text-sm font-semibold">
                        {bounty.createdByUser?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold">
                      {bounty.createdByUser?.name || "Unknown"}
                    </p>
                  </div>
                </Section>
              </SideCard>

              {/* Assignees */}
              {bounty.assignees && bounty.assignees.length > 0 && (
                <SideCard>
                  <Section icon={UserCheck} title="Assigned To">
                    <div className="space-y-2 mt-1">
                      {bounty.assignees.map((a) => {
                        const hasSubmitted = workSubmissions.some(
                          (s) => s.submittedBy === a.userId,
                        );
                        return (
                          <div
                            key={a.userId}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-primary/15 bg-primary/5"
                          >
                            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                              <AvatarImage
                                src={a.user?.avatar || "/placeholder-user.jpg"}
                              />
                              <AvatarFallback className="text-xs font-semibold">
                                {a.user?.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-primary truncate">
                                {a.user?.name || "Unknown"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {a.userId === currentUser?.id && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    You
                                  </span>
                                )}
                                {hasSubmitted && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3 w-3" />{" "}
                                    Submitted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                </SideCard>
              )}
            </aside>

            {/* ── Main content ── */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {/* Description */}
              <SideCard>
                <Section icon={FileText} title="Description">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">
                    {bounty.description}
                  </p>
                </Section>
              </SideCard>

              {/* ── Submit Work Form ── */}
              {canSubmitWork && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 text-base">
                        Submit Your Work
                      </h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                        You're assigned to this bounty. Share your deliverable
                        below.
                      </p>
                    </div>
                  </div>

                  <Field label="Work Description" required>
                    <Textarea
                      id="submission-description"
                      placeholder="Describe the work you've completed, what you delivered, and any important notes…"
                      value={submissionDescription}
                      onChange={(e) => setSubmissionDescription(e.target.value)}
                      className="min-h-[96px] resize-none bg-white dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700 focus-visible:ring-emerald-500"
                    />
                  </Field>

                  <Field
                    label="Deliverable URL"
                    required
                    hint="GitHub repo, Google Drive, deployed app, etc."
                  >
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        id="deliverable-url"
                        type="url"
                        placeholder="https://github.com/username/repo"
                        value={deliverableUrl}
                        onChange={(e) => setDeliverableUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Work
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* ── Already submitted ── */}
              {isAssignedToCurrentUser && hasCurrentUserSubmitted && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                        Work Submitted
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        submissionStatusStyle[
                          userWorkSubmission?.status ?? "pending"
                        ]
                      }`}
                    >
                      {userWorkSubmission?.status ?? "pending"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Your Submission
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {userWorkSubmission?.description}
                      </p>
                    </div>

                    {userWorkSubmission?.deliverableUrl && (
                      <div className="flex items-start gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <a
                          href={userWorkSubmission.deliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline underline-offset-2 break-all"
                        >
                          {userWorkSubmission.deliverableUrl}
                        </a>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
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
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                            Revision Notes
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {userWorkSubmission.reviewNotes}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ── Apply form ── */}
              {canApply && (
                <div className="rounded-2xl border p-5 space-y-4 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">
                        Apply for this Bounty
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Tell the issuer why you're the best fit.
                      </p>
                    </div>
                  </div>

                  <Field label="Application Message" required>
                    <Textarea
                      id="application-message"
                      placeholder="Describe your relevant experience and approach to this bounty…"
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </Field>

                  <div className="flex gap-2.5">
                    <Button
                      className="flex-1 rounded-xl h-10 font-semibold"
                      onClick={handleApply}
                      disabled={!applicationMessage.trim() || isApplying}
                    >
                      {isApplying ? "Applying…" : "Submit Application"}
                      {!isApplying && <CheckCircle2 className="ml-2 h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-10 w-10 shrink-0"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Application status ── */}
              {hasApplied && (
                <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      <span className="font-semibold text-sky-800 dark:text-sky-200">
                        Your Application
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        applicationStatusStyle[
                          userApplication?.status ?? "pending"
                        ]
                      }`}
                    >
                      {userApplication?.status || "pending"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Your Message
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {userApplication?.message}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Applied{" "}
                    {userApplication?.appliedAt
                      ? format(
                          new Date(userApplication.appliedAt),
                          "PPP 'at' p",
                        )
                      : "Unknown"}
                  </p>

                  {userApplication?.status === "pending" && (
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Your application is being reviewed by the bounty creator.
                    </p>
                  )}
                  {userApplication?.status === "accepted" && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      🎉 Congratulations! Your application has been accepted.
                    </p>
                  )}
                  {userApplication?.status === "rejected" && (
                    <p className="text-sm text-rose-700 dark:text-rose-300">
                      Your application was not selected for this bounty.
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
                    <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-4">
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
