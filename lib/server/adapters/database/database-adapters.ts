import type {
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
  MailboxAdapter,
} from "@/lib/server/adapters/contracts";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { createPostgresActivityAdapter } from "@/lib/server/adapters/postgres/postgres-activity-adapter";
import { createPostgresKnowledgeBaseAdapter } from "@/lib/server/adapters/postgres/postgres-knowledge-base-adapter";
import { createPostgresMailboxAdapter } from "@/lib/server/adapters/postgres/postgres-mailbox-adapter";
import { createPostgresDatabaseAccess } from "@/lib/server/adapters/postgres/postgres-database";
import { createSQLiteActivityAdapter } from "@/lib/server/adapters/sqlite/sqlite-activity-adapter";
import { createSQLiteKnowledgeBaseAdapter } from "@/lib/server/adapters/sqlite/sqlite-knowledge-base-adapter";
import { createSQLiteMailboxAdapter } from "@/lib/server/adapters/sqlite/sqlite-mailbox-adapter";
import { createSQLiteDatabaseAccess } from "@/lib/server/adapters/sqlite/sqlite-database";

function getRequiredConfiguredDatabase() {
  const configuredDatabase = getConfiguredDatabaseUrl();

  if (!configuredDatabase) {
    throw new Error(
      "EDUMAILAI_DATABASE_URL must be set to a supported SQLite path or PostgreSQL connection string when using the database adapter."
    );
  }

  return configuredDatabase;
}

export function createDatabaseActivityAdapter(): ActivityAdapter {
  const configuredDatabase = getRequiredConfiguredDatabase();

  if (configuredDatabase.driver === "postgres") {
    return createPostgresActivityAdapter({
      databaseAccess: createPostgresDatabaseAccess(
        configuredDatabase.connectionString
      ),
    });
  }

  return createSQLiteActivityAdapter({
    databaseAccess: createSQLiteDatabaseAccess(configuredDatabase.resolvedPath),
  });
}

export function createDatabaseMailboxAdapter(dependencies: {
  activityAdapter: ActivityAdapter;
}): MailboxAdapter {
  const configuredDatabase = getRequiredConfiguredDatabase();

  if (configuredDatabase.driver === "postgres") {
    return createPostgresMailboxAdapter({
      ...dependencies,
      databaseAccess: createPostgresDatabaseAccess(
        configuredDatabase.connectionString
      ),
    });
  }

  return createSQLiteMailboxAdapter({
    ...dependencies,
    databaseAccess: createSQLiteDatabaseAccess(configuredDatabase.resolvedPath),
  });
}

export function createDatabaseKnowledgeBaseAdapter(dependencies: {
  activityAdapter: ActivityAdapter;
  fileStorageAdapter: FileStorageAdapter;
  fileStorageAdapters?: readonly FileStorageAdapter[];
}): KnowledgeBaseAdapter {
  const configuredDatabase = getRequiredConfiguredDatabase();

  if (configuredDatabase.driver === "postgres") {
    return createPostgresKnowledgeBaseAdapter({
      ...dependencies,
      databaseAccess: createPostgresDatabaseAccess(
        configuredDatabase.connectionString
      ),
    });
  }

  return createSQLiteKnowledgeBaseAdapter({
    ...dependencies,
    databaseAccess: createSQLiteDatabaseAccess(configuredDatabase.resolvedPath),
  });
}
