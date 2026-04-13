import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildKnowledgeDocumentPreview,
  buildKnowledgeDocumentSummary,
  getInitialKnowledgeDocuments,
  type KnowledgeDocument,
} from "@/lib/knowledge-base-data";
import { appendActivityEvent } from "@/lib/server/activity-log-store";
import {
  ensureDirectory,
  ensureStoreDirectory,
  readJsonFileWithFallback,
  writeJsonFileAtomically,
} from "@/lib/server/json-file-store";

const knowledgeBaseStorePath = path.join(
  process.cwd(),
  "data",
  "knowledge-base-documents.json"
);
const knowledgeBaseFilesDirectory = path.join(
  process.cwd(),
  "data",
  "knowledge-base-files"
);
const seedDocumentMap = new Map(
  getInitialKnowledgeDocuments().map((document) => [document.id, document])
);

type StoredKnowledgeDocument = Omit<KnowledgeDocument, "downloadUrl" | "referenceCount"> & {
  storedFileName?: string;
};

type CreateKnowledgeBaseStoredDocumentInput = {
  name: string;
  category: KnowledgeDocument["category"];
  pages: number;
  mimeType: string;
  sizeInBytes: number;
  fileBuffer: Buffer;
};

function normalizeStoredDocument(
  document: Partial<StoredKnowledgeDocument>
): StoredKnowledgeDocument {
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

  return {
    ...baseDocument,
    ...document,
    summary: document.summary ?? baseDocument.summary,
    previewExcerpt: document.previewExcerpt ?? baseDocument.previewExcerpt,
    origin: document.origin ?? baseDocument.origin,
  };
}

function toKnowledgeDocument(document: StoredKnowledgeDocument): KnowledgeDocument {
  return {
    id: document.id,
    name: document.name,
    category: document.category,
    uploadedAt: document.uploadedAt,
    pages: document.pages,
    sizeInBytes: document.sizeInBytes,
    mimeType: document.mimeType,
    summary: document.summary,
    previewExcerpt: document.previewExcerpt,
    origin: document.origin,
    referenceCount: 0,
    downloadUrl: document.storedFileName
      ? `/api/knowledge-base/documents/${document.id}/file`
      : undefined,
  };
}

function sanitizeKnowledgeFileName(name: string) {
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedName.length > 0 ? sanitizedName : "document";
}

async function ensureKnowledgeBaseDirectories() {
  await Promise.all([
    ensureStoreDirectory(knowledgeBaseStorePath),
    ensureDirectory(knowledgeBaseFilesDirectory),
  ]);
}

async function writeKnowledgeBaseDocuments(documents: StoredKnowledgeDocument[]) {
  await writeJsonFileAtomically(knowledgeBaseStorePath, documents);
}

export async function listKnowledgeBaseDocuments() {
  const documents = await readJsonFileWithFallback<Partial<StoredKnowledgeDocument>[]>(
    knowledgeBaseStorePath,
    {
      fallback: getInitialKnowledgeDocuments,
    }
  );
  return documents.map((document) => toKnowledgeDocument(normalizeStoredDocument(document)));
}

export async function createKnowledgeBaseDocument(
  input: CreateKnowledgeBaseStoredDocumentInput
) {
  await ensureKnowledgeBaseDirectories();

  const documents = (
    await readJsonFileWithFallback<StoredKnowledgeDocument[]>(
      knowledgeBaseStorePath,
      {
        fallback: getInitialKnowledgeDocuments as () => StoredKnowledgeDocument[],
      }
    )
  ).map(normalizeStoredDocument);
  const documentId = `DOC-${randomUUID().slice(0, 8)}`;
  const storedFileName = `${documentId}-${sanitizeKnowledgeFileName(input.name)}`;

  await writeFile(
    path.join(knowledgeBaseFilesDirectory, storedFileName),
    input.fileBuffer
  );

  const nextDocument: StoredKnowledgeDocument = {
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
    storedFileName,
  };

  await writeKnowledgeBaseDocuments([nextDocument, ...documents.map(normalizeStoredDocument)]);

  await appendActivityEvent({
    action: "document_uploaded",
    entityType: "document",
    entityId: nextDocument.id,
    title: nextDocument.name,
    description: `Added a ${nextDocument.category} document to the library.`,
    href: `/dashboard/knowledge-base?document=${encodeURIComponent(nextDocument.name)}`,
  });

  return toKnowledgeDocument(nextDocument);
}

export async function deleteKnowledgeBaseDocument(id: string) {
  await ensureKnowledgeBaseDirectories();

  const documents = (
    await readJsonFileWithFallback<Partial<StoredKnowledgeDocument>[]>(
      knowledgeBaseStorePath,
      {
        fallback: getInitialKnowledgeDocuments,
      }
    )
  ).map(normalizeStoredDocument);
  const documentToDelete = documents.find((document) => document.id === id);
  const nextDocuments = documents.filter((document) => document.id !== id);

  if (nextDocuments.length === documents.length) {
    return false;
  }

  if (documentToDelete?.storedFileName) {
    await unlink(
      path.join(knowledgeBaseFilesDirectory, documentToDelete.storedFileName)
    ).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    });
  }

  await writeKnowledgeBaseDocuments(nextDocuments);

  if (documentToDelete) {
    await appendActivityEvent({
      action: "document_deleted",
      entityType: "document",
      entityId: documentToDelete.id,
      title: documentToDelete.name,
      description: `Removed a ${documentToDelete.category} document from the library.`,
      href: "/dashboard/knowledge-base",
    });
  }

  return true;
}

export async function getKnowledgeBaseDocumentFile(id: string) {
  await ensureKnowledgeBaseDirectories();

  const documents = (
    await readJsonFileWithFallback<Partial<StoredKnowledgeDocument>[]>(
      knowledgeBaseStorePath,
      {
        fallback: getInitialKnowledgeDocuments,
      }
    )
  ).map(normalizeStoredDocument);
  const document = documents.find((candidate) => candidate.id === id);

  if (!document?.storedFileName) {
    return null;
  }

  const fileBuffer = await readFile(
    path.join(knowledgeBaseFilesDirectory, document.storedFileName)
  ).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  });

  if (!fileBuffer) {
    return null;
  }

  return {
    document: toKnowledgeDocument(document),
    fileBuffer,
    mimeType: document.mimeType ?? "application/octet-stream",
    name: document.name,
  };
}
