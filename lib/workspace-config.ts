import type { LanguagePreference } from "@/lib/user-preferences";

export type WorkspaceRole =
  | "operations_admin"
  | "triage_specialist"
  | "knowledge_manager";

export type WorkspaceUserStatus = "active" | "pending";
export type WorkspaceStaffDirectorySource = "static" | "database";
export type WorkspaceProviderStatus =
  | "local"
  | "manual_required"
  | "planned"
  | "configured";
export type WorkspaceReadinessCategory =
  | "data"
  | "auth"
  | "email"
  | "storage"
  | "ai"
  | "hosting";

export type WorkspaceStaffUser = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceUserStatus;
};

export type WorkspaceIntegrationStatus = {
  id: string;
  label: string;
  category: WorkspaceReadinessCategory;
  status: WorkspaceProviderStatus;
  summary: string;
  nextStep: string;
};

export type WorkspaceAdapterBinding = {
  id: string;
  label: string;
  envVarName: string;
  activeProvider: string;
  requestedProvider: string | null;
  status: WorkspaceProviderStatus;
  summary: string;
  nextStep: string;
};

export type WorkspaceEnvironmentSignal = {
  id: string;
  label: string;
  category: WorkspaceReadinessCategory;
  status: WorkspaceProviderStatus;
  requiredEnvVars: string[];
  configuredEnvVars: string[];
  summary: string;
  nextStep: string;
};

export type WorkspaceDomainEntity = {
  id: string;
  label: string;
  description: string;
};

export type WorkspaceManualWorkItem = {
  id: string;
  label: string;
  description: string;
};

export type WorkspaceWorkflowStage = {
  id: string;
  label: string;
  description: string;
};

export type WorkspaceStorageLocationKind =
  | "json"
  | "sqlite"
  | "postgres"
  | "remote"
  | "directory";

export type WorkspaceStorageLocation = {
  id: string;
  label: string;
  kind: WorkspaceStorageLocationKind;
  path: string;
  present: boolean;
  active: boolean;
  approxSizeBytes: number;
  fileCount: number;
  summary: string;
};

export type WorkspaceLocalStorageSummary = {
  rootPath: string;
  totalTrackedBytes: number;
  totalTrackedFiles: number;
  locations: WorkspaceStorageLocation[];
};

export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  operations_admin: "Operations Admin",
  triage_specialist: "Triage Specialist",
  knowledge_manager: "Knowledge Manager",
};

export const workspaceStaffDirectory: WorkspaceStaffUser[] = [
  {
    id: "USR-1001",
    name: "Ava Patel",
    email: "ava.patel@edumailai.local",
    role: "triage_specialist",
    status: "active",
  },
  {
    id: "USR-1002",
    name: "Noah Kim",
    email: "noah.kim@edumailai.local",
    role: "operations_admin",
    status: "active",
  },
  {
    id: "USR-1003",
    name: "Priya Shah",
    email: "priya.shah@edumailai.local",
    role: "knowledge_manager",
    status: "active",
  },
  {
    id: "USR-1004",
    name: "Jordan Lee",
    email: "jordan.lee@edumailai.local",
    role: "triage_specialist",
    status: "active",
  },
];

