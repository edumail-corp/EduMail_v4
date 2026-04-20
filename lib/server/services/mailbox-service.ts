import type {
  DepartmentFilter,
  EmailCategory,
  EmailFilter,
  EmailPriority,
  MailboxIntegration,
  MailProvider,
  StaffEmail,
  StaffEmailCreateInput,
  StaffAssignmentFilter,
  StaffEmailUpdateInput,
} from "@/lib/email-data";
import {
  getDepartmentSuggestedAssignees,
  getEmailDepartment,
  isValidEmailAddress,
  translateDepartment,
  translateRoutingConfidence,
} from "@/lib/email-data";
import { inferLocalRoutingDecision } from "@/lib/local-routing";
import type { MailboxCreateEmailInput } from "@/lib/server/adapters/contracts";
import type { LanguagePreference } from "@/lib/user-preferences";
import {
  getAIDraftAdapter,
  getMailboxAdapter,
} from "@/lib/server/adapters";
import { listActiveWorkspaceStaffAssignees } from "@/lib/server/workspace-staff-directory";

const mailboxAdapter = getMailboxAdapter();

type BuildMailboxCaseOptions = {
  input: StaffEmailCreateInput;
  language: LanguagePreference;
  caseOrigin: StaffEmail["caseOrigin"];
  receivedAt?: string;
  threadLabel: {
    english: string;
    polish: string;
  };
  internalLabel: {
    english: string;
    polish: string;
  };
  internalAuthor: {
    english: string;
    polish: string;
  };
  integration?: MailboxIntegration | null;
};

export type IngestMailboxEmailInput = {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  provider: MailProvider;
  externalMessageId: string;
  externalConversationId?: string | null;
  referenceUrl?: string | null;
  language?: LanguagePreference;
};

export type IngestMailboxEmailResult = {
  email: StaffEmail;
  duplicate: boolean;
};

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

function inferInboundPriority(subject: string, body: string): EmailPriority {
  const combined = `${subject} ${body}`.toLowerCase();

  if (
    /urgent|asap|immediately|today|deadline|error|issue|problem|appeal|refund/.test(
      combined
    )
  ) {
    return "High";
  }

  if (/follow up|question|help|request|support/.test(combined)) {
    return "Medium";
  }

  return "Medium";
}

function inferInboundCategory(
  subject: string,
  body: string,
  priority: EmailPriority,
  language: LanguagePreference
): EmailCategory {
  return inferLocalRoutingDecision(
    {
      category: "Admissions",
      priority,
      subject,
      body,
    },
    language
  ).department;
}

async function buildMailboxCaseInput({
  input,
  language,
  caseOrigin,
  receivedAt,
  threadLabel,
  internalLabel,
  internalAuthor,
  integration = null,
}: BuildMailboxCaseOptions): Promise<MailboxCreateEmailInput> {
  const draftAdapter = await getAIDraftAdapter();
  const [suggestion, activeStaffAssignees] = await Promise.all([
    draftAdapter.generateDraftSuggestion(input, language),
    listActiveWorkspaceStaffAssignees(),
  ]);
  const timestamp = receivedAt ?? new Date().toISOString();
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

  return {
    sender: `${input.senderName.trim()} <${input.senderEmail.trim().toLowerCase()}>`,
    subject: input.subject.trim(),
    body: input.body.trim(),
    category: routingDecision.department,
    department: routingDecision.department,
    caseOrigin,
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
        label: isPolish ? threadLabel.polish : threadLabel.english,
        author: input.senderName.trim(),
        sentAt: timestamp,
        body: input.body.trim(),
      },
      {
        id: "THREAD-INTAKE",
        kind: "Internal",
        label: isPolish ? internalLabel.polish : internalLabel.english,
        author: isPolish ? internalAuthor.polish : internalAuthor.english,
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
    integration,
  };
}

async function getActiveWorkspaceSuggestions() {
  return listActiveWorkspaceStaffAssignees();
}

function parseMailboxSender(sender: string) {
  const trimmedSender = sender.trim();
  const matchedSender = /^(.*?)\s*<(.*)>$/.exec(trimmedSender);

  if (matchedSender) {
    const senderEmail = matchedSender[2]?.trim().toLowerCase() ?? "";
    return {
      senderName: matchedSender[1]?.trim() || senderEmail,
      senderEmail: isValidEmailAddress(senderEmail) ? senderEmail : null,
    };
  }

  if (isValidEmailAddress(trimmedSender)) {
    return {
      senderName: trimmedSender,
      senderEmail: trimmedSender.toLowerCase(),
    };
  }

  return {
    senderName: trimmedSender || "Unknown sender",
    senderEmail: null,
  };
}

export async function listMailboxEmails(
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  const [emails, activeStaffAssignees] = await Promise.all([
    mailboxAdapter.listEmails(filter, assignmentFilter, departmentFilter),
    getActiveWorkspaceSuggestions(),
  ]);

  return emails.map((email) =>
    applyActiveWorkspaceSuggestions(email, activeStaffAssignees)
  );
}

