import type { LanguagePreference } from "@/lib/user-preferences";

export type EmailCategory = "Admissions" | "Finance" | "Registrar" | "Academic";
export type EmailStatus = "Draft" | "Auto-sent" | "Escalated";
export type EmailFilter = "All" | EmailStatus;
export type EmailPriority = "Low" | "Medium" | "High";
export type Department = EmailCategory;
export type StaffAssignee = string;
export type StaffAssignmentFilter = "All" | "Unassigned" | StaffAssignee;
export type StaffAssignmentSelectValue = "Unassigned" | StaffAssignee;
export type DepartmentFilter = "All" | Department;
export type CaseOrigin = "Email intake" | "Manual intake";
export type RoutingConfidence = "Low" | "Medium" | "High";
export type GroundingStrength = "Weak" | "Moderate" | "Strong";
export type CaseApprovalState =
  | "Awaiting Draft"
  | "Needs Review"
  | "Approved"
  | "Escalated";
export type EmailThreadEntryKind =
  | "Inbound"
  | "Outbound"
  | "Internal"
  | "System";

export type EmailThreadEntry = {
  id: string;
  kind: EmailThreadEntryKind;
  label: string;
  author: string;
  sentAt: string;
  body: string;
};

export type MailProvider = "local" | "microsoft_graph";

export type MailboxIntegration = {
  inboundProvider: MailProvider | null;
  inboundMessageId: string | null;
  inboundConversationId: string | null;
  inboundSyncedAt: string | null;
  inboundReferenceUrl: string | null;
  outboundProvider: MailProvider | null;
  outboundMessageId: string | null;
  outboundSentAt: string | null;
};

export type EmailSourceCitation = {
  id: string;
  documentName: string;
  excerpt: string;
  reason: string;
};

export type RoutingReasonCode =
  | "selected_category_match"
  | "department_override"
  | "ambiguous_department_match"
  | "insufficient_department_signals"
  | "low_confidence_manual_review"
  | "escalation_signal_detected"
  | "fallback_mapping";

export type RoutingReason = {
  code: RoutingReasonCode;
  signal?: string;
};

export type RoutingDecision = {
  department: Department;
  confidence: RoutingConfidence;
  confidenceScore: number;
  reason: string;
  routingReasons: RoutingReason[];
  signals: string[];
  escalationReason: string | null;
  suggestedAssignees: StaffAssignee[];
};

export type StaffEmailCreateInput = {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  category: EmailCategory;
  priority: EmailPriority;
};

export type StaffEmail = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  category: EmailCategory;
  department?: Department;
  caseOrigin?: CaseOrigin;
  routingDecision?: RoutingDecision;
  approvalState?: CaseApprovalState;
  confidence: number;
  priority: EmailPriority;
  status: EmailStatus;
  assignee: StaffAssignee | null;
  aiDraft: string | null;
  staffNote: string | null;
  source: string | null;
  summary: string;
  manualReviewReason: string | null;
  receivedAt: string;
  lastUpdatedAt: string;
  threadHistory: EmailThreadEntry[];
  sourceCitations: EmailSourceCitation[];
  integration?: MailboxIntegration | null;
};

export type StaffEmailUpdateInput = {
  status?: EmailStatus;
  assignee?: StaffAssignee | null;
  aiDraft?: string | null;
  staffNote?: string | null;
  category?: EmailCategory;
  department?: Department;
  routingDecision?: RoutingDecision;
  approvalState?: CaseApprovalState;
  confidence?: number;
  source?: string | null;
  summary?: string;
  manualReviewReason?: string | null;
  sourceCitations?: EmailSourceCitation[];
  integration?: MailboxIntegration | null;
};

export type EmailGroundingAssessment = {
  strength: GroundingStrength;
  score: number;
  approvalReady: boolean;
  summary: string;
  positives: string[];
  risks: string[];
};

export type EmailApprovalGuidance = {
  blockers: string[];
  nextActions: string[];
};

export type EmailCitationGroup = {
  documentName: string;
  citationCount: number;
  excerpts: string[];
  reasons: string[];
};

export type WorkloadPressure = "Balanced" | "Busy" | "Overloaded";

export type OwnerWorkloadSummary = {
  owner: StaffAssignee;
  totalCount: number;
  activeCount: number;
  approvalReadyCount: number;
  weakSupportCount: number;
  strongSupportCount: number;
  escalatedCount: number;
  highPriorityCount: number;
  primaryDepartment: Department | null;
  departments: Department[];
  pressureScore: number;
  pressure: WorkloadPressure;
};

export type DepartmentQueueSummary = {
  department: Department;
  totalCount: number;
  activeCount: number;
  approvalReadyCount: number;
  weakSupportCount: number;
  strongSupportCount: number;
  unassignedCount: number;
  escalatedCount: number;
  highPriorityCount: number;
  ownerCoverageRate: number;
  suggestedOwners: StaffAssignee[];
  lightestOwner: StaffAssignee | null;
  pressureScore: number;
  pressure: WorkloadPressure;
};

export type MailboxOperationsSnapshot = {
  totalCount: number;
  activeCount: number;
  approvalReadyCount: number;
  weakSupportCount: number;
  strongSupportCount: number;
  unassignedCount: number;
  escalatedCount: number;
  departmentSummaries: DepartmentQueueSummary[];
  ownerSummaries: OwnerWorkloadSummary[];
  mostPressuredDepartment: DepartmentQueueSummary | null;
  mostLoadedOwner: OwnerWorkloadSummary | null;
};

export type AssignmentRecommendation = {
  assignee: StaffAssignee;
  department: Department;
  reason: string;
  queueSummary: string;
  departmentSummary: string;
  pressure: WorkloadPressure;
};

function isPolishLanguage(language: LanguagePreference) {
  return language === "Polish";
}

export function translateDepartment(
  department: Department,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<Department, string> = {
      Admissions: "Rekrutacja",
      Finance: "Finanse",
      Registrar: "Dziekanat",
      Academic: "Akademickie",
    };

    return labels[department];
  }

  return department;
}

export function translateEmailCategory(
  category: EmailCategory,
  language: LanguagePreference = "English"
) {
  return translateDepartment(category, language);
}

export function translateEmailStatus(
  status: EmailStatus,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<EmailStatus, string> = {
      Draft: "Szkic",
      "Auto-sent": "Wysłano",
      Escalated: "Eskalacja",
    };

    return labels[status];
  }

  return status;
}

