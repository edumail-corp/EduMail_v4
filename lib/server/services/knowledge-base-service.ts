import {
  assessEmailGrounding,
  getEmailApprovalState,
  getEmailDepartment,
  getEmailWorkflowHref,
} from "@/lib/email-data";
import {
  getKnowledgeBaseAdapter,
  getMailboxAdapter,
} from "@/lib/server/adapters";
import type { CreateKnowledgeBaseDocumentInput } from "@/lib/server/adapters/contracts";

const knowledgeBaseAdapter = getKnowledgeBaseAdapter();
const mailboxAdapter = getMailboxAdapter();

export async function listKnowledgeLibraryDocuments() {
  const [documents, emails] = await Promise.all([
    knowledgeBaseAdapter.listDocuments(),
    mailboxAdapter.listEmails(),
  ]);

  return documents.map((document) => ({
    ...document,
    ...(() => {
      const linkedEmails = emails
        .filter(
          (email) =>
            email.source === document.name ||
            email.sourceCitations.some(
              (citation) => citation.documentName === document.name
            )
        )
        .sort(
          (left, right) =>
            new Date(right.lastUpdatedAt).getTime() -
            new Date(left.lastUpdatedAt).getTime()
        );

      const relatedCases = linkedEmails.map((email) => {
        const matchingCitation = email.sourceCitations.find(
          (citation) => citation.documentName === document.name
        );
        const grounding = assessEmailGrounding(email);

        return {
          id: email.id,
          subject: email.subject,
          department: getEmailDepartment(email),
          status: email.status,
          approvalState: getEmailApprovalState(email),
          approvalReady: grounding.approvalReady,
          assignee: email.assignee,
          groundingStrength: grounding.strength,
          href: getEmailWorkflowHref(email),
          updatedAt: email.lastUpdatedAt,
          citationReason:
            matchingCitation?.reason ??
            "This document is attached as the primary source for the case.",
          citationExcerpt:
            matchingCitation?.excerpt ??
            email.summary,
        };
      });

      const supportHighlights = relatedCases.slice(0, 3).map((caseItem) => ({
        caseId: caseItem.id,
        caseSubject: caseItem.subject,
        href: caseItem.href,
        reason: caseItem.citationReason,
        excerpt: caseItem.citationExcerpt,
      }));

      return {
        referenceCount: relatedCases.length,
        approvalReadyCaseCount: linkedEmails.filter((email) =>
          assessEmailGrounding(email).approvalReady
        ).length,
        weakSupportCaseCount: relatedCases.filter(
          (caseItem) => caseItem.groundingStrength === "Weak"
        ).length,
        relatedCases,
        supportHighlights,
      };
    })(),
  }));
}

export async function createKnowledgeLibraryDocument(
  input: CreateKnowledgeBaseDocumentInput
) {
  return knowledgeBaseAdapter.createDocument(input);
}

export async function deleteKnowledgeLibraryDocument(id: string) {
  return knowledgeBaseAdapter.deleteDocument(id);
}

export async function getKnowledgeLibraryDocumentFile(id: string) {
  return knowledgeBaseAdapter.getDocumentFile(id);
}
