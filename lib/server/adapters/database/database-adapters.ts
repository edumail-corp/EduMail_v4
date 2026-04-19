import type {
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
  MailboxAdapter,
} from "@/lib/server/adapters/contracts";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { createSQLiteActivityAdapter } from "@/lib/server/adapters/sqlite/sqlite-activity-adapter";
import { createSQLiteKnowledgeBaseAdapter } from "@/lib/server/adapters/sqlite/sqlite-knowledge-base-adapter";
import { createSQLiteMailboxAdapter } from "@/lib/server/adapters/sqlite/sqlite-mailbox-adapter";
import { createSQLiteDatabaseAccess } from "@/lib/server/adapters/sqlite/sqlite-database";

function getDatabaseSQLiteAccess() {
  const configuredDatabase = getConfiguredDatabaseUrl();

  if (!configuredDatabase) {
    throw new Error(
      "EDUMAILAI_DATABASE_URL must be set to a supported sqlite/file path when using the database adapter."
    );
  }

  return createSQLiteDatabaseAccess(configuredDatabase.resolvedPath);
}

export function createDatabaseActivityAdapter(): ActivityAdapter {
  return createSQLiteActivityAdapter({
    databaseAccess: getDatabaseSQLiteAccess(),
  });
}

export function createDatabaseMailboxAdapter(dependencies: {
  activityAdapter: ActivityAdapter;
}): MailboxAdapter {
  return createSQLiteMailboxAdapter({
    ...dependencies,
    databaseAccess: getDatabaseSQLiteAccess(),
  });
}

export function createDatabaseKnowledgeBaseAdapter(dependencies: {
  activityAdapter: ActivityAdapter;
  fileStorageAdapter: FileStorageAdapter;
}): KnowledgeBaseAdapter {
  return createSQLiteKnowledgeBaseAdapter({
    ...dependencies,
    databaseAccess: getDatabaseSQLiteAccess(),
  });
}