export function translateEmailPriority(
  priority: EmailPriority,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<EmailPriority, string> = {
      Low: "Niski",
      Medium: "Średni",
      High: "Wysoki",
    };

    return labels[priority];
  }

  return priority;
}

export function translateRoutingConfidence(
  confidence: RoutingConfidence,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<RoutingConfidence, string> = {
      Low: "Niska",
      Medium: "Średnia",
      High: "Wysoka",
    };

    return labels[confidence];
  }

  return confidence;
}

export function translateGroundingStrength(
  strength: GroundingStrength,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<GroundingStrength, string> = {
      Weak: "Słabe",
      Moderate: "Umiarkowane",
      Strong: "Silne",
    };

    return labels[strength];
  }

  return strength;
}

export function translateCaseApprovalState(
  state: CaseApprovalState,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<CaseApprovalState, string> = {
      "Awaiting Draft": "Oczekuje na szkic",
      "Needs Review": "Wymaga przeglądu",
      Approved: "Zatwierdzone",
      Escalated: "Eskalacja",
    };

    return labels[state];
  }

  return state;
}

export function translateWorkloadPressure(
  pressure: WorkloadPressure,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<WorkloadPressure, string> = {
      Balanced: "Zrównoważone",
      Busy: "Obciążone",
      Overloaded: "Przeciążone",
    };

    return labels[pressure];
  }

  return pressure;
}

export function translateCaseOrigin(
  origin: CaseOrigin,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<CaseOrigin, string> = {
      "Email intake": "Wpływ email",
      "Manual intake": "Wpis ręczny",
    };

    return labels[origin];
  }

  return origin;
}

export function translateThreadEntryKind(
  kind: EmailThreadEntryKind,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const labels: Record<EmailThreadEntryKind, string> = {
      Inbound: "Przychodzące",
      Outbound: "Wychodzące",
      Internal: "Wewnętrzne",
      System: "Systemowe",
    };

    return labels[kind];
  }

  return kind;
}

export function translateRoutingSignal(
  signal: string,
  language: LanguagePreference = "English"
) {
  if (!isPolishLanguage(language)) {
    return signal;
  }

  const labels: Record<string, string> = {
    admission: "rekrutacja",
    apply: "aplikacja",
    application: "wniosek",
    enrollment: "rejestracja",
    scholarship: "stypendium",
    international: "międzynarodowe",
    deadline: "termin",
    acceptance: "przyjęcie",
    billing: "rozliczenia",
    tuition: "czesne",
    payment: "płatność",
    refund: "zwrot",
    invoice: "faktura",
    balance: "saldo",
    fee: "opłata",
    "financial aid": "pomoc finansowa",
    transcript: "transkrypt",
    registration: "rejestracja",
    records: "dokumentacja",
    "enrollment verification": "potwierdzenie zapisu",
    drop: "rezygnacja",
    withdrawal: "wycofanie",
    calendar: "kalendarz",
    "name change": "zmiana nazwiska",
    credit: "punkty",
    grade: "ocena",
    faculty: "kadra",
    course: "kurs",
    appeal: "odwołanie",
    "academic advising": "doradztwo akademickie",
    degree: "dyplom",
    curriculum: "program",
    dispute: "spór",
    error: "błąd",
    urgent: "pilne",
    complaint: "skarga",
    legal: "prawne",
    grievance: "zażalenie",
    exception: "wyjątek",
    mismatch: "niezgodność",
    "manual review required": "wymagany ręczny przegląd",
    "workflow summary": "podsumowanie przepływu",
  };

  return labels[signal] ?? signal;
}

export function translateStaffAssignmentFilterLabel(
  filter: StaffAssignmentFilter,
  language: LanguagePreference = "English"
) {
  if (filter === "All") {
    return language === "Polish" ? "Wszyscy właściciele" : "All Owners";
  }

  if (filter === "Unassigned") {
    return language === "Polish" ? "Nieprzypisane" : "Unassigned";
  }

  return filter;
}

export function translateStaffAssignmentSelectValue(
  value: StaffAssignmentSelectValue,
  language: LanguagePreference = "English"
) {
  if (value === "Unassigned") {
    return language === "Polish" ? "Nieprzypisane" : "Unassigned";
  }

  return value;
}

export function translateDepartmentFilterLabel(
  filter: DepartmentFilter,
  language: LanguagePreference = "English"
) {
  if (filter === "All") {
    return language === "Polish" ? "Wszystkie działy" : "All Departments";
  }

  return translateDepartment(filter, language);
}

export const minimumSenderNameLength = 2;
export const minimumEmailSubjectLength = 3;
export const minimumEmailBodyLength = 10;

function buildUniqueStaffAssigneeOptions(groups: readonly (readonly StaffAssignee[])[]) {
  const seenOwners = new Set<string>();
  const uniqueOwners: StaffAssignee[] = [];

  for (const group of groups) {
    for (const owner of group) {
      const normalizedOwner = owner.trim();

      if (!normalizedOwner || seenOwners.has(normalizedOwner)) {
        continue;
      }

      seenOwners.add(normalizedOwner);
      uniqueOwners.push(normalizedOwner);
    }
  }

  return uniqueOwners;
}

export const departmentAssigneeMap: Record<Department, StaffAssignee[]> = {
  Admissions: ["Ava Patel", "Jordan Lee"],
  Finance: ["Noah Kim", "Priya Shah"],
  Registrar: ["Jordan Lee", "Ava Patel"],
  Academic: ["Priya Shah", "Ava Patel"],
};

export const departmentFilterOptions: DepartmentFilter[] = [
  "All",
  "Admissions",
  "Finance",
  "Registrar",
  "Academic",
];

export function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getEmailDepartment(
  email: Pick<StaffEmail, "department" | "category">
) {
  return email.department ?? email.category;
}

export function getStaffAssigneeOptions(
  availableOwners: readonly StaffAssignee[] = staffAssigneeOptions
) {
  return buildUniqueStaffAssigneeOptions([
    availableOwners.length > 0 ? availableOwners : staffAssigneeOptions,
  ]);
}

export function getStaffAssignmentFilters(
  availableOwners: readonly StaffAssignee[] = staffAssigneeOptions
): StaffAssignmentFilter[] {
  return [
    "All",
    "Unassigned",
    ...getStaffAssigneeOptions(availableOwners),
  ];
}

export function getDepartmentSuggestedAssignees(
  department: Department,
  availableOwners?: readonly StaffAssignee[]
) {
  const preferredOwners = departmentAssigneeMap[department];

  if (!availableOwners || availableOwners.length === 0) {
    return [...preferredOwners];
  }

  const activeOwners = getStaffAssigneeOptions(availableOwners);
  const matchingOwners = preferredOwners.filter((owner) =>
    activeOwners.includes(owner)
  );

  return matchingOwners.length > 0 ? matchingOwners : activeOwners;
}

