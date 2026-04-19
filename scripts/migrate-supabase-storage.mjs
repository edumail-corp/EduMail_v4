import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const projectRoot = process.cwd();
const dataRoot = path.join(projectRoot, "data");
const envPath = path.join(projectRoot, ".env.local");

function parseEnvFile(text) {
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }

  return env;
}

function normalizeProjectUrl(value) {
  try {
    const parsedUrl = new URL(value.trim().replace(/\/+$/, ""));
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch {
    return null;
  }
}

function deriveSupabaseProjectUrl(databaseUrl) {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(databaseUrl);

    if (parsedUrl.username.startsWith("postgres.")) {
      const projectRef = parsedUrl.username.slice("postgres.".length).trim();
      return projectRef ? `https://${projectRef}.supabase.co` : null;
    }

    const hostnameSegments = parsedUrl.hostname.split(".").filter(Boolean);

    if (hostnameSegments[0] === "db" && hostnameSegments.length >= 2) {
      return `https://${hostnameSegments[1]}.supabase.co`;
    }
  } catch {
    return null;
  }

  return null;
}

async function getKnowledgeDocumentRecords(env) {
  if (env.EDUMAILAI_KNOWLEDGE_BASE_ADAPTER === "database" && env.EDUMAILAI_DATABASE_URL) {
    const client = new Client({
      connectionString: env.EDUMAILAI_DATABASE_URL,
      ssl:
        env.EDUMAILAI_DATABASE_SSL_MODE === "require"
          ? { rejectUnauthorized: false }
          : undefined,
    });

    await client.connect();

    try {
      const result = await client.query(`
        SELECT id, name, mime_type, size_in_bytes, file_asset_json
        FROM knowledge_documents
        ORDER BY uploaded_at DESC, id DESC
      `);

      return result.rows
        .map((row) => ({
          id: row.id,
          name: row.name,
          mimeType: row.mime_type ?? undefined,
          sizeInBytes: row.size_in_bytes ?? undefined,
          fileAsset:
            typeof row.file_asset_json === "string"
              ? JSON.parse(row.file_asset_json)
              : row.file_asset_json,
        }))
        .filter(
          (record) =>
            record.fileAsset?.storageKey &&
            (record.fileAsset.storageProvider ?? "local") !== "supabase_storage"
        );
    } finally {
      await client.end();
    }
  }

  const metadataPath = path.join(dataRoot, "knowledge-base-documents.json");
  const metadataText = await readFile(metadataPath, "utf8");
  const metadata = JSON.parse(metadataText);

  return metadata.filter(
    (record) =>
      record.fileAsset?.storageKey &&
      (record.fileAsset.storageProvider ?? "local") !== "supabase_storage"
  );
}

async function ensureBucketExists(supabase, bucketName) {
  const existingBucket = await supabase.storage.getBucket(bucketName);

  if (!existingBucket.error && existingBucket.data) {
    return;
  }

  if (
    existingBucket.error &&
    !existingBucket.error.message.toLowerCase().includes("not found")
  ) {
    throw new Error(existingBucket.error.message);
  }

  const createdBucket = await supabase.storage.createBucket(bucketName, {
    public: false,
  });

  if (
    createdBucket.error &&
    !createdBucket.error.message.toLowerCase().includes("already exists")
  ) {
    throw new Error(createdBucket.error.message);
  }
}

async function main() {
  const envText = await readFile(envPath, "utf8");
  const env = parseEnvFile(envText);
  const bucketName = env.EDUMAILAI_FILE_STORAGE_BUCKET?.trim();
  const serviceKey = env.EDUMAILAI_SUPABASE_SERVICE_KEY?.trim();
  const projectUrl =
    normalizeProjectUrl(env.EDUMAILAI_SUPABASE_URL ?? "") ??
    deriveSupabaseProjectUrl(env.EDUMAILAI_DATABASE_URL);

  if (!bucketName || !serviceKey || !projectUrl) {
    throw new Error(
      "Supabase storage migration requires EDUMAILAI_FILE_STORAGE_BUCKET, EDUMAILAI_SUPABASE_SERVICE_KEY, and a Supabase project URL or database URL in .env.local."
    );
  }

  const supabase = createClient(projectUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await ensureBucketExists(supabase, bucketName);

  const records = await getKnowledgeDocumentRecords(env);
  let uploadedCount = 0;
  let skippedCount = 0;
  const missingFiles = [];

  for (const record of records) {
    const storageKey = record.fileAsset.storageKey;
    const sourcePath = path.join(dataRoot, ...storageKey.split("/"));

    let fileBuffer;

    try {
      fileBuffer = await readFile(sourcePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        missingFiles.push(storageKey);
        continue;
      }

      throw error;
    }

    const uploadResult = await supabase.storage.from(bucketName).upload(storageKey, fileBuffer, {
      contentType: record.fileAsset.mimeType ?? record.mimeType ?? "application/octet-stream",
      upsert: false,
    });

    if (uploadResult.error) {
      const message = uploadResult.error.message.toLowerCase();

      if (message.includes("already exists") || message.includes("duplicate")) {
        skippedCount += 1;
        continue;
      }

      throw new Error(
        `Unable to upload ${storageKey} to Supabase Storage: ${uploadResult.error.message}`
      );
    }

    uploadedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        projectUrl,
        bucketName,
        totalRecords: records.length,
        uploadedCount,
        skippedCount,
        missingLocalFiles: missingFiles,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
