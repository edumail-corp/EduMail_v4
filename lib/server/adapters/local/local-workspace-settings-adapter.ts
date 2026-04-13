import type { WorkspaceSettingsAdapter } from "@/lib/server/adapters/contracts";
import {
  getLocalizedWorkspaceFutureDomainModel,
  getLocalizedWorkspaceIntegrationStatuses,
  getLocalizedWorkspaceManualWorkItems,
  getLocalizedWorkspaceWorkflowStages,
  workspaceOperatingDepartments,
  workspaceStaffDirectory,
} from "@/lib/workspace-config";

export const localWorkspaceSettingsAdapter: WorkspaceSettingsAdapter = {
  async getSnapshot(options) {
    const language = options?.language ?? "English";
    const integrations = getLocalizedWorkspaceIntegrationStatuses(language).map(
      (integration) =>
        integration.id === "ai-provider" && options?.draftProvider
          ? {
              ...integration,
              summary: options.draftProvider.summary,
              nextStep: options.draftProvider.nextStep,
            }
          : integration
    );

    return {
      integrations,
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
    };
  },
};