export function getEmailApprovalState(
  email: Pick<StaffEmail, "approvalState" | "status" | "aiDraft">
) {
  if (email.approvalState) {
    return email.approvalState;
  }

  if (email.status === "Auto-sent") {
    return "Approved" as const;
  }

  if (email.status === "Escalated") {
    return "Escalated" as const;
  }

  if (email.aiDraft) {
    return "Needs Review" as const;
  }

  return "Awaiting Draft" as const;
}

export function getEmailWorkflowHref(
  email: Pick<StaffEmail, "id" | "status">
) {
  return `/dashboard/inbox?emailId=${encodeURIComponent(email.id)}`;
}

export function groupEmailSourceCitations(
  citations: StaffEmail["sourceCitations"]
): EmailCitationGroup[] {
  const groups = citations.reduce<Record<string, EmailCitationGroup>>(
    (totals, citation) => {
      const current = totals[citation.documentName] ?? {
        documentName: citation.documentName,
        citationCount: 0,
        excerpts: [],
        reasons: [],
      };

      current.citationCount += 1;

      if (!current.excerpts.includes(citation.excerpt)) {
        current.excerpts.push(citation.excerpt);
      }

      if (!current.reasons.includes(citation.reason)) {
        current.reasons.push(citation.reason);
      }

      totals[citation.documentName] = current;
      return totals;
    },
    {}
  );

  return Object.values(groups).sort((left, right) => {
    if (right.citationCount !== left.citationCount) {
      return right.citationCount - left.citationCount;
    }

    return left.documentName.localeCompare(right.documentName);
  });
}

export function getEmailReplyEntry(
  email: Pick<StaffEmail, "threadHistory">
) {
  const currentDraftEntry = email.threadHistory.find(
    (entry) => entry.id === "CURRENT-DRAFT"
  );

  if (currentDraftEntry) {
    return currentDraftEntry;
  }

  const outboundEntries = email.threadHistory
    .filter((entry) => entry.kind === "Outbound")
    .sort(
      (left, right) =>
        new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime()
    );

  return outboundEntries[0] ?? null;
}

export function assessEmailGrounding(
  email: Pick<
    StaffEmail,
    "aiDraft" | "source" | "sourceCitations" | "manualReviewReason" | "routingDecision" | "assignee"
  >,
  language: LanguagePreference = "English"
): EmailGroundingAssessment {
  const isPolish = isPolishLanguage(language);
  const positives: string[] = [];
  const risks: string[] = [];
  const uniqueDocumentCount = new Set(
    email.sourceCitations.map((citation) => citation.documentName)
  ).size;
  const routingConfidenceScore = email.routingDecision?.confidenceScore ?? 0;

  let score = 0;

  if (email.aiDraft) {
    score += 24;
    positives.push(
      isPolish
        ? "Szkic jest już dostępny do przeglądu przez człowieka."
        : "A draft is already available for human review."
    );
  } else {
    risks.push(
      isPolish
        ? "Brak szkicu, więc nadal wymagana jest ręczna odpowiedź."
        : "No draft is available yet, so a human response is still required."
    );
  }

  if (email.source) {
    score += 20;
    positives.push(
      isPolish
        ? `Do tej sprawy podłączono dokument źródłowy (${email.source}).`
        : `A source document is linked to this case (${email.source}).`
    );
  } else {
    risks.push(
      isPolish
        ? "Do tej sprawy nie podłączono jeszcze dokumentu źródłowego."
        : "No source document is linked to this case yet."
    );
  }

  if (email.sourceCitations.length > 0) {
    score += 18;
    positives.push(
      isPolish
        ? `${email.sourceCitations.length} cytowany fragment${email.sourceCitations.length === 1 ? "" : "y"} wspiera szkic.`
        : `${email.sourceCitations.length} cited passage${email.sourceCitations.length === 1 ? "" : "s"} support the draft.`
    );
  } else if (email.source) {
    score += 6;
    risks.push(
      isPolish
        ? "Źródło jest podłączone, ale do szkicu nie dołączono wspierających fragmentów."
        : "A source is linked, but no supporting excerpts are attached to the draft."
    );
  } else {
    risks.push(
      isPolish
        ? "Szkic nie zawiera zapisanych fragmentów potwierdzających treść."
        : "The draft does not include stored supporting excerpts."
    );
  }

  if (uniqueDocumentCount >= 2) {
    score += 12;
    positives.push(
      isPolish
        ? `Wsparcie jest rozłożone na ${uniqueDocumentCount} dokumenty źródłowe.`
        : `Support is distributed across ${uniqueDocumentCount} source documents.`
    );
  } else if (uniqueDocumentCount === 1 && email.sourceCitations.length > 0) {
    score += 6;
    positives.push(
      isPolish
        ? "Co najmniej jeden dokument źródłowy został osadzony w szkicu."
        : "At least one source document is grounded into the draft."
    );
  }

  if (routingConfidenceScore >= 85) {
    score += 12;
    positives.push(
      isPolish
        ? `Pewność routingu jest wysoka i wynosi ${routingConfidenceScore}%.`
        : `Routing confidence is high at ${routingConfidenceScore}%.`
    );
  } else if (routingConfidenceScore >= 70) {
    score += 6;
    positives.push(
      isPolish
        ? `Pewność routingu jest akceptowalna i wynosi ${routingConfidenceScore}%.`
        : `Routing confidence is acceptable at ${routingConfidenceScore}%.`
    );
  } else if (routingConfidenceScore > 0) {
    risks.push(
      isPolish
        ? `Pewność routingu wynosi tylko ${routingConfidenceScore}%, więc przypisanie do kolejki trzeba uważnie sprawdzić.`
        : `Routing confidence is only ${routingConfidenceScore}%, so the queue placement should be checked carefully.`
    );
  } else {
    risks.push(
      isPolish
        ? "Do tej sprawy nie dołączono wyniku pewności routingu."
        : "No routing confidence score is attached to this case."
    );
  }

  if (email.assignee) {
    score += 4;
    positives.push(
      isPolish
        ? `Przypisano właściciela (${email.assignee}).`
        : `An owner is assigned (${email.assignee}).`
    );
  } else {
    risks.push(
      isPolish ? "Nie przypisano jeszcze właściciela." : "No owner is assigned yet."
    );
  }

  if (email.manualReviewReason) {
    score -= 22;
    risks.push(email.manualReviewReason);
  }

  score = Math.max(0, Math.min(100, score));

  const strength: GroundingStrength =
    score >= 72 ? "Strong" : score >= 48 ? "Moderate" : "Weak";
  const approvalReady =
    Boolean(email.aiDraft) &&
    Boolean(email.source) &&
    email.sourceCitations.length > 0 &&
    !email.manualReviewReason &&
    routingConfidenceScore >= 70;

  let summary =
    isPolish
      ? "Ten szkic nadal wymaga weryfikacji człowieka przed zatwierdzeniem routingu i wsparcia źródłowego."
      : "This draft still needs a human to validate the routing and policy support before approval.";

  if (approvalReady) {
    summary =
      isPolish
        ? "Ten szkic ma wystarczające widoczne wsparcie, aby przejść do końcowego przeglądu i zatwierdzenia przez człowieka."
        : "This draft has enough visible support to move into final human review and approval.";
  } else if (strength === "Moderate") {
    summary =
      isPolish
        ? "Ten szkic ma częściowe wsparcie, ale przed zatwierdzeniem należy potwierdzić logikę routingu lub dodać mocniejsze dowody."
        : "This draft has partial support, but a reviewer should confirm the routing logic or add stronger cited evidence before approval.";
  } else if (strength === "Weak") {
    summary =
      isPolish
        ? "Ten szkic ma słabe podstawy i powinien pozostać w ręcznym przeglądzie, dopóki nie zostanie wzmocniony lepszym wsparciem."
        : "This draft is weakly grounded and should be treated as a manual-review case until stronger support is attached.";
  }

  return {
    strength,
    score,
    approvalReady,
    summary,
    positives,
    risks,
  };
}

