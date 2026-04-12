import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  filterEmails,
  filterEmailsByAssignment,
  filterEmailsByDepartment,
  getDepartmentSuggestedAssignees,
  getInitialStaffEmails,
  getEmailApprovalState,
  getEmailDepartment,
  type CaseApprovalState,
  type DepartmentFilter,
  type EmailFilter,
  type EmailThreadEntry,
  type RoutingDecision,
  type StaffAssignmentFilter,
  type StaffEmail,
  type StaffEmailUpdateInput,
} from "@/lib/email-data";
import { appendActivityEvent } from "@/lib/server/activity-log-store";

const emailStorePath = path.join(process.cwd(), "data", "staff-emails.json");
const seedEmailMap = new Map(
  getInitialStaffEmails().map((email) => [email.id, email])
);

function buildFallbackRoutingDecision(
  email: Partial<StaffEmail>
): RoutingDecision {
  const department = getEmailDepartment({
    department: email.department,
    category: email.category ?? "Admissions",
  });
  const escalationReason = email.manualReviewReason ?? null;

  return {
    department,
    confidence: escalationReason ? "Low" : "Medium",
    confidenceScore: email.confidence ?? (escalationReason ? 58 : 74),
    reason: escalationReason
      ? `Manual review is required before this case can be confidently routed into ${department}.`
      : `This case currently maps into the ${department} workflow based on the available intake and summary information.`,
    signals: escalationReason
      ? ["manual review required"]
      : [department.toLowerCase(), "workflow summary"],
    escalationReason,
    suggestedAssignees: getDepartmentSuggestedAssignees(department),
  };
}

