import {
  filterEmails,
  filterEmailsByAssignment,
  filterEmailsByDepartment,
  getEmailWorkflowHref,
  type DepartmentFilter,
  type EmailFilter,
  type StaffAssignmentFilter,
  type StaffEmail,
} from "@/lib/email-data";
import type {
  ActivityAdapter,
  MailboxAdapter,
} from "@/lib/server/adapters/contracts";
import { loadBootstrapMailboxRecords } from "@/lib/server/adapters/postgres/postgres-bootstrap";
import {
  getPostgresCount,
  parsePostgresJson,
  runPostgresTransaction,
  serializePostgresJson,
  type PostgresDatabaseAccess,
} from "@/lib/server/adapters/postgres/postgres-database";
import {
  fromStaffEmail,
  toStaffEmail,
  type MailboxCaseRecord,
} from "@/lib/server/mailbox-record-store";
import {
  buildFallbackRoutingDecision,
  createNextEmailId,
  getEmailActivityDescription,
  synchronizeDraftThreadEntry,
  synchronizeOperationalFields,
} from "@/lib/server/local-mailbox-operations";

type PostgresMailboxRow = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
  thread_history_json: unknown;
  source_citations_json: unknown;
  category: MailboxCaseRecord["workflow"]["category"];
  department: MailboxCaseRecord["workflow"]["department"];
  case_origin: MailboxCaseRecord["workflow"]["caseOrigin"];
  routing_decision_json: unknown;
  approval_state: MailboxCaseRecord["workflow"]["approvalState"];
  priority: MailboxCaseRecord["workflow"]["priority"];
  status: MailboxCaseRecord["workflow"]["status"];
  assignee: MailboxCaseRecord["workflow"]["assignee"];
  last_updated_at: string;
  confidence: number;
  ai_draft: string | null;
  staff_note: string | null;
  source: string | null;
  summary: string;
  manual_review_reason: string | null;
};

type PostgresMailboxAdapterDependencies = {
  activityAdapter: ActivityAdapter;
  databaseAccess: PostgresDatabaseAccess;
};

function filterVisibleEmails(
  emails: StaffEmail[],
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  return filterEmailsByDepartment(
    filterEmailsByAssignment(filterEmails(emails, filter), assignmentFilter),
    departmentFilter
  );
}

function toMailboxCaseRecord(row: PostgresMailboxRow): MailboxCaseRecord {
  return {
    id: row.id,
    message: {
      sender: row.sender,
      subject: row.subject,
      body: row.body,
      receivedAt: row.received_at,
      threadHistory: parsePostgresJson(row.thread_history_json, []),
      sourceCitations: parsePostgresJson(row.source_citations_json, []),
    },
    workflow: {
      category: row.category,
      department: row.department,
      caseOrigin: row.case_origin,
      routingDecision: parsePostgresJson(
        row.routing_decision_json,
        buildFallbackRoutingDecision({
          category: row.category,
          department: row.department,
          confidence: row.confidence,
          manualReviewReason: row.manual_review_reason,
        })
      ),
      approvalState: row.approval_state,
      priority: row.priority,
      status: row.status,
      assignee: row.assignee ?? null,
      lastUpdatedAt: row.last_updated_at,
    },
    response: {
      confidence: row.confidence,
      aiDraft: row.ai_draft,
      staffNote: row.staff_note,
      source: row.source,
      summary: row.summary,
      manualReviewReason: row.manual_review_reason,
    },
  };
}

function upsertMailboxCaseRecord(
  record: MailboxCaseRecord,
  databaseAccess: PostgresDatabaseAccess
) {
  return databaseAccess.query(
    `
      INSERT INTO mailbox_cases (
        id,
        sender,
        subject,
        body,
        received_at,
        thread_history_json,
        source_citations_json,
        category,
        department,
        case_origin,
        routing_decision_json,
        approval_state,
        priority,
        status,
        assignee,
        last_updated_at,
        confidence,
        ai_draft,
        staff_note,
        source,
        summary,
        manual_review_reason
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      ON CONFLICT (id) DO UPDATE SET
        sender = EXCLUDED.sender,
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        received_at = EXCLUDED.received_at,
        thread_history_json = EXCLUDED.thread_history_json,
        source_citations_json = EXCLUDED.source_citations_json,
        category = EXCLUDED.category,
        department = EXCLUDED.department,
        case_origin = EXCLUDED.case_origin,
        routing_decision_json = EXCLUDED.routing_decision_json,
        approval_state = EXCLUDED.approval_state,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        assignee = EXCLUDED.assignee,
        last_updated_at = EXCLUDED.last_updated_at,
        confidence = EXCLUDED.confidence,
        ai_draft = EXCLUDED.ai_draft,
        staff_note = EXCLUDED.staff_note,
        source = EXCLUDED.source,
        summary = EXCLUDED.summary,
        manual_review_reason = EXCLUDED.manual_review_reason
    `,
    [
      record.id,
      record.message.sender,
      record.message.subject,
      record.message.body,
      record.message.receivedAt,
      serializePostgresJson(record.message.threadHistory),
      serializePostgresJson(record.message.sourceCitations),
      record.workflow.category,
      record.workflow.department,
      record.workflow.caseOrigin,
      serializePostgresJson(record.workflow.routingDecision),
      record.workflow.approvalState,
      record.workflow.priority,
      record.workflow.status,
      record.workflow.assignee,
      record.workflow.lastUpdatedAt,
      record.response.confidence,
      record.response.aiDraft,
      record.response.staffNote,
      record.response.source,
      record.response.summary,
      record.response.manualReviewReason,
    ]
  );
}

