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
  buildKnowledgeBaseStorageKey,
} from "@/lib/server/knowledge-base-file-storage";
import {
  listKnowledgeDocumentRecords,
  toKnowledgeDocument,
  type KnowledgeDocumentRecord,
} from "@/lib/server/knowledge-base-metadata-store";
import {
  getSQLiteCount,
  parseSQLiteJson,
  runSQLiteTransaction,
  serializeSQLiteJson,
  type SQLiteDatabaseAccess,
  withSQLiteDatabase,
} from "@/lib/server/adapters/sqlite/sqlite-database";

type SQLiteKnowledgeBaseAdapterDependencies = {
  activityAdapter: ActivityAdapter;
  fileStorageAdapter: FileStorageAdapter;
  databaseAccess?: SQLiteDatabaseAccess;
};

type SQLiteKnowledgeDocumentRow = {
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
  file_asset_json: string | null;
};

function toKnowledgeDocumentRecord(row: SQLiteKnowledgeDocumentRow): KnowledgeDocumentRecord {
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
    fileAsset: parseSQLiteJson<
      KnowledgeDocumentRecord["fileAsset"] | undefined
    >(row.file_asset_json, undefined),
  };
}

function upsertKnowledgeDocumentRecord(
  record: KnowledgeDocumentRecord,
  withDatabase: SQLiteDatabaseAccess["withDatabase"] = withSQLiteDatabase
) {
  return withDatabase((database) => {
    database
      .prepare(`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          uploaded_at = excluded.uploaded_at,
          pages = excluded.pages,
          size_in_bytes = excluded.size_in_bytes,
          mime_type = excluded.mime_type,
          summary = excluded.summary,
          preview_excerpt = excluded.preview_excerpt,
          origin = excluded.origin,
          file_asset_json = excluded.file_asset_json
      `)
      .run(
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
        record.fileAsset ? serializeSQLiteJson(record.fileAsset) : null
      );
  });
}

export function createSQLiteKnowledgeBaseAdapter({
  activityAdapter,
  fileStorageAdapter,
  databaseAccess,
}: SQLiteKnowledgeBaseAdapterDependencies): KnowledgeBaseAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;
  const withDatabase = databaseAccess?.withDatabase ?? withSQLiteDatabase;

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = withDatabase(async (database) => {
      if (getSQLiteCount(database, "knowledge_documents") === 0) {
        const seedRecords = await listKnowledgeDocumentRecords({
          fallback: "seeded",
        });
        const insertStatement = database.prepare(`
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        runSQLiteTransaction(database, () => {
          for (const record of seedRecords) {
            insertStatement.run(
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
              record.fileAsset ? serializeSQLiteJson(record.fileAsset) : null
            );
          }
        });
      }

      hasBootstrapped = true;
    }).finally(() => {
      bootstrapPromise = null;
    });

    return bootstrapPromise;
  }

  async function listPersistedRecords() {
    await ensureBootstrapped();

    return withDatabase((database) => {
      const rows = database
        .prepare(`
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
        `)
        .all() as SQLiteKnowledgeDocumentRow[];

      return rows.map(toKnowledgeDocumentRecord);
    });
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
          },
        };
        await upsertKnowledgeDocumentRecord(nextRecord, withDatabase);

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

      const documentToDelete = await withDatabase((database) => {
        const row = database
          .prepare(`
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
            WHERE id = ?
          `)
          .get(id) as SQLiteKnowledgeDocumentRow | undefined;

        return row ? toKnowledgeDocumentRecord(row) : null;
      });

      if (!documentToDelete) {
        return false;
      }

      if (documentToDelete.fileAsset) {
        await fileStorageAdapter.deleteBinaryFile(documentToDelete.fileAsset.storageKey);
      }

      await withDatabase((database) => {
        database.prepare(`DELETE FROM knowledge_documents WHERE id = ?`).run(id);
      });

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

      const document = await withDatabase((database) => {
        const row = database
          .prepare(`
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
            WHERE id = ?
          `)
          .get(id) as SQLiteKnowledgeDocumentRow | undefined;

        return row ? toKnowledgeDocumentRecord(row) : null;
      });

      if (!document?.fileAsset) {
        return null;
      }

      const fileBuffer = await fileStorageAdapter.readBinaryFile(
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
