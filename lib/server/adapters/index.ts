import type {
  AIDraftAdapter,
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
  MailboxAdapter,
  WorkspaceSettingsAdapter,
} from "@/lib/server/adapters/contracts";
import {
  createDatabaseActivityAdapter,
  createDatabaseKnowledgeBaseAdapter,
  createDatabaseMailboxAdapter,
} from "@/lib/server/adapters/database/database-adapters";
import { getConfiguredAdapterBinding } from "@/lib/server/adapters/provider-config";
import {
  createJsonFileActivityAdapter,
  createLocalActivityAdapter,
} from "@/lib/server/adapters/local/local-activity-adapter";
import { localFileStorageAdapter } from "@/lib/server/adapters/local/local-file-storage-adapter";
import {
  createJsonFileKnowledgeBaseAdapter,
  createLocalKnowledgeBaseAdapter,
} from "@/lib/server/adapters/local/local-knowledge-base-adapter";
import {
  createJsonFileMailboxAdapter,
  createLocalMailboxAdapter,
} from "@/lib/server/adapters/local/local-mailbox-adapter";
import { createSQLiteActivityAdapter } from "@/lib/server/adapters/sqlite/sqlite-activity-adapter";
import { createSQLiteKnowledgeBaseAdapter } from "@/lib/server/adapters/sqlite/sqlite-knowledge-base-adapter";
import { createSQLiteMailboxAdapter } from "@/lib/server/adapters/sqlite/sqlite-mailbox-adapter";

let cachedLocalMailboxAdapter: MailboxAdapter | null = null;
let cachedJsonFileMailboxAdapter: MailboxAdapter | null = null;
let cachedSQLiteMailboxAdapter: MailboxAdapter | null = null;
let cachedDatabaseMailboxAdapter: MailboxAdapter | null = null;
let cachedLocalActivityAdapter: ActivityAdapter | null = null;
let cachedJsonFileActivityAdapter: ActivityAdapter | null = null;
let cachedSQLiteActivityAdapter: ActivityAdapter | null = null;
let cachedDatabaseActivityAdapter: ActivityAdapter | null = null;
let cachedLocalKnowledgeBaseAdapter: KnowledgeBaseAdapter | null = null;
let cachedJsonFileKnowledgeBaseAdapter: KnowledgeBaseAdapter | null = null;
let cachedSQLiteKnowledgeBaseAdapter: KnowledgeBaseAdapter | null = null;
let cachedDatabaseKnowledgeBaseAdapter: KnowledgeBaseAdapter | null = null;

export function getMailboxAdapter(): MailboxAdapter {
  const binding = getConfiguredAdapterBinding("mailbox");

  if (binding.activeProvider === "database") {
    if (!cachedDatabaseMailboxAdapter) {
      cachedDatabaseMailboxAdapter = createDatabaseMailboxAdapter({
        activityAdapter: getActivityAdapter(),
      });
    }

    return cachedDatabaseMailboxAdapter;
  }

  if (binding.activeProvider === "sqlite") {
    if (!cachedSQLiteMailboxAdapter) {
      cachedSQLiteMailboxAdapter = createSQLiteMailboxAdapter({
        activityAdapter: getActivityAdapter(),
      });
    }

    return cachedSQLiteMailboxAdapter;
  }

  if (binding.activeProvider === "json_file") {
    if (!cachedJsonFileMailboxAdapter) {
      cachedJsonFileMailboxAdapter = createJsonFileMailboxAdapter({
        activityAdapter: getActivityAdapter(),
      });
    }

    return cachedJsonFileMailboxAdapter;
  }

  if (!cachedLocalMailboxAdapter) {
    cachedLocalMailboxAdapter = createLocalMailboxAdapter({
      activityAdapter: getActivityAdapter(),
    });
  }

  return cachedLocalMailboxAdapter;
}

