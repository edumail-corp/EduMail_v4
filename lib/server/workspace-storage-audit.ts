import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { listConfiguredAdapterBindings } from "@/lib/server/adapters/provider-config";
import { resolveSQLiteDatabasePath } from "@/lib/server/adapters/sqlite/sqlite-database";
import { knowledgeBaseStoragePrefix } from "@/lib/server/knowledge-base-file-storage";
import { getWritableDataPath, getWritableDataRootPath } from "@/lib/server/storage-path";
import type {
  WorkspaceLocalStorageSummary,
  WorkspaceStorageLocation,
} from "@/lib/workspace-config";
import type { LanguagePreference } from "@/lib/user-preferences";

type PathUsage = {
  present: boolean;
  approxSizeBytes: number;
  fileCount: number;
};

async function getPathUsage(targetPath: string): Promise<PathUsage> {
  try {
    const targetStats = await stat(targetPath);

    if (targetStats.isFile()) {
      return {
        present: true,
        approxSizeBytes: targetStats.size,
        fileCount: 1,
      };
    }

    if (!targetStats.isDirectory()) {
      return {
        present: true,
        approxSizeBytes: 0,
        fileCount: 0,
      };
    }

    const entries = await readdir(targetPath, { withFileTypes: true });
    let approxSizeBytes = 0;
    let fileCount = 0;

    for (const entry of entries) {
      const nextPath = path.join(targetPath, entry.name);
      const nextUsage = await getPathUsage(nextPath);
      approxSizeBytes += nextUsage.approxSizeBytes;
      fileCount += nextUsage.fileCount;
    }

    return {
      present: true,
      approxSizeBytes,
      fileCount,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        present: false,
        approxSizeBytes: 0,
        fileCount: 0,
      };
    }

    throw error;
  }
}

function buildLocationSummary(
  present: boolean,
  active: boolean,
  fileCount: number,
  language: LanguagePreference
) {
  if (active) {
    if (language === "Polish") {
      return fileCount === 1
        ? "To jest aktywna lokalizacja zapisu i przechowuje obecnie 1 plik."
        : `To jest aktywna lokalizacja zapisu i przechowuje obecnie ${fileCount} plików.`;
    }

    return fileCount === 1
      ? "This is an active storage location and it currently stores 1 file."
      : `This is an active storage location and it currently stores ${fileCount} files.`;
  }

  if (!present) {
    return language === "Polish"
      ? "Ta lokalizacja nie została jeszcze utworzona w tym środowisku."
      : "This location has not been created in this environment yet.";
  }

  if (language === "Polish") {
    return fileCount === 1
      ? "Ta lokalizacja przechowuje obecnie 1 plik."
      : `Ta lokalizacja przechowuje obecnie ${fileCount} plików.`;
  }

  return fileCount === 1
    ? "This location currently stores 1 file."
    : `This location currently stores ${fileCount} files.`;
}

export async function getWorkspaceLocalStorageSummary(
  language: LanguagePreference = "English"
): Promise<WorkspaceLocalStorageSummary> {
  const adapterBindings = listConfiguredAdapterBindings();
  const mailboxProvider = adapterBindings.find((binding) => binding.id === "mailbox")
    ?.activeProvider;
  const knowledgeBaseProvider = adapterBindings.find(
    (binding) => binding.id === "knowledge-base"
  )?.activeProvider;
  const activityProvider = adapterBindings.find((binding) => binding.id === "activity")
    ?.activeProvider;
  const fileStorageProvider = adapterBindings.find(
    (binding) => binding.id === "file-storage"
  )?.activeProvider;
  const configuredDatabase = getConfiguredDatabaseUrl();
  const sqliteActive =
    mailboxProvider === "sqlite" ||
    knowledgeBaseProvider === "sqlite" ||
    activityProvider === "sqlite";
  const databaseActive =
    mailboxProvider === "database" ||
    knowledgeBaseProvider === "database" ||
    activityProvider === "database";
  const locations: WorkspaceStorageLocation[] = await Promise.all([
    {
      id: "mailbox-json",
      label: language === "Polish" ? "Rekordy skrzynki" : "Mailbox Records",
      kind: "json" as const,
      path: getWritableDataPath("mailbox-cases.json"),
      active: mailboxProvider === "json_file",
    },
    {
      id: "activity-json",
      label: language === "Polish" ? "Zdarzenia aktywności" : "Activity Events",
      kind: "json" as const,
      path: getWritableDataPath("activity-events.json"),
      active: activityProvider === "json_file",
    },
    {
      id: "knowledge-metadata-json",
      label:
        language === "Polish"
          ? "Metadane bazy wiedzy"
          : "Knowledge Metadata",
      kind: "json" as const,
      path: getWritableDataPath("knowledge-base-documents.json"),
      active: knowledgeBaseProvider === "json_file",
    },
    {
      id: "knowledge-binaries",
      label:
        language === "Polish"
          ? "Pliki bazy wiedzy"
          : "Knowledge Document Files",
      kind: "directory" as const,
      path: path.join(getWritableDataRootPath(), knowledgeBaseStoragePrefix),
      active: fileStorageProvider === "local",
    },
    {
      id: "sqlite-database",
      label: language === "Polish" ? "Baza SQLite" : "SQLite Database",
      kind: "sqlite" as const,
      path: databaseActive
        ? configuredDatabase?.resolvedPath ?? resolveSQLiteDatabasePath()
        : resolveSQLiteDatabasePath(),
      active: sqliteActive || databaseActive,
    },
  ].map(async (location) => {
    const usage = await getPathUsage(location.path);

    return {
      ...location,
      present: usage.present,
      approxSizeBytes: usage.approxSizeBytes,
      fileCount: usage.fileCount,
      summary: buildLocationSummary(
        usage.present,
        location.active,
        usage.fileCount,
        language
      ),
    };
  }));

  return {
    rootPath: getWritableDataRootPath(),
    totalTrackedBytes: locations.reduce(
      (total, location) => total + location.approxSizeBytes,
      0
    ),
    totalTrackedFiles: locations.reduce(
      (total, location) => total + location.fileCount,
      0
    ),
    locations,
  };
}
