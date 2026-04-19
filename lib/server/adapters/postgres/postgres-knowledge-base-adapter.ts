import { randomUUID } from "node:crypto";
import {
  buildKnowledgeDocumentPreview,
  buildKnowledgeDocumentSummary,
} from "@/lib/knowledge-base-data";
import type {
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
} from "@/lib/server/adapters/contracts";
import {
  dedupeFileStorageAdapters,
  resolveFileStorageAdapter,
} from "@/lib/server/adapters/file-storage-resolver";
import { loadBootstrapKnowledgeDocumentRecords } from "@/lib/server/adapters/postgres/postgres-bootstrap";
import {
  getPostgresCount,
  parsePostgresJson,
  runPostgresTransaction,
  serializePostgresJson,
  type PostgresDatabaseAccess,
} from "@/lib/server/adapters/postgres/postgres-database";
import {
  buildKnowledgeBaseStorageKey,
} from "@/lib/server/knowledge-base-file-storage";
import {
  toKnowledgeDocument,
  type KnowledgeDocumentRecord,
} from "@/lib/server/knowledge-base-metadata-store";

type PostgresKnowledgeBaseAdapterDependencies = {
  activityAdapter: ActivityAdapter;
  fileStorageAdapter: FileStorageAdapter;
  fileStorageAdapters?: readonly FileStorageAdapter[];
  databaseAccess: PostgresDatabaseAccess;
};

type PostgresKnowledgeDocumentRow = {
  id: string;
  name: string;
  category: KnowledgeDocumentRecord["category"];
  uploaded_at: string;
  pages: number;
  size_in_bytes: number | null;
  mime_type: string | null;
  summary: string;
  preview_excerpt: string;
  origin: KnowledgeDocumentRecord["origin"];
  file_asset_json: unknown;
};

function toKnowledgeDocumentRecord(
  row: PostgresKnowledgeDocumentRow
): KnowledgeDocumentRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    uploadedAt: row.uploaded_at,
    pages: Number(row.pages),
    sizeInBytes:
      typeof row.size_in_bytes === "number" ? row.size_in_bytes : undefined,
    mimeType: row.mime_type ?? undefined,
    summary: row.summary,
    previewExcerpt: row.preview_excerpt,
    origin: row.origin,
    fileAsset: parsePostgresJson<
      KnowledgeDocumentRecord["fileAsset"] | undefined
    >(row.file_asset_json, undefined),
  };
}

function upsertKnowledgeDocumentRecord(
  record: KnowledgeDocumentRecord,
  databaseAccess: PostgresDatabaseAccess
) {
  return databaseAccess.query(
    `
      INSERT INTO knowledge_documents (
        id,
        name,
        category,
        uploaded_at,
        pages,
        size_in_bytes,
        mime_type,
        summary,
        preview_excerpt,
        origin,
        file_asset_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        uploaded_at = EXCLUDED.uploaded_at,
        pages = EXCLUDED.pages,
        size_in_bytes = EXCLUDED.size_in_bytes,
        mime_type = EXCLUDED.mime_type,
        summary = EXCLUDED.summary,
        preview_excerpt = EXCLUDED.preview_excerpt,
        origin = EXCLUDED.origin,
        file_asset_json = EXCLUDED.file_asset_json
    `,
    [
      record.id,
      record.name,
      record.category,
      record.uploadedAt,
      record.pages,
      record.sizeInBytes ?? null,
      record.mimeType ?? null,
      record.summary,
      record.previewExcerpt,
      record.origin,
      record.fileAsset ? serializePostgresJson(record.fileAsset) : null,
    ]
  );
}

