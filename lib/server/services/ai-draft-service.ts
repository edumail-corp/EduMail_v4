import type {
  Department,
  EmailSourceCitation,
  StaffEmailCreateInput,
} from "@/lib/email-data";
import {
  getDepartmentSourceDocument,
  inferLocalRoutingDecision,
} from "@/lib/local-routing";

type SeededDraftSuggestion = {
  confidence: number;
  aiDraft: string | null;
  source: string | null;
  summary: string;
  manualReviewReason: string | null;
  sourceCitations: EmailSourceCitation[];
  routingDecision: ReturnType<typeof inferLocalRoutingDecision>;
};

type AIDraftProviderStatus = {
  summary: string;
  nextStep: string;
};

const departmentReplyOpeners: Record<Department, string> = {
  Admissions:
    "Thank you for reaching out to the admissions team. Based on the information you shared, here is the clearest next-step guidance we can give right now.",
  Finance:
    "Thank you for contacting student finance. Based on the billing and payment context in your message, here is the best next-step guidance for now.",
  Registrar:
    "Thank you for contacting the registrar office. Based on your records and registration request, here is the best next-step guidance we can give right now.",
  Academic:
    "Thank you for reaching out about an academic issue. Based on the course and advising context in your message, here is the clearest next-step guidance for now.",
};

const departmentSummaryPrefixes: Record<Department, string> = {
  Admissions: "Admissions case about",
  Finance: "Finance case about",
  Registrar: "Registrar case about",
  Academic: "Academic case about",
};

function buildSummary(
  input: StaffEmailCreateInput,
  department: Department,
  reason: string
) {
  return `${departmentSummaryPrefixes[department]} ${input.subject.trim().toLowerCase()}. ${reason}`;
}

function buildSourceCitations(
  department: Department,
  sourceDocument: string
): EmailSourceCitation[] {
  const citationTemplates: Record<Department, Array<{ excerpt: string; reason: string }>> = {
    Admissions: [
      {
        excerpt:
          "Admissions review guidance defines how scholarship timing, deadlines, and application requirements should be communicated to students.",
        reason: "Supports the admissions timeline and requirements language in the draft.",
      },
    ],
    Finance: [
      {
        excerpt:
          "Student billing guidance covers payment expectations, refund handling, and balance resolution steps for finance cases.",
        reason: "Supports the billing and refund guidance in the draft.",
      },
    ],
    Registrar: [
      {
        excerpt:
          "Registrar workflow guidance covers records requests, verification holds, registration timing, and procedural next steps.",
        reason: "Supports the records and registrar process language in the draft.",
      },
    ],
    Academic: [
      {
        excerpt:
          "Academic workflow guidance covers advising paths, course issues, credit decisions, and approval expectations.",
        reason: "Supports the academic process explanation in the draft.",
      },
    ],
  };

  return citationTemplates[department].map((citation, index) => ({
    id: `SRC-${department}-${index + 1}`,
    documentName: sourceDocument,
    excerpt: citation.excerpt,
    reason: citation.reason,
  }));
}

function buildSeededDraft(
  input: StaffEmailCreateInput,
  department: Department
) {
  const senderFirstName = input.senderName.trim().split(/\s+/)[0] ?? "there";

  return [
    `Hello ${senderFirstName},`,
    "",
    departmentReplyOpeners[department],
    "",
    `We are reviewing your message about "${input.subject.trim()}". A staff member will confirm the exact policy steps and follow up with the most appropriate answer for the ${department.toLowerCase()} workflow.`,
    "",
    "If additional documents or clarification are required, we will include that in the next response.",
    "",
    "Best regards,",
    `${department} Operations`,
  ].join("\n");
}

export async function generateSeededDraftSuggestion(
  input: StaffEmailCreateInput
): Promise<SeededDraftSuggestion> {
  const routingDecision = inferLocalRoutingDecision(input);
  const sourceDocument = getDepartmentSourceDocument(routingDecision.department);
  const manualReviewReason = routingDecision.escalationReason;

  return {
    confidence: routingDecision.confidenceScore,
    aiDraft: manualReviewReason
      ? null
      : buildSeededDraft(input, routingDecision.department),
    source: sourceDocument,
    summary: buildSummary(
      input,
      routingDecision.department,
      routingDecision.reason
    ),
    manualReviewReason,
    sourceCitations: buildSourceCitations(
      routingDecision.department,
      sourceDocument
    ),
    routingDecision,
  };
}

export async function getAIDraftProviderStatus(): Promise<AIDraftProviderStatus> {
  return {
    summary: "Drafts are currently seeded using local templates and routing signals.",
    nextStep:
      "Connect a live AI provider (plus grounding/citations) to replace seeded drafts in production.",
  };
}
