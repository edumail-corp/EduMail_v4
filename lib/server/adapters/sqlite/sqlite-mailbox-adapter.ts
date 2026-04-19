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
import {
  fromStaffEmail,
  listMailboxCaseRecords,
  toStaffEmail,
  type MailboxCaseRecord,
} from "@/lib/server/mailbox-record-store";
import {
  getSQLiteCount,
  parseSQLiteJson,
  runSQLiteTransaction,
  serializeSQLiteJson,
  type SQLiteDatabaseAccess,
  withSQLiteDatabase,
} from "@/lib/server/adapters/sqlite/sqlite-database";
import {
  buildFallbackRoutingDecision,
  createNextEmailId,
  getEmailActivityDescription,
  synchronizeDraftThreadEntry,
  synchronizeOperationalFields,
} from "@/lib/server/local-mailbox-operations";

type SQLiteMailboxRow = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
  thread_history_json: string;
  source_citations_json: string;
  category: MailboxCaseRecord["workflow"]["category"];
  department: MailboxCaseRecord["workflow"]["department"];
  case_origin: MailboxCaseRecord["workflow"]["caseOrigin"];
  routing_decision_json: string;
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

type SQLiteMailboxAdapterDependencies = {
  activityAdapter: ActivityAdapter;
  databaseAccess?: SQLiteDatabaseAccess;
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

function toMailboxCaseRecord(row: SQLiteMailboxRow): MailboxCaseRecord {
  return {
    id: row.id,
    message: {
      sender: row.sender,
      subject: row.subject,
      body: row.body,
      receivedAt: row.received_at,
      threadHistory: parseSQLiteJson(row.thread_history_json, []),
      sourceCitations: parseSQLiteJson(row.source_citations_json, []),
    },
    workflow: {
      category: row.category,
      department: row.department,
      caseOrigin: row.case_origin,
      routingDecision: parseSQLiteJson(
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
  withDatabase: SQLiteDatabaseAccess["withDatabase"] = withSQLiteDatabase
) {
  return withDatabase((database) => {
    database
      .prepare(`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sender = excluded.sender,
          subject = excluded.subject,
          body = excluded.body,
          received_at = excluded.received_at,
          thread_history_json = excluded.thread_history_json,
          source_citations_json = excluded.source_citations_json,
          category = excluded.category,
          department = excluded.department,
          case_origin = excluded.case_origin,
          routing_decision_json = excluded.routing_decision_json,
          approval_state = excluded.approval_state,
          priority = excluded.priority,
          status = excluded.status,
          assignee = excluded.assignee,
          last_updated_at = excluded.last_updated_at,
          confidence = excluded.confidence,
          ai_draft = excluded.ai_draft,
          staff_note = excluded.staff_note,
          source = excluded.source,
          summary = excluded.summary,
          manual_review_reason = excluded.manual_review_reason
      `)
      .run(
        record.id,
        record.message.sender,
        record.message.subject,
        record.message.body,
        record.message.receivedAt,
        serializeSQLiteJson(record.message.threadHistory),
        serializeSQLiteJson(record.message.sourceCitations),
        record.workflow.category,
        record.workflow.department,
        record.workflow.caseOrigin,
        serializeSQLiteJson(record.workflow.routingDecision),
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
        record.response.manualReviewReason
      );
  });
}

export function createSQLiteMailboxAdapter({
  activityAdapter,
  databaseAccess,
}: SQLiteMailboxAdapterDependencies): MailboxAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;
  const withDatabase = databaseAccess?.withDatabase ?? withSQLiteDatabase;

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = withDatabase(async (database) => {
      if (getSQLiteCount(database, "mailbox_cases") === 0) {
        const seedRecords = await listMailboxCaseRecords({
          bootstrapFromLegacy: true,
          fallback: "seeded",
        });
        const insertStatement = database.prepare(`
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        runSQLiteTransaction(database, () => {
          for (const record of seedRecords) {
            insertStatement.run(
              record.id,
              record.message.sender,
              record.message.subject,
              record.message.body,
              record.message.receivedAt,
              serializeSQLiteJson(record.message.threadHistory),
              serializeSQLiteJson(record.message.sourceCitations),
              record.workflow.category,
              record.workflow.department,
              record.workflow.caseOrigin,
              serializeSQLiteJson(record.workflow.routingDecision),
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
              record.response.manualReviewReason
            );
          }
        });
      }

      hasBootstrapped = true;
    }).finally(() => {
      bootstrapPromise = null;
    });

    return bootstrapPromise;
  }

  async function listPersistedEmails() {
    await ensureBootstrapped();

    return withDatabase((database) => {
      const rows = database
        .prepare(`
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
        `)
        .all() as SQLiteMailboxRow[];

      return rows.map((row) => toStaffEmail(toMailboxCaseRecord(row)));
    });
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
      await upsertMailboxCaseRecord(fromStaffEmail(synchronizedNextEmail), withDatabase);

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

      await upsertMailboxCaseRecord(fromStaffEmail(synchronizedNextEmail), withDatabase);

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