export function getEmailApprovalGuidance(
  email: Pick<
    StaffEmail,
    "aiDraft" | "source" | "sourceCitations" | "manualReviewReason" | "routingDecision" | "assignee"
  >,
  language: LanguagePreference = "English"
): EmailApprovalGuidance {
  const isPolish = isPolishLanguage(language);
  const blockers: string[] = [];
  const nextActions: string[] = [];
  const grounding = assessEmailGrounding(email, language);
  const routingConfidenceScore = email.routingDecision?.confidenceScore ?? 0;

  if (!email.aiDraft) {
    blockers.push(
      isPolish
        ? "Brak gotowego szkicu, więc sprawa nie może przejść do zatwierdzenia."
        : "No draft is ready, so the case cannot move into approval."
    );
    nextActions.push(
      isPolish
        ? "Napisz lub zapisz szkic odpowiedzi przed końcowym przeglądem."
        : "Write or save a draft response before final review."
    );
  }

  if (!email.assignee) {
    blockers.push(
      isPolish
        ? "Sprawa nie ma obecnie przypisanego właściciela."
        : "The case does not have a current owner."
    );
    nextActions.push(
      isPolish
        ? "Przypisz sprawę do najlepiej dopasowanego właściciela działowego."
        : "Assign the case to the best-fit department owner."
    );
  }

  if (!email.source) {
    blockers.push(
      isPolish
        ? "Do sprawy nie podłączono głównego źródła polityki."
        : "No primary policy source is linked to the case."
    );
    nextActions.push(
      isPolish
        ? "Przed zatwierdzeniem dołącz najbardziej trafne źródło z bazy wiedzy."
        : "Attach the most relevant knowledge-base source before approval."
    );
  }

  if (email.source && email.sourceCitations.length === 0) {
    blockers.push(
      isPolish
        ? "Szkic odwołuje się do źródła, ale nie ma dołączonych zapisanych cytatów."
        : "The draft references a source, but no stored cited passages are attached."
    );
    nextActions.push(
      isPolish
        ? "Dodaj co najmniej jeden cytowany fragment pokazujący, która zasada wspiera odpowiedź."
        : "Add at least one cited excerpt showing which policy line supports the response."
    );
  }

  if (routingConfidenceScore > 0 && routingConfidenceScore < 70) {
    blockers.push(
      isPolish
        ? `Pewność routingu wynosi tylko ${routingConfidenceScore}%, więc przypisanie działu trzeba potwierdzić.`
        : `Routing confidence is only ${routingConfidenceScore}%, so the department placement should be confirmed.`
    );
    nextActions.push(
      isPolish
        ? "Zweryfikuj przypisany dział lub ręcznie prześlij sprawę do właściwego miejsca."
        : "Verify the routed department or manually reassign the case if needed."
    );
  }

  if (email.manualReviewReason) {
    blockers.push(email.manualReviewReason);
    nextActions.push(
      isPolish
        ? "Rozwiąż blokadę ręcznego przeglądu przed wysłaniem czegokolwiek na zewnątrz."
        : "Resolve the manual-review hold before sending anything outward."
    );
  }

  if (!grounding.approvalReady && blockers.length === 0) {
    blockers.push(
      isPolish
        ? "Sprawa nadal wymaga mocniejszych dowodów, zanim będzie bezpieczna do zatwierdzenia."
        : "The case still needs stronger evidence before it is safe to approve."
    );
  }

  if (nextActions.length === 0) {
    nextActions.push(
      isPolish
        ? "Wykonaj końcowy przegląd przez człowieka i zatwierdź odpowiedź, gdy będzie gotowa."
        : "Complete a final human review and approve the reply when ready."
    );
  }

  return {
    blockers,
    nextActions,
  };
}

function isActiveWorkflowEmail(email: Pick<StaffEmail, "status">) {
  return email.status !== "Auto-sent";
}

function getOwnerPressure(
  summary: Pick<
    OwnerWorkloadSummary,
    "pressureScore" | "activeCount" | "weakSupportCount" | "escalatedCount"
  >
): WorkloadPressure {
  if (
    summary.pressureScore >= 36 ||
    summary.activeCount >= 4 ||
    summary.weakSupportCount >= 2 ||
    summary.escalatedCount >= 2
  ) {
    return "Overloaded";
  }

  if (
    summary.pressureScore >= 16 ||
    summary.activeCount >= 2 ||
    summary.weakSupportCount >= 1 ||
    summary.escalatedCount >= 1
  ) {
    return "Busy";
  }

  return "Balanced";
}

