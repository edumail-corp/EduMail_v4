import { NextResponse } from "next/server";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import { listConfiguredAdapterBindings } from "@/lib/server/adapters/provider-config";
import { getConfiguredSupabaseStorage } from "@/lib/server/adapters/supabase/supabase-config";
import { getWritableDataRootPath } from "@/lib/server/storage-path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasEnv(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value);
}

function getLocalStorageWarning() {
  const fileStorageBinding = listConfiguredAdapterBindings().find(
    (binding) => binding.id === "file-storage"
  );
  const knowledgeBaseBinding = listConfiguredAdapterBindings().find(
    (binding) => binding.id === "knowledge-base"
  );

  if (
    process.env.VERCEL &&
    (fileStorageBinding?.activeProvider === "local" ||
      knowledgeBaseBinding?.activeProvider === "local" ||
      knowledgeBaseBinding?.activeProvider === "json_file")
  ) {
    return "This deployment is still writing some knowledge-base data to Vercel local temp storage. On Vercel that means /tmp-backed data can survive briefly, then disappear across refreshes, instances, or redeploys.";
  }

  return null;
}

export async function GET() {
  const adapterBindings = listConfiguredAdapterBindings();
  const configuredDatabase = getConfiguredDatabaseUrl();
  const configuredSupabaseStorage = getConfiguredSupabaseStorage();

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    runtime: {
      vercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelTargetEnv: process.env.VERCEL_TARGET_ENV ?? null,
      writableDataRootPath: getWritableDataRootPath(),
    },
    envPresence: {
      EDUMAILAI_MAILBOX_ADAPTER: hasEnv("EDUMAILAI_MAILBOX_ADAPTER"),
      EDUMAILAI_KNOWLEDGE_BASE_ADAPTER: hasEnv(
        "EDUMAILAI_KNOWLEDGE_BASE_ADAPTER"
      ),
      EDUMAILAI_ACTIVITY_ADAPTER: hasEnv("EDUMAILAI_ACTIVITY_ADAPTER"),
      EDUMAILAI_DATABASE_URL: hasEnv("EDUMAILAI_DATABASE_URL"),
      EDUMAILAI_DATABASE_SSL_MODE: hasEnv("EDUMAILAI_DATABASE_SSL_MODE"),
      EDUMAILAI_SUPABASE_URL: hasEnv("EDUMAILAI_SUPABASE_URL"),
      EDUMAILAI_SUPABASE_SERVICE_KEY: hasEnv(
        "EDUMAILAI_SUPABASE_SERVICE_KEY"
      ),
      EDUMAILAI_FILE_STORAGE_ADAPTER: hasEnv(
        "EDUMAILAI_FILE_STORAGE_ADAPTER"
      ),
      EDUMAILAI_FILE_STORAGE_BUCKET: hasEnv("EDUMAILAI_FILE_STORAGE_BUCKET"),
    },
    adapterBindings: adapterBindings.map((binding) => ({
      id: binding.id,
      envVarName: binding.envVarName,
      requestedProvider: binding.requestedProvider,
      activeProvider: binding.activeProvider,
      fallbackToLocal: binding.fallbackToLocal,
    })),
    database: configuredDatabase
      ? configuredDatabase.driver === "postgres"
        ? {
            configured: true,
            driver: configuredDatabase.driver,
            displayLabel: configuredDatabase.displayLabel,
            host: configuredDatabase.host,
            databaseName: configuredDatabase.databaseName,
          }
        : {
            configured: true,
            driver: configuredDatabase.driver,
            resolvedPath: configuredDatabase.resolvedPath,
          }
      : {
          configured: false,
        },
    supabaseStorage: configuredSupabaseStorage
      ? {
          configured: true,
          projectUrl: configuredSupabaseStorage.projectUrl,
          projectRef: configuredSupabaseStorage.projectRef,
          bucketName: configuredSupabaseStorage.bucketName,
        }
      : {
          configured: false,
        },
    warning: getLocalStorageWarning(),
  });
}