export function getKnowledgeBaseAdapter(): KnowledgeBaseAdapter {
  const binding = getConfiguredAdapterBinding("knowledge-base");

  if (binding.activeProvider === "database") {
    if (!cachedDatabaseKnowledgeBaseAdapter) {
      cachedDatabaseKnowledgeBaseAdapter = createDatabaseKnowledgeBaseAdapter({
        activityAdapter: getActivityAdapter(),
        fileStorageAdapter: getFileStorageAdapter(),
      });
    }

    return cachedDatabaseKnowledgeBaseAdapter;
  }

  if (binding.activeProvider === "sqlite") {
    if (!cachedSQLiteKnowledgeBaseAdapter) {
      cachedSQLiteKnowledgeBaseAdapter = createSQLiteKnowledgeBaseAdapter({
        activityAdapter: getActivityAdapter(),
        fileStorageAdapter: getFileStorageAdapter(),
      });
    }

    return cachedSQLiteKnowledgeBaseAdapter;
  }

  if (binding.activeProvider === "json_file") {
    if (!cachedJsonFileKnowledgeBaseAdapter) {
      cachedJsonFileKnowledgeBaseAdapter = createJsonFileKnowledgeBaseAdapter({
        activityAdapter: getActivityAdapter(),
        fileStorageAdapter: getFileStorageAdapter(),
      });
    }

    return cachedJsonFileKnowledgeBaseAdapter;
  }

  if (!cachedLocalKnowledgeBaseAdapter) {
    cachedLocalKnowledgeBaseAdapter = createLocalKnowledgeBaseAdapter({
      activityAdapter: getActivityAdapter(),
      fileStorageAdapter: getFileStorageAdapter(),
    });
  }

  return cachedLocalKnowledgeBaseAdapter;
}

export function getActivityAdapter(): ActivityAdapter {
  const binding = getConfiguredAdapterBinding("activity");

  if (binding.activeProvider === "database") {
    if (!cachedDatabaseActivityAdapter) {
      cachedDatabaseActivityAdapter = createDatabaseActivityAdapter();
    }

    return cachedDatabaseActivityAdapter;
  }

  if (binding.activeProvider === "sqlite") {
    if (!cachedSQLiteActivityAdapter) {
      cachedSQLiteActivityAdapter = createSQLiteActivityAdapter();
    }

    return cachedSQLiteActivityAdapter;
  }

  if (binding.activeProvider === "json_file") {
    if (!cachedJsonFileActivityAdapter) {
      cachedJsonFileActivityAdapter = createJsonFileActivityAdapter();
    }

    return cachedJsonFileActivityAdapter;
  }

  if (!cachedLocalActivityAdapter) {
    cachedLocalActivityAdapter = createLocalActivityAdapter();
  }

  return cachedLocalActivityAdapter;
}

export function getFileStorageAdapter(): FileStorageAdapter {
  getConfiguredAdapterBinding("file-storage");
  return localFileStorageAdapter;
}

let cachedAIDraftAdapter: AIDraftAdapter | null = null;
let cachedWorkspaceSettingsAdapter: WorkspaceSettingsAdapter | null = null;

export async function getAIDraftAdapter(): Promise<AIDraftAdapter> {
  getConfiguredAdapterBinding("ai-draft");

  if (cachedAIDraftAdapter) {
    return cachedAIDraftAdapter;
  }

  const adapterModule = await import(
    "@/lib/server/adapters/local/local-ai-draft-adapter"
  );
  cachedAIDraftAdapter = adapterModule.localAIDraftAdapter;
  return cachedAIDraftAdapter;
}

export async function getWorkspaceSettingsAdapter(): Promise<WorkspaceSettingsAdapter> {
  getConfiguredAdapterBinding("workspace-settings");

  if (cachedWorkspaceSettingsAdapter) {
    return cachedWorkspaceSettingsAdapter;
  }

  const adapterModule = await import(
    "@/lib/server/adapters/local/local-workspace-settings-adapter"
  );
  cachedWorkspaceSettingsAdapter = adapterModule.localWorkspaceSettingsAdapter;
  return cachedWorkspaceSettingsAdapter;
}
