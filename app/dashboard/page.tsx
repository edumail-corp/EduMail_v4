import Link from "next/link";
import { EmailStatusBadge } from "@/components/dashboard/email-badges";
import {
  DashboardAvatar,
  DashboardIcon,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  approvalStateClasses,
  dashboardCurrentUser,
  formatEmailDate,
  groundingStrengthClasses,
  workloadPressureClasses,
} from "@/lib/dashboard";
import {
  assessEmailGrounding,
  getEmailApprovalState,
  getEmailAssignmentRecommendation,
  getEmailDepartment,
  getEmailWorkflowHref,
  summarizeMailboxOperations,
  type StaffEmail,
} from "@/lib/email-data";
import { listWorkspaceActivity } from "@/lib/server/services/activity-service";
import { listMailboxEmails } from "@/lib/server/services/mailbox-service";
import { listKnowledgeLibraryDocuments } from "@/lib/server/services/knowledge-base-service";

const dashboardWeeklyFallbackAnchorIso = "2026-01-07T00:00:00.000Z";

function formatAverageMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0.0m";
  }

  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  return `${(minutes / 60).toFixed(1)}h`;
}

function getLastSevenSnapshots(anchorIso: string) {
  const anchor = new Date(anchorIso);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (6 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });
}

function getCaseActionLabel(email: StaffEmail) {
  if (email.status === "Escalated") {
    return "Review Escalation";
  }

  if (email.status === "Draft") {
    return "Open Draft";
  }

  return "View Sent Reply";
}

function buildOperationalSignals(input: {
  unassignedCount: number;
  escalatedMessages: number;
  referencedDocuments: number;
  totalDocuments: number;
  ownerCoverageRate: number;
  approvalReadyCount: number;
  weakGroundingCount: number;
  reviewBlockedCount: number;
}) {
  const signals = [];

  if (input.unassignedCount > 0) {
    signals.push({
      label: "Coverage gap",
      tone: "text-[#D43D63]",
      body: `${input.unassignedCount} cases are still unassigned. Inbox coverage is at ${input.ownerCoverageRate}%.`,
      href: "/dashboard/inbox?assignee=Unassigned",
    });
  } else {
    signals.push({
      label: "Ownership",
      tone: "text-[#19754C]",
      body: "Every active case currently has an owner assigned in the local queue.",
      href: "/dashboard/inbox",
    });
  }

  if (input.weakGroundingCount > 0) {
    signals.push({
      label: "Grounding risk",
      tone: "text-[#D43D63]",
      body: `${input.weakGroundingCount} cases are weakly supported or missing enough cited evidence for approval.`,
      href: "/dashboard/drafts",
    });
  } else if (input.approvalReadyCount > 0) {
    signals.push({
      label: "Approval posture",
      tone: "text-[#19754C]",
      body: `${input.approvalReadyCount} cases look strong enough to move into final human approval.`,
      href: "/dashboard/drafts",
    });
  } else {
    signals.push({
      label: "Approval posture",
      tone: "text-[#4F57E8]",
      body: `${input.reviewBlockedCount} cases still need stronger support, routing confidence, or draft work before approval.`,
      href: "/dashboard/drafts",
    });
  }

  if (input.escalatedMessages > 0) {
    signals.push({
      label: "Escalation pressure",
      tone: "text-[#D43D63]",
      body: `${input.escalatedMessages} cases need manual review before a reply can move forward.`,
      href: "/dashboard/escalations",
    });
  } else {
    signals.push({
      label: "Escalation pressure",
      tone: "text-[#19754C]",
      body: "No cases are currently sitting in the Escalations queue.",
      href: "/dashboard/escalations",
    });
  }

  signals.push({
    label: "Knowledge posture",
    tone: "text-[#4F57E8]",
    body:
      input.totalDocuments === 0
        ? "No local documents are linked yet, so replies are running without a grounded library."
        : `${input.referencedDocuments}/${input.totalDocuments} documents are already linked to live mailbox cases.`,
    href: "/dashboard/knowledge-base",
  });

  return signals;
}

