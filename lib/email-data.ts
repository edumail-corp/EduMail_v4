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
  outboundAttemptCount?: number;
  outboundLastAttemptAt?: string | null;
  outboundLastError?: string | null;
  outboundLastStatus?: "sent" | "failed" | null;
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
    id: "EM-1010",
    sender: "Sofia Alvarez <sofia.alvarez@students.northbridge.edu>",
    subject: "Can I stay in scholarship review while my translated transcript is pending?",
    body: "Hello Admissions Team, I submitted my international application for Fall 2027 and uploaded my English-taught bachelor degree certificate. My official translated transcript will arrive next week. Can my application still stay in scholarship review, and do I need to book IELTS now?",
    category: "Admissions",
    confidence: 94,
    priority: "High",
    status: "Draft",
    assignee: "Ava Patel",
    aiDraft:
      "Hello Sofia,\n\nThank you for checking with us. If your previous degree was taught in English, the admissions team can review that documentation as possible English-language proof, but it must be included clearly in your application file. A separate IELTS booking is not always required when official proof of English-taught prior study is accepted.\n\nFor scholarship review, your file needs to be complete, including translated transcripts and required supporting documents. Please upload the official translated transcript as soon as it is available so your application can move forward without delay.\n\nBest regards,\nAdmissions Office",
    staffNote:
      "Good featured pitch case: shows grounded answer, no invented scholarship promise, and a clear next step for the student.",
    source: "International Admissions Guidance 2026.pdf",
    summary:
      "International applicant needs clear guidance on English-language proof and scholarship review while a translated transcript is still pending.",
    manualReviewReason: null,
    receivedAt: "2026-04-24T08:18:00.000Z",
    lastUpdatedAt: "2026-04-24T08:43:00.000Z",
    threadHistory: [
      {
        id: "EM-1010-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Sofia Alvarez",
        sentAt: "2026-04-24T08:18:00.000Z",
        body:
          "Hello Admissions Team, I submitted my international application for Fall 2027 and uploaded my English-taught bachelor degree certificate. My official translated transcript will arrive next week. Can my application still stay in scholarship review, and do I need to book IELTS now?",
      },
      {
        id: "EM-1010-TH-2",
        kind: "Internal",
        label: "Grounded draft prepared",
        author: "Admissions triage",
        sentAt: "2026-04-24T08:43:00.000Z",
        body:
          "Prepared a staff-review draft using international admissions guidance. The reply avoids promising scholarship review until the file is complete.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1010-SRC-1",
        documentName: "International Admissions Guidance 2026.pdf",
        excerpt:
          "International applicants must document English-language proficiency unless prior study was completed in English and official proof is included in the application file.",
        reason:
          "Supports the answer about English-taught prior study as possible language proof.",
      },
      {
        id: "EM-1010-SRC-2",
        documentName: "International Admissions Guidance 2026.pdf",
        excerpt:
          "Scholarship review begins only after the admissions file is complete, including translated transcripts and required supporting documents.",
        reason:
          "Supports the next step without promising that scholarship review can proceed early.",
      },
    ],
  },
  {
    id: "EM-1011",
    sender: "Daniel Weber <daniel.weber@students.northbridge.edu>",
    subject: "Registration hold after missing one payment-plan installment",
    body: "Hi Student Finance, I missed one installment on my payment plan because my employer reimbursement came late. I am worried my summer registration will be blocked. Can I pay today and have the hold removed?",
    category: "Finance",
    confidence: 86,
    priority: "High",
    status: "Escalated",
    assignee: "Noah Kim",
    aiDraft: null,
    staffNote:
      "Use this one to show human control: AI can summarize the rule, but a staff member must verify the account before promising hold removal.",
    source: "Student Billing and Payment Plans 2026.docx",
    summary:
      "Student missed a payment-plan installment and wants a registration hold removed after paying today.",
    manualReviewReason:
      "The reply should not promise hold removal until Student Finance verifies the account balance and repayment status.",
    receivedAt: "2026-04-24T09:04:00.000Z",
    lastUpdatedAt: "2026-04-24T09:27:00.000Z",
    threadHistory: [
      {
        id: "EM-1011-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Daniel Weber",
        sentAt: "2026-04-24T09:04:00.000Z",
        body:
          "Hi Student Finance, I missed one installment on my payment plan because my employer reimbursement came late. I am worried my summer registration will be blocked. Can I pay today and have the hold removed?",
      },
      {
        id: "EM-1011-TH-2",
        kind: "Internal",
        label: "Escalation note",
        author: "Finance triage",
        sentAt: "2026-04-24T09:27:00.000Z",
        body:
          "Escalated because account-specific hold removal must be confirmed by Student Finance before replying.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1011-SRC-1",
        documentName: "Student Billing and Payment Plans 2026.docx",
        excerpt:
          "Overdue balances may place registration or transcript services on hold until the finance team confirms a compliant repayment arrangement.",
        reason:
          "Explains why this case needs account verification before the staff response is approved.",
      },
    ],
  },
  {
    id: "EM-1012",
    sender: "Aisha Rahman <aisha.rahman@students.northbridge.edu>",
    subject: "Urgent transcript for graduate application is still on hold",
    body: "Hello Registrar, my graduate application deadline is Monday and my transcript request still says identity verification hold. My passport uses my full legal name, but my student profile shows my preferred first name. Can this be released today?",
    category: "Registrar",
    confidence: 81,
    priority: "High",
    status: "Escalated",
    assignee: "Priya Shah",
    aiDraft: null,
    staffNote:
      "Strong governance example: urgent tone, but the system correctly blocks auto-response because identity verification is involved.",
    source: "Transcript Identity Verification Workflow.pdf",
    summary:
      "Urgent transcript request is blocked by an identity verification hold caused by legal-name and preferred-name mismatch.",
    manualReviewReason:
      "Identity verification must be completed by Registrar Operations before release timing can be confirmed.",
    receivedAt: "2026-04-24T10:15:00.000Z",
    lastUpdatedAt: "2026-04-24T10:38:00.000Z",
    threadHistory: [
      {
        id: "EM-1012-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Aisha Rahman",
        sentAt: "2026-04-24T10:15:00.000Z",
        body:
          "Hello Registrar, my graduate application deadline is Monday and my transcript request still says identity verification hold. My passport uses my full legal name, but my student profile shows my preferred first name. Can this be released today?",
      },
      {
        id: "EM-1012-TH-2",
        kind: "Internal",
        label: "Manual review required",
        author: "Registrar triage",
        sentAt: "2026-04-24T10:38:00.000Z",
        body:
          "Release timing cannot be promised until the identity hold is reviewed by Registrar Operations.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1012-SRC-1",
        documentName: "Transcript Identity Verification Workflow.pdf",
        excerpt:
          "Requests with legal-name discrepancies remain on hold until Registrar Operations completes identity verification.",
        reason:
          "Supports escalation and prevents the draft from promising same-day transcript release.",
      },
      {
        id: "EM-1012-SRC-2",
        documentName: "Transcript Identity Verification Workflow.pdf",
        excerpt:
          "Staff should direct urgent exceptions through Registrar Operations and document the hold reason instead of confirming release dates before verification is complete.",
        reason:
          "Supports the recommended internal next step.",
      },
    ],
  },
  {
    id: "EM-1013",
    sender: "Prof. Marcus Chen <marcus.chen@northbridge.edu>",
    subject: "Grade correction approved by chair, what happens next?",
    body: "Good morning, the department chair approved my grade correction request for a senior project course. The students are asking when the corrected grades will show on their records. What should I tell them?",
    category: "Academic",
    confidence: 92,
    priority: "Medium",
    status: "Draft",
    assignee: null,
    aiDraft:
      "Dear Professor Chen,\n\nThank you for confirming that department approval has been recorded. After chair approval, the correction is routed to Registrar Operations for final posting in the academic record system.\n\nWe recommend telling students that the correction is moving through the final registrar posting step and that they should wait for the official record update rather than relying on an estimated posting date.\n\nBest,\nAcademic Operations",
    staffNote:
      "Unassigned by design so the pitch can show owner assignment and queue recommendations.",
    source: "Academic Records Change Process 2026.pdf",
    summary:
      "Faculty member asks what to tell students after a department-chair-approved grade correction moves to registrar posting.",
    manualReviewReason: null,
    receivedAt: "2026-04-24T11:22:00.000Z",
    lastUpdatedAt: "2026-04-24T11:46:00.000Z",
    threadHistory: [
      {
        id: "EM-1013-TH-1",
        kind: "Inbound",
        label: "Faculty inquiry",
        author: "Prof. Marcus Chen",
        sentAt: "2026-04-24T11:22:00.000Z",
        body:
          "Good morning, the department chair approved my grade correction request for a senior project course. The students are asking when the corrected grades will show on their records. What should I tell them?",
      },
      {
        id: "EM-1013-TH-2",
        kind: "Internal",
        label: "Draft queued",
        author: "Academic Operations",
        sentAt: "2026-04-24T11:46:00.000Z",
        body:
          "Draft prepared from the academic records change process. Needs owner assignment before final review.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1013-SRC-1",
        documentName: "Academic Records Change Process 2026.pdf",
        excerpt:
          "Grade corrections require department approval before the Registrar posts the updated record.",
        reason:
          "Supports the explanation that the case is now in the registrar posting step.",
      },
      {
        id: "EM-1013-SRC-2",
        documentName: "Academic Records Change Process 2026.pdf",
        excerpt:
          "Staff should explain the approval dependency clearly and avoid committing to posting dates until the approval chain is complete.",
        reason:
          "Supports the careful wording around timing.",
      },
    ],
  },
  {
    id: "EM-1014",
    sender: "Ethan Brooks <ethan.brooks@students.northbridge.edu>",
    subject: "I dropped after the no-W deadline, can my transcript still be clean?",
    body: "Hi Registrar Office, I dropped an elective after April 4 because of a medical appointment conflict. I thought it would not show on my transcript. Can you confirm whether I will receive a W or if an exception is possible?",
    category: "Registrar",
    confidence: 88,
    priority: "High",
    status: "Draft",
    assignee: "Jordan Lee",
    aiDraft:
      "Hello Ethan,\n\nThe published registrar calendar lists April 4 at 11:59 PM local time as the last day to drop an elective without a W grade. Requests submitted after that deadline may affect the transcript according to the withdrawal rules.\n\nBecause you mentioned a possible exception, we recommend that Registrar Operations review the case before a final answer is sent. Please include any relevant documentation through the official student request process.\n\nRegards,\nRegistrar Office",
    staffNote:
      "Useful pitch case for showing a safe draft: it answers the rule but routes the exception request to staff review.",
    source: "Registrar Calendar and Enrollment Deadlines 2026.pdf",
    summary:
      "Student asks whether a post-deadline elective drop can avoid a W grade because of a possible medical exception.",
    manualReviewReason: null,
    receivedAt: "2026-04-24T12:05:00.000Z",
    lastUpdatedAt: "2026-04-24T12:29:00.000Z",
    threadHistory: [
      {
        id: "EM-1014-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Ethan Brooks",
        sentAt: "2026-04-24T12:05:00.000Z",
        body:
          "Hi Registrar Office, I dropped an elective after April 4 because of a medical appointment conflict. I thought it would not show on my transcript. Can you confirm whether I will receive a W or if an exception is possible?",
      },
      {
        id: "EM-1014-TH-2",
        kind: "Internal",
        label: "Exception-sensitive draft",
        author: "Registrar triage",
        sentAt: "2026-04-24T12:29:00.000Z",
        body:
          "Draft cites the published deadline and keeps the exception path under human review.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1014-SRC-1",
        documentName: "Registrar Calendar and Enrollment Deadlines 2026.pdf",
        excerpt:
          "The last day to drop an elective without a W grade is April 4 at 11:59 PM local time.",
        reason:
          "Supports the deadline guidance in the draft.",
      },
      {
        id: "EM-1014-SRC-2",
        documentName: "Registrar Calendar and Enrollment Deadlines 2026.pdf",
        excerpt:
          "Staff should always anchor schedule guidance to the published registrar calendar and flag exceptions for manual review if the request arrives after the relevant deadline.",
        reason:
          "Supports routing the exception question to staff review.",
      },
    ],
  },
  {
    id: "EM-1015",
    sender: "Nora Singh <nora.singh@students.northbridge.edu>",
    subject: "Can I get a refund after switching to part-time enrollment?",
    body: "Hello Student Finance, I changed from full-time to part-time enrollment and my billing portal still shows the original tuition amount. Does the refund happen automatically, and will this affect my transcript request?",
    category: "Finance",
    confidence: 87,
    priority: "Medium",
    status: "Draft",
    assignee: "Noah Kim",
    aiDraft:
      "Hello Nora,\n\nThank you for reaching out. Refund and billing adjustments should be reviewed through the Student Finance workflow and checked against the published billing calendar. The team can confirm whether the enrollment change creates an adjustment on your account.\n\nPlease note that overdue balances may affect transcript services until Student Finance confirms the account is in good standing or under a compliant repayment arrangement.\n\nRegards,\nStudent Finance Team",
    staffNote:
      "Good case for demonstrating cross-functional context: finance answer with transcript-service risk.",
    source: "Student Billing and Payment Plans 2026.docx",
    summary:
      "Student asks whether switching to part-time enrollment creates a refund and whether billing status could affect transcript access.",
    manualReviewReason: null,
    receivedAt: "2026-04-24T13:11:00.000Z",
    lastUpdatedAt: "2026-04-24T13:34:00.000Z",
    threadHistory: [
      {
        id: "EM-1015-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Nora Singh",
        sentAt: "2026-04-24T13:11:00.000Z",
        body:
          "Hello Student Finance, I changed from full-time to part-time enrollment and my billing portal still shows the original tuition amount. Does the refund happen automatically, and will this affect my transcript request?",
      },
      {
        id: "EM-1015-TH-2",
        kind: "Internal",
        label: "Draft queued",
        author: "Finance triage",
        sentAt: "2026-04-24T13:34:00.000Z",
        body:
          "Draft prepared with billing-calendar caution and transcript-service hold context.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1015-SRC-1",
        documentName: "Student Billing and Payment Plans 2026.docx",
        excerpt:
          "Refund questions should be routed through the student finance workflow, and staff should reference the published billing calendar instead of promising immediate reversals.",
        reason:
          "Supports a careful refund explanation without promising automatic reversal.",
      },
      {
        id: "EM-1015-SRC-2",
        documentName: "Student Billing and Payment Plans 2026.docx",
        excerpt:
          "Overdue balances may place registration or transcript services on hold until the finance team confirms a compliant repayment arrangement.",
        reason:
          "Supports the transcript-service caveat.",
      },
    ],
  },
  {
    id: "EM-1016",
    sender: "Owen Miller <owen.miller@students.northbridge.edu>",
    subject: "Can you confirm my payment plan is active?",
    body: "Hi, I enrolled in the spring monthly payment plan yesterday and want to make sure I do not need to do anything else before registration opens. Could you confirm the next step?",
    category: "Finance",
    confidence: 97,
    priority: "Low",
    status: "Auto-sent",
    assignee: "Noah Kim",
    aiDraft:
      "Hello Owen,\n\nThank you for your message. Monthly payment plans are activated through the billing portal before the published tuition deadline. Please check the billing portal for your current payment-plan status and upcoming installment schedule.\n\nIf the portal does not show the plan as active, contact Student Finance so the team can review your account.\n\nRegards,\nStudent Finance Team",
    staffNote: null,
    source: "Student Billing and Payment Plans 2026.docx",
    summary:
      "Low-risk finance question asking how to confirm a payment plan is active before registration opens.",
    manualReviewReason: null,
    receivedAt: "2026-04-24T14:02:00.000Z",
    lastUpdatedAt: "2026-04-24T14:10:00.000Z",
    threadHistory: [
      {
        id: "EM-1016-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Owen Miller",
        sentAt: "2026-04-24T14:02:00.000Z",
        body:
          "Hi, I enrolled in the spring monthly payment plan yesterday and want to make sure I do not need to do anything else before registration opens. Could you confirm the next step?",
      },
      {
        id: "EM-1016-TH-2",
        kind: "Outbound",
        label: "Approved reply",
        author: "Noah Kim",
        sentAt: "2026-04-24T14:10:00.000Z",
        body:
          "Directed the student to confirm payment-plan status in the billing portal and contact Finance if the plan is not visible.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1016-SRC-1",
        documentName: "Student Billing and Payment Plans 2026.docx",
        excerpt:
          "Monthly payment plans can be activated through the billing portal before the published tuition deadline.",
        reason:
          "Supports the approved low-risk payment-plan guidance.",
      },
    ],
  },
  {
    id: "EM-1001",
    sender: "Maya Thompson <maya.thompson@students.northbridge.edu>",
    subject: "Can prior study in English waive IELTS for Fall 2027 admissions?",
    body: "Hello Admissions Team, I am applying as an international student for Fall 2027 and wanted to confirm whether my previous degree taught fully in English could satisfy the language requirement. I also want to make sure I do not miss scholarship review while I gather translated transcripts. Thank you.",
    category: "Admissions",
    confidence: 93,
    priority: "Medium",
    status: "Draft",
    assignee: "Ava Patel",
    aiDraft:
      "Hello Maya,\n\nThank you for your question. For international applicants, Northbridge University normally asks for English-language proficiency documentation unless prior study was completed in English and official proof is included in the application file. SAT verbal scores can support the application, but they do not replace this requirement on their own.\n\nScholarship review begins once the admissions file is complete, so we recommend submitting your translated transcripts and supporting documents as early as possible.\n\nBest regards,\nAdmissions Office",
    staffNote:
      "Keep the reply clear that scholarship review starts after the file is complete and avoid promising an award outcome.",
    source: "International Admissions Guidance 2026.pdf",
    summary:
      "International applicant asking whether prior study in English can satisfy language requirements and how scholarship review timing works.",
    manualReviewReason: null,
    receivedAt: "2026-04-19T09:12:00.000Z",
    lastUpdatedAt: "2026-04-19T10:05:00.000Z",
    threadHistory: [
      {
        id: "EM-1001-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Maya Thompson",
        sentAt: "2026-04-19T09:12:00.000Z",
        body:
          "Hello Admissions Team, I am applying as an international student for Fall 2027 and wanted to confirm whether my previous degree taught fully in English could satisfy the language requirement. I also want to make sure I do not miss scholarship review while I gather translated transcripts. Thank you.",
      },
      {
        id: "EM-1001-TH-2",
        kind: "Internal",
        label: "Routing note",
        author: "Admissions triage",
        sentAt: "2026-04-19T09:20:00.000Z",
        body:
          "Assigned to international admissions review because the student needs one reply covering language proof and scholarship timing.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1001-SRC-1",
        documentName: "International Admissions Guidance 2026.pdf",
        excerpt:
          "International applicants must document English-language proficiency unless prior study was completed in English and official proof is included.",
        reason: "Supports the language-requirement explanation.",
      },
      {
        id: "EM-1001-SRC-2",
        documentName: "International Admissions Guidance 2026.pdf",
        excerpt:
          "Scholarship review begins only after the admissions file is complete, including translated transcripts and required supporting documents.",
        reason: "Supports the scholarship-timing guidance without over-promising an outcome.",
      },
    ],
  },
  {
    id: "EM-1002",
    sender: "Liam Patel <liam.patel@students.northbridge.edu>",
    subject: "Need a payment plan for my spring tuition balance",
    body: "Hi Finance Office, I cannot pay the full spring tuition this month. Is there a monthly payment-plan option, and what happens if one installment is late by a few days?",
    category: "Finance",
    confidence: 89,
    priority: "High",
    status: "Auto-sent",
    assignee: "Noah Kim",
    aiDraft:
      "Hello Liam,\n\nYes, Northbridge University offers a monthly payment plan for spring tuition. You can enroll through the student billing portal under Payment Plans before the published tuition deadline.\n\nIf an installment is delayed, late-fee rules may apply based on the billing calendar. If you need added support, the Student Finance team can also help direct you to the right next step.\n\nRegards,\nStudent Finance Team",
    staffNote: null,
    source: "Student Billing and Payment Plans 2026.docx",
    summary:
      "Finance inquiry about tuition installments and late-fee exposure for spring billing.",
    manualReviewReason: null,
    receivedAt: "2026-04-19T11:46:00.000Z",
    lastUpdatedAt: "2026-04-19T12:18:00.000Z",
    threadHistory: [
      {
        id: "EM-1002-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Liam Patel",
        sentAt: "2026-04-19T11:46:00.000Z",
        body:
          "Hi Finance Office, I cannot pay the full spring tuition this month. Is there a monthly payment-plan option, and what happens if one installment is late by a few days?",
      },
      {
        id: "EM-1002-TH-2",
        kind: "Outbound",
        label: "Approved reply",
        author: "Noah Kim",
        sentAt: "2026-04-19T12:18:00.000Z",
        body:
          "Confirmed installment-plan availability, pointed the student to the billing portal, and called out late-fee policy plus financial-aid escalation.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1002-SRC-1",
        documentName: "Student Billing and Payment Plans 2026.docx",
        excerpt:
          "Students may enroll in a monthly payment plan through the billing portal before the published spring tuition deadline.",
        reason: "Supports the installment-plan availability in the reply.",
      },
    ],
  },
  {
    id: "EM-1003",
    sender: "Registrar Queue <records@northbridge.edu>",
    subject: "Transcript request on hold because of legal-name mismatch",
    body: "A transcript request from student ID 224198 was flagged because the legal name in SIS does not match the submitted request form. Please review the hold reason and confirm the next response to the student.",
    category: "Registrar",
    confidence: 74,
    priority: "High",
    status: "Escalated",
    assignee: "Priya Shah",
    aiDraft: null,
    staffNote:
      "Potential legal-name exception. Confirm the registrar identity-match policy before replying.",
    source: "Transcript Identity Verification Workflow.pdf",
    summary:
      "Registrar exception case involving identity verification before a transcript request can proceed.",
    manualReviewReason:
      "This case requires policy confirmation because the request involves a legal-name mismatch across systems.",
    receivedAt: "2026-04-20T07:30:00.000Z",
    lastUpdatedAt: "2026-04-20T08:14:00.000Z",
    threadHistory: [
      {
        id: "EM-1003-TH-1",
        kind: "System",
        label: "Queue alert",
        author: "Registrar Queue",
        sentAt: "2026-04-20T07:30:00.000Z",
        body:
          "Transcript request flagged due to a legal-name mismatch between SIS and the submitted transcript form.",
      },
      {
        id: "EM-1003-TH-2",
        kind: "Internal",
        label: "Escalation note",
        author: "Priya Shah",
        sentAt: "2026-04-20T08:14:00.000Z",
        body:
          "Needs registrar identity-match policy confirmation before the student is contacted.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1003-SRC-1",
        documentName: "Transcript Identity Verification Workflow.pdf",
        excerpt:
          "Transcript requests with legal-name discrepancies must be held until identity verification is completed by Registrar Operations.",
        reason: "Explains why this case cannot be auto-sent yet.",
      },
    ],
  },
  {
    id: "EM-1004",
    sender: "Prof. Elena Cruz <elena.cruz@northbridge.edu>",
    subject: "Approval path for a capstone grade correction",
    body: "Good afternoon, I need to submit a grade correction for two capstone students because of an LMS export issue. Can you confirm the approval path and what I should tell the students about next steps?",
    category: "Academic",
    confidence: 91,
    priority: "Medium",
    status: "Draft",
    assignee: null,
    aiDraft:
      "Dear Professor Cruz,\n\nThank you for reaching out. Grade correction requests should be submitted through the Academic Records portal and routed first for department approval. Once that approval is recorded, Registrar Operations can post the updated record.\n\nIf helpful, we can also confirm the documentation needed before you submit the correction.\n\nBest,\nAcademic Operations",
    staffNote: null,
    source: "Academic Records Change Process 2026.pdf",
    summary:
      "Faculty request about the approval path for grade corrections affecting capstone students.",
    manualReviewReason: null,
    receivedAt: "2026-04-20T14:22:00.000Z",
    lastUpdatedAt: "2026-04-20T14:41:00.000Z",
    threadHistory: [
      {
        id: "EM-1004-TH-1",
        kind: "Inbound",
        label: "Faculty inquiry",
        author: "Prof. Elena Cruz",
        sentAt: "2026-04-20T14:22:00.000Z",
        body:
          "Good afternoon, I need to submit a grade correction for two capstone students because of an LMS export issue. Can you confirm the approval path and what I should tell the students about next steps?",
      },
      {
        id: "EM-1004-TH-2",
        kind: "Internal",
        label: "Draft queued",
        author: "Academic Operations",
        sentAt: "2026-04-20T14:41:00.000Z",
        body:
          "Draft created from the academic-records process guide. Waiting for assignment before final review.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1004-SRC-1",
        documentName: "Academic Records Change Process 2026.pdf",
        excerpt:
          "Grade corrections route to the department chair first and then to the Registrar for posting after approval.",
        reason: "Supports the approval-chain explanation.",
      },
    ],
  },
  {
    id: "EM-1005",
    sender: "Amelia Ross <amelia.ross@students.northbridge.edu>",
    subject: "Last date to drop an elective without a W",
    body: "Hi, could you tell me the last date to drop an elective this semester without receiving a W on my transcript? I am deciding whether to adjust my schedule this week.",
    category: "Registrar",
    confidence: 96,
    priority: "Low",
    status: "Auto-sent",
    assignee: "Jordan Lee",
    aiDraft:
      "Hello Noah,\n\nThe last date to drop an elective course without receiving a W grade this semester is April 4. You can process the change through the registration portal before 11:59 PM local time.\n\nIf you want help evaluating schedule impacts, we recommend speaking with your academic advisor.\n\nRegards,\nRegistrar Office",
    staffNote: null,
    source: "Registrar Calendar and Enrollment Deadlines 2026.pdf",
    summary:
      "Registrar deadline question about course-drop timing and transcript impact.",
    manualReviewReason: null,
    receivedAt: "2026-04-21T08:05:00.000Z",
    lastUpdatedAt: "2026-04-21T08:21:00.000Z",
    threadHistory: [
      {
        id: "EM-1005-TH-1",
        kind: "Inbound",
        label: "Student inquiry",
        author: "Amelia Ross",
        sentAt: "2026-04-21T08:05:00.000Z",
        body:
          "Hi, could you tell me the last date to drop an elective this semester without receiving a W on my transcript? I am deciding whether to adjust my schedule this week.",
      },
      {
        id: "EM-1005-TH-2",
        kind: "Outbound",
        label: "Approved reply",
        author: "Jordan Lee",
        sentAt: "2026-04-21T08:21:00.000Z",
        body:
          "Confirmed the no-W drop deadline and directed the student to academic advising for schedule planning.",
      },
    ],
    sourceCitations: [
      {
        id: "EM-1005-SRC-1",
        documentName: "Registrar Calendar and Enrollment Deadlines 2026.pdf",
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