export const workspaceIntegrationStatuses: WorkspaceIntegrationStatus[] = [
  {
    id: "database",
    label: "Database",
    category: "data",
    status: "local",
    summary:
      "Mailbox data, activity history, and knowledge-base metadata currently persist through local adapters backed by JSON files.",
    nextStep:
      "Choose a hosted or self-managed database, then swap those adapters without changing routes or pages.",
  },
  {
    id: "auth",
    label: "Authentication",
    category: "auth",
    status: "manual_required",
    summary: "No sign-in flow or roles are enforced yet.",
    nextStep: "Choose an auth provider and define role/permission rules.",
  },
  {
    id: "file-storage",
    label: "File Storage",
    category: "storage",
    status: "local",
    summary:
      "Knowledge document binaries now flow through the file-storage adapter separately from their metadata records.",
    nextStep:
      "Select production object storage for documents and long-term retention, then wire it behind the adapter contract.",
  },
  {
    id: "ai-provider",
    label: "AI Draft Provider",
    category: "ai",
    status: "planned",
    summary:
      "Drafts default to the local seeded adapter, but the app can now switch to an OpenAI-backed drafting adapter when configured.",
    nextStep:
      "Set EDUMAILAI_AI_DRAFT_ADAPTER=openai and provide the API key to move reply generation onto the live model path.",
  },
  {
    id: "email-inbox",
    label: "Inbox Integration",
    category: "email",
    status: "manual_required",
    summary:
      "Live inbox sync can now run through Microsoft Graph, while manual intake stays available as the local fallback.",
    nextStep:
      "Configure the Microsoft Graph mailbox credentials and enable inbox sync for the shared mailbox.",
  },
  {
    id: "email-outbound",
    label: "Outbound Mail",
    category: "email",
    status: "manual_required",
    summary:
      "Approved replies can now be delivered through Microsoft Graph, with the local auto-sent flow kept as the fallback path.",
    nextStep:
      "Configure outbound Microsoft Graph mail so approved replies leave the workspace for real recipients.",
  },
  {
    id: "hosting",
    label: "Hosting and Observability",
    category: "hosting",
    status: "manual_required",
    summary: "The prototype is local-only and has no deployment or monitoring configuration.",
    nextStep: "Choose a hosting platform and basic monitoring stack before launch.",
  },
];

export const workspaceFutureDomainModel: WorkspaceDomainEntity[] = [
  {
    id: "users",
    label: "Users and Roles",
    description: "Staff identity, role assignment, approval permissions, and ownership rules.",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Inbound emails, routing state, reply drafts, and review outcomes.",
  },
  {
    id: "ownership",
    label: "Ownership and Notes",
    description: "Case ownership, internal notes, escalation reasons, and last-updated timestamps.",
  },
  {
    id: "documents",
    label: "Knowledge Documents",
    description:
      "Reference metadata, separate file assets, categories, previews, and citation relationships.",
  },
  {
    id: "activity",
    label: "Activity Events",
    description: "Workflow history for approvals, assignments, note changes, and document actions.",
  },
];

export const workspaceManualWorkItems: WorkspaceManualWorkItem[] = [
  {
    id: "providers",
    label: "Choose production providers",
    description: "Pick database, auth, file storage, AI, inbox integration, and hosting services.",
  },
  {
    id: "access",
    label: "Create projects and credentials",
    description: "Set up accounts, API keys, environment variables, and deployment access.",
  },
  {
    id: "rules",
    label: "Define workflow rules",
    description: "Decide who can approve, assign, auto-send, and retain activity or document history.",
  },
  {
    id: "data",
    label: "Provide real operating data",
    description: "Supply policy files, real staff roster, email patterns, and category taxonomy.",
  },
];

export const workspaceOperatingDepartments = [
  "Admissions",
  "Finance",
  "Registrar",
  "Academic",
] as const;

export const workspaceWorkflowStages: WorkspaceWorkflowStage[] = [
  {
    id: "created",
    label: "Created",
    description: "A case enters the system from manual intake or future email ingestion.",
  },
  {
    id: "routed",
    label: "Routed",
    description: "The local routing layer suggests a department, owners, and escalation risk.",
  },
  {
    id: "assigned",
    label: "Assigned",
    description: "A staff owner takes responsibility for review and response handling.",
  },
  {
    id: "reviewed",
    label: "Reviewed",
    description: "Drafts, notes, sources, and routing signals are checked by a human.",
  },
  {
    id: "approved",
    label: "Approved or Escalated",
    description: "The case is either approved for send or kept in manual escalation handling.",
  },
];

export function translateWorkspaceRole(
  role: WorkspaceRole,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<WorkspaceRole, string> = {
      operations_admin: "Administrator operacyjny",
      triage_specialist: "Specjalista triage",
      knowledge_manager: "Opiekun bazy wiedzy",
    };

    return labels[role];
  }

  return workspaceRoleLabels[role];
}