export function createPostgresKnowledgeBaseAdapter({
  activityAdapter,
  fileStorageAdapter,
  fileStorageAdapters,
  databaseAccess,
}: PostgresKnowledgeBaseAdapterDependencies): KnowledgeBaseAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;
  const availableFileStorageAdapters = dedupeFileStorageAdapters(
    fileStorageAdapter,
    fileStorageAdapters
  );

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = databaseAccess
      .withClient(async (client) => {
        if ((await getPostgresCount(client, "knowledge_documents")) === 0) {
          const seedRecords = await loadBootstrapKnowledgeDocumentRecords();

          await runPostgresTransaction(client, async () => {
            for (const record of seedRecords) {
              await client.query(
                `
                  INSERT INTO knowledge_documents (
                    id,
                    name,
                    category,
                    uploaded_at,
                    pages,
                    size_in_bytes,
                    mime_type,
                    summary,
                    preview_excerpt,
                    origin,
                    file_asset_json
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
                `,
                [
                  record.id,
                  record.name,
                  record.category,
                  record.uploadedAt,
                  record.pages,
                  record.sizeInBytes ?? null,
                  record.mimeType ?? null,
                  record.summary,
                  record.previewExcerpt,
                  record.origin,
                  record.fileAsset ? serializePostgresJson(record.fileAsset) : null,
                ]
              );
            }
          });
        }

        hasBootstrapped = true;
      })
      .finally(() => {
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  }

  async function listPersistedRecords() {
    await ensureBootstrapped();

    const rows = await databaseAccess.query<PostgresKnowledgeDocumentRow>(
      `
        SELECT
          id,
          name,
          category,
          uploaded_at,
          pages,
          size_in_bytes,
          mime_type,
          summary,
          preview_excerpt,
          origin,
          file_asset_json
        FROM knowledge_documents
        ORDER BY uploaded_at DESC, id DESC
      `
    );

    return rows.map(toKnowledgeDocumentRecord);
  }

  return {
    async listDocuments() {
      const records = await listPersistedRecords();
      return records.map(toKnowledgeDocument);
    },
    async createDocument(input) {
      await ensureBootstrapped();

      const documentId = `DOC-${randomUUID().slice(0, 8)}`;
      const storageKey = buildKnowledgeBaseStorageKey(documentId, input.name);

      await fileStorageAdapter.writeBinaryFile(storageKey, input.fileBuffer);

      try {
        const nextRecord: KnowledgeDocumentRecord = {
          id: documentId,
          name: input.name,
          category: input.category,
          uploadedAt: new Date().toISOString().slice(0, 10),
          pages: input.pages,
          sizeInBytes: input.sizeInBytes,
          mimeType: input.mimeType,
          summary: buildKnowledgeDocumentSummary(input.name, input.category),
          previewExcerpt: buildKnowledgeDocumentPreview(input.name, input.category),
          origin: "uploaded",
          fileAsset: {
            storageKey,
            originalName: input.name,
            mimeType: input.mimeType,
            sizeInBytes: input.sizeInBytes,
            storageProvider: fileStorageAdapter.providerId,
          },
        };
        await upsertKnowledgeDocumentRecord(nextRecord, databaseAccess);

        await activityAdapter.appendEvent({
          action: "document_uploaded",
          entityType: "document",
          entityId: nextRecord.id,
          title: nextRecord.name,
          description: `Added a ${nextRecord.category} document to the library.`,
          href: `/dashboard/knowledge-base?document=${encodeURIComponent(nextRecord.name)}`,
        });

        return toKnowledgeDocument(nextRecord);
      } catch (error) {
        await fileStorageAdapter.deleteBinaryFile(storageKey).catch(() => false);
        throw error;
      }
    },
    async deleteDocument(id) {
      await ensureBootstrapped();

      const rows = await databaseAccess.query<PostgresKnowledgeDocumentRow>(
        `
          SELECT
            id,
            name,
            category,
            uploaded_at,
            pages,
            size_in_bytes,
            mime_type,
            summary,
            preview_excerpt,
            origin,
            file_asset_json
          FROM knowledge_documents
          WHERE id = $1
        `,
        [id]
      );
      const documentToDelete = rows[0] ? toKnowledgeDocumentRecord(rows[0]) : null;

      if (!documentToDelete) {
        return false;
      }

      if (documentToDelete.fileAsset) {
        const documentStorageAdapter = resolveFileStorageAdapter(
          availableFileStorageAdapters,
          documentToDelete.fileAsset.storageProvider,
          fileStorageAdapter
        );
        await documentStorageAdapter.deleteBinaryFile(
          documentToDelete.fileAsset.storageKey
        );
      }

      await databaseAccess.query(`DELETE FROM knowledge_documents WHERE id = $1`, [id]);

      await activityAdapter.appendEvent({
        action: "document_deleted",
        entityType: "document",
        entityId: documentToDelete.id,
        title: documentToDelete.name,
        description: `Removed a ${documentToDelete.category} document from the library.`,
        href: "/dashboard/knowledge-base",
      });

      return true;
    },
    async getDocumentFile(id) {
      await ensureBootstrapped();

      const rows = await databaseAccess.query<PostgresKnowledgeDocumentRow>(
        `
          SELECT
            id,
            name,
            category,
            uploaded_at,
            pages,
            size_in_bytes,
            mime_type,
            summary,
            preview_excerpt,
            origin,
            file_asset_json
          FROM knowledge_documents
          WHERE id = $1
        `,
        [id]
      );
      const document = rows[0] ? toKnowledgeDocumentRecord(rows[0]) : null;

      if (!document?.fileAsset) {
        return null;
      }

      const documentStorageAdapter = resolveFileStorageAdapter(
        availableFileStorageAdapters,
        document.fileAsset.storageProvider,
        fileStorageAdapter
      );
      const fileBuffer = await documentStorageAdapter.readBinaryFile(
        document.fileAsset.storageKey
      );

      if (!fileBuffer) {
        return null;
      }

      return {
        document: toKnowledgeDocument(document),
        fileBuffer,
        mimeType:
          document.fileAsset.mimeType ??
          document.mimeType ??
          "application/octet-stream",
        name: document.fileAsset.originalName || document.name,
      };
    },
  };
}
