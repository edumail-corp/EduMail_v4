import type {
  DepartmentFilter,
  EmailFilter,
  StaffEmailCreateInput,
  StaffAssignmentFilter,
  StaffEmailUpdateInput,
} from "@/lib/email-data";
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

export async function createMailboxEmail(input: StaffEmailCreateInput) {
  const suggestion = await generateSeededDraftSuggestion(input);
  const timestamp = new Date().toISOString();

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
        label: "Manual intake",
        author: input.senderName.trim(),
        sentAt: timestamp,
        body: input.body.trim(),
      },
      {
        id: "THREAD-INTAKE",
        kind: "Internal",
        label: "Workspace intake",
        author: "EduMailAI compose flow",
        sentAt: timestamp,
        body: suggestion.manualReviewReason
          ? `Created a new case, suggested ${suggestion.routingDecision.department}, recommended ${suggestion.routingDecision.suggestedAssignees.join(", ")}, and routed it into Escalations. ${suggestion.manualReviewReason}`
          : `Created a new case, suggested ${suggestion.routingDecision.department} with ${suggestion.routingDecision.confidence.toLowerCase()} confidence, recommended ${suggestion.routingDecision.suggestedAssignees.join(", ")}, and prepared an initial local draft for staff review.`,
      },
    ],
    sourceCitations: suggestion.sourceCitations,
  });
}
