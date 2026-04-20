import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResultRow,
} from "pg";

type PostgresQueryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export type PostgresDatabaseAccess = {
  connectionString: string;
  getPool(): Promise<Pool>;
  withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<T[]>;
};

type PostgresDatabaseCacheEntry = {
  pool: Pool | null;
  poolPromise: Promise<Pool> | null;
};

const postgresDatabaseCache = new Map<string, PostgresDatabaseCacheEntry>();

function normalizeSSLMode(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase() ?? "";
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getConfiguredSSLMode(connectionString: string) {
  const envValue = normalizeSSLMode(process.env.EDUMAILAI_DATABASE_SSL_MODE);

  if (envValue) {
    return envValue;
  }

  try {
    return normalizeSSLMode(new URL(connectionString).searchParams.get("sslmode"));
  } catch {
    return null;
  }
}

function resolvePostgresSSL(
  connectionString: string
): PoolConfig["ssl"] | undefined {
  const configuredSSLMode = getConfiguredSSLMode(connectionString);

  if (configuredSSLMode === "disable") {
    return false;
  }

  try {
    const hostname = new URL(connectionString).hostname.toLowerCase();
    const shouldRequireSSL =
      configuredSSLMode === "require" ||
      hostname.includes("supabase.co") ||
      hostname.includes("supabase.com") ||
      hostname.includes("supabase.net");

    if (shouldRequireSSL) {
      return {
        rejectUnauthorized: false,
      };
    }
  } catch {
    return configuredSSLMode === "require"
      ? {
          rejectUnauthorized: false,
        }
      : undefined;
  }

  return undefined;
}

async function initializePostgresDatabase(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mailbox_cases (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      thread_history_json JSONB NOT NULL,
      source_citations_json JSONB NOT NULL,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      case_origin TEXT NOT NULL,
      routing_decision_json JSONB NOT NULL,
      approval_state TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      last_updated_at TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL,
      ai_draft TEXT,
      staff_note TEXT,
      source TEXT,
      summary TEXT NOT NULL,
      manual_review_reason TEXT
    );

    ALTER TABLE mailbox_cases
      ADD COLUMN IF NOT EXISTS integration_json JSONB;

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
      file_asset_json JSONB
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_staff_users_email_lower
      ON workspace_staff_users (LOWER(email));
  `);
}

async function createPostgresPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    ssl: resolvePostgresSSL(connectionString),
  });

  try {
    await initializePostgresDatabase(pool);
    return pool;
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
}

export function createPostgresDatabaseAccess(
  connectionString: string
): PostgresDatabaseAccess {
  async function getPool() {
    const cachedEntry = postgresDatabaseCache.get(connectionString);

    if (cachedEntry?.pool) {
      return cachedEntry.pool;
    }

    if (cachedEntry?.poolPromise) {
      const pool = await cachedEntry.poolPromise;
      postgresDatabaseCache.set(connectionString, {
        pool,
        poolPromise: cachedEntry.poolPromise,
      });
      return pool;
    }

    const poolPromise = createPostgresPool(connectionString);
    postgresDatabaseCache.set(connectionString, {
      pool: null,
      poolPromise,
    });
    const pool = await poolPromise;
    postgresDatabaseCache.set(connectionString, {
      pool,
      poolPromise,
    });
    return pool;
  }

  async function withClient<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = await getPool();
    const client = await pool.connect();

    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = []
  ) {
    const pool = await getPool();
    const result = await pool.query<T>(text, [...values]);
    return result.rows;
  }

  return {
    connectionString,
    getPool,
    withClient,
    query,
  };
}

export function serializePostgresJson(value: unknown) {
  return JSON.stringify(value);
}

export function parsePostgresJson<T>(value: unknown, fallback: T) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === "object") {
    return value as T;
  }

  return fallback;
}

export async function getPostgresCount(
  queryable: PostgresQueryable,
  tableName: string
) {
  const result = await queryable.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${tableName}`
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function runPostgresTransaction<T>(
  client: PoolClient,
  callback: () => Promise<T>
) {
  await client.query("BEGIN");

  try {
    const result = await callback();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
