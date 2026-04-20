import type { WorkspaceSettingsAdapter } from "@/lib/server/adapters/contracts";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { listConfiguredAdapterBindings } from "@/lib/server/adapters/provider-config";
import { getMailRuntimeStatus } from "@/lib/server/mail-provider-config";
import { getConfiguredSupabaseStorage } from "@/lib/server/adapters/supabase/supabase-config";
import { getWorkspaceStaffDirectoryData } from "@/lib/server/workspace-staff-directory";
import { getWorkspaceEnvironmentSignals } from "@/lib/server/workspace-environment-signals";
import { getWorkspaceLocalStorageSummary } from "@/lib/server/workspace-storage-audit";
import { hasConfiguredSupabaseAuth } from "@/lib/supabase-auth";
import {
  getLocalizedWorkspaceFutureDomainModel,
  getLocalizedWorkspaceIntegrationStatuses,
  getLocalizedWorkspaceManualWorkItems,
  getLocalizedWorkspaceWorkflowStages,
  type WorkspaceProviderStatus,
  workspaceOperatingDepartments,
} from "@/lib/workspace-config";

function getLocalizedAdapterBindings(language: "English" | "Polish") {
  return listConfiguredAdapterBindings().map((binding) => {
    const activeProviderLabel = binding.activeProvider.toUpperCase();
    const requestedProviderLabel = binding.requestedProvider?.toUpperCase() ?? null;
    const plannedProvidersLabel = binding.plannedProviders
      .map((provider) => provider.toUpperCase())
      .join(", ");
    const hasPlannedProviders = binding.plannedProviders.length > 0;
    const bindingStatus: WorkspaceProviderStatus = binding.fallbackToLocal
      ? "manual_required"
      : "local";

    if (language === "Polish") {
      return {
        id: binding.id,
        label: binding.label,
        envVarName: binding.envVarName,
        activeProvider: binding.activeProvider,
        requestedProvider: binding.requestedProvider,
        status: bindingStatus,
        summary: binding.fallbackToLocal
          ? `Zażądano dostawcy ${requestedProviderLabel}, ale aplikacja nadal działa na lokalnym adapterze ${activeProviderLabel}.`
          : `Adapter działa obecnie na dostawcy ${activeProviderLabel}.`,
        nextStep: binding.fallbackToLocal
          ? `Dodaj implementację ${requestedProviderLabel} lub ustaw ${binding.envVarName}=local.`
          : hasPlannedProviders
            ? `Przyszłe opcje dla tego adaptera: ${plannedProvidersLabel}.`
            : "Ten adapter ma już zdefiniowany bieżący kontrakt i czeka na produkcyjne wdrożenie.",
      };
    }

    return {
      id: binding.id,
      label: binding.label,
      envVarName: binding.envVarName,
      activeProvider: binding.activeProvider,
      requestedProvider: binding.requestedProvider,
      status: bindingStatus,
      summary: binding.fallbackToLocal
        ? `Requested provider ${requestedProviderLabel}, but the app is still running on the ${activeProviderLabel} local adapter.`
        : `This adapter is currently running on the ${activeProviderLabel} provider.`,
      nextStep: binding.fallbackToLocal
        ? `Implement ${requestedProviderLabel} or reset ${binding.envVarName}=local.`
        : hasPlannedProviders
          ? `Future provider options for this adapter: ${plannedProvidersLabel}.`
          : "This adapter already has its current contract defined and is waiting for a production implementation.",
    };
  });
}