function getDepartmentPressure(
  summary: Pick<
    DepartmentQueueSummary,
    | "pressureScore"
    | "activeCount"
    | "weakSupportCount"
    | "unassignedCount"
    | "escalatedCount"
  >
): WorkloadPressure {
  if (
    summary.pressureScore >= 42 ||
    summary.activeCount >= 5 ||
    summary.weakSupportCount >= 2 ||
    summary.unassignedCount >= 2 ||
    summary.escalatedCount >= 2
  ) {
    return "Overloaded";
  }

  if (
    summary.pressureScore >= 18 ||
    summary.activeCount >= 2 ||
    summary.weakSupportCount >= 1 ||
    summary.unassignedCount >= 1 ||
    summary.escalatedCount >= 1
  ) {
    return "Busy";
  }

  return "Balanced";
}

function pickLightestDepartmentOwner(
  department: Department,
  ownerSummaries: OwnerWorkloadSummary[]
) {
  const candidateOwners = getDepartmentSuggestedAssignees(
    department,
    ownerSummaries.map((summary) => summary.owner)
  )
    .map((owner) => ownerSummaries.find((summary) => summary.owner === owner))
    .filter((summary): summary is OwnerWorkloadSummary => summary !== undefined)
    .sort((left, right) => {
      if (left.pressureScore !== right.pressureScore) {
        return left.pressureScore - right.pressureScore;
      }

      if (left.activeCount !== right.activeCount) {
        return left.activeCount - right.activeCount;
      }

      if (left.weakSupportCount !== right.weakSupportCount) {
        return left.weakSupportCount - right.weakSupportCount;
      }

      if (left.totalCount !== right.totalCount) {
        return left.totalCount - right.totalCount;
      }

      return left.owner.localeCompare(right.owner);
    });

  return candidateOwners[0]?.owner ?? null;
}

export function summarizeMailboxOperations(
  emails: StaffEmail[],
  availableOwners: readonly StaffAssignee[] = staffAssigneeOptions
): MailboxOperationsSnapshot {
  const resolvedOwners = getStaffAssigneeOptions(availableOwners);
  const ownerSummaries = resolvedOwners
    .map<OwnerWorkloadSummary>((owner) => {
      const ownerEmails = emails.filter((email) => email.assignee === owner);
      const activeEmails = ownerEmails.filter(isActiveWorkflowEmail);
      const ownerGrounding = activeEmails.map((email) => assessEmailGrounding(email));
      const departmentCounts = activeEmails.reduce<Partial<Record<Department, number>>>(
        (totals, email) => {
          const department = getEmailDepartment(email);
          totals[department] = (totals[department] ?? 0) + 1;
          return totals;
        },
        {}
      );

      const primaryDepartment =
        Object.entries(departmentCounts).sort((left, right) => {
          if (right[1] !== left[1]) {
            return right[1] - left[1];
          }

          return left[0].localeCompare(right[0]);
        })[0]?.[0] ?? null;

      const approvalReadyCount = ownerGrounding.filter(
        (grounding) => grounding.approvalReady
      ).length;
      const weakSupportCount = ownerGrounding.filter(
        (grounding) => grounding.strength === "Weak"
      ).length;
      const strongSupportCount = ownerGrounding.filter(
        (grounding) => grounding.strength === "Strong"
      ).length;
      const escalatedCount = activeEmails.filter(
        (email) => email.status === "Escalated"
      ).length;
      const highPriorityCount = activeEmails.filter(
        (email) => email.priority === "High"
      ).length;
      const pressureScore =
        activeEmails.length * 8 +
        weakSupportCount * 6 +
        escalatedCount * 5 +
        highPriorityCount * 4 -
        approvalReadyCount * 3;

      return {
        owner,
        totalCount: ownerEmails.length,
        activeCount: activeEmails.length,
        approvalReadyCount,
        weakSupportCount,
        strongSupportCount,
        escalatedCount,
        highPriorityCount,
        primaryDepartment:
          primaryDepartment === null ? null : (primaryDepartment as Department),
        departments: Object.keys(departmentCounts) as Department[],
        pressureScore,
        pressure: getOwnerPressure({
          pressureScore,
          activeCount: activeEmails.length,
          weakSupportCount,
          escalatedCount,
        }),
      };
    })
    .sort((left, right) => {
      if (right.pressureScore !== left.pressureScore) {
        return right.pressureScore - left.pressureScore;
      }

      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount;
      }

      return left.owner.localeCompare(right.owner);
    });

  const departmentSummaries = emailCategoryOptions
    .map<DepartmentQueueSummary>((department) => {
      const departmentEmails = emails.filter(
        (email) => getEmailDepartment(email) === department
      );
      const activeEmails = departmentEmails.filter(isActiveWorkflowEmail);
      const departmentGrounding = activeEmails.map((email) =>
        assessEmailGrounding(email)
      );
      const approvalReadyCount = departmentGrounding.filter(
        (grounding) => grounding.approvalReady
      ).length;
      const weakSupportCount = departmentGrounding.filter(
        (grounding) => grounding.strength === "Weak"
      ).length;
      const strongSupportCount = departmentGrounding.filter(
        (grounding) => grounding.strength === "Strong"
      ).length;
      const unassignedCount = activeEmails.filter(
        (email) => email.assignee === null
      ).length;
      const escalatedCount = activeEmails.filter(
        (email) => email.status === "Escalated"
      ).length;
      const highPriorityCount = activeEmails.filter(
        (email) => email.priority === "High"
      ).length;
      const pressureScore =
        activeEmails.length * 7 +
        weakSupportCount * 6 +
        unassignedCount * 5 +
        escalatedCount * 5 +
        highPriorityCount * 4 -
        approvalReadyCount * 2;

      return {
        department,
        totalCount: departmentEmails.length,
        activeCount: activeEmails.length,
        approvalReadyCount,
        weakSupportCount,
        strongSupportCount,
        unassignedCount,
        escalatedCount,
        highPriorityCount,
        ownerCoverageRate:
          activeEmails.length === 0
            ? 100
            : Math.round(
                ((activeEmails.length - unassignedCount) / activeEmails.length) *
                  100
              ),
        suggestedOwners: getDepartmentSuggestedAssignees(
          department,
          resolvedOwners
        ),
        lightestOwner: null,
        pressureScore,
        pressure: getDepartmentPressure({
          pressureScore,
          activeCount: activeEmails.length,
          weakSupportCount,
          unassignedCount,
          escalatedCount,
        }),
      };
    })
    .map((summary) => ({
      ...summary,
      lightestOwner: pickLightestDepartmentOwner(summary.department, ownerSummaries),
    }))
    .sort((left, right) => {
      if (right.pressureScore !== left.pressureScore) {
        return right.pressureScore - left.pressureScore;
      }

      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount;
      }

      return left.department.localeCompare(right.department);
    });

  const activeEmails = emails.filter(isActiveWorkflowEmail);
  const activeGrounding = activeEmails.map((email) => assessEmailGrounding(email));

  return {
    totalCount: emails.length,
    activeCount: activeEmails.length,
    approvalReadyCount: activeGrounding.filter((grounding) => grounding.approvalReady)
      .length,
    weakSupportCount: activeGrounding.filter(
      (grounding) => grounding.strength === "Weak"
    ).length,
    strongSupportCount: activeGrounding.filter(
      (grounding) => grounding.strength === "Strong"
    ).length,
    unassignedCount: activeEmails.filter((email) => email.assignee === null).length,
    escalatedCount: activeEmails.filter((email) => email.status === "Escalated")
      .length,
    departmentSummaries,
    ownerSummaries,
    mostPressuredDepartment:
      departmentSummaries.find((summary) => summary.activeCount > 0) ?? null,
    mostLoadedOwner: ownerSummaries.find((summary) => summary.activeCount > 0) ?? null,
  };
}

