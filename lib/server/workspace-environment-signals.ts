import type {
  WorkspaceEnvironmentSignal,
  WorkspaceProviderStatus,
  WorkspaceReadinessCategory,
} from "@/lib/workspace-config";
import { getConfiguredAdapterBinding } from "@/lib/server/adapters/provider-config";
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
        return language === "Polish"
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
        return language === "Polish"
          ? "Utrzymaj logowanie i bazowe role, a potem przenieś katalog pracowników oraz członkostwo workspace do bazy danych."
          : "Keep sign-in and baseline roles stable, then move the staff directory and workspace membership into the database.";
      }

      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, a potem zweryfikuj logowanie Google i magic link."
          : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then verify Google and magic-link sign-in.";
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
    requiredEnvVars: ["EDUMAILAI_INBOX_PROVIDER"],
    getSummary(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto docelowego dostawcę skrzynki, ale synchronizacja wiadomości i checkpointy ingestu nie są jeszcze wdrożone."
          : "A live inbox provider is named, but ingestion sync and checkpoints are not implemented yet.";
      }

      return language === "Polish"
        ? "Nie wybrano jeszcze dostawcy poczty lub helpdesku dla prawdziwego ingestu."
        : "No live mailbox or helpdesk provider has been chosen for real ingestion yet.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Następnym krokiem jest wdrożenie adaptera inbox z normalizacją wiadomości, deduplikacją i checkpointami."
          : "Next, implement the inbox adapter with message normalization, deduplication, and checkpoints.";
      }

      return language === "Polish"
        ? "Wybierz dostawcę inbox/helpdesk i ustaw EDUMAILAI_INBOX_PROVIDER."
        : "Choose an inbox/helpdesk provider and set EDUMAILAI_INBOX_PROVIDER.";
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
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Następnym krokiem jest wdrożenie adaptera AI z ustrukturyzowanymi wynikami i kontrolą ugruntowania."
          : "Next, implement the AI adapter with structured outputs and grounding controls.";
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
