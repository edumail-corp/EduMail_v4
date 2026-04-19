import type { WorkspaceSettingsAdapter } from "@/lib/server/adapters/contracts";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { listConfiguredAdapterBindings } from "@/lib/server/adapters/provider-config";
import { getConfiguredSupabaseStorage } from "@/lib/server/adapters/supabase/supabase-config";
import { getWorkspaceEnvironmentSignals } from "@/lib/server/workspace-environment-signals";
import { getWorkspaceLocalStorageSummary } from "@/lib/server/workspace-storage-audit";
import {
  getLocalizedWorkspaceFutureDomainModel,
  getLocalizedWorkspaceIntegrationStatuses,
  getLocalizedWorkspaceManualWorkItems,
  getLocalizedWorkspaceWorkflowStages,
  type WorkspaceProviderStatus,
  workspaceOperatingDepartments,
  workspaceStaffDirectory,
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
    const environmentSignals = getWorkspaceEnvironmentSignals(language);
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
      staffDirectory: workspaceStaffDirectory,
      futureDomainModel: getLocalizedWorkspaceFutureDomainModel(language),
      manualWorkItems: getLocalizedWorkspaceManualWorkItems(language),
      operatingDepartments: workspaceOperatingDepartments,
      workflowStages: getLocalizedWorkspaceWorkflowStages(language),
      localStorage: await getWorkspaceLocalStorageSummary(language),
    };
  },
};
