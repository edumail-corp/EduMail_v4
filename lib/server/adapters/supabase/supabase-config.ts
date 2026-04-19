import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";

export type SupabaseStorageConfig = {
  projectUrl: string;
  serviceKey: string;
  bucketName: string;
  projectRef: string | null;
};

function normalizeEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeProjectUrl(value: string) {
  const trimmedValue = value.trim().replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(trimmedValue);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch {
    return null;
  }
}

function parseProjectRefFromConnectionString() {
  const configuredDatabase = getConfiguredDatabaseUrl();

  if (!configuredDatabase || configuredDatabase.driver !== "postgres") {
    return null;
  }

  try {
    const parsedUrl = new URL(configuredDatabase.connectionString);
    const normalizedUsername = parsedUrl.username.trim();

    if (normalizedUsername.startsWith("postgres.")) {
      const projectRef = normalizedUsername.slice("postgres.".length).trim();
      return projectRef.length > 0 ? projectRef : null;
    }

    const hostnameSegments = parsedUrl.hostname.split(".").filter(Boolean);

    if (hostnameSegments[0] === "db" && hostnameSegments.length >= 2) {
      return hostnameSegments[1] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getConfiguredSupabaseProjectUrl() {
  const explicitProjectUrl = normalizeEnvValue(process.env.EDUMAILAI_SUPABASE_URL);

  if (explicitProjectUrl) {
    return normalizeProjectUrl(explicitProjectUrl);
  }

  const projectRef = parseProjectRefFromConnectionString();

  return projectRef ? `https://${projectRef}.supabase.co` : null;
}

export function getConfiguredSupabaseStorage() {
  const projectUrl = getConfiguredSupabaseProjectUrl();
  const serviceKey = normalizeEnvValue(process.env.EDUMAILAI_SUPABASE_SERVICE_KEY);
  const bucketName = normalizeEnvValue(process.env.EDUMAILAI_FILE_STORAGE_BUCKET);

  if (!projectUrl || !serviceKey || !bucketName) {
    return null;
  }

  return {
    projectUrl,
    serviceKey,
    bucketName,
    projectRef: parseProjectRefFromConnectionString(),
  } satisfies SupabaseStorageConfig;
}

export function hasConfiguredSupabaseStorage() {
  return getConfiguredSupabaseStorage() !== null;
}
