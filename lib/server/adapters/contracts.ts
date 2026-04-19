import type { ActivityEvent, ActivityEventCreateInput } from "@/lib/activity-log";
import type {
  Department,
  DepartmentFilter,
  EmailFilter,
  EmailSourceCitation,
  RoutingDecision,
  StaffAssignmentFilter,
  StaffEmail,
  StaffEmailCreateInput,
  StaffEmailUpdateInput,
} from "@/lib/email-data";
import type { KnowledgeDocument } from "@/lib/knowledge-base-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import type {
  WorkspaceDomainEntity,
  WorkspaceEnvironmentSignal,
  WorkspaceIntegrationStatus,
  WorkspaceLocalStorageSummary,
  WorkspaceManualWorkItem,
  WorkspaceAdapterBinding,
  WorkspaceStaffUser,
  WorkspaceWorkflowStage,
} from "@/lib/workspace-config";

export type DraftSuggestion = {
  confidence: number;
  aiDraft: string | null;
  source: string | null;
  summary: string;
  manualReviewReason: string | null;
  sourceCitations: EmailSourceCitation[];
  routingDecision: RoutingDecision;
};

export type DraftProviderStatus = {
  summary: string;
  nextStep: string;
};

export type MailboxCreateEmailInput = Omit<
  StaffEmail,
  "id" | "receivedAt" | "lastUpdatedAt"
>;

export type CreateKnowledgeBaseDocumentInput = {
  name: string;
  category: KnowledgeDocument["category"];
  pages: number;
  mimeType: string;
  sizeInBytes: number;
  fileBuffer: Buffer;
};

export type KnowledgeBaseDocumentFile = {
  document: KnowledgeDocument;
  fileBuffer: Buffer;
  mimeType: string;
  name: string;
};

export type FileStorageProviderId = "local" | "supabase_storage";

export type WorkspaceSettingsSnapshot = {
  integrations: WorkspaceIntegrationStatus[];
  adapterBindings: WorkspaceAdapterBinding[];
  environmentSignals: WorkspaceEnvironmentSignal[];
  integrationCounts: {
    local: number;
    manualRequired: number;
    planned: number;
  };
  staffDirectory: WorkspaceStaffUser[];
  futureDomainModel: WorkspaceDomainEntity[];
  manualWorkItems: WorkspaceManualWorkItem[];
  operatingDepartments: readonly Department[];
  workflowStages: WorkspaceWorkflowStage[];
  localStorage: WorkspaceLocalStorageSummary;
};

export interface MailboxAdapter {
  listEmails(
    filter?: EmailFilter,
    assignmentFilter?: StaffAssignmentFilter,
    departmentFilter?: DepartmentFilter
  ): Promise<StaffEmail[]>;
  updateEmail(id: string, updates: StaffEmailUpdateInput): Promise<StaffEmail | null>;
  createEmail(input: MailboxCreateEmailInput): Promise<StaffEmail>;
}

export interface KnowledgeBaseAdapter {
  listDocuments(): Promise<KnowledgeDocument[]>;
  createDocument(input: CreateKnowledgeBaseDocumentInput): Promise<KnowledgeDocument>;
  deleteDocument(id: string): Promise<boolean>;
  getDocumentFile(id: string): Promise<KnowledgeBaseDocumentFile | null>;
}

export interface ActivityAdapter {
  listEvents(limit?: number): Promise<ActivityEvent[]>;
  appendEvent(input: ActivityEventCreateInput): Promise<ActivityEvent>;
}

export interface AIDraftAdapter {
  generateDraftSuggestion(
    input: StaffEmailCreateInput,
    language?: LanguagePreference
  ): Promise<DraftSuggestion>;
  getProviderStatus(language?: LanguagePreference): Promise<DraftProviderStatus>;
}

export interface WorkspaceSettingsAdapter {
  getSnapshot(options?: {
    language?: LanguagePreference;
    draftProvider?: DraftProviderStatus;
  }): Promise<WorkspaceSettingsSnapshot>;
}

export interface FileStorageAdapter {
  providerId: FileStorageProviderId;
  writeBinaryFile(storageKey: string, fileBuffer: Buffer): Promise<void>;
  readBinaryFile(storageKey: string): Promise<Buffer | null>;
  deleteBinaryFile(storageKey: string): Promise<boolean>;
}
