import type {
  DepartmentFilter,
  EmailFilter,
  StaffEmailCreateInput,
  StaffAssignmentFilter,
  StaffEmailUpdateInput,
} from "@/lib/email-data";
import {
  translateDepartment,
  translateRoutingConfidence,
} from "@/lib/email-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import {
  createStaffEmail,
  listStaffEmails,
  updateStaffEmail,
} from "@/lib/server/email-store";
import { generateSeededDraftSuggestion } from "@/lib/server/services/ai-draft-service";

export async function listMailboxEmails(
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  return listStaffEmails(filter, assignmentFilter, departmentFilter);
}

export async function updateMailboxEmail(
  id: string,
  updates: StaffEmailUpdateInput
) {
  return updateStaffEmail(id, updates);
}

export async function createMailboxEmail(
  input: StaffEmailCreateInput,
  language: LanguagePreference = "English"
) {
  const suggestion = await generateSeededDraftSuggestion(input, language);
  const timestamp = new Date().toISOString();
  const isPolish = language === "Polish";
  const localizedDepartment = translateDepartment(
    suggestion.routingDecision.department,
    language
  );
  const localizedConfidence = translateRoutingConfidence(
    suggestion.routingDecision.confidence,
    language
  ).toLowerCase();

  return createStaffEmail({
    sender: `${input.senderName.trim()} <${input.senderEmail.trim().toLowerCase()}>`,
    subject: input.subject.trim(),
    body: input.body.trim(),
    category: suggestion.routingDecision.department,
    department: suggestion.routingDecision.department,
    caseOrigin: "Manual intake",
    routingDecision: suggestion.routingDecision,
    approvalState: suggestion.manualReviewReason
      ? "Escalated"
      : suggestion.aiDraft
        ? "Needs Review"
        : "Awaiting Draft",
    confidence: suggestion.confidence,
    priority: input.priority,
    status: suggestion.manualReviewReason ? "Escalated" : "Draft",
    assignee: null,
    aiDraft: suggestion.aiDraft,
    staffNote: null,
    source: suggestion.source,
    summary: suggestion.summary,
    manualReviewReason: suggestion.manualReviewReason,
    threadHistory: [
      {
        id: "THREAD-INBOUND",
        kind: "Inbound",
        label: isPolish ? "Wpis ręczny" : "Manual intake",
        author: input.senderName.trim(),
        sentAt: timestamp,
        body: input.body.trim(),
      },
      {
        id: "THREAD-INTAKE",
        kind: "Internal",
        label: isPolish ? "Przyjęcie w workspace" : "Workspace intake",
        author: isPolish ? "Przepływ tworzenia EduMailAI" : "EduMailAI compose flow",
        sentAt: timestamp,
        body: suggestion.manualReviewReason
          ? isPolish
            ? `Utworzono nową sprawę, zasugerowano ${localizedDepartment}, polecono ${suggestion.routingDecision.suggestedAssignees.join(", ")} i skierowano sprawę do Eskalacji. ${suggestion.manualReviewReason}`
            : `Created a new case, suggested ${suggestion.routingDecision.department}, recommended ${suggestion.routingDecision.suggestedAssignees.join(", ")}, and routed it into Escalations. ${suggestion.manualReviewReason}`
          : isPolish
            ? `Utworzono nową sprawę, zasugerowano ${localizedDepartment} z ${localizedConfidence} pewnością, polecono ${suggestion.routingDecision.suggestedAssignees.join(", ")} i przygotowano wstępny lokalny szkic do przeglądu.`
            : `Created a new case, suggested ${suggestion.routingDecision.department} with ${suggestion.routingDecision.confidence.toLowerCase()} confidence, recommended ${suggestion.routingDecision.suggestedAssignees.join(", ")}, and prepared an initial local draft for staff review.`,
      },
    ],
    sourceCitations: suggestion.sourceCitations,
  });
}