export function getEmailAssignmentRecommendation(
  email: Pick<
    StaffEmail,
    "assignee" | "category" | "department" | "routingDecision"
  >,
  snapshot: MailboxOperationsSnapshot,
  language: LanguagePreference = "English"
): AssignmentRecommendation | null {
  const isPolish = isPolishLanguage(language);
  const department = getEmailDepartment(email);
  const departmentLabel = translateDepartment(department, language);
  const availableOwners = snapshot.ownerSummaries.map((summary) => summary.owner);
  const ownerMap = new Map(
    snapshot.ownerSummaries.map((summary) => [summary.owner, summary])
  );
  const routingSuggestedOwners =
    email.routingDecision?.suggestedAssignees.filter((owner) =>
      availableOwners.includes(owner)
    ) ?? [];
  const candidateOwners =
    routingSuggestedOwners.length > 0
      ? routingSuggestedOwners
      : getDepartmentSuggestedAssignees(department, availableOwners);

  const candidateSummaries = candidateOwners
    .map((owner) => ownerMap.get(owner))
    .filter((summary): summary is OwnerWorkloadSummary => summary !== undefined)
    .sort((left, right) => {
      if (left.pressureScore !== right.pressureScore) {
        return left.pressureScore - right.pressureScore;
      }

      if (left.activeCount !== right.activeCount) {
        return left.activeCount - right.activeCount;
      }

      if (left.weakSupportCount !== right.weakSupportCount) {
        return left.weakSupportCount - right.weakSupportCount;
      }

      if (left.totalCount !== right.totalCount) {
        return left.totalCount - right.totalCount;
      }

      return left.owner.localeCompare(right.owner);
    });

  const currentOwnerSummary = email.assignee ? ownerMap.get(email.assignee) : null;
  let recommendedSummary = candidateSummaries[0] ?? currentOwnerSummary ?? null;

  if (
    currentOwnerSummary &&
    candidateOwners.includes(currentOwnerSummary.owner) &&
    recommendedSummary &&
    currentOwnerSummary.pressureScore <= recommendedSummary.pressureScore + 2
  ) {
    recommendedSummary = currentOwnerSummary;
  }

  if (!recommendedSummary) {
    return null;
  }

  const departmentSummary = snapshot.departmentSummaries.find(
    (summary) => summary.department === department
  );
  const queueSummary = isPolish
    ? `${recommendedSummary.activeCount} aktywne • ${recommendedSummary.weakSupportCount} słabe wsparcie • ${recommendedSummary.approvalReadyCount} gotowe do zatwierdzenia`
    : `${recommendedSummary.activeCount} active • ${recommendedSummary.weakSupportCount} weak-support • ${recommendedSummary.approvalReadyCount} approval-ready`;
  const departmentSummaryText = departmentSummary
    ? isPolish
      ? `${departmentSummary.activeCount} aktywne w dziale ${departmentLabel} • ${departmentSummary.unassignedCount} nieprzypisane • ${departmentSummary.weakSupportCount} słabe wsparcie`
      : `${departmentSummary.activeCount} active in ${department} • ${departmentSummary.unassignedCount} unassigned • ${departmentSummary.weakSupportCount} weak-support`
    : isPolish
      ? `Podsumowanie obciążenia dla działu ${departmentLabel} nie jest jeszcze dostępne.`
      : `${department} workload summary is not available yet.`;

  let reason = isPolish
    ? `${recommendedSummary.owner} należy do rotacji ${departmentLabel} i ma obecnie najlżejsze widoczne obciążenie.`
    : `${recommendedSummary.owner} is in the ${department} rotation and currently has the lightest visible workload.`;

  if (email.assignee === recommendedSummary.owner) {
    reason = isPolish
      ? `${recommendedSummary.owner} już prowadzi tę sprawę i nadal wygląda na najlepiej dopasowanego właściciela dla obecnego obciążenia działu ${departmentLabel}.`
      : `${recommendedSummary.owner} already owns this case and still looks like the best-fit owner for the current ${department} workload.`;
  } else if (email.assignee && currentOwnerSummary) {
    reason = isPolish
      ? `${recommendedSummary.owner} ma lżejszą kolejkę ${departmentLabel} niż ${email.assignee}, więc ta sprawa jest teraz tam lepiej dopasowana.`
      : `${recommendedSummary.owner} has a lighter ${department} queue than ${email.assignee}, so this case is a better fit there right now.`;
  } else if (recommendedSummary.activeCount === 0) {
    reason = isPolish
      ? `${recommendedSummary.owner} należy do rotacji ${departmentLabel} i nie ma jeszcze aktywnych spraw w tym wycinku kolejki.`
      : `${recommendedSummary.owner} is part of the ${department} rotation and has no active cases in this queue slice yet.`;
  }

  return {
    assignee: recommendedSummary.owner,
    department,
    reason,
    queueSummary,
    departmentSummary: departmentSummaryText,
    pressure: recommendedSummary.pressure,
  };
}

export const emailCategoryOptions = [
  "Admissions",
  "Finance",
  "Registrar",
  "Academic",
] as const satisfies readonly EmailCategory[];

export const emailPriorityOptions = [
  "Low",
  "Medium",
  "High",
] as const satisfies readonly EmailPriority[];

export const staffAssigneeOptions = [
  "Ava Patel",
  "Noah Kim",
  "Priya Shah",
  "Jordan Lee",
] as const satisfies readonly StaffAssignee[];

export const staffAssignmentFilters =
  getStaffAssignmentFilters() as readonly StaffAssignmentFilter[];

