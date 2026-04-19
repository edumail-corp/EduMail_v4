import { randomUUID } from "node:crypto";
import type {
  ActivityAdapter,
  FileStorageAdapter,
  KnowledgeBaseAdapter,
} from "@/lib/server/adapters/contracts";
import {
  createKnowledgeDocumentRecord,
  deleteKnowledgeDocumentRecord,
  getKnowledgeDocumentRecord,
  listKnowledgeDocumentRecords,
  toKnowledgeDocument,
} from "@/lib/server/knowledge-base-metadata-store";
import { buildKnowledgeBaseStorageKey } from "@/lib/server/knowledge-base-file-storage";

type LocalKnowledgeBaseAdapterDependencies = {
  activityAdapter: ActivityAdapter;
  fileStorageAdapter: FileStorageAdapter;
};

type RecordBackedKnowledgeBaseAdapterOptions = {
  fallback?: "seeded" | "empty";
};

function createRecordBackedKnowledgeBaseAdapter(
  {
    activityAdapter,
    fileStorageAdapter,
  }: LocalKnowledgeBaseAdapterDependencies,
  options?: RecordBackedKnowledgeBaseAdapterOptions
): KnowledgeBaseAdapter {
  return {
    async listDocuments() {
      const records = await listKnowledgeDocumentRecords(options);
      return records.map(toKnowledgeDocument);
    },
    async createDocument(input) {
      const documentId = `DOC-${randomUUID().slice(0, 8)}`;
      const storageKey = buildKnowledgeBaseStorageKey(documentId, input.name);

      await fileStorageAdapter.writeBinaryFile(storageKey, input.fileBuffer);

      try {
        const nextRecord = await createKnowledgeDocumentRecord(
          {
            id: documentId,
            name: input.name,
            category: input.category,
            uploadedAt: new Date().toISOString().slice(0, 10),
            pages: input.pages,
            origin: "uploaded",
            fileAsset: {
              storageKey,
              originalName: input.name,
              mimeType: input.mimeType,
              sizeInBytes: input.sizeInBytes,
            },
            mimeType: input.mimeType,
            sizeInBytes: input.sizeInBytes,
          },
          options
        );

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
      const documentToDelete = await getKnowledgeDocumentRecord(id, options);

      if (!documentToDelete) {
        return false;
      }

      if (documentToDelete.fileAsset) {
        await fileStorageAdapter.deleteBinaryFile(documentToDelete.fileAsset.storageKey);
      }

      const deletedRecord = await deleteKnowledgeDocumentRecord(id, options);

      if (!deletedRecord) {
        return false;
      }

      await activityAdapter.appendEvent({
        action: "document_deleted",
        entityType: "document",
        entityId: deletedRecord.id,
        title: deletedRecord.name,
        description: `Removed a ${deletedRecord.category} document from the library.`,
        href: "/dashboard/knowledge-base",
      });

      return true;
    },
    async getDocumentFile(id) {
      const document = await getKnowledgeDocumentRecord(id, options);

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

export function createLocalKnowledgeBaseAdapter({
  activityAdapter,
  fileStorageAdapter,
}: LocalKnowledgeBaseAdapterDependencies): KnowledgeBaseAdapter {
  return createRecordBackedKnowledgeBaseAdapter(
    { activityAdapter, fileStorageAdapter },
    {
      fallback: "seeded",
    }
  );
}

export function createJsonFileKnowledgeBaseAdapter({
  activityAdapter,
  fileStorageAdapter,
}: LocalKnowledgeBaseAdapterDependencies): KnowledgeBaseAdapter {
  return createRecordBackedKnowledgeBaseAdapter(
    { activityAdapter, fileStorageAdapter },
    {
      fallback: "empty",
    }
  );
}