function synchronizeOperationalFields(email: StaffEmail): StaffEmail {
  const department = getEmailDepartment(email);
  const routingDecision = email.routingDecision
    ? {
        ...email.routingDecision,
        department,
        escalationReason:
          email.routingDecision.escalationReason ?? email.manualReviewReason ?? null,
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

function createFallbackThreadHistory(email: Partial<StaffEmail>): EmailThreadEntry[] {
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

function normalizeStoredEmail(email: Partial<StaffEmail>) {
  const seedEmail = email.id ? seedEmailMap.get(email.id) : undefined;
  const baseEmail =
    seedEmail ??
    ({
      id: email.id ?? "EMAIL-UNKNOWN",
      sender: email.sender ?? "Unknown sender",
      subject: email.subject ?? "Untitled message",
      body: email.body ?? "",
      category: email.category ?? "Admissions",
      department: email.department ?? email.category ?? "Admissions",
      caseOrigin: email.caseOrigin ?? "Email intake",
      routingDecision: email.routingDecision ?? buildFallbackRoutingDecision(email),
      approvalState: email.approvalState ?? getEmailApprovalState({
        approvalState: email.approvalState,
        status: email.status ?? "Draft",
        aiDraft: email.aiDraft ?? null,
      }),
      confidence: email.confidence ?? 0,
      priority: email.priority ?? "Medium",
      status: email.status ?? "Draft",
      assignee: email.assignee ?? null,
      aiDraft: email.aiDraft ?? null,
      staffNote: email.staffNote ?? null,
      source: email.source ?? null,
      summary: email.summary ?? "No case summary has been prepared yet.",
      manualReviewReason: email.manualReviewReason ?? null,
      receivedAt: email.receivedAt ?? new Date().toISOString(),
      lastUpdatedAt: email.lastUpdatedAt ?? email.receivedAt ?? new Date().toISOString(),
      threadHistory: createFallbackThreadHistory(email),
      sourceCitations: [],
    } satisfies StaffEmail);

  const normalizedEmail = {
    ...baseEmail,
    ...email,
    priority: email.priority ?? baseEmail.priority,
    summary: email.summary ?? baseEmail.summary,
    manualReviewReason: email.manualReviewReason ?? baseEmail.manualReviewReason,
    lastUpdatedAt:
      email.lastUpdatedAt ?? baseEmail.lastUpdatedAt ?? baseEmail.receivedAt,
    threadHistory:
      email.threadHistory?.map((entry) => ({ ...entry })) ??
      baseEmail.threadHistory.map((entry) => ({ ...entry })),
    sourceCitations:
      email.sourceCitations?.map((citation) => ({ ...citation })) ??
      baseEmail.sourceCitations.map((citation) => ({ ...citation })),
  } satisfies StaffEmail;

  return synchronizeOperationalFields(normalizedEmail);
}

function synchronizeDraftThreadEntry(
  email: StaffEmail,
  nextTimestamp: string
): EmailThreadEntry[] {
  const withoutDraftEntry = email.threadHistory.filter(
    (entry) => entry.id !== "CURRENT-DRAFT"
  );

  if (!email.aiDraft) {
    return withoutDraftEntry;
  }

  return [
    ...withoutDraftEntry,
    {
      id: "CURRENT-DRAFT",
      kind: "Outbound",
      label:
        email.status === "Auto-sent" ? "Approved reply" : "Current draft",
      author: email.assignee ?? "Staff Workspace",
      sentAt: nextTimestamp,
      body: email.aiDraft,
    } satisfies EmailThreadEntry,
  ];
}

function createNextEmailId(emails: StaffEmail[]) {
  const nextNumericId =
    emails.reduce((max, email) => {
      const match = /^EM-(\d+)$/.exec(email.id);
      const numericId = match ? Number(match[1]) : 0;
      return numericId > max ? numericId : max;
    }, 1000) + 1;

  return `EM-${String(nextNumericId).padStart(4, "0")}`;
}

function getEmailActivityDescription(previousEmail: StaffEmail, nextEmail: StaffEmail) {
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

async function writeStaffEmails(emails: StaffEmail[]) {
  await writeFile(emailStorePath, `${JSON.stringify(emails, null, 2)}\n`, "utf8");
}

async function ensureEmailStore() {
  await mkdir(path.dirname(emailStorePath), { recursive: true });

  try {
    await readFile(emailStorePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    await writeStaffEmails(getInitialStaffEmails());
  }
}

async function readStaffEmails() {
  await ensureEmailStore();
  const fileContents = await readFile(emailStorePath, "utf8");
  const emails = JSON.parse(fileContents) as Partial<StaffEmail>[];
  return emails.map(normalizeStoredEmail);
}

export async function listStaffEmails(
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  const emails = await readStaffEmails();
  return filterEmailsByDepartment(
    filterEmailsByAssignment(filterEmails(emails, filter), assignmentFilter),
    departmentFilter
  );
}

export async function updateStaffEmail(
  id: string,
  updates: StaffEmailUpdateInput
) {
  const emails = await readStaffEmails();
  const emailIndex = emails.findIndex((email) => email.id === id);

  if (emailIndex === -1) {
    return null;
  }

  const previousEmail = emails[emailIndex];
  const nextTimestamp = new Date().toISOString();
  const nextEmailBeforeThreadSync: StaffEmail = {
    ...previousEmail,
    ...updates,
    lastUpdatedAt: nextTimestamp,
  };
  const nextEmail: StaffEmail = {
    ...nextEmailBeforeThreadSync,
    threadHistory: synchronizeDraftThreadEntry(
      nextEmailBeforeThreadSync,
      nextTimestamp
    ),
  };
  const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);

  const nextEmails = [...emails];
  nextEmails[emailIndex] = synchronizedNextEmail;

  await writeStaffEmails(nextEmails);

  const activity = getEmailActivityDescription(previousEmail, synchronizedNextEmail);

  if (activity) {
    await appendActivityEvent({
      action: activity.action,
      entityType: "email",
      entityId: synchronizedNextEmail.id,
      title: synchronizedNextEmail.subject,
      description: activity.description,
      href: activity.href,
    });
  }

  return synchronizedNextEmail;
}

export async function createStaffEmail(
  input: Omit<StaffEmail, "id" | "receivedAt" | "lastUpdatedAt">
) {
  const emails = await readStaffEmails();
  const timestamp = new Date().toISOString();
  const nextEmailBeforeThreadSync: StaffEmail = {
    ...input,
    id: createNextEmailId(emails),
    receivedAt: timestamp,
    lastUpdatedAt: timestamp,
  };
  const nextEmail: StaffEmail = {
    ...nextEmailBeforeThreadSync,
    threadHistory: synchronizeDraftThreadEntry(
      nextEmailBeforeThreadSync,
      timestamp
    ),
  };
  const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);
  const routingDecision =
    synchronizedNextEmail.routingDecision ??
    buildFallbackRoutingDecision(synchronizedNextEmail);

  await writeStaffEmails([synchronizedNextEmail, ...emails]);

  await appendActivityEvent({
    action: "case_created",
    entityType: "email",
    entityId: synchronizedNextEmail.id,
    title: synchronizedNextEmail.subject,
    description:
      synchronizedNextEmail.status === "Escalated"
        ? `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and routed it into the Escalations queue.`
        : `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and added it to the review queue.`,
    href:
      synchronizedNextEmail.status === "Escalated"
        ? `/dashboard/inbox?view=escalations&emailId=${encodeURIComponent(synchronizedNextEmail.id)}`
        : `/dashboard/inbox?emailId=${encodeURIComponent(synchronizedNextEmail.id)}`,
  });

  return synchronizedNextEmail;
}
