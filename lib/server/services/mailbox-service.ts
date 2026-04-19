import type {
  DepartmentFilter,
  EmailFilter,
  StaffEmailCreateInput,
  StaffEmail,
  StaffAssignmentFilter,
  StaffEmailUpdateInput,
} from "@/lib/email-data";
import {
  getDepartmentSuggestedAssignees,
  getEmailDepartment,
  translateDepartment,
  translateRoutingConfidence,
} from "@/lib/email-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import {
  getAIDraftAdapter,
  getMailboxAdapter,
} from "@/lib/server/adapters";
import { listActiveWorkspaceStaffAssignees } from "@/lib/server/workspace-staff-directory";

const mailboxAdapter = getMailboxAdapter();

function applyActiveWorkspaceSuggestions(
  email: StaffEmail,
  activeStaffAssignees: readonly string[]
) {
  if (!email.routingDecision) {
    return email;
  }

  const department = getEmailDepartment(email);

  return {
    ...email,
    routingDecision: {
      ...email.routingDecision,
      department,
      suggestedAssignees: getDepartmentSuggestedAssignees(
        department,
        activeStaffAssignees
      ),
    },
  } satisfies StaffEmail;
}

export async function listMailboxEmails(
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  const [emails, activeStaffAssignees] = await Promise.all([
    mailboxAdapter.listEmails(filter, assignmentFilter, departmentFilter),
    listActiveWorkspaceStaffAssignees(),
  ]);

  return emails.map((email) =>
    applyActiveWorkspaceSuggestions(email, activeStaffAssignees)
  );
}

export async function updateMailboxEmail(
  id: string,
  updates: StaffEmailUpdateInput
) {
  const [email, activeStaffAssignees] = await Promise.all([
    mailboxAdapter.updateEmail(id, updates),
    listActiveWorkspaceStaffAssignees(),
  ]);

  return email ? applyActiveWorkspaceSuggestions(email, activeStaffAssignees) : null;
}

export async function createMailboxEmail(
  input: StaffEmailCreateInput,
  language: LanguagePreference = "English"
) {
  const draftAdapter = await getAIDraftAdapter();
  const [suggestion, activeStaffAssignees] = await Promise.all([
    draftAdapter.generateDraftSuggestion(input, language),
    listActiveWorkspaceStaffAssignees(),
  ]);
  const timestamp = new Date().toISOString();
  const isPolish = language === "Polish";
  const routingDecision = {
    ...suggestion.routingDecision,
    suggestedAssignees: getDepartmentSuggestedAssignees(
      suggestion.routingDecision.department,
      activeStaffAssignees
    ),
  };
  const localizedDepartment = translateDepartment(
    routingDecision.department,
    language
  );
  const localizedConfidence = translateRoutingConfidence(
    routingDecision.confidence,
    language
  ).toLowerCase();

  return mailboxAdapter.createEmail({
    sender: `${input.senderName.trim()} <${input.senderEmail.trim().toLowerCase()}>`,
    subject: input.subject.trim(),
    body: input.body.trim(),
    category: routingDecision.department,
    department: routingDecision.department,
    caseOrigin: "Manual intake",
    routingDecision,
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
            ? `Utworzono nową sprawę, zasugerowano ${localizedDepartment}, polecono ${routingDecision.suggestedAssignees.join(", ")} i oznaczono sprawę do ręcznego przeglądu w skrzynce. ${suggestion.manualReviewReason}`
            : `Created a new case, suggested ${routingDecision.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and flagged it for manual review in the inbox. ${suggestion.manualReviewReason}`
          : isPolish
            ? `Utworzono nową sprawę, zasugerowano ${localizedDepartment} z ${localizedConfidence} pewnością, polecono ${routingDecision.suggestedAssignees.join(", ")} i przygotowano wstępny lokalny szkic do przeglądu.`
            : `Created a new case, suggested ${routingDecision.department} with ${routingDecision.confidence.toLowerCase()} confidence, recommended ${routingDecision.suggestedAssignees.join(", ")}, and prepared an initial local draft for staff review.`,
      },
    ],
    sourceCitations: suggestion.sourceCitations,
  });
}
