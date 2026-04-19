import { hasSupportedConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { hasConfiguredSupabaseStorage } from "@/lib/server/adapters/supabase/supabase-config";

export type AdapterBindingId =
  | "mailbox"
  | "knowledge-base"
  | "activity"
  | "ai-draft"
  | "workspace-settings"
  | "file-storage";

export type AdapterProviderBinding = {
  id: AdapterBindingId;
  label: string;
  envVarName: string;
  requestedProvider: string | null;
  activeProvider: string;
  supportedProviders: readonly string[];
  plannedProviders: readonly string[];
  fallbackToLocal: boolean;
};

type AdapterBindingDefinition = Omit<
  AdapterProviderBinding,
  "requestedProvider" | "activeProvider" | "fallbackToLocal"
> & {
  defaultProvider: string;
};

const adapterBindingDefinitions: readonly AdapterBindingDefinition[] = [
  {
    id: "mailbox",
    label: "Mailbox",
    envVarName: "EDUMAILAI_MAILBOX_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local", "json_file", "sqlite", "database"],
    plannedProviders: ["email_inbox"],
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base Metadata",
    envVarName: "EDUMAILAI_KNOWLEDGE_BASE_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local", "json_file", "sqlite", "database"],
    plannedProviders: [],
  },
  {
    id: "activity",
    label: "Activity Log",
    envVarName: "EDUMAILAI_ACTIVITY_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local", "json_file", "sqlite", "database"],
    plannedProviders: [],
  },
  {
    id: "ai-draft",
    label: "AI Drafting",
    envVarName: "EDUMAILAI_AI_DRAFT_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local"],
    plannedProviders: ["openai", "ai_gateway"],
  },
  {
    id: "workspace-settings",
    label: "Workspace Settings",
    envVarName: "EDUMAILAI_WORKSPACE_SETTINGS_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local"],
    plannedProviders: ["database"],
  },
  {
    id: "file-storage",
    label: "File Storage",
    envVarName: "EDUMAILAI_FILE_STORAGE_ADAPTER",
    defaultProvider: "local",
    supportedProviders: ["local", "supabase_storage"],
    plannedProviders: ["blob", "s3"],
  },
] as const;

const adapterBindingDefinitionMap = new Map(
  adapterBindingDefinitions.map((definition) => [definition.id, definition])
);

function normalizeProviderName(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase() ?? "";
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function buildAdapterBinding(
  definition: AdapterBindingDefinition
): AdapterProviderBinding {
  const requestedProvider = normalizeProviderName(process.env[definition.envVarName]);
  const providerIsSupported =
    requestedProvider !== null &&
    definition.supportedProviders.includes(requestedProvider);
  const providerIsRuntimeReady =
    requestedProvider === "database"
      ? hasSupportedConfiguredDatabaseUrl()
      : requestedProvider === "supabase_storage"
        ? hasConfiguredSupabaseStorage()
        : true;
  const activeProvider =
    providerIsSupported && providerIsRuntimeReady
      ? requestedProvider
      : definition.defaultProvider;

  return {
    id: definition.id,
    label: definition.label,
    envVarName: definition.envVarName,
    requestedProvider,
    activeProvider,
    supportedProviders: definition.supportedProviders,
    plannedProviders: definition.plannedProviders,
    fallbackToLocal:
      requestedProvider !== null && requestedProvider !== activeProvider,
  };
}

export function listConfiguredAdapterBindings() {
  return adapterBindingDefinitions.map(buildAdapterBinding);
}

export function getConfiguredAdapterBinding(id: AdapterBindingId) {
  const definition = adapterBindingDefinitionMap.get(id);

  if (!definition) {
    throw new Error(`Unknown adapter binding: ${id}`);
  }

  return buildAdapterBinding(definition);
}