export async function getMailboxEmail(id: string) {
  const emails = await listMailboxEmails();
  return emails.find((email) => email.id === id) ?? null;
}

export async function findMailboxEmailByInboundIdentity(
  provider: MailProvider,
  externalMessageId: string
) {
  const emails = await listMailboxEmails();

  return (
    emails.find(
      (email) =>
        email.integration?.inboundProvider === provider &&
        email.integration?.inboundMessageId === externalMessageId
    ) ?? null
  );
}

export async function updateMailboxEmail(
  id: string,
  updates: StaffEmailUpdateInput
) {
  const [email, activeStaffAssignees] = await Promise.all([
    mailboxAdapter.updateEmail(id, updates),
    getActiveWorkspaceSuggestions(),
  ]);

  return email ? applyActiveWorkspaceSuggestions(email, activeStaffAssignees) : null;
}

export async function regenerateMailboxEmailDraft(
  id: string,
  language: LanguagePreference = "English"
) {
  const existingEmail = await getMailboxEmail(id);

  if (!existingEmail) {
    throw new Error("Email not found.");
  }

  if (existingEmail.status === "Auto-sent") {
    throw new Error("This reply was already sent.");
  }

  const sender = parseMailboxSender(existingEmail.sender);

  if (!sender.senderEmail) {
    throw new Error("The sender email address could not be parsed.");
  }

  const draftAdapter = await getAIDraftAdapter();
  const [suggestion, activeStaffAssignees] = await Promise.all([
    draftAdapter.generateDraftSuggestion(
      {
        senderName: sender.senderName,
        senderEmail: sender.senderEmail,
        subject: existingEmail.subject,
        body: existingEmail.body,
        category: getEmailDepartment(existingEmail),
        priority: existingEmail.priority,
      },
      language
    ),
    getActiveWorkspaceSuggestions(),
  ]);
  const nextDepartment = suggestion.routingDecision.department;
  const nextRoutingDecision = {
    ...suggestion.routingDecision,
    department: nextDepartment,
    suggestedAssignees: getDepartmentSuggestedAssignees(
      nextDepartment,
      activeStaffAssignees
    ),
  };

  const updatedEmail = await updateMailboxEmail(id, {
    category: nextDepartment,
    department: nextDepartment,
    routingDecision: nextRoutingDecision,
    approvalState: suggestion.manualReviewReason
      ? "Escalated"
      : suggestion.aiDraft
        ? "Needs Review"
        : "Awaiting Draft",
    confidence: suggestion.confidence,
    status: suggestion.manualReviewReason ? "Escalated" : "Draft",
    aiDraft: suggestion.aiDraft,
    source: suggestion.source,
    summary: suggestion.summary,
    manualReviewReason: suggestion.manualReviewReason,
    sourceCitations: suggestion.sourceCitations,
  });

  if (!updatedEmail) {
    throw new Error("Email not found.");
  }

  return updatedEmail;
}

export async function createMailboxEmail(
  input: StaffEmailCreateInput,
  language: LanguagePreference = "English"
) {
  return mailboxAdapter.createEmail(
    await buildMailboxCaseInput({
      input,
      language,
      caseOrigin: "Manual intake",
      threadLabel: {
        english: "Manual intake",
        polish: "Wpis ręczny",
      },
      internalLabel: {
        english: "Workspace intake",
        polish: "Przyjęcie w workspace",
      },
      internalAuthor: {
        english: "EduMailAI compose flow",
        polish: "Przepływ tworzenia EduMailAI",
      },
    })
  );
}

export async function ingestMailboxEmail(
  input: IngestMailboxEmailInput
): Promise<IngestMailboxEmailResult> {
  const existingEmail = await findMailboxEmailByInboundIdentity(
    input.provider,
    input.externalMessageId
  );

  if (existingEmail) {
    return {
      email: existingEmail,
      duplicate: true,
    };
  }

  const language = input.language ?? "English";
  const priority = inferInboundPriority(input.subject, input.body);
  const category = inferInboundCategory(
    input.subject,
    input.body,
    priority,
    language
  );
  const email = await mailboxAdapter.createEmail(
    await buildMailboxCaseInput({
      input: {
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        subject: input.subject,
        body: input.body,
        category,
        priority,
      },
      language,
      caseOrigin: "Email intake",
      receivedAt: input.receivedAt,
      threadLabel: {
        english: "Live inbox message",
        polish: "Wiadomość z żywej skrzynki",
      },
      internalLabel: {
        english: "Inbox sync import",
        polish: "Import synchronizacji skrzynki",
      },
      internalAuthor: {
        english: `${input.provider} inbox sync`,
        polish: `Synchronizacja skrzynki ${input.provider}`,
      },
      integration: {
        inboundProvider: input.provider,
        inboundMessageId: input.externalMessageId,
        inboundConversationId: input.externalConversationId ?? null,
        inboundSyncedAt: new Date().toISOString(),
        inboundReferenceUrl: input.referenceUrl ?? null,
        outboundProvider: null,
        outboundMessageId: null,
        outboundSentAt: null,
      },
    })
  );

  return {
    email,
    duplicate: false,
  };
}