export const localWorkspaceSettingsAdapter: WorkspaceSettingsAdapter = {
  async getSnapshot(options) {
    const language = options?.language ?? "English";
    const configuredDatabase = getConfiguredDatabaseUrl();
    const configuredSupabaseStorage = getConfiguredSupabaseStorage();
    const adapterBindings = getLocalizedAdapterBindings(language);
    const workspaceSettingsBinding = adapterBindings.find(
      (binding) => binding.id === "workspace-settings"
    );
    const environmentSignals = getWorkspaceEnvironmentSignals(language);
    const staffDirectoryData = await getWorkspaceStaffDirectoryData();
    const operationalBindings = adapterBindings.filter((binding) =>
      ["mailbox", "knowledge-base", "activity"].includes(binding.id)
    );
    const hasSQLiteOperationalBinding = operationalBindings.some(
      (binding) => binding.activeProvider === "sqlite"
    );
    const hasDatabaseOperationalBinding = operationalBindings.some(
      (binding) => binding.activeProvider === "database"
    );
    const hasJsonFileOperationalBinding = operationalBindings.some(
      (binding) => binding.activeProvider === "json_file"
    );
    const hasSupabaseStorageBinding = adapterBindings.some(
      (binding) =>
        binding.id === "file-storage" &&
        binding.activeProvider === "supabase_storage"
    );
    const hasConfiguredAuth = hasConfiguredSupabaseAuth();
    const mailRuntimeStatus = getMailRuntimeStatus();
    const integrations = getLocalizedWorkspaceIntegrationStatuses(language).map(
      (integration) =>
        integration.id === "ai-provider" && options?.draftProvider
          ? {
              ...integration,
              summary: options.draftProvider.summary,
              nextStep: options.draftProvider.nextStep,
            }
          : integration.id === "database" && hasDatabaseOperationalBinding
            ? {
                ...integration,
                summary:
                  configuredDatabase?.driver === "postgres"
                    ? language === "Polish"
                      ? "Skrzynka, aktywność i metadane bazy wiedzy działają teraz przez adapter PostgreSQL/Supabase sterowany zmienną EDUMAILAI_DATABASE_URL."
                      : "Mailbox, activity, and knowledge-base metadata are now running through the PostgreSQL/Supabase adapter controlled by EDUMAILAI_DATABASE_URL."
                    : language === "Polish"
                      ? "Skrzynka, aktywność i metadane bazy wiedzy działają teraz przez ogólny adapter database sterowany zmienną EDUMAILAI_DATABASE_URL."
                      : "Mailbox, activity, and knowledge-base metadata are now running through the generic database adapter controlled by EDUMAILAI_DATABASE_URL.",
                nextStep:
                  configuredDatabase?.driver === "postgres"
                    ? language === "Polish"
                      ? "Następnym krokiem jest utrzymanie podziału metadanych i plików, a potem dołożenie auth oraz ingestu inbox bez zmiany usług."
                      : "Next, keep the metadata-versus-file split, then add auth and inbox ingestion without changing the service layer."
                    : language === "Polish"
                      ? "Następnym krokiem jest podłączenie produkcyjnego sterownika bazy przy zachowaniu tego samego kontraktu adaptera."
                      : "The next step is wiring a production database driver behind the same adapter contract.",
              }
          : integration.id === "database" && hasSQLiteOperationalBinding
            ? {
                ...integration,
                summary:
                  language === "Polish"
                    ? "Skrzynka, aktywność i metadane bazy wiedzy działają teraz na lokalnej bazie SQLite za adapterami usług."
                    : "Mailbox, activity, and knowledge-base metadata are now running through a local SQLite database behind the service adapters.",
                nextStep:
                  language === "Polish"
                    ? "Następnym krokiem jest podmiana SQLite na produkcyjną bazę danych przy zachowaniu tych samych kontraktów adapterów."
                    : "The next step is swapping SQLite for a production database while keeping the same adapter contracts.",
              }
            : integration.id === "database" && hasJsonFileOperationalBinding
              ? {
                  ...integration,
                  summary:
                    language === "Polish"
                      ? "Skrzynka, aktywność i metadane bazy wiedzy korzystają z adapterów plików JSON zapisujących rekordy poza warstwą UI."
                      : "Mailbox, activity, and knowledge-base metadata are using JSON-file record adapters behind the UI layer.",
                }
              : integration.id === "file-storage" && hasSupabaseStorageBinding
                ? {
                    ...integration,
                    summary:
                      language === "Polish"
                        ? `Pliki dokumentów bazy wiedzy działają teraz przez Supabase Storage bucket ${configuredSupabaseStorage?.bucketName ?? ""} za tym samym kontraktem file-storage.`
                        : `Knowledge-base document files are now running through the Supabase Storage bucket ${configuredSupabaseStorage?.bucketName ?? ""} behind the same file-storage contract.`,
                    nextStep:
                      language === "Polish"
                        ? "Zweryfikuj upload i pobieranie dokumentów, a potem przenieś istniejące pliki lokalne."
                        : "Verify document upload/download parity, then migrate existing local files.",
                  }
              : integration.id === "auth" && hasConfiguredAuth
                ? {
                    ...integration,
                    status: "configured" as const,
                    summary:
                      workspaceSettingsBinding?.activeProvider === "database"
                        ? language === "Polish"
                          ? "Supabase Auth chroni teraz dashboard i API, a członkostwo workspace jest odczytywane z katalogu pracowników zapisanego w bazie danych."
                          : "Supabase Auth now protects the dashboard and APIs, while workspace membership is read from the database-backed staff directory."
                        : language === "Polish"
                          ? "Supabase Auth chroni teraz dashboard i API, a dostęp pozostaje ograniczony do katalogu pracowników z allowlistą."
                          : "Supabase Auth now protects the dashboard and APIs, while access remains limited to the allowlisted staff directory.",
                    nextStep:
                      workspaceSettingsBinding?.activeProvider === "database"
                        ? language === "Polish"
                          ? "Następnym krokiem jest utrzymanie stabilnej edycji członkostwa i wdrożenie prawdziwego ingestu inbox bez naruszania warstwy usług."
                          : "Next, keep membership editing stable and wire real inbox ingestion without disturbing the service layer."
                        : language === "Polish"
                          ? "Utrzymaj logowanie i podstawowe role, a następnie przenieś członkostwo workspace z katalogu statycznego do bazy danych."
                          : "Keep sign-in and baseline roles stable, then move workspace membership from the static directory into the database.",
                  }
              : integration.id === "email-inbox" && mailRuntimeStatus.hasLiveInboxSync
                ? {
                    ...integration,
                    status: "configured" as const,
                    summary:
                      language === "Polish"
                        ? "Microsoft Graph synchronizuje już żywe wiadomości do skrzynki EduMailAI z deduplikacją po identyfikatorze wiadomości."
                        : "Microsoft Graph is now syncing live mailbox messages into EduMailAI with message-id deduplication.",
                    nextStep:
                      language === "Polish"
                        ? "Przetestuj skrzynkę współdzieloną na prawdziwych wiadomościach i dopiero potem dołóż harmonogram odświeżania lub checkpointy."
                        : "Test the shared mailbox on real traffic, then add scheduled refresh or checkpoints only if the team needs them.",
                  }
              : integration.id === "email-outbound" &&
                  mailRuntimeStatus.hasLiveOutboundSend
                ? {
                    ...integration,
                    status: "configured" as const,
                    summary:
                      language === "Polish"
                        ? "Microsoft Graph wysyła już zatwierdzone odpowiedzi z workspace zamiast kończyć je wyłącznie lokalnie."
                        : "Microsoft Graph is now sending approved replies from the workspace instead of ending them only in the local flow.",
                    nextStep:
                      language === "Polish"
                        ? "Zweryfikuj końcowe dostarczanie odpowiedzi, a potem ewentualnie dołóż monitoring błędów wysyłki."
                        : "Verify end-to-end reply delivery, then add send-failure monitoring if it becomes necessary.",
                  }
              : integration
    );

    return {
      integrations,
      adapterBindings,
      environmentSignals,
      integrationCounts: {
        local: integrations.filter((integration) => integration.status === "local").length,
        manualRequired: integrations.filter(
          (integration) => integration.status === "manual_required"
        ).length,
        planned: integrations.filter((integration) => integration.status === "planned").length,
      },
      staffDirectory: staffDirectoryData.staffDirectory,
      staffDirectorySource: staffDirectoryData.source,
      futureDomainModel: getLocalizedWorkspaceFutureDomainModel(language),
      manualWorkItems: getLocalizedWorkspaceManualWorkItems(language),
      operatingDepartments: workspaceOperatingDepartments,
      workflowStages: getLocalizedWorkspaceWorkflowStages(language),
      localStorage: await getWorkspaceLocalStorageSummary(language),
    };
  },
};
