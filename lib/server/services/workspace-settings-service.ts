import {
  workspaceFutureDomainModel,
  workspaceIntegrationStatuses,
  workspaceManualWorkItems,
  workspaceOperatingDepartments,
  workspaceStaffDirectory,
  workspaceWorkflowStages,
} from "@/lib/workspace-config";
import { getAIDraftProviderStatus } from "@/lib/server/services/ai-draft-service";

export async function getWorkspaceSettingsSnapshot() {
  const draftProvider = await getAIDraftProviderStatus();
  const integrations = workspaceIntegrationStatuses.map((integration) =>
    integration.id === "ai-provider"
      ? {
          ...integration,
          summary: draftProvider.summary,
          nextStep: draftProvider.nextStep,
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
    futureDomainModel: workspaceFutureDomainModel,
    manualWorkItems: workspaceManualWorkItems,
    operatingDepartments: workspaceOperatingDepartments,
    workflowStages: workspaceWorkflowStages,
  };
}