export function translateWorkspaceUserStatus(
  status: WorkspaceUserStatus,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<WorkspaceUserStatus, string> = {
      active: "Aktywny",
      pending: "Oczekujący",
    };

    return labels[status];
  }

  return status === "active" ? "Active" : "Pending";
}

export function translateWorkspaceProviderStatus(
  status: WorkspaceProviderStatus,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<WorkspaceProviderStatus, string> = {
      local: "Lokalne",
      manual_required: "Wymaga decyzji",
      planned: "Planowane",
      configured: "Skonfigurowane",
    };

    return labels[status];
  }

  if (status === "configured") {
    return "Configured";
  }

  if (status === "manual_required") {
    return "Manual Required";
  }

  return status === "local" ? "Local" : "Planned";
}

export function translateWorkspaceReadinessCategory(
  category: WorkspaceReadinessCategory,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<WorkspaceReadinessCategory, string> = {
      data: "Dane",
      auth: "Auth",
      email: "Email",
      storage: "Pliki",
      ai: "AI",
      hosting: "Hosting",
    };

    return labels[category];
  }

  const labels: Record<WorkspaceReadinessCategory, string> = {
    data: "Data",
    auth: "Auth",
    email: "Email",
    storage: "Storage",
    ai: "AI",
    hosting: "Hosting",
  };

  return labels[category];
}

export function getLocalizedWorkspaceIntegrationStatuses(
  language: LanguagePreference = "English"
) {
  if (language === "English") {
    return workspaceIntegrationStatuses;
  }

  const localizedCopy: Record<
    WorkspaceIntegrationStatus["id"],
    Pick<WorkspaceIntegrationStatus, "label" | "summary" | "nextStep">
  > = {
    database: {
      label: "Baza danych",
      summary:
        "Dane skrzynki, historia aktywności i metadane bazy wiedzy są obecnie zapisywane przez lokalne adaptery oparte na JSON.",
      nextStep:
        "Wybierz hostowaną lub własną bazę danych, a potem podmień adaptery bez zmiany tras ani stron.",
    },
    auth: {
      label: "Uwierzytelnianie",
      summary: "Nie ma jeszcze logowania ani egzekwowania ról.",
      nextStep: "Wybierz dostawcę auth i zdefiniuj role oraz uprawnienia.",
    },
    "file-storage": {
      label: "Przechowywanie plików",
      summary:
        "Pliki dokumentów bazy wiedzy przechodzą teraz przez adapter plików oddzielnie od ich rekordów metadanych.",
      nextStep:
        "Wybierz produkcyjne przechowywanie obiektów dla dokumentów i retencji, a potem podłącz je za adapterem.",
    },
    "ai-provider": {
      label: "Dostawca szkiców AI",
      summary:
        "Szkice domyślnie korzystają z lokalnego adaptera testowego, ale aplikacja może już przełączyć się na adapter OpenAI po konfiguracji.",
      nextStep:
        "Ustaw EDUMAILAI_AI_DRAFT_ADAPTER=openai i dodaj klucz API, aby przenieść generowanie odpowiedzi na żywy model.",
    },
    "email-inbox": {
      label: "Integracja skrzynki",
      summary:
        "Żywa synchronizacja skrzynki może teraz działać przez Microsoft Graph, a ręczne przyjęcie nadal pozostaje lokalnym fallbackiem.",
      nextStep:
        "Skonfiguruj poświadczenia skrzynki Microsoft Graph i włącz synchronizację wspólnej skrzynki.",
    },
    "email-outbound": {
      label: "Poczta wychodząca",
      summary:
        "Zatwierdzone odpowiedzi mogą już wychodzić przez Microsoft Graph, a lokalny przepływ Auto-sent pozostaje ścieżką zapasową.",
      nextStep:
        "Skonfiguruj wychodzącą pocztę Microsoft Graph, aby zatwierdzone odpowiedzi trafiały do prawdziwych odbiorców.",
    },
    hosting: {
      label: "Hosting i obserwowalność",
      summary:
        "Prototyp działa lokalnie i nie ma jeszcze konfiguracji wdrożenia ani monitoringu.",
      nextStep:
        "Wybierz platformę hostingową i podstawowy monitoring przed uruchomieniem.",
    },
  };

  return workspaceIntegrationStatuses.map((integration) => ({
    ...integration,
    ...localizedCopy[integration.id],
  }));
}

