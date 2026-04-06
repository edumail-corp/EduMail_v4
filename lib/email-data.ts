export type EmailCategory = "Admissions" | "Finance" | "Registrar" | "Academic";
export type EmailStatus = "Draft" | "Auto-sent" | "Escalated";
export type EmailFilter = "All" | EmailStatus;
export type EmailPriority = "Low" | "Medium" | "High";
export type Department = EmailCategory;
export type StaffAssignee = "Ava Patel" | "Noah Kim" | "Priya Shah" | "Jordan Lee";
export type StaffAssignmentFilter = "All" | "Unassigned" | StaffAssignee;
export type StaffAssignmentSelectValue = "Unassigned" | StaffAssignee;
export type DepartmentFilter = "All" | Department;
export type CaseOrigin = "Email intake" | "Manual intake";
export type RoutingConfidence = "Low" | "Medium" | "High";
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

export type EmailSourceCitation = {
  id: string;
  documentName: string;
  excerpt: string;
  reason: string;
};

export type RoutingDecision = {
  department: Department;
  confidence: RoutingConfidence;
  confidenceScore: number;
  reason: string;
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
};

export type StaffEmailUpdateInput = {
  status?: EmailStatus;
  assignee?: StaffAssignee | null;
  aiDraft?: string;
  staffNote?: string | null;
};

export const minimumSenderNameLength = 2;
export const minimumEmailSubjectLength = 3;
export const minimumEmailBodyLength = 10;

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

export function getDepartmentSuggestedAssignees(department: Department) {
  return departmentAssigneeMap[department];
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

export const staffAssignmentFilters = [
  "All",
  "Unassigned",
  ...staffAssigneeOptions,
] as const satisfies readonly StaffAssignmentFilter[];

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

export function isStaffAssignee(value: string): value is StaffAssignee {
  return staffAssigneeOptions.includes(value as StaffAssignee);
}

export function isStaffAssignmentFilter(
  value: string
): value is StaffAssignmentFilter {
  return value === "All" || value === "Unassigned" || isStaffAssignee(value);
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

export function getStaffAssignmentFilterLabel(filter: StaffAssignmentFilter) {
  if (filter === "All") {
    return "All Owners";
  }

  return filter;
}

export function getDepartmentFilterLabel(filter: DepartmentFilter) {
  if (filter === "All") {
    return "All Departments";
  }

  return filter;
}

export function getInitialSelectedEmailId(emails: StaffEmail[]) {
  return emails[0]?.id ?? "";
}

export function getSelectedEmail(emails: StaffEmail[], selectedId: string) {
  return emails.find((email) => email.id === selectedId) ?? emails[0];
}