export const defaultStaffAssignmentFilter = "All";
export const defaultStaffAssignmentSelection = "Unassigned";

const seedEmails: StaffEmail[] = [
  {
    id: "EM-1001",
    sender: "Maya Thompson <maya.thompson@student.edu>",
    subject: "Questions about international admission requirements",
    body: "Hello Admissions Team, I am applying as an international student for Fall 2027 and wanted to confirm if IELTS scores are mandatory when I already have SAT verbal scores. Could you also share the deadline for scholarship consideration?",
    category: "Admissions",
    confidence: 93,
    priority: "Medium",
    status: "Draft",
    assignee: "Ava Patel",
    aiDraft:
      "Hello Maya,\n\nThank you for your interest in EduMail University. For international applicants, IELTS or TOEFL is generally required unless your prior education was completed in English. SAT verbal scores are helpful but do not replace the English proficiency requirement in most cases.\n\nFor scholarship consideration, please submit your full application by December 15.\n\nBest regards,\nAdmissions Office",
    staffNote: null,
    source: "Admissions-International-Policy-2026.pdf",
    summary:
      "International applicant asking about English-language requirements and scholarship timing for Fall 2027.",
    manualReviewReason: null,
    receivedAt: "2026-03-27T09:12:00.000Z",
    lastUpdatedAt: "2026-03-27T10:05:00.000Z",
    threadHistory: [
      {
        id: "EM-1001-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Maya Thompson",
        sentAt: "2026-03-27T09:12:00.000Z",
        body:
          "Hello Admissions Team, I am applying as an international student for Fall 2027 and wanted to confirm if IELTS scores are mandatory when I already have SAT verbal scores. Could you also share the deadline for scholarship consideration?",
      },
      {
        id: "EM-1001-TH-2",
        kind: "Internal",
        label: "Routing note",
        author: "Admissions triage",
        sentAt: "2026-03-27T09:20:00.000Z",
        body:
          "Assigned to international admissions review because scholarship timing is bundled into the same response.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1001-SRC-1",
        documentName: "Admissions-International-Policy-2026.pdf",
        excerpt:
          "International applicants must provide IELTS or TOEFL scores unless prior study was completed in English.",
        reason: "Supports the English proficiency requirement.",
      },
      {
        id: "EM-1001-SRC-2",
        documentName: "Admissions-International-Policy-2026.pdf",
        excerpt:
          "Priority scholarship review requires a complete application submitted by December 15.",
        reason: "Supports the scholarship deadline in the draft.",
      },
    ],
  },
  {
    id: "EM-1002",
    sender: "Liam Patel <liam.patel@student.edu>",
    subject: "Installment plan for spring tuition payment",
    body: "Hi Finance Office, I cannot pay the full spring tuition this month. Is there a monthly installment option and what are the late fee rules if one payment is delayed?",
    category: "Finance",
    confidence: 89,
    priority: "High",
    status: "Auto-sent",
    assignee: "Noah Kim",
    aiDraft:
      "Hello Liam,\n\nYes, we offer a monthly installment plan for spring tuition. You can enroll through the student billing portal under Payment Plans. Please note that each missed installment may incur a late fee based on our tuition policy.\n\nIf needed, we can also connect you with Financial Aid to discuss additional support options.\n\nRegards,\nStudent Finance Team",
    staffNote: null,
    source: "Student-Billing-Handbook-2026.docx",
    summary:
      "Finance inquiry about tuition installments and late-fee exposure for spring billing.",
    manualReviewReason: null,
    receivedAt: "2026-03-27T11:46:00.000Z",
    lastUpdatedAt: "2026-03-27T12:18:00.000Z",
    threadHistory: [
      {
        id: "EM-1002-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Liam Patel",
        sentAt: "2026-03-27T11:46:00.000Z",
        body:
          "Hi Finance Office, I cannot pay the full spring tuition this month. Is there a monthly installment option and what are the late fee rules if one payment is delayed?",
      },
      {
        id: "EM-1002-TH-2",
        kind: "Outbound",
        label: "Approved reply",
        author: "Noah Kim",
        sentAt: "2026-03-27T12:18:00.000Z",
        body:
          "Confirmed installment-plan availability, pointed the student to the billing portal, and called out late-fee policy plus financial-aid escalation.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1002-SRC-1",
        documentName: "Student-Billing-Handbook-2026.docx",
        excerpt:
          "Students may enroll in a monthly payment plan through the billing portal before the published spring tuition deadline.",
        reason: "Supports the installment-plan availability in the reply.",
      },
    ],
  },
  {
    id: "EM-1003",
    sender: "Registrar Queue <noreply@registrar.edu>",
    subject: "Name mismatch on transcript request",
    body: "A transcript request from student ID 224198 was flagged due to a legal name mismatch between SIS and the transcript form. Please review and advise next steps.",
    category: "Registrar",
    confidence: 74,
    priority: "High",
    status: "Escalated",
    assignee: "Priya Shah",
    aiDraft: null,
    staffNote:
      "Potential legal-name exception. Confirm the registrar identity-match policy before replying.",
    source: "Transcript-Request-Workflow-v4.pdf",
    summary:
      "Registrar exception case involving identity verification before a transcript request can proceed.",
    manualReviewReason:
      "This case requires policy confirmation because the request involves a legal-name mismatch across systems.",
    receivedAt: "2026-03-28T07:30:00.000Z",
    lastUpdatedAt: "2026-03-28T08:14:00.000Z",
    threadHistory: [
      {
        id: "EM-1003-TH-1",
        kind: "System",
        label: "Queue alert",
        author: "Registrar Queue",
        sentAt: "2026-03-28T07:30:00.000Z",
        body:
          "Transcript request flagged due to a legal-name mismatch between SIS and the submitted transcript form.",
      },
      {
        id: "EM-1003-TH-2",
        kind: "Internal",
        label: "Escalation note",
        author: "Priya Shah",
        sentAt: "2026-03-28T08:14:00.000Z",
        body:
          "Needs registrar identity-match policy confirmation before the student is contacted.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1003-SRC-1",
        documentName: "Transcript-Request-Workflow-v4.pdf",
        excerpt:
          "Transcript requests with legal-name discrepancies must be held until identity verification is completed by Registrar Operations.",
        reason: "Explains why this case cannot be auto-sent yet.",
      },
    ],
  },
  {
    id: "EM-1004",
    sender: "Prof. Elena Cruz <ecruz@faculty.edu>",
    subject: "Grade change approval process for capstone course",
    body: "Good afternoon, I need to submit a grade correction for two capstone students due to an LMS export issue. Can you confirm the approval chain and expected processing timeline?",
    category: "Academic",
    confidence: 91,
    priority: "Medium",
    status: "Draft",
    assignee: null,
    aiDraft:
      "Dear Professor Cruz,\n\nThank you for reaching out. Grade correction requests for capstone courses should be submitted via the Academic Records portal. After submission, requests route to your department chair for approval and then to the Registrar for final posting.\n\nTypical processing time is 3-5 business days.\n\nBest,\nAcademic Operations",
    staffNote: null,
    source: "Academic-Records-SOP-2026.pdf",
    summary:
      "Faculty request about grade-correction approvals and turnaround for capstone records.",
    manualReviewReason: null,
    receivedAt: "2026-03-28T14:22:00.000Z",
    lastUpdatedAt: "2026-03-28T14:41:00.000Z",
    threadHistory: [
      {
        id: "EM-1004-TH-1",
        kind: "Inbound",
        label: "Faculty inquiry",
        author: "Prof. Elena Cruz",
        sentAt: "2026-03-28T14:22:00.000Z",
        body:
          "Good afternoon, I need to submit a grade correction for two capstone students due to an LMS export issue. Can you confirm the approval chain and expected processing timeline?",
      },
      {
        id: "EM-1004-TH-2",
        kind: "Internal",
        label: "Draft queued",
        author: "Academic Operations",
        sentAt: "2026-03-28T14:41:00.000Z",
        body:
          "Draft created from academic-records SOP. Waiting for assignment before final review.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1004-SRC-1",
        documentName: "Academic-Records-SOP-2026.pdf",
        excerpt:
          "Grade corrections route to the department chair first and then to the Registrar for posting after approval.",
        reason: "Supports the approval-chain explanation.",
      },
    ],
  },
  {
    id: "EM-1005",
    sender: "Noah Kim <noah.kim@student.edu>",
    subject: "Deadline to drop elective without W grade",
    body: "Hi, could you tell me the last date to drop an elective this semester without receiving a W on my transcript? I am considering a schedule adjustment.",
    category: "Registrar",
    confidence: 96,
    priority: "Low",
    status: "Auto-sent",
    assignee: "Jordan Lee",
    aiDraft:
      "Hello Noah,\n\nThe last date to drop an elective course without receiving a W grade this semester is April 4. You can process the change through the registration portal before 11:59 PM local time.\n\nIf you want help evaluating schedule impacts, we recommend speaking with your academic advisor.\n\nRegards,\nRegistrar Office",
    staffNote: null,
    source: "Academic-Calendar-2026.pdf",
    summary:
      "Registrar deadline question about course-drop timing and transcript impact.",
    manualReviewReason: null,
    receivedAt: "2026-03-29T08:05:00.000Z",
    lastUpdatedAt: "2026-03-29T08:21:00.000Z",
    threadHistory: [
      {
        id: "EM-1005-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Noah Kim",
        sentAt: "2026-03-29T08:05:00.000Z",
        body:
          "Hi, could you tell me the last date to drop an elective this semester without receiving a W on my transcript? I am considering a schedule adjustment.",
      },
      {
        id: "EM-1005-TH-2",
        kind: "Outbound",
        label: "Approved reply",
        author: "Jordan Lee",
        sentAt: "2026-03-29T08:21:00.000Z",
        body:
          "Confirmed the no-W drop deadline and directed the student to academic advising for schedule planning.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1005-SRC-1",
        documentName: "Academic-Calendar-2026.pdf",
        excerpt:
          "The last day to drop an elective without a W grade is April 4 at 11:59 PM local time.",
        reason: "Supports the deadline quoted in the approved reply.",
      },
    ],
  },
];