export default async function DashboardRootPage() {
  const [emails, documents, activityEvents] = await Promise.all([
    listMailboxEmails(),
    listKnowledgeLibraryDocuments(),
    listWorkspaceActivity(40),
  ]);

  const totalMessages = emails.length;
  const draftCount = emails.filter((email) => email.status === "Draft").length;
  const escalatedMessages = emails.filter(
    (email) => email.status === "Escalated"
  ).length;
  const approvedMessages = emails.filter(
    (email) => email.status === "Auto-sent"
  ).length;
  const operationsSnapshot = summarizeMailboxOperations(emails);
  const unassignedCount = operationsSnapshot.unassignedCount;
  const emailsWithGrounding = emails.map((email) => ({
    email,
    grounding: assessEmailGrounding(email),
  }));
  const approvalReadyCount = operationsSnapshot.approvalReadyCount;
  const weakGroundingCount = operationsSnapshot.weakSupportCount;
  const strongGroundingCount = operationsSnapshot.strongSupportCount;
  const moderateGroundingCount = Math.max(
    0,
    operationsSnapshot.activeCount -
      strongGroundingCount -
      weakGroundingCount
  );
  const reviewBlockedCount = Math.max(
    0,
    operationsSnapshot.activeCount - approvalReadyCount
  );
  const openCases = draftCount + escalatedMessages;
  const ownerCoverageRate =
    operationsSnapshot.activeCount === 0
      ? 0
      : Math.round(
          ((operationsSnapshot.activeCount - operationsSnapshot.unassignedCount) /
            operationsSnapshot.activeCount) *
            100
        );

  const referencedDocuments = documents.filter(
    (document) => document.referenceCount > 0
  ).length;
  const metadataOnlyCount = documents.filter(
    (document) => !document.downloadUrl
  ).length;
  const uploadedDocumentCount = documents.length - metadataOnlyCount;
  const knowledgeHealth =
    documents.length === 0
      ? 0
      : Math.round((referencedDocuments / documents.length) * 100);

  const averageResponseMinutes =
    approvedMessages === 0
      ? 0
      : emails
          .filter((email) => email.status === "Auto-sent")
          .reduce((total, email) => {
            const received = new Date(email.receivedAt).getTime();
            const updated = new Date(email.lastUpdatedAt).getTime();
            return total + Math.max(0, updated - received) / 60000;
          }, 0) / approvedMessages;

  const latestTimestamps = [
    ...emails.map((email) => new Date(email.lastUpdatedAt).getTime()),
    ...activityEvents.map((event) => new Date(event.timestamp).getTime()),
  ];
  const latestTimestamp =
    latestTimestamps.length > 0
      ? latestTimestamps.reduce((max, value) => (value > max ? value : max))
      : new Date(dashboardWeeklyFallbackAnchorIso).getTime();

  const weeklySnapshots = getLastSevenSnapshots(
    new Date(latestTimestamp).toISOString()
  );
  const weeklySeries = weeklySnapshots.map((snapshot) => {
    const mailCount = emails.filter(
      (email) => email.receivedAt.slice(0, 10) === snapshot.key
    ).length;
    const activityCount = activityEvents.filter(
      (event) => event.timestamp.slice(0, 10) === snapshot.key
    ).length;

    return {
      ...snapshot,
      mailCount,
      activityCount,
    };
  });
  const maxWeeklyValue = weeklySeries.reduce((max, entry) => {
    const currentMax = Math.max(entry.mailCount, entry.activityCount);
    return currentMax > max ? currentMax : max;
  }, 1);

  const busiestOwner: [string, number] = operationsSnapshot.mostLoadedOwner
    ? [operationsSnapshot.mostLoadedOwner.owner, operationsSnapshot.mostLoadedOwner.activeCount]
    : ["Unassigned", 0];
  const mostPressuredDepartment = operationsSnapshot.mostPressuredDepartment;

  const recentCases = [...emailsWithGrounding]
    .sort(
      (left, right) =>
        new Date(right.email.lastUpdatedAt).getTime() -
        new Date(left.email.lastUpdatedAt).getTime()
    )
    .slice(0, 5);

  const departmentReadiness = operationsSnapshot.departmentSummaries
    .filter((summary) => summary.activeCount > 0)
    .map((summary) => [
      summary.department,
      {
        total: summary.activeCount,
        approvalReady: summary.approvalReadyCount,
        weak: summary.weakSupportCount,
        strong: summary.strongSupportCount,
      },
    ] as const);

  const latestActivity = activityEvents[0];
  const operationalSignals = buildOperationalSignals({
    unassignedCount,
    escalatedMessages,
    referencedDocuments,
    totalDocuments: documents.length,
    ownerCoverageRate,
    approvalReadyCount,
    weakGroundingCount,
    reviewBlockedCount,
  });

  const metricCards = [
    {
      label: "Unassigned",
      value: `${unassignedCount}`,
      accent:
        totalMessages === 0
          ? "No live queue"
          : unassignedCount === 0
            ? "Fully covered"
            : `${ownerCoverageRate}% owned`,
      icon: "mail" as const,
      href: "/dashboard/inbox?assignee=Unassigned",
    },
    {
      label: "Open Cases",
      value: `${openCases}`,
      accent:
        openCases === 0
          ? "Queue clear"
          : `${draftCount} drafts • ${escalatedMessages} escalations`,
      icon: "document" as const,
      href: "/dashboard/drafts",
    },
    {
      label: "KB Health",
      value: `${knowledgeHealth}%`,
      accent:
        documents.length === 0
          ? "No docs yet"
          : `${referencedDocuments}/${documents.length} linked`,
      icon: "shield" as const,
      href: "/dashboard/knowledge-base",
    },
    {
      label: "Avg. Response",
      value: formatAverageMinutes(averageResponseMinutes),
      accent: approvedMessages > 0 ? `${approvedMessages} approved` : "Awaiting sent data",
      icon: "clock" as const,
      href: "/dashboard/activity",
    },
  ];

  return (
    <>
      <DashboardTopBar label="Operations Dashboard" />

      <DashboardPageHeader
        eyebrow="Dashboard Overview"
        title="Dashboard Overview"
        description={`Welcome back, ${dashboardCurrentUser.name}. Here is the clearest local-first picture of queue pressure, ownership, and knowledge readiness right now.`}
        meta="Provider-agnostic workspace snapshot"
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/compose"
              className={dashboardSecondaryButtonClassName}
            >
              Compose New
            </Link>
            <Link
              href="/dashboard/activity"
              className={dashboardGhostButtonClassName}
            >
              Open Activity Log
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${dashboardPanelClassName} p-5 transition hover:-translate-y-0.5 hover:bg-white/88`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#EEF0FF] text-[#5C61FF]">
                <DashboardIcon name={card.icon} className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#5C61FF] shadow-[0_12px_24px_rgba(142,155,182,0.14)]">
                {card.accent}
              </span>
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-tight text-[#1E2340]">
              {card.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className={`${dashboardPanelClassName} p-6 md:p-7`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                Queue Snapshot
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                Queue Snapshot
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Recent cases are grouped here with clearer next actions so the team can move from overview into review without hunting for context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/inbox" className={dashboardGhostButtonClassName}>
                Full Inbox
              </Link>
              <Link href="/dashboard/drafts" className={dashboardGhostButtonClassName}>
                Draft Queue
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/80 bg-white/64 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Draft-ready
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {draftCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Cases with a reply draft available for review.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/64 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Approval-ready
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {approvalReadyCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Cases that now have enough visible support for final human approval.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/64 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Weak support
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {weakGroundingCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Cases that should stay in human review until stronger support is attached.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/64 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Escalated
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {escalatedMessages}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Cases needing manual intervention before a response moves.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {recentCases.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/80 bg-white/54 px-6 py-10 text-center text-sm text-slate-500">
                No local cases yet. Create a new case to start building the queue snapshot.
              </div>
            ) : (
              recentCases.map(({ email, grounding }) => {
                const assignmentRecommendation = getEmailAssignmentRecommendation(
                  email,
                  operationsSnapshot
                );
                const approvalState = getEmailApprovalState(email);

                return (
                  <div
                    key={email.id}
                    className="rounded-[26px] border border-white/80 bg-white/64 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold tracking-tight text-[#1E2340]">
                            {email.subject}
                          </p>
                          <EmailStatusBadge status={email.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{email.sender}</p>
                        <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
                          {email.summary}
                        </p>
                      </div>

                      <Link
                        href={getEmailWorkflowHref(email)}
                        className={dashboardSecondaryButtonClassName}
                      >
                        {getCaseActionLabel(email)}
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                      <span className="rounded-full bg-white/86 px-3 py-1.5">
                        {getEmailDepartment(email)}
                      </span>
                      <span className="rounded-full bg-white/86 px-3 py-1.5">
                        {email.assignee ?? "Unassigned"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 ${approvalStateClasses[approvalState]}`}
                      >
                        {approvalState}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 ${groundingStrengthClasses[grounding.strength]}`}
                      >
                        {grounding.strength} support
                      </span>
                      {email.routingDecision ? (
                        <span className="rounded-full bg-white/86 px-3 py-1.5">
                          {email.routingDecision.confidence} routing •{" "}
                          {email.routingDecision.confidenceScore}%
                        </span>
                      ) : null}
                      {assignmentRecommendation ? (
                        <span
                          className={`rounded-full px-3 py-1.5 ${workloadPressureClasses[assignmentRecommendation.pressure]}`}
                        >
                          Best next owner: {assignmentRecommendation.assignee}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/86 px-3 py-1.5">
                        {email.sourceCitations.length} citations
                      </span>
                      <span className="rounded-full bg-white/86 px-3 py-1.5">
                        Updated {formatEmailDate(email.lastUpdatedAt)}
                      </span>
                    </div>

                    {email.routingDecision ? (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {email.routingDecision.reason}
                      </p>
                    ) : null}

                    {assignmentRecommendation ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {assignmentRecommendation.reason}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {grounding.approvalReady
                        ? "Ready to move into final human approval."
                        : grounding.summary}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className={`${dashboardPanelClassName} p-6 md:p-7`}>
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#EEF0FF] text-[#5C61FF]">
              <DashboardIcon name="sparkles" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                Operational Signals
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1E2340]">
                Operational Signals
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {operationalSignals.map((signal) => (
              <Link
                key={signal.label}
                href={signal.href}
                className="block rounded-[24px] border border-white/80 bg-white/64 p-4 transition hover:bg-white"
              >
                <p className={`text-sm font-semibold ${signal.tone}`}>{signal.label}</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">{signal.body}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/80 bg-white/64 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Latest activity
            </p>
            {latestActivity ? (
              <>
                <p className="mt-3 text-lg font-semibold text-[#1E2340]">
                  {latestActivity.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {latestActivity.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-400">
                    {formatEmailDate(latestActivity.timestamp)}
                  </span>
                  {latestActivity.href ? (
                    <Link
                      href={latestActivity.href}
                      className={dashboardGhostButtonClassName}
                    >
                      Open Related
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-7 text-slate-500">
                No activity has been tracked yet.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <article className={`${dashboardPanelClassName} p-6 md:p-7`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                Weekly Activity
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                Weekly Activity
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Inbound mail volume versus logged workflow activity across the latest seven active days in the local prototype.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#5C61FF]" />
                Mail
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#B7BDFC]" />
                Activity
              </span>
            </div>
          </div>

          <div className="mt-8 grid h-[240px] grid-cols-7 gap-3">
            {weeklySeries.map((entry) => (
              <div key={entry.key} className="flex flex-col items-center gap-3">
                <div className="flex h-full w-full items-end justify-center gap-2 rounded-[24px] bg-white/44 px-2 py-3">
                  <div
                    className="w-1/2 rounded-t-[18px] bg-[#B7BDFC]"
                    style={{
                      height: `${Math.max(10, (entry.activityCount / maxWeeklyValue) * 100)}%`,
                    }}
                  />
                  <div
                    className="w-1/2 rounded-t-[18px] bg-[#5C61FF]"
                    style={{
                      height: `${Math.max(10, (entry.mailCount / maxWeeklyValue) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{entry.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {entry.mailCount} mail • {entry.activityCount} log
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-4">
          <article className={`${dashboardPanelClassName} p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Knowledge Readiness
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Uploaded
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {uploadedDocumentCount}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Metadata only
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {metadataOnlyCount}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Linked docs
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {referencedDocuments}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              {documents.length === 0
                ? "The knowledge base is still empty, so drafts cannot cite local source documents yet."
                : `${knowledgeHealth}% of the current library is already referenced by active mailbox cases.`}
            </p>
          </article>

          <article className={`${dashboardPanelClassName} p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Review Readiness
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Strong support
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {strongGroundingCount}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Moderate support
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {moderateGroundingCount}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Approval blocked
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1E2340]">
                  {reviewBlockedCount}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {departmentReadiness.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/80 bg-white/54 px-4 py-6 text-sm text-slate-500">
                  Review readiness will appear here once the queue has cases.
                </div>
              ) : (
                departmentReadiness.map(([department, summary]) => (
                  <div
                    key={department}
                    className="rounded-[22px] border border-white/80 bg-white/64 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#1E2340]">
                        {department}
                      </p>
                      <span className="text-xs font-medium text-slate-400">
                        {summary.approvalReady}/{summary.total} ready
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {summary.weak > 0
                        ? `${summary.weak} weakly supported case${summary.weak === 1 ? "" : "s"} need stronger evidence or routing checks.`
                        : "No weak-support cases are sitting in this department right now."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Workload & Focus
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Busiest owner
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <DashboardAvatar
                    name={busiestOwner[0]}
                    className="h-11 w-11 text-[10px]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-[#1E2340]">
                      {busiestOwner[0]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {busiestOwner[1]} active cases currently in queue
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Most pressured department
                </p>
                {mostPressuredDepartment ? (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[#1E2340]">
                        {mostPressuredDepartment.department}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${workloadPressureClasses[mostPressuredDepartment.pressure]}`}
                      >
                        {mostPressuredDepartment.pressure}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {mostPressuredDepartment.activeCount} active •{" "}
                      {mostPressuredDepartment.unassignedCount} unassigned •{" "}
                      {mostPressuredDepartment.weakSupportCount} weak support
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No live department pressure yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {operationsSnapshot.ownerSummaries.every(
                (summary) => summary.totalCount === 0
              ) ? (
                <div className="rounded-[22px] border border-dashed border-white/80 bg-white/54 px-4 py-6 text-sm text-slate-500">
                  Owner balancing will appear here once the local queue has more assigned work.
                </div>
              ) : (
                operationsSnapshot.ownerSummaries.map((summary) => (
                  <div
                    key={summary.owner}
                    className="rounded-[22px] border border-white/80 bg-white/64 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1E2340]">
                          {summary.owner}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {summary.activeCount} active • {summary.weakSupportCount} weak-support •{" "}
                          {summary.approvalReadyCount} approval-ready
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${workloadPressureClasses[summary.pressure]}`}
                      >
                        {summary.pressure}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {summary.primaryDepartment
                        ? `Primary load: ${summary.primaryDepartment}.`
                        : "No active department load yet."}{" "}
                      {summary.pressure === "Overloaded"
                        ? "Route the next case elsewhere if continuity allows."
                        : summary.pressure === "Busy"
                          ? "Balance new work carefully."
                          : "Safe candidate for new work in the current rotation."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
