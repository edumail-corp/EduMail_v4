import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FileStorageAdapter } from "@/lib/server/adapters/contracts";
import {
  getConfiguredSupabaseStorage,
  type SupabaseStorageConfig,
} from "@/lib/server/adapters/supabase/supabase-config";

const bucketReadyPromises = new Map<string, Promise<void>>();

function buildBucketCacheKey(config: SupabaseStorageConfig) {
  return `${config.projectUrl}::${config.bucketName}`;
}

function normalizeStorageKey(storageKey: string) {
  const normalizedSegments = storageKey
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (
    normalizedSegments.length === 0 ||
    normalizedSegments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  return normalizedSegments.join("/");
}

function createSupabaseAdminClient(config: SupabaseStorageConfig) {
  return createClient(config.projectUrl, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isNotFoundError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("not found") || message.includes("no such");
}

function isAlreadyExistsError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("already exists") || message.includes("duplicate");
}

async function ensureBucketExists(
  client: SupabaseClient,
  config: SupabaseStorageConfig
) {
  const bucketCacheKey = buildBucketCacheKey(config);
  const existingPromise = bucketReadyPromises.get(bucketCacheKey);

  if (existingPromise) {
    return existingPromise;
  }

  const readyPromise = (async () => {
    const { data, error } = await client.storage.getBucket(config.bucketName);

    if (!error && data) {
      return;
    }

    if (error && !isNotFoundError(error)) {
      throw new Error(
        `Unable to inspect Supabase bucket ${config.bucketName}: ${error.message}`
      );
    }

    const { error: createError } = await client.storage.createBucket(
      config.bucketName,
      {
        public: false,
      }
    );

    if (createError && !isAlreadyExistsError(createError)) {
      throw new Error(
        `Unable to create Supabase bucket ${config.bucketName}: ${createError.message}`
      );
    }
  })().finally(() => {
    bucketReadyPromises.delete(bucketCacheKey);
  });

  bucketReadyPromises.set(bucketCacheKey, readyPromise);
  return readyPromise;
}

export function createSupabaseFileStorageAdapter(
  config: SupabaseStorageConfig = (() => {
    const configuredStorage = getConfiguredSupabaseStorage();

    if (!configuredStorage) {
      throw new Error(
        "Supabase file storage requires EDUMAILAI_SUPABASE_SERVICE_KEY and EDUMAILAI_FILE_STORAGE_BUCKET, plus either EDUMAILAI_SUPABASE_URL or a Supabase-backed EDUMAILAI_DATABASE_URL."
      );
    }

    return configuredStorage;
  })()
): FileStorageAdapter {
  const supabase = createSupabaseAdminClient(config);

  return {
    providerId: "supabase_storage",
    async writeBinaryFile(storageKey, fileBuffer) {
      const objectPath = normalizeStorageKey(storageKey);
      await ensureBucketExists(supabase, config);

      const { error } = await supabase.storage
        .from(config.bucketName)
        .upload(objectPath, fileBuffer, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (error) {
        throw new Error(
          `Unable to write Supabase storage object ${objectPath}: ${error.message}`
        );
      }
    },
    async readBinaryFile(storageKey) {
      const objectPath = normalizeStorageKey(storageKey);
      await ensureBucketExists(supabase, config);

      const { data, error } = await supabase.storage
        .from(config.bucketName)
        .download(objectPath);

      if (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw new Error(
          `Unable to read Supabase storage object ${objectPath}: ${error.message}`
        );
      }

      return Buffer.from(await data.arrayBuffer());
    },
    async deleteBinaryFile(storageKey) {
      const objectPath = normalizeStorageKey(storageKey);
      await ensureBucketExists(supabase, config);

      const { data, error } = await supabase.storage
        .from(config.bucketName)
        .remove([objectPath]);

      if (error) {
        if (isNotFoundError(error)) {
          return false;
        }

        throw new Error(
          `Unable to delete Supabase storage object ${objectPath}: ${error.message}`
        );
      }

      return Array.isArray(data) ? data.length > 0 : true;
    },
  };
}