export function getInitialStaffEmails() {
  return seedEmails.map((email) => ({
    ...email,
    threadHistory: email.threadHistory.map((entry) => ({ ...entry })),
    sourceCitations: email.sourceCitations.map((citation) => ({ ...citation })),
  }));
}

export function isEmailStatus(value: string): value is EmailStatus {
  return value === "Draft" || value === "Auto-sent" || value === "Escalated";
}

export function isEmailCategory(value: string): value is EmailCategory {
  return emailCategoryOptions.includes(value as EmailCategory);
}

export function isEmailPriority(value: string): value is EmailPriority {
  return emailPriorityOptions.includes(value as EmailPriority);
}

export function isEmailFilter(value: string): value is EmailFilter {
  return value === "All" || isEmailStatus(value);
}

export function isStaffAssignee(
  value: string,
  availableOwners: readonly StaffAssignee[] = staffAssigneeOptions
): value is StaffAssignee {
  return getStaffAssigneeOptions(availableOwners).includes(value);
}

export function isStaffAssignmentFilter(
  value: string,
  availableOwners: readonly StaffAssignee[] = staffAssigneeOptions
): value is StaffAssignmentFilter {
  return (
    value === "All" ||
    value === "Unassigned" ||
    isStaffAssignee(value, availableOwners)
  );
}

export function isDepartmentFilter(value: string): value is DepartmentFilter {
  return value === "All" || emailCategoryOptions.includes(value as Department);
}

export function filterEmails(emails: StaffEmail[], filter: EmailFilter) {
  if (filter === "All") {
    return emails;
  }

  return emails.filter((email) => email.status === filter);
}

export function filterEmailsByAssignment(
  emails: StaffEmail[],
  filter: StaffAssignmentFilter
) {
  if (filter === "All") {
    return emails;
  }

  if (filter === "Unassigned") {
    return emails.filter((email) => email.assignee === null);
  }

  return emails.filter((email) => email.assignee === filter);
}

export function filterEmailsByDepartment(
  emails: StaffEmail[],
  filter: DepartmentFilter
) {
  if (filter === "All") {
    return emails;
  }

  return emails.filter((email) => getEmailDepartment(email) === filter);
}

export function getStaffAssignmentFilterLabel(
  filter: StaffAssignmentFilter,
  language: LanguagePreference = "English"
) {
  return translateStaffAssignmentFilterLabel(filter, language);
}

export function getDepartmentFilterLabel(
  filter: DepartmentFilter,
  language: LanguagePreference = "English"
) {
  return translateDepartmentFilterLabel(filter, language);
}

export function getInitialSelectedEmailId(emails: StaffEmail[]) {
  return emails[0]?.id ?? "";
}

export function getSelectedEmail(emails: StaffEmail[], selectedId: string) {
  return emails.find((email) => email.id === selectedId) ?? emails[0];
}
