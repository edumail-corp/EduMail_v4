import {
  buildKnowledgeDocumentPreview,
  buildKnowledgeDocumentSummary,
  getInitialKnowledgeDocuments,
  type KnowledgeDocument,
  type KnowledgeDocumentOrigin,
} from "@/lib/knowledge-base-data";
import {
  readJsonFileIfExists,
  writeJsonFileAtomically,
} from "@/lib/server/json-file-store";
import {
  buildLegacyKnowledgeBaseStorageKey,
} from "@/lib/server/knowledge-base-file-storage";
import { getWritableDataPath } from "@/lib/server/storage-path";

const knowledgeBaseMetadataPath = getWritableDataPath("knowledge-base-documents.json");
const seedDocumentMap = new Map(
  getInitialKnowledgeDocuments().map((document) => [document.id, document])
);

export type KnowledgeDocumentAssetRecord = {
  storageKey: string;
  originalName: string;
  mimeType?: string;
  sizeInBytes?: number;
  storageProvider?: "local" | "supabase_storage";
};

export type KnowledgeDocumentRecord = Omit<
  KnowledgeDocument,
  "downloadUrl" | "referenceCount"
> & {
  fileAsset?: KnowledgeDocumentAssetRecord;
};

type LegacyKnowledgeDocumentRecord = Partial<KnowledgeDocumentRecord> & {
  storedFileName?: string;
};

export type CreateKnowledgeDocumentRecordInput = {
  id: string;
  name: string;
  category: KnowledgeDocument["category"];
  pages: number;
  uploadedAt?: string;
  summary?: string;
  previewExcerpt?: string;
  origin?: KnowledgeDocumentOrigin;
  fileAsset?: KnowledgeDocumentAssetRecord;
  mimeType?: string;
  sizeInBytes?: number;
};

export type KnowledgeDocumentRecordReadOptions = {
  fallback?: "seeded" | "empty";
};

function normalizeKnowledgeDocumentRecord(
  document: LegacyKnowledgeDocumentRecord
): KnowledgeDocumentRecord {
  const seedDocument = document.id ? seedDocumentMap.get(document.id) : undefined;
  const baseDocument =
    seedDocument ??
    ({
      id: document.id ?? "DOC-UNKNOWN",
      name: document.name ?? "Untitled document",
      category: document.category ?? "Admissions",
      uploadedAt: document.uploadedAt ?? new Date().toISOString().slice(0, 10),
      pages: document.pages ?? 1,
      sizeInBytes: document.sizeInBytes,
      mimeType: document.mimeType,
      summary:
        document.summary ??
        buildKnowledgeDocumentSummary(
          document.name ?? "Untitled document",
          document.category ?? "Admissions"
        ),
      previewExcerpt:
        document.previewExcerpt ??
        buildKnowledgeDocumentPreview(
          document.name ?? "Untitled document",
          document.category ?? "Admissions"
        ),
      origin: document.origin ?? "uploaded",
      referenceCount: 0,
    } satisfies KnowledgeDocument);

  const fileAsset =
    document.fileAsset ??
    (document.storedFileName
      ? {
          storageKey: buildLegacyKnowledgeBaseStorageKey(document.storedFileName),
          originalName: document.name ?? baseDocument.name,
          mimeType: document.mimeType ?? baseDocument.mimeType,
          sizeInBytes: document.sizeInBytes ?? baseDocument.sizeInBytes,
          storageProvider: "local" as const,
        }
      : undefined);

  return {
    id: document.id ?? baseDocument.id,
    name: document.name ?? baseDocument.name,
    category: document.category ?? baseDocument.category,
    uploadedAt: document.uploadedAt ?? baseDocument.uploadedAt,
    pages: document.pages ?? baseDocument.pages,
    sizeInBytes:
      fileAsset?.sizeInBytes ??
      document.sizeInBytes ??
      baseDocument.sizeInBytes,
    mimeType: fileAsset?.mimeType ?? document.mimeType ?? baseDocument.mimeType,
    summary: document.summary ?? baseDocument.summary,
    previewExcerpt: document.previewExcerpt ?? baseDocument.previewExcerpt,
    origin: document.origin ?? baseDocument.origin,
    fileAsset:
      fileAsset
        ? {
            ...fileAsset,
            storageProvider: fileAsset.storageProvider ?? "local",
          }
        : undefined,
  };
}

async function writeKnowledgeDocumentRecords(records: KnowledgeDocumentRecord[]) {
  await writeJsonFileAtomically(knowledgeBaseMetadataPath, records);
}

export function toKnowledgeDocument(record: KnowledgeDocumentRecord): KnowledgeDocument {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    uploadedAt: record.uploadedAt,
    pages: record.pages,
    sizeInBytes: record.fileAsset?.sizeInBytes ?? record.sizeInBytes,
    mimeType: record.fileAsset?.mimeType ?? record.mimeType,
    summary: record.summary,
    previewExcerpt: record.previewExcerpt,
    origin: record.origin,
    referenceCount: 0,
    downloadUrl: record.fileAsset
      ? `/api/knowledge-base/documents/${record.id}/file`
      : undefined,
  };
}

function buildFallbackKnowledgeDocumentRecords(
  fallback: KnowledgeDocumentRecordReadOptions["fallback"] = "seeded"
) {
  if (fallback === "empty") {
    return [] as KnowledgeDocumentRecord[];
  }

  return getInitialKnowledgeDocuments().map((document) =>
    normalizeKnowledgeDocumentRecord(document)
  );
}

export async function listKnowledgeDocumentRecords(
  options?: KnowledgeDocumentRecordReadOptions
) {
  const storedDocuments = await readJsonFileIfExists<LegacyKnowledgeDocumentRecord[]>(
    knowledgeBaseMetadataPath
  );

  if (storedDocuments) {
    return storedDocuments.map(normalizeKnowledgeDocumentRecord);
  }

  return buildFallbackKnowledgeDocumentRecords(options?.fallback);
}

export async function getKnowledgeDocumentRecord(
  id: string,
  options?: KnowledgeDocumentRecordReadOptions
) {
  const documents = await listKnowledgeDocumentRecords(options);
  return documents.find((document) => document.id === id) ?? null;
}

export async function createKnowledgeDocumentRecord(
  input: CreateKnowledgeDocumentRecordInput,
  options?: KnowledgeDocumentRecordReadOptions
) {
  const documents = await listKnowledgeDocumentRecords(options);
  const nextRecord = normalizeKnowledgeDocumentRecord({
    id: input.id,
    name: input.name,
    category: input.category,
    uploadedAt: input.uploadedAt,
    pages: input.pages,
    summary: input.summary,
    previewExcerpt: input.previewExcerpt,
    origin: input.origin,
    fileAsset: input.fileAsset,
    mimeType: input.mimeType,
    sizeInBytes: input.sizeInBytes,
  });

  await writeKnowledgeDocumentRecords([nextRecord, ...documents]);
  return nextRecord;
}

export async function deleteKnowledgeDocumentRecord(
  id: string,
  options?: KnowledgeDocumentRecordReadOptions
) {
  const documents = await listKnowledgeDocumentRecords(options);
  const documentToDelete = documents.find((document) => document.id === id) ?? null;

  if (!documentToDelete) {
    return null;
  }

  await writeKnowledgeDocumentRecords(
    documents.filter((document) => document.id !== id)
  );

  return documentToDelete;
}
