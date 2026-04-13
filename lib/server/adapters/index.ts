import type {
  AIDraftAdapter,
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
  MailboxAdapter,
  WorkspaceSettingsAdapter,
} from "@/lib/server/adapters/contracts";
import { localActivityAdapter } from "@/lib/server/adapters/local/local-activity-adapter";
import { localFileStorageAdapter } from "@/lib/server/adapters/local/local-file-storage-adapter";
import { localKnowledgeBaseAdapter } from "@/lib/server/adapters/local/local-knowledge-base-adapter";
import { localMailboxAdapter } from "@/lib/server/adapters/local/local-mailbox-adapter";

export function getMailboxAdapter(): MailboxAdapter {
  return localMailboxAdapter;
}

export function getKnowledgeBaseAdapter(): KnowledgeBaseAdapter {
  return localKnowledgeBaseAdapter;
}

export function getActivityAdapter(): ActivityAdapter {
  return localActivityAdapter;
}

export function getFileStorageAdapter(): FileStorageAdapter {
  return localFileStorageAdapter;
}

let cachedAIDraftAdapter: AIDraftAdapter | null = null;
let cachedWorkspaceSettingsAdapter: WorkspaceSettingsAdapter | null = null;

export async function getAIDraftAdapter(): Promise<AIDraftAdapter> {
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
  if (cachedWorkspaceSettingsAdapter) {
    return cachedWorkspaceSettingsAdapter;
  }

  const adapterModule = await import(
    "@/lib/server/adapters/local/local-workspace-settings-adapter"
  );
  cachedWorkspaceSettingsAdapter = adapterModule.localWorkspaceSettingsAdapter;
  return cachedWorkspaceSettingsAdapter;
}
