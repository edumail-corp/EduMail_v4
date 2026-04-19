import type { ActivityEventRecord } from "@/lib/server/activity-event-store";
import { listActivityEventRecords } from "@/lib/server/activity-event-store";
import {
  getSQLiteCount,
  parseSQLiteJson,
  withSQLiteDatabase,
} from "@/lib/server/adapters/sqlite/sqlite-database";
import { buildFallbackRoutingDecision } from "@/lib/server/local-mailbox-operations";
import type { KnowledgeDocumentRecord } from "@/lib/server/knowledge-base-metadata-store";
import { listKnowledgeDocumentRecords } from "@/lib/server/knowledge-base-metadata-store";
import type { MailboxCaseRecord } from "@/lib/server/mailbox-record-store";
import { listMailboxCaseRecords } from "@/lib/server/mailbox-record-store";

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

type SQLiteKnowledgeDocumentRow = {
  id: string;
  name: string;
  category: KnowledgeDocumentRecord["category"];
  uploaded_at: string;
  pages: number;
  size_in_bytes: number | null;
  mime_type: string | null;
  summary: string;
  preview_excerpt: string;
  origin: KnowledgeDocumentRecord["origin"];
  file_asset_json: string | null;
};

type SQLiteActivityRow = {
  id: string;
  timestamp: string;
  action: ActivityEventRecord["action"];
  entity_type: ActivityEventRecord["entityType"];
  entity_id: string;
  title: string;
  description: string;
  href: string | null;
};

function getTimestamp(value: string | undefined) {
  const parsedValue = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function mergeRecordsById<T>(
  groups: readonly T[][],
  getId: (record: T) => string,
  chooseRecord: (left: T, right: T) => T
) {
  const recordsById = new Map<string, T>();

  for (const group of groups) {
    for (const record of group) {
      const recordId = getId(record);
      const existingRecord = recordsById.get(recordId);
      recordsById.set(
        recordId,
        existingRecord ? chooseRecord(existingRecord, record) : record
      );
    }
  }

  return [...recordsById.values()];
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

function toKnowledgeDocumentRecord(
  row: SQLiteKnowledgeDocumentRow
): KnowledgeDocumentRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    uploadedAt: row.uploaded_at,
    pages: Number(row.pages),
    sizeInBytes:
      typeof row.size_in_bytes === "number" ? row.size_in_bytes : undefined,
    mimeType: row.mime_type ?? undefined,
    summary: row.summary,
    previewExcerpt: row.preview_excerpt,
    origin: row.origin,
    fileAsset: parseSQLiteJson<
      KnowledgeDocumentRecord["fileAsset"] | undefined
    >(row.file_asset_json, undefined),
  };
}

function toActivityEventRecord(row: SQLiteActivityRow): ActivityEventRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description,
    href: row.href ?? undefined,
  };
}

function chooseMailboxRecord(left: MailboxCaseRecord, right: MailboxCaseRecord) {
  const leftTimestamp = getTimestamp(left.workflow.lastUpdatedAt);
  const rightTimestamp = getTimestamp(right.workflow.lastUpdatedAt);

  if (rightTimestamp !== leftTimestamp) {
    return rightTimestamp > leftTimestamp ? right : left;
  }

  if (right.message.threadHistory.length !== left.message.threadHistory.length) {
    return right.message.threadHistory.length > left.message.threadHistory.length
      ? right
      : left;
  }

  if (Boolean(right.response.aiDraft) !== Boolean(left.response.aiDraft)) {
    return right.response.aiDraft ? right : left;
  }

  return left;
}

function chooseActivityRecord(
  left: ActivityEventRecord,
  right: ActivityEventRecord
) {
  return getTimestamp(right.timestamp) > getTimestamp(left.timestamp) ? right : left;
}

