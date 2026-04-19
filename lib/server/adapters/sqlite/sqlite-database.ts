import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getWritableDataPath } from "@/lib/server/storage-path";

const defaultSQLitePath = getWritableDataPath("edumailai.sqlite");

export type SQLiteDatabaseAccess = {
  databasePath: string;
  getDatabase(): Promise<DatabaseSync>;
  withDatabase<T>(callback: (database: DatabaseSync) => T | Promise<T>): Promise<T>;
};

type SQLiteDatabaseCacheEntry = {
  database: DatabaseSync | null;
  databasePromise: Promise<DatabaseSync> | null;
};

const sqliteDatabaseCache = new Map<string, SQLiteDatabaseCacheEntry>();

export function resolveSQLiteDatabasePath() {
  const configuredPath = process.env.EDUMAILAI_SQLITE_PATH?.trim();

  if (!configuredPath) {
    return defaultSQLitePath;
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : getWritableDataPath(configuredPath);
}

async function createSQLiteDatabase(databasePath: string) {
  await mkdir(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS mailbox_cases (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      thread_history_json TEXT NOT NULL,
      source_citations_json TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      case_origin TEXT NOT NULL,
      routing_decision_json TEXT NOT NULL,
      approval_state TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      last_updated_at TEXT NOT NULL,
      confidence REAL NOT NULL,
      ai_draft TEXT,
      staff_note TEXT,
      source TEXT,
      summary TEXT NOT NULL,
      manual_review_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mailbox_cases_status
      ON mailbox_cases (status);
    CREATE INDEX IF NOT EXISTS idx_mailbox_cases_updated_at
      ON mailbox_cases (last_updated_at DESC);

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      href TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_activity_events_timestamp
      ON activity_events (timestamp DESC);

    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      pages INTEGER NOT NULL,
      size_in_bytes INTEGER,
      mime_type TEXT,
      summary TEXT NOT NULL,
      preview_excerpt TEXT NOT NULL,
      origin TEXT NOT NULL,
      file_asset_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_at
      ON knowledge_documents (uploaded_at DESC);

    CREATE TABLE IF NOT EXISTS workspace_staff_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_staff_users_email_nocase
      ON workspace_staff_users (email COLLATE NOCASE);
  `);

  return database;
}

export function createSQLiteDatabaseAccess(databasePath: string): SQLiteDatabaseAccess {
  const normalizedPath = path.resolve(databasePath);

  async function getDatabase() {
    const cachedEntry = sqliteDatabaseCache.get(normalizedPath);

    if (cachedEntry?.database) {
      return cachedEntry.database;
    }

    if (cachedEntry?.databasePromise) {
      const database = await cachedEntry.databasePromise;
      sqliteDatabaseCache.set(normalizedPath, {
        database,
        databasePromise: cachedEntry.databasePromise,
      });
      return database;
    }

    const databasePromise = createSQLiteDatabase(normalizedPath);
    sqliteDatabaseCache.set(normalizedPath, {
      database: null,
      databasePromise,
    });
    const database = await databasePromise;
    sqliteDatabaseCache.set(normalizedPath, {
      database,
      databasePromise,
    });
    return database;
  }

  async function withDatabase<T>(
    callback: (database: DatabaseSync) => T | Promise<T>
  ): Promise<T> {
    const database = await getDatabase();
    return callback(database);
  }

  return {
    databasePath: normalizedPath,
    getDatabase,
    withDatabase,
  };
}

const defaultSQLiteDatabaseAccess = createSQLiteDatabaseAccess(resolveSQLiteDatabasePath());

export function getDefaultSQLiteDatabaseAccess() {
  return defaultSQLiteDatabaseAccess;
}

export async function getSQLiteDatabase() {
  return defaultSQLiteDatabaseAccess.getDatabase();
}

export async function withSQLiteDatabase<T>(
  callback: (database: DatabaseSync) => T | Promise<T>
) {
  return defaultSQLiteDatabaseAccess.withDatabase(callback);
}

export function serializeSQLiteJson(value: unknown) {
  return JSON.stringify(value);
}

export function parseSQLiteJson<T>(value: unknown, fallback: T) {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getSQLiteCount(database: DatabaseSync, tableName: string) {
  const row = database
    .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
    .get() as
    | {
        count?: number | bigint;
      }
    | undefined;

  return Number(row?.count ?? 0);
}

export function runSQLiteTransaction(
  database: DatabaseSync,
  callback: () => void
) {
  database.exec("BEGIN");

  try {
    callback();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
