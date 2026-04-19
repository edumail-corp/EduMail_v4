import type {
  WorkspaceEnvironmentSignal,
  WorkspaceProviderStatus,
  WorkspaceReadinessCategory,
} from "@/lib/workspace-config";
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

const environmentSignalDefinitions: readonly EnvironmentSignalDefinition[] = [
  {
    id: "database-contract",
    label: "Database Contract",
    category: "data",
    requiredEnvVars: ["EDUMAILAI_DATABASE_URL"],
    getSummary(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto URL produkcyjnej bazy danych, ale adapter bazy nie został jeszcze podłączony do rejestru usług."
          : "A production database URL is configured, but the database adapter has not been connected to the service registry yet.";
      }

      return language === "Polish"
        ? "Nie ustawiono jeszcze produkcyjnego połączenia z bazą danych. Skrzynka, aktywność i metadane nadal działają lokalnie."
        : "No production database connection is configured yet. Mailbox, activity, and metadata are still running locally.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Następnym krokiem jest wdrożenie adaptera database na tym kontrakcie i przełączenie usług po testach parzystości."
          : "Next, implement the database adapter on this contract and switch the services after parity testing.";
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
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto konfigurację dostawcy auth, ale logowanie i role nie są jeszcze wdrożone w interfejsie."
          : "An auth provider setting is present, but sign-in and role enforcement are not implemented yet.";
      }

      return language === "Polish"
        ? "Brakuje jeszcze wyboru dostawcy auth i zasad dostępu dla workspace."
        : "Auth provider selection and access rules are still missing.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Dodaj warstwę tożsamości, członkostwo workspace i uprawnienia ról bez zmiany usług domenowych."
          : "Add identity, workspace membership, and role permissions without changing the domain services.";
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
    requiredEnvVars: ["EDUMAILAI_FILE_STORAGE_BUCKET"],
    getSummary(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Wykryto docelowy bucket dla plików, ale adapter storage nadal działa lokalnie."
          : "A target file-storage bucket is configured, but the storage adapter still runs locally.";
      }

      return language === "Polish"
        ? "Dokumenty bazy wiedzy są nadal przechowywane lokalnie na dysku tego środowiska."
        : "Knowledge-base document binaries are still stored on this environment's local disk.";
    },
    getNextStep(configuredEnvVars, language) {
      if (configuredEnvVars.length > 0) {
        return language === "Polish"
          ? "Dodaj produkcyjny adapter blob/S3 i zachowaj obecny podział metadanych oraz binariów."
          : "Add a production blob/S3 adapter while keeping the current metadata-versus-binary split.";
      }

      return language === "Polish"
        ? "Wybierz dostawcę przechowywania plików i ustaw EDUMAILAI_FILE_STORAGE_BUCKET."
        : "Choose a file-storage provider and set EDUMAILAI_FILE_STORAGE_BUCKET.";
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