export function createPostgresMailboxAdapter({
  activityAdapter,
  databaseAccess,
}: PostgresMailboxAdapterDependencies): MailboxAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = databaseAccess
      .withClient(async (client) => {
        if ((await getPostgresCount(client, "mailbox_cases")) === 0) {
          const seedRecords = await loadBootstrapMailboxRecords();

          await runPostgresTransaction(client, async () => {
            for (const record of seedRecords) {
              await client.query(
                `
                  INSERT INTO mailbox_cases (
                    id,
                    sender,
                    subject,
                    body,
                    received_at,
                    thread_history_json,
                    source_citations_json,
                    category,
                    department,
                    case_origin,
                    routing_decision_json,
                    approval_state,
                    priority,
                    status,
                    assignee,
                    last_updated_at,
                    confidence,
                    ai_draft,
                    staff_note,
                    source,
                    summary,
                    manual_review_reason
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb,
                    $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                  )
                `,
                [
                  record.id,
                  record.message.sender,
                  record.message.subject,
                  record.message.body,
                  record.message.receivedAt,
                  serializePostgresJson(record.message.threadHistory),
                  serializePostgresJson(record.message.sourceCitations),
                  record.workflow.category,
                  record.workflow.department,
                  record.workflow.caseOrigin,
                  serializePostgresJson(record.workflow.routingDecision),
                  record.workflow.approvalState,
                  record.workflow.priority,
                  record.workflow.status,
                  record.workflow.assignee,
                  record.workflow.lastUpdatedAt,
                  record.response.confidence,
                  record.response.aiDraft,
                  record.response.staffNote,
                  record.response.source,
                  record.response.summary,
                  record.response.manualReviewReason,
                ]
              );
            }
          });
        }

        hasBootstrapped = true;
      })
      .finally(() => {
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  }

  async function listPersistedEmails() {
    await ensureBootstrapped();

    const rows = await databaseAccess.query<PostgresMailboxRow>(
      `
        SELECT
          id,
          sender,
          subject,
          body,
          received_at,
          thread_history_json,
          source_citations_json,
          category,
          department,
          case_origin,
          routing_decision_json,
          approval_state,
          priority,
          status,
          assignee,
          last_updated_at,
          confidence,
          ai_draft,
          staff_note,
          source,
          summary,
          manual_review_reason
        FROM mailbox_cases
        ORDER BY received_at DESC, id DESC
      `
    );

    return rows.map((row) => toStaffEmail(toMailboxCaseRecord(row)));
  }

  return {
    async listEmails(filter, assignmentFilter, departmentFilter) {
      const emails = await listPersistedEmails();
      return filterVisibleEmails(emails, filter, assignmentFilter, departmentFilter);
    },
    async updateEmail(id, updates) {
      const emails = await listPersistedEmails();
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
          nextTimestamp,
          previousEmail
        ),
      };
      const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);
      await upsertMailboxCaseRecord(
        fromStaffEmail(synchronizedNextEmail),
        databaseAccess
      );

      const activity = getEmailActivityDescription(
        previousEmail,
        synchronizedNextEmail
      );

      if (activity) {
        await activityAdapter.appendEvent({
          action: activity.action,
          entityType: "email",
          entityId: synchronizedNextEmail.id,
          title: synchronizedNextEmail.subject,
          description: activity.description,
          href: activity.href,
        });
      }

      return synchronizedNextEmail;
    },
    async createEmail(input) {
      const emails = await listPersistedEmails();
      const timestamp = new Date().toISOString();
      const nextEmailBeforeThreadSync: StaffEmail = {
        ...input,
        id: createNextEmailId(emails),
        receivedAt: timestamp,
        lastUpdatedAt: timestamp,
      };
      const nextEmail: StaffEmail = {
        ...nextEmailBeforeThreadSync,
        threadHistory: synchronizeDraftThreadEntry(nextEmailBeforeThreadSync, timestamp),
      };
      const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);
      const routingDecision =
        synchronizedNextEmail.routingDecision ??
        buildFallbackRoutingDecision(synchronizedNextEmail);

      await upsertMailboxCaseRecord(
        fromStaffEmail(synchronizedNextEmail),
        databaseAccess
      );

      await activityAdapter.appendEvent({
        action: "case_created",
        entityType: "email",
        entityId: synchronizedNextEmail.id,
        title: synchronizedNextEmail.subject,
        description:
          synchronizedNextEmail.status === "Escalated"
            ? `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and flagged it for manual review in the inbox.`
            : `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and added it to the review queue.`,
        href: getEmailWorkflowHref(synchronizedNextEmail),
      });

      return synchronizedNextEmail;
    },
  };
}
