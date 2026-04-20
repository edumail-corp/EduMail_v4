import {
  getInitialStaffEmails,
  getEmailApprovalState,
  type CaseApprovalState,
  type CaseOrigin,
  type Department,
  type EmailThreadEntry,
  type MailboxIntegration,
  type RoutingDecision,
  type StaffEmail,
  type StaffAssignee,
} from "@/lib/email-data";
import {
  readJsonFileIfExists,
  readJsonFileWithFallback,
  writeJsonFileAtomically,
} from "@/lib/server/json-file-store";
import {
  buildFallbackRoutingDecision,
  createFallbackThreadHistory,
  synchronizeOperationalFields,
} from "@/lib/server/local-mailbox-operations";
import { getWritableDataPath } from "@/lib/server/storage-path";

const mailboxRecordsPath = getWritableDataPath("mailbox-cases.json");
const legacyMailboxPath = getWritableDataPath("staff-emails.json");
const seedEmailMap = new Map(
  getInitialStaffEmails().map((email) => [email.id, email])
);

export type MailboxCaseMessageRecord = {
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
  threadHistory: EmailThreadEntry[];
  sourceCitations: StaffEmail["sourceCitations"];
};

export type MailboxCaseWorkflowRecord = {
  category: StaffEmail["category"];
  department: Department;
  caseOrigin: CaseOrigin;
  routingDecision: RoutingDecision;
  approvalState: CaseApprovalState;
  priority: StaffEmail["priority"];
  status: StaffEmail["status"];
  assignee: StaffAssignee | null;
  lastUpdatedAt: string;
};

export type MailboxCaseResponseRecord = {
  confidence: number;
  aiDraft: string | null;
  staffNote: string | null;
  source: string | null;
  summary: string;
  manualReviewReason: string | null;
};

export type MailboxCaseRecord = {
  id: string;
  message: MailboxCaseMessageRecord;
  workflow: MailboxCaseWorkflowRecord;
  response: MailboxCaseResponseRecord;
  integration: MailboxIntegration | null;
};

export type MailboxRecordReadOptions = {
  bootstrapFromLegacy?: boolean;
  fallback?: "seeded" | "empty";
};

type LegacyMailboxCaseRecord = Partial<MailboxCaseRecord> & Partial<StaffEmail>;

function flattenLegacyMailboxRecord(
  record: LegacyMailboxCaseRecord
): Partial<StaffEmail> {
  if (!record.message && !record.workflow && !record.response) {
    return record;
  }

  return {
    id: record.id,
    sender: record.message?.sender,
    subject: record.message?.subject,
    body: record.message?.body,
    category: record.workflow?.category,
    department: record.workflow?.department,
    caseOrigin: record.workflow?.caseOrigin,
    routingDecision: record.workflow?.routingDecision,
    approvalState: record.workflow?.approvalState,
    confidence: record.response?.confidence,
    priority: record.workflow?.priority,
    status: record.workflow?.status,
    assignee: record.workflow?.assignee,
    aiDraft: record.response?.aiDraft,
    staffNote: record.response?.staffNote,
    source: record.response?.source,
    summary: record.response?.summary,
    manualReviewReason: record.response?.manualReviewReason,
    receivedAt: record.message?.receivedAt,
    lastUpdatedAt: record.workflow?.lastUpdatedAt,
    threadHistory: record.message?.threadHistory,
    sourceCitations: record.message?.sourceCitations,
    integration: record.integration,
  };
}

function normalizeMailboxEmail(email: Partial<StaffEmail>) {
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
      integration: email.integration ?? null,
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
    integration: email.integration ?? baseEmail.integration ?? null,
  } satisfies StaffEmail;

  return synchronizeOperationalFields(normalizedEmail);
}