function getKnowledgeRecordCompletenessScore(record: KnowledgeDocumentRecord) {
  return [
    record.fileAsset ? 4 : 0,
    record.sizeInBytes ? 2 : 0,
    record.mimeType ? 1 : 0,
    record.summary.trim().length > 0 ? 1 : 0,
    record.previewExcerpt.trim().length > 0 ? 1 : 0,
  ].reduce((total, score) => total + score, 0);
}

function chooseKnowledgeRecord(
  left: KnowledgeDocumentRecord,
  right: KnowledgeDocumentRecord
) {
  const leftScore = getKnowledgeRecordCompletenessScore(left);
  const rightScore = getKnowledgeRecordCompletenessScore(right);

  if (rightScore !== leftScore) {
    return rightScore > leftScore ? right : left;
  }

  return getTimestamp(right.uploadedAt) > getTimestamp(left.uploadedAt)
    ? right
    : left;
}

async function listSQLiteMailboxRecords() {
  return withSQLiteDatabase((database) => {
    if (getSQLiteCount(database, "mailbox_cases") === 0) {
      return [] as MailboxCaseRecord[];
    }

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
      `)
      .all() as SQLiteMailboxRow[];

    return rows.map(toMailboxCaseRecord);
  });
}

async function listSQLiteKnowledgeDocumentRecords() {
  return withSQLiteDatabase((database) => {
    if (getSQLiteCount(database, "knowledge_documents") === 0) {
      return [] as KnowledgeDocumentRecord[];
    }

    const rows = database
      .prepare(`
        SELECT
          id,
          name,
          category,
          uploaded_at,
          pages,
          size_in_bytes,
          mime_type,
          summary,
          preview_excerpt,
          origin,
          file_asset_json
        FROM knowledge_documents
      `)
      .all() as SQLiteKnowledgeDocumentRow[];

    return rows.map(toKnowledgeDocumentRecord);
  });
}

async function listSQLiteActivityRecords() {
  return withSQLiteDatabase((database) => {
    if (getSQLiteCount(database, "activity_events") === 0) {
      return [] as ActivityEventRecord[];
    }

    const rows = database
      .prepare(`
        SELECT id, timestamp, action, entity_type, entity_id, title, description, href
        FROM activity_events
      `)
      .all() as SQLiteActivityRow[];

    return rows.map(toActivityEventRecord);
  });
}

export async function loadBootstrapMailboxRecords() {
  const [recordStoreRecords, sqliteRecords] = await Promise.all([
    listMailboxCaseRecords({
      bootstrapFromLegacy: true,
      fallback: "seeded",
    }),
    listSQLiteMailboxRecords(),
  ]);

  return mergeRecordsById(
    [recordStoreRecords, sqliteRecords],
    (record) => record.id,
    chooseMailboxRecord
  ).sort(
    (left, right) =>
      getTimestamp(right.message.receivedAt) - getTimestamp(left.message.receivedAt) ||
      right.id.localeCompare(left.id)
  );
}

export async function loadBootstrapKnowledgeDocumentRecords() {
  const [recordStoreRecords, sqliteRecords] = await Promise.all([
    listKnowledgeDocumentRecords({
      fallback: "seeded",
    }),
    listSQLiteKnowledgeDocumentRecords(),
  ]);

  return mergeRecordsById(
    [recordStoreRecords, sqliteRecords],
    (record) => record.id,
    chooseKnowledgeRecord
  ).sort(
    (left, right) =>
      getTimestamp(right.uploadedAt) - getTimestamp(left.uploadedAt) ||
      right.id.localeCompare(left.id)
  );
}

export async function loadBootstrapActivityRecords() {
  const [recordStoreRecords, sqliteRecords] = await Promise.all([
    listActivityEventRecords(),
    listSQLiteActivityRecords(),
  ]);

  return mergeRecordsById(
    [recordStoreRecords, sqliteRecords],
    (record) => record.id,
    chooseActivityRecord
  ).sort(
    (left, right) =>
      getTimestamp(right.timestamp) - getTimestamp(left.timestamp) ||
      right.id.localeCompare(left.id)
  );
}