export function getLocalizedWorkspaceFutureDomainModel(
  language: LanguagePreference = "English"
) {
  if (language === "English") {
    return workspaceFutureDomainModel;
  }

  const localizedCopy: Record<
    WorkspaceDomainEntity["id"],
    Pick<WorkspaceDomainEntity, "label" | "description">
  > = {
    users: {
      label: "Użytkownicy i role",
      description:
        "Tożsamość pracowników, przypisanie ról, uprawnienia zatwierdzania i zasady własności.",
    },
    messages: {
      label: "Wiadomości",
      description:
        "Przychodzące emaile, stan routingu, szkice odpowiedzi i wyniki przeglądu.",
    },
    ownership: {
      label: "Własność i notatki",
      description:
        "Własność spraw, notatki wewnętrzne, powody eskalacji i znaczniki ostatniej aktualizacji.",
    },
    documents: {
      label: "Dokumenty wiedzy",
      description:
        "Metadane referencyjne, oddzielne zasoby plikowe, kategorie, podglądy i relacje cytowań.",
    },
    activity: {
      label: "Zdarzenia aktywności",
      description:
        "Historia przepływu dla zatwierdzeń, przypisań, zmian notatek i działań na dokumentach.",
    },
  };

  return workspaceFutureDomainModel.map((entity) => ({
    ...entity,
    ...localizedCopy[entity.id],
  }));
}

export function getLocalizedWorkspaceManualWorkItems(
  language: LanguagePreference = "English"
) {
  if (language === "English") {
    return workspaceManualWorkItems;
  }

  const localizedCopy: Record<
    WorkspaceManualWorkItem["id"],
    Pick<WorkspaceManualWorkItem, "label" | "description">
  > = {
    providers: {
      label: "Wybierz produkcyjnych dostawców",
      description:
        "Wskaż bazę danych, auth, przechowywanie plików, AI, integrację skrzynki i hosting.",
    },
    access: {
      label: "Utwórz projekty i dostępy",
      description:
        "Skonfiguruj konta, klucze API, zmienne środowiskowe i dostęp do wdrożeń.",
    },
    rules: {
      label: "Zdefiniuj reguły pracy",
      description:
        "Ustal kto może zatwierdzać, przypisywać, wysyłać automatycznie i przechowywać historię.",
    },
    data: {
      label: "Dostarcz prawdziwe dane operacyjne",
      description:
        "Dodaj pliki polityk, prawdziwą listę pracowników, wzorce maili i dopracowaną taksonomię.",
    },
  };

  return workspaceManualWorkItems.map((item) => ({
    ...item,
    ...localizedCopy[item.id],
  }));
}

export function getLocalizedWorkspaceWorkflowStages(
  language: LanguagePreference = "English"
) {
  if (language === "English") {
    return workspaceWorkflowStages;
  }

  const localizedCopy: Record<
    WorkspaceWorkflowStage["id"],
    Pick<WorkspaceWorkflowStage, "label" | "description">
  > = {
    created: {
      label: "Utworzono",
      description:
        "Sprawa trafia do systemu przez ręczne przyjęcie lub przyszłe pobranie emaila.",
    },
    routed: {
      label: "Skierowano",
      description:
        "Warstwa lokalnego routingu sugeruje dział, właścicieli i ryzyko eskalacji.",
    },
    assigned: {
      label: "Przypisano",
      description:
        "Pracownik przejmuje odpowiedzialność za przegląd i obsługę odpowiedzi.",
    },
    reviewed: {
      label: "Przejrzano",
      description:
        "Szkice, notatki, źródła i sygnały routingu są sprawdzane przez człowieka.",
    },
    approved: {
      label: "Zatwierdzono lub eskalowano",
      description:
        "Sprawa zostaje zatwierdzona do wysyłki albo pozostaje w ręcznej obsłudze eskalacji.",
    },
  };

  return workspaceWorkflowStages.map((stage) => ({
    ...stage,
    ...localizedCopy[stage.id],
  }));
}