export function toStaffEmail(record: MailboxCaseRecord): StaffEmail {
  return synchronizeOperationalFields({
    id: record.id,
    sender: record.message.sender,
    subject: record.message.subject,
    body: record.message.body,
    category: record.workflow.category,
    department: record.workflow.department,
    caseOrigin: record.workflow.caseOrigin,
    routingDecision: record.workflow.routingDecision,
    approvalState: record.workflow.approvalState,
    confidence: record.response.confidence,
    priority: record.workflow.priority,
    status: record.workflow.status,
    assignee: record.workflow.assignee,
    aiDraft: record.response.aiDraft,
    staffNote: record.response.staffNote,
    source: record.response.source,
    summary: record.response.summary,
    manualReviewReason: record.response.manualReviewReason,
    receivedAt: record.message.receivedAt,
    lastUpdatedAt: record.workflow.lastUpdatedAt,
    threadHistory: record.message.threadHistory.map((entry) => ({ ...entry })),
    sourceCitations: record.message.sourceCitations.map((citation) => ({
      ...citation,
    })),
    integration: record.integration,
  });
}

export function fromStaffEmail(email: StaffEmail): MailboxCaseRecord {
  const normalizedEmail = synchronizeOperationalFields(email);

  return {
    id: normalizedEmail.id,
    message: {
      sender: normalizedEmail.sender,
      subject: normalizedEmail.subject,
      body: normalizedEmail.body,
      receivedAt: normalizedEmail.receivedAt,
      threadHistory: normalizedEmail.threadHistory.map((entry) => ({ ...entry })),
      sourceCitations: normalizedEmail.sourceCitations.map((citation) => ({
        ...citation,
      })),
    },
    workflow: {
      category: normalizedEmail.category,
      department: normalizedEmail.department ?? normalizedEmail.category,
      caseOrigin: normalizedEmail.caseOrigin ?? "Email intake",
      routingDecision:
        normalizedEmail.routingDecision ??
        buildFallbackRoutingDecision(normalizedEmail),
      approvalState:
        normalizedEmail.approvalState ?? getEmailApprovalState(normalizedEmail),
      priority: normalizedEmail.priority,
      status: normalizedEmail.status,
      assignee: normalizedEmail.assignee,
      lastUpdatedAt: normalizedEmail.lastUpdatedAt,
    },
    response: {
      confidence: normalizedEmail.confidence,
      aiDraft: normalizedEmail.aiDraft,
      staffNote: normalizedEmail.staffNote,
      source: normalizedEmail.source,
      summary: normalizedEmail.summary,
      manualReviewReason: normalizedEmail.manualReviewReason,
    },
    integration: normalizedEmail.integration ?? null,
  };
}

async function readLegacyMailboxEmails() {
  const emails = await readJsonFileWithFallback<Partial<StaffEmail>[]>(
    legacyMailboxPath,
    {
      fallback: getInitialStaffEmails,
    }
  );

  return emails.map((email) => fromStaffEmail(normalizeMailboxEmail(email)));
}

function buildFallbackMailboxRecords(
  fallback: MailboxRecordReadOptions["fallback"] = "seeded"
) {
  if (fallback === "empty") {
    return [] as MailboxCaseRecord[];
  }

  return getInitialStaffEmails().map((email) => fromStaffEmail(email));
}

export async function listMailboxCaseRecords(
  options?: MailboxRecordReadOptions
) {
  const storedRecords = await readJsonFileIfExists<LegacyMailboxCaseRecord[]>(
    mailboxRecordsPath
  );

  if (storedRecords) {
    return storedRecords.map((record) =>
      fromStaffEmail(normalizeMailboxEmail(flattenLegacyMailboxRecord(record)))
    );
  }

  if (options?.bootstrapFromLegacy ?? true) {
    return readLegacyMailboxEmails();
  }

  return buildFallbackMailboxRecords(options?.fallback);
}

export async function writeMailboxCaseRecords(records: MailboxCaseRecord[]) {
  await writeJsonFileAtomically(mailboxRecordsPath, records);
}
