import type { KnowledgeBaseAdapter } from "@/lib/server/adapters/contracts";
import {
  createKnowledgeBaseDocument,
  deleteKnowledgeBaseDocument,
  getKnowledgeBaseDocumentFile,
  listKnowledgeBaseDocuments,
} from "@/lib/server/knowledge-base-store";

export const localKnowledgeBaseAdapter: KnowledgeBaseAdapter = {
  listDocuments() {
    return listKnowledgeBaseDocuments();
  },
  createDocument(input) {
    return createKnowledgeBaseDocument(input);
  },
  deleteDocument(id) {
    return deleteKnowledgeBaseDocument(id);
  },
  getDocumentFile(id) {
    return getKnowledgeBaseDocumentFile(id);
  },
};
