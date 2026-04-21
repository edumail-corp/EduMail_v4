import type {
  WorkspaceEnvironmentSignal,
  WorkspaceProviderStatus,
  WorkspaceReadinessCategory,
} from "@/lib/workspace-config";
import { getConfiguredAdapterBinding } from "@/lib/server/adapters/provider-config";
import {
  getConfiguredInboxProvider,
  getConfiguredOutboundProvider,
  getMailRuntimeStatus,
} from "@/lib/server/mail-provider-config";
import { getOpenAIDraftConfig } from "@/lib/server/adapters/openai/openai-config";
import { hasConfiguredSupabaseStorage } from "@/lib/server/adapters/supabase/supabase-config";
import { hasConfiguredSupabaseAuth } from "@/lib/supabase-auth";
import type { LanguagePreference } from "@/lib/user-preferences";

type EnvironmentSignalDefinition = {
  id: string;
  label: string;
  category: WorkspaceReadinessCategory;
  requiredEnvVars: string[];
  getSummary: (configured: string[], language: LanguagePreference) => string;
  getNextStep: (configured: string[], language: LanguagePreference) => string;
};

function getConfiguredEnvVars(envVarNames: string[]) {
  return envVarNames.filter((envVarName) => {
    const value = process.env[envVarName];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function getSignalStatus(
  configuredEnvVars: string[],
  requiredEnvVars: string[]
): WorkspaceProviderStatus {
  if (requiredEnvVars.every((envVarName) => configuredEnvVars.includes(envVarName))) {
    return "configured";
  }

  return "manual_required";
}

function hasOperationalDatabaseAdapterBinding() {
  return (
    getConfiguredAdapterBinding("mailbox").activeProvider === "database" &&
    getConfiguredAdapterBinding("knowledge-base").activeProvider === "database" &&
    getConfiguredAdapterBinding("activity").activeProvider === "database"
  );
}

function hasActiveSupabaseStorageBinding() {
  return getConfiguredAdapterBinding("file-storage").activeProvider === "supabase_storage";
}

const environmentSignalDefinitions: readonly EnvironmentSignalDefinition[] = [
  {
    id: "database-contract",
    label: "Database Contract",
    category: "data",
    requiredEnvVars: ["EDUMAILAI_DATABASE_URL"],
    getSummary(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0 && hasOperationalDatabaseAdapterBinding()) {
        return language === "Polish"
          ? "Skrzynka, aktywność i metadane bazy wiedzy działają już przez aktywny adapter database bez zmiany tras ani stron."
          : "Mailbox, activity, and knowledge-base metadata are already running through the active database adapter without route or page changes.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto URL bazy danych. Wspólny adapter database może teraz uruchamiać skrzynkę, aktywność i metadane na SQLite albo PostgreSQL/Supabase bez zmian w trasach."
          : "A database URL is configured. The shared database adapter can now run mailbox, activity, and metadata on SQLite or PostgreSQL/Supabase without route changes.";
      }

      return language === "Polish"
        ? "Nie ustawiono jeszcze produkcyjnego połączenia z bazą danych. Skrzynka, aktywność i metadane nadal działają lokalnie."
        : "No production database connection is configured yet. Mailbox, activity, and metadata are still running locally.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0 && hasOperationalDatabaseAdapterBinding()) {
        return language === "Polish"
          ? "Utrzymaj parzystość workflow za adapterami, a następnie dołóż auth i prawdziwy ingest inbox bez naruszania warstwy usług."
          : "Keep workflow parity behind the adapters, then add auth and real inbox ingestion without disturbing the service layer.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Przełącz odpowiednie adaptery na tryb database, zweryfikuj parzystość workflow i utrzymaj pliki bazy wiedzy na osobnym adapterze storage."
          : "Switch the relevant adapters to database mode, verify workflow parity, and keep knowledge-base files on their separate storage adapter.";
      }

      return language === "Polish"
        ? "Wybierz bazę danych i ustaw EDUMAILAI_DATABASE_URL, gdy decyzja o dostawcy będzie ostateczna."
        : "Choose a database and set EDUMAILAI_DATABASE_URL once the provider decision is final.";
    },
  },
  {
    id: "auth-contract",
    label: "Authentication Contract",
    category: "auth",
    requiredEnvVars: ["EDUMAILAI_AUTH_PROVIDER"],
    getSummary(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0 && hasConfiguredSupabaseAuth()) {
        return getConfiguredAdapterBinding("workspace-settings").activeProvider ===
          "database"
          ? language === "Polish"
            ? "Supabase Auth chroni już dashboard i API, a członkostwo workspace jest odczytywane z katalogu pracowników zapisanego w bazie danych."
            : "Supabase Auth is already protecting the dashboard and APIs, while workspace membership is read from the database-backed staff directory."
          : language === "Polish"
            ? "Supabase Auth chroni już dashboard i API, a dostęp nadal opiera się na katalogu pracowników z allowlistą."
            : "Supabase Auth is already protecting the dashboard and APIs, while access still relies on the allowlisted staff directory.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto konfigurację dostawcy auth, ale brakuje jeszcze publicznej konfiguracji Supabase potrzebnej do logowania pracowników."
          : "An auth provider setting is present, but the public Supabase configuration required for staff sign-in is still missing.";
      }

      return language === "Polish"
        ? "Brakuje jeszcze wyboru dostawcy auth i zasad dostępu dla workspace."
        : "Auth provider selection and access rules are still missing.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0 && hasConfiguredSupabaseAuth()) {
        return getConfiguredAdapterBinding("workspace-settings").activeProvider ===
          "database"
          ? language === "Polish"
            ? "Następnym krokiem jest utrzymanie stabilnej edycji członkostwa i wdrożenie prawdziwego ingestu inbox."
            : "Next, keep membership editing stable and implement real inbox ingestion."
          : language === "Polish"
            ? "Utrzymaj logowanie i bazowe role, a potem przenieś katalog pracowników oraz członkostwo workspace do bazy danych."
            : "Keep sign-in and baseline roles stable, then move the staff directory and workspace membership into the database.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, a potem zweryfikuj logowanie Google, Microsoft i magic link."
          : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then verify Google, Microsoft, and magic-link sign-in.";
      }

      return language === "Polish"
        ? "Ustal dostawcę auth i politykę ról, a potem ustaw EDUMAILAI_AUTH_PROVIDER."
        : "Choose an auth provider and role policy, then set EDUMAILAI_AUTH_PROVIDER.";
    },
  },
  {
    id: "email-contract",
    label: "Inbox Contract",
    category: "email",
    requiredEnvVars: [
      "EDUMAILAI_INBOX_PROVIDER",
      "EDUMAILAI_MICROSOFT_TENANT_ID",
      "EDUMAILAI_MICROSOFT_CLIENT_ID",
      "EDUMAILAI_MICROSOFT_CLIENT_SECRET",
      "EDUMAILAI_MICROSOFT_MAILBOX_USER",
    ],
    getSummary(configuredEnvVars, language) {
      const runtimeStatus = getMailRuntimeStatus();

      if (runtimeStatus.hasLiveInboxSync) {
        return language === "Polish"
          ? "Microsoft Graph może już importować żywe wiadomości do skrzynki EduMailAI z zachowaniem deduplikacji po identyfikatorze wiadomości."
          : "Microsoft Graph can now import live inbox messages into EduMailAI with message-id deduplication.";
      }

      if (getConfiguredInboxProvider() === "microsoft_graph") {
        return language === "Polish"
          ? "Wybrano Microsoft Graph dla skrzynki, ale brakuje jeszcze pełnego zestawu poświadczeń dla żywej synchronizacji."
          : "Microsoft Graph is selected for inbox sync, but the mailbox credentials are still incomplete.";
      }

      return language === "Polish"
        ? "Żywy provider skrzynki nie jest jeszcze skonfigurowany, więc workspace nadal polega na ręcznym tworzeniu spraw."
        : "No live inbox provider is configured yet, so the workspace still relies on manual case creation.";
    },
    getNextStep(configuredEnvVars, language) {
      if (getMailRuntimeStatus().hasLiveInboxSync) {
        return language === "Polish"
          ? "Przetestuj synchronizację wspólnej skrzynki na prawdziwym ruchu i potwierdź, że checkpoint oraz ewentualne odświeżanie harmonogramem działają zgodnie z oczekiwaniami."
          : "Test the shared-mailbox sync flow on real traffic and confirm the checkpoint plus any scheduled refresh behave as expected.";
      }

      if (getConfiguredInboxProvider() === "microsoft_graph") {
        return language === "Polish"
          ? "Dodaj tenant ID, client ID, client secret oraz EDUMAILAI_MICROSOFT_MAILBOX_USER, aby uruchomić żywy import z Microsoft Graph."
          : "Add the tenant ID, client ID, client secret, and EDUMAILAI_MICROSOFT_MAILBOX_USER to enable live Microsoft Graph import.";
      }

      return language === "Polish"
        ? "Ustaw EDUMAILAI_INBOX_PROVIDER=microsoft_graph i przygotuj poświadczenia dla współdzielonej skrzynki."
        : "Set EDUMAILAI_INBOX_PROVIDER=microsoft_graph and prepare the shared-mailbox credentials.";
    },
  },
  {
    id: "outbound-email-contract",
    label: "Outbound Mail Contract",
    category: "email",
    requiredEnvVars: [
      "EDUMAILAI_OUTBOUND_PROVIDER",
      "EDUMAILAI_MICROSOFT_TENANT_ID",
      "EDUMAILAI_MICROSOFT_CLIENT_ID",
      "EDUMAILAI_MICROSOFT_CLIENT_SECRET",
      "EDUMAILAI_MICROSOFT_MAILBOX_USER",
    ],
    getSummary(configuredEnvVars, language) {
      const runtimeStatus = getMailRuntimeStatus();

      if (runtimeStatus.hasLiveOutboundSend) {
        return language === "Polish"
          ? "Microsoft Graph może już wysyłać zatwierdzone odpowiedzi bezpośrednio z workspace."
          : "Microsoft Graph can now send approved replies directly from the workspace.";
      }

      if (getConfiguredOutboundProvider() === "microsoft_graph") {
        return language === "Polish"
          ? "Wybrano Microsoft Graph dla poczty wychodzącej, ale brakuje jeszcze pełnych poświadczeń do wysyłki."
          : "Microsoft Graph is selected for outbound mail, but the send credentials are still incomplete.";
      }

      return language === "Polish"
        ? "Zatwierdzone odpowiedzi nadal kończą się w lokalnym trybie Auto-sent i nie wychodzą do prawdziwej skrzynki."
        : "Approved replies still end in the local Auto-sent mode and are not leaving the workspace yet.";
    },
    getNextStep(configuredEnvVars, language) {
      if (getMailRuntimeStatus().hasLiveOutboundSend) {
        return language === "Polish"
          ? "Zweryfikuj rzeczywistą wysyłkę odpowiedzi, a potem dodaj śledzenie błędów dostarczenia lub sent-items reconciliation, jeśli będzie potrzebne."
          : "Verify real reply delivery, then add delivery-failure tracking or sent-items reconciliation if needed.";
      }

      if (getConfiguredOutboundProvider() === "microsoft_graph") {
        return language === "Polish"
          ? "Dodaj brakujące poświadczenia Microsoft Graph, aby przycisk Approve & Send wysyłał prawdziwe maile."
          : "Add the missing Microsoft Graph credentials so Approve & Send delivers real email.";
      }

      return language === "Polish"
        ? "Ustaw EDUMAILAI_OUTBOUND_PROVIDER=microsoft_graph, aby zatwierdzone odpowiedzi trafiały do prawdziwych odbiorców."
        : "Set EDUMAILAI_OUTBOUND_PROVIDER=microsoft_graph so approved replies go to real recipients.";
    },
  },
  {
    id: "storage-contract",
    label: "File Storage Contract",
    category: "storage",
    requiredEnvVars: ["EDUMAILAI_FILE_STORAGE_BUCKET", "EDUMAILAI_SUPABASE_SERVICE_KEY"],
    getSummary(configuredEnvVars, language) {
      if (hasConfiguredSupabaseStorage() && hasActiveSupabaseStorageBinding()) {
        return language === "Polish"
          ? "Pliki dokumentów bazy wiedzy są już zapisywane przez aktywny adapter Supabase Storage zamiast lokalnego dysku."
          : "Knowledge-base document files are already being written through the active Supabase Storage adapter instead of the local disk.";
      }

      if (hasConfiguredSupabaseStorage()) {
        return language === "Polish"
          ? "Wykryto bucket i klucz usługowy Supabase. Adapter storage może teraz przenieść pliki bazy wiedzy poza lokalny dysk."
          : "A Supabase bucket and service key are configured. The storage adapter can now move knowledge-base files off the local disk.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto część konfiguracji storage, ale adapter plików nie ma jeszcze pełnego zestawu danych dostępowych do Supabase."
          : "Part of the storage configuration is present, but the file-storage adapter does not yet have the full Supabase credentials it needs.";
      }

      return language === "Polish"
        ? "Dokumenty bazy wiedzy są nadal przechowywane lokalnie na dysku tego środowiska."
        : "Knowledge-base document binaries are still stored on this environment's local disk.";
    },
    getNextStep(configuredEnvVars, language) {
      if (hasConfiguredSupabaseStorage() && hasActiveSupabaseStorageBinding()) {
        return language === "Polish"
          ? "Utrzymaj zweryfikowaną parzystość uploadu, pobierania i usuwania, a potem przenieś pozostałe pliki lokalne, jeśli nadal istnieją."
          : "Keep upload, download, and delete parity verified, then migrate any remaining local files if they still exist.";
      }

      if (hasConfiguredSupabaseStorage()) {
        return language === "Polish"
          ? "Ustaw EDUMAILAI_FILE_STORAGE_ADAPTER=supabase_storage, zweryfikuj upload/download dokumentów i zaplanuj migrację istniejących plików lokalnych."
          : "Set EDUMAILAI_FILE_STORAGE_ADAPTER=supabase_storage, verify document upload/download parity, and plan migration of existing local files.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Dodaj brakujące dane dostępu do Supabase Storage, a potem przełącz adapter plików bez zmiany warstwy usług."
          : "Add the missing Supabase Storage credentials, then switch the file adapter without changing the service layer.";
      }

      return language === "Polish"
        ? "Wybierz bucket storage i ustaw EDUMAILAI_FILE_STORAGE_BUCKET oraz EDUMAILAI_SUPABASE_SERVICE_KEY."
        : "Choose a storage bucket and set EDUMAILAI_FILE_STORAGE_BUCKET plus EDUMAILAI_SUPABASE_SERVICE_KEY.";
    },
  },
  {
    id: "ai-contract",
    label: "AI Contract",
    category: "ai",
    requiredEnvVars: ["EDUMAILAI_AI_API_KEY"],
    getSummary(configuredEnvVars, language) {
      const aiDraftBinding = getConfiguredAdapterBinding("ai-draft");
      const openAIConfig = getOpenAIDraftConfig();

      if (aiDraftBinding.activeProvider === "openai" && openAIConfig) {
        return language === "Polish"
          ? `OpenAI (${openAIConfig.model}) generuje teraz szkice odpowiedzi z lokalnym doborem dokumentów bazy wiedzy do ugruntowania.`
          : `OpenAI (${openAIConfig.model}) is now generating reply drafts with local knowledge-base document selection for grounding.`;
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto klucz AI, ale szkice nadal pochodzą z lokalnego adaptera demonstracyjnego."
          : "An AI API key is present, but draft generation still comes from the local demo adapter.";
      }

      return language === "Polish"
        ? "Nie skonfigurowano jeszcze produkcyjnego dostawcy AI dla routingu i szkiców."
        : "No production AI provider is configured yet for routing and drafting.";
    },
    getNextStep(configuredEnvVars, language) {
      const aiDraftBinding = getConfiguredAdapterBinding("ai-draft");

      if (aiDraftBinding.activeProvider === "openai") {
        return language === "Polish"
          ? "Następnym krokiem jest strojenie promptu, ocena jakości szkiców i ewentualne wzbogacenie ugruntowania o pełny tekst dokumentów."
          : "Next, tune the prompt, evaluate draft quality, and consider richer grounding from full document text.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Ustaw EDUMAILAI_AI_DRAFT_ADAPTER=openai, aby przełączyć szkice na adapter produkcyjnego modelu."
          : "Set EDUMAILAI_AI_DRAFT_ADAPTER=openai to switch drafting onto the production model adapter.";
      }

      return language === "Polish"
        ? "Wybierz dostawcę AI i ustaw EDUMAILAI_AI_API_KEY po decyzji produktowej."
        : "Choose an AI provider and set EDUMAILAI_AI_API_KEY once the product decision is final.";
    },
  },
  {
    id: "hosting-contract",
    label: "Hosting and Observability Contract",
    category: "hosting",
    requiredEnvVars: ["EDUMAILAI_HOSTING_PROVIDER", "EDUMAILAI_OBSERVABILITY_PROVIDER"],
    getSummary(configuredEnvVars, language) {
      const hasHostingProvider = configuredEnvVars.includes("EDUMAILAI_HOSTING_PROVIDER");
      const hasObservabilityProvider = configuredEnvVars.includes(
        "EDUMAILAI_OBSERVABILITY_PROVIDER"
      );

      if (hasHostingProvider && hasObservabilityProvider) {
        return language === "Polish"
          ? "Wykryto dostawcę hostingu i obserwowalności, ale wdrożenie oraz alarmy nie są jeszcze skonfigurowane."
          : "Hosting and observability providers are configured, but deployment and alerting are not wired yet.";
      }

      return language === "Polish"
        ? "Brakuje jeszcze wyboru hostingu i podstawowej obserwowalności dla produkcyjnego uruchomienia."
        : "Hosting and baseline observability have not both been chosen yet.";
    },
    getNextStep(configuredEnvVars, language) {
      if (
        configuredEnvVars.includes("EDUMAILAI_HOSTING_PROVIDER") &&
        configuredEnvVars.includes("EDUMAILAI_OBSERVABILITY_PROVIDER")
      ) {
        return language === "Polish"
          ? "Dodaj deployment, logi, alerty i podstawowe runbooki operacyjne za tą konfiguracją."
          : "Add deployment, logging, alerts, and baseline operator runbooks behind this configuration.";
      }

      return language === "Polish"
        ? "Wybierz hosting i obserwowalność, a potem ustaw EDUMAILAI_HOSTING_PROVIDER oraz EDUMAILAI_OBSERVABILITY_PROVIDER."
        : "Choose hosting and observability, then set EDUMAILAI_HOSTING_PROVIDER and EDUMAILAI_OBSERVABILITY_PROVIDER.";
    },
  },
] as const;

export function getWorkspaceEnvironmentSignals(
  language: LanguagePreference = "English"
): WorkspaceEnvironmentSignal[] {
  return environmentSignalDefinitions.map((definition) => {
    const configuredEnvVars = getConfiguredEnvVars(definition.requiredEnvVars);

    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      status: getSignalStatus(configuredEnvVars, definition.requiredEnvVars),
      requiredEnvVars: [...definition.requiredEnvVars],
      configuredEnvVars,
      summary: definition.getSummary(configuredEnvVars, language),
      nextStep: definition.getNextStep(configuredEnvVars, language),
    };
  });
}
