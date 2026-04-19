import path from "node:path";

export const knowledgeBaseStoragePrefix = "knowledge-base-files";

function sanitizeKnowledgeFileName(name: string) {
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedName.length > 0 ? sanitizedName : "document";
}

export function buildKnowledgeBaseStorageKey(documentId: string, fileName: string) {
  return path.posix.join(
    knowledgeBaseStoragePrefix,
    `${documentId}-${sanitizeKnowledgeFileName(fileName)}`
  );
}

export function buildLegacyKnowledgeBaseStorageKey(storedFileName: string) {
  return path.posix.join(knowledgeBaseStoragePrefix, storedFileName);
}
