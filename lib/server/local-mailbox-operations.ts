import {
  getDepartmentSuggestedAssignees,
  getEmailApprovalState,
  getEmailDepartment,
  getEmailReplyEntry,
  type CaseApprovalState,
  type EmailThreadEntry,
  type RoutingDecision,
  type RoutingReason,
  type StaffEmail,
} from "@/lib/email-data";
import { getLocalizedRoutingDecisionReason } from "@/lib/local-routing";

export function buildFallbackRoutingReasons(
  email: Partial<StaffEmail>
): RoutingReason[] {
  if (email.manualReviewReason) {
    return [
      { code: "fallback_mapping" },
      { code: "low_confidence_manual_review" },
    ];
  }

  return [{ code: "fallback_mapping" }];
}

export function buildFallbackRoutingDecision(
  email: Partial<StaffEmail>
): RoutingDecision {
  const department = getEmailDepartment({
    department: email.department,
    category: email.category ?? "Admissions",
  });
  const escalationReason = email.manualReviewReason ?? null;
  const routingReasons = buildFallbackRoutingReasons(email);
  const nextDecision: RoutingDecision = {
    department,
    confidence: escalationReason ? "Low" : "Medium",
    confidenceScore: email.confidence ?? (escalationReason ? 58 : 74),
    reason: "",
    routingReasons,
    signals: escalationReason
      ? ["manual review required"]
      : [department.toLowerCase(), "workflow summary"],
    escalationReason,
    suggestedAssignees: getDepartmentSuggestedAssignees(department),
  };

  return {
    ...nextDecision,
    reason: getLocalizedRoutingDecisionReason(nextDecision),
  };
}

export function synchronizeOperationalFields(email: StaffEmail): StaffEmail {
  const department = getEmailDepartment(email);
  const routingDecision = email.routingDecision
    ? {
        ...email.routingDecision,
        department,
        escalationReason:
          email.routingDecision.escalationReason ?? email.manualReviewReason ?? null,
        routingReasons:
          email.routingDecision.routingReasons?.length
            ? email.routingDecision.routingReasons
            : buildFallbackRoutingReasons(email),
        reason:
          email.routingDecision.reason ||
          getLocalizedRoutingDecisionReason({
            ...email.routingDecision,
            department,
            escalationReason:
              email.routingDecision.escalationReason ??
              email.manualReviewReason ??
              null,
            routingReasons:
              email.routingDecision.routingReasons?.length
                ? email.routingDecision.routingReasons
                : buildFallbackRoutingReasons(email),
          }),
        suggestedAssignees:
          email.routingDecision.suggestedAssignees?.length
            ? email.routingDecision.suggestedAssignees
            : getDepartmentSuggestedAssignees(department),
      }
    : buildFallbackRoutingDecision({
        ...email,
        department,
      });
  const approvalState: CaseApprovalState = getEmailApprovalState(email);

  return {
    ...email,
    category: department,
    department,
    caseOrigin: email.caseOrigin ?? "Email intake",
    routingDecision,
    approvalState,
  };
}

export function createFallbackThreadHistory(
  email: Partial<StaffEmail>
): EmailThreadEntry[] {
  return [
    {
      id: `${email.id ?? "EMAIL"}-THREAD-INBOUND`,
      kind: "Inbound",
      label: "Inbound message",
      author: email.sender ?? "Unknown sender",
      sentAt: email.receivedAt ?? new Date().toISOString(),
      body: email.body ?? "",
    },
  ];
}

export function synchronizeDraftThreadEntry(
  nextEmail: StaffEmail,
  nextTimestamp: string,
  previousEmail?: StaffEmail
): EmailThreadEntry[] {
  const withoutDraftEntry = nextEmail.threadHistory.filter(
    (entry) => entry.id !== "CURRENT-DRAFT"
  );
  const previousDraftEntry = previousEmail
    ? getEmailReplyEntry(previousEmail)
    : null;
  const draftWasUpdated = previousEmail
    ? nextEmail.aiDraft !== previousEmail.aiDraft
    : true;
  const replyWasApproved =
    previousEmail !== undefined &&
    previousEmail.status !== "Auto-sent" &&
    nextEmail.status === "Auto-sent";

  if (!nextEmail.aiDraft) {
    return withoutDraftEntry;
  }

  const entryTimestamp =
    draftWasUpdated || replyWasApproved
      ? nextTimestamp
      : previousDraftEntry?.sentAt ?? nextTimestamp;
  const entryAuthor =
    replyWasApproved || draftWasUpdated
      ? nextEmail.assignee ?? "Staff Workspace"
      : previousDraftEntry?.author ?? nextEmail.assignee ?? "Staff Workspace";

  return [
    ...withoutDraftEntry,
    {
      id: "CURRENT-DRAFT",
      kind: "Outbound",
      label:
        nextEmail.status === "Auto-sent" ? "Approved reply" : "Current draft",
      author: entryAuthor,
      sentAt: entryTimestamp,
      body: nextEmail.aiDraft,
    } satisfies EmailThreadEntry,
  ];
}

export function createNextEmailId(emails: StaffEmail[]) {
  const nextNumericId =
    emails.reduce((max, email) => {
      const match = /^EM-(\d+)$/.exec(email.id);
      const numericId = match ? Number(match[1]) : 0;
      return numericId > max ? numericId : max;
    }, 1000) + 1;

  return `EM-${String(nextNumericId).padStart(4, "0")}`;
}

export function getEmailActivityDescription(
  previousEmail: StaffEmail,
  nextEmail: StaffEmail
) {
  if (nextEmail.status === "Auto-sent" && previousEmail.status !== "Auto-sent") {
    return {
      action: "email_approved" as const,
      description: `Approved the reply for ${nextEmail.sender} and moved the message into Auto-sent.`,
      href: `/dashboard/inbox?emailId=${encodeURIComponent(nextEmail.id)}`,
    };
  }

  if (nextEmail.assignee !== previousEmail.assignee) {
    return {
      action: "assignment_updated" as const,
      description: nextEmail.assignee
        ? `Assigned this message to ${nextEmail.assignee}.`
        : "Cleared the current message owner and returned it to the unassigned pool.",
      href:
        nextEmail.status === "Escalated"
          ? `/dashboard/inbox?view=escalations&emailId=${encodeURIComponent(nextEmail.id)}`
          : `/dashboard/inbox?emailId=${encodeURIComponent(nextEmail.id)}`,
    };
  }

  if (nextEmail.aiDraft !== previousEmail.aiDraft) {
    if (previousEmail.status === "Escalated" && nextEmail.status === "Draft") {
      return {
        action: "draft_saved" as const,
        description:
          "Saved a new reply draft and converted the escalated case into the Draft queue.",
        href: `/dashboard/inbox?emailId=${encodeURIComponent(nextEmail.id)}`,
      };
    }

    return {
      action: "draft_saved" as const,
      description: "Updated the reply draft for continued review.",
      href: `/dashboard/inbox?emailId=${encodeURIComponent(nextEmail.id)}`,
    };
  }

  if (nextEmail.staffNote !== previousEmail.staffNote) {
    return {
      action: "note_saved" as const,
      description:
        nextEmail.staffNote && nextEmail.staffNote.length > 0
          ? "Saved an internal staff note for follow-up and context sharing."
          : "Cleared the internal staff note from this message.",
      href:
        nextEmail.status === "Escalated"
          ? `/dashboard/inbox?view=escalations&emailId=${encodeURIComponent(nextEmail.id)}`
          : `/dashboard/inbox?emailId=${encodeURIComponent(nextEmail.id)}`,
    };
  }

  return null;
}
