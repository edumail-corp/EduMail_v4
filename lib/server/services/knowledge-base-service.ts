import {
  createKnowledgeBaseDocument,
  deleteKnowledgeBaseDocument,
  getKnowledgeBaseDocumentFile,
  listKnowledgeBaseDocuments,
} from "@/lib/server/knowledge-base-store";
import { listStaffEmails } from "@/lib/server/email-store";

export async function listKnowledgeLibraryDocuments() {
  const [documents, emails] = await Promise.all([
    listKnowledgeBaseDocuments(),
    listStaffEmails(),
  ]);

  return documents.map((document) => ({
    ...document,
    referenceCount: emails.filter((email) => email.source === document.name).length,
  }));
}

export async function createKnowledgeLibraryDocument(
  input: Parameters<typeof createKnowledgeBaseDocument>[0]
) {
  return createKnowledgeBaseDocument(input);
}

export async function deleteKnowledgeLibraryDocument(id: string) {
  return deleteKnowledgeBaseDocument(id);
}

export async function getKnowledgeLibraryDocumentFile(id: string) {
  return getKnowledgeBaseDocumentFile(id);
}
