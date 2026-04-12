import type {
  CaseApprovalState,
  EmailCategory,
  EmailStatus,
  GroundingStrength,
  StaffAssignee,
} from "@/lib/email-data";

export type KnowledgeBaseCategory = EmailCategory;
export type KnowledgeBaseFilter = "All" | KnowledgeBaseCategory;
export type KnowledgeCategorySelectValue =
  | "Select category"
  | KnowledgeBaseCategory;
export type KnowledgeDocumentOrigin = "seeded" | "uploaded";

export type KnowledgeDocument = {
  id: string;
  name: string;
  category: KnowledgeBaseCategory;
  uploadedAt: string;
  pages: number;
  sizeInBytes?: number;
  mimeType?: string;
  downloadUrl?: string;
  summary: string;
  previewExcerpt: string;
  origin: KnowledgeDocumentOrigin;
  referenceCount: number;
  approvalReadyCaseCount?: number;
  weakSupportCaseCount?: number;
  relatedCases?: KnowledgeDocumentRelatedCase[];
  supportHighlights?: KnowledgeDocumentSupportHighlight[];
};

export type KnowledgeDocumentRelatedCase = {
  id: string;
  subject: string;
  department: KnowledgeBaseCategory;
  status: EmailStatus;
  approvalState: CaseApprovalState;
  approvalReady: boolean;
  assignee: StaffAssignee | null;
  groundingStrength: GroundingStrength;
  href: string;
  updatedAt: string;
  citationReason: string;
  citationExcerpt: string;
};

export type KnowledgeDocumentSupportHighlight = {
  caseId: string;
  caseSubject: string;
  href: string;
  reason: string;
  excerpt: string;
};

export type KnowledgeDocumentDraft = {
  file: File;
  name: string;
  mimeTypeLabel: string;
  sizeLabel: string;
  estimatedPages: number;
};

export const knowledgeBaseCategoryClasses: Record<
  KnowledgeBaseCategory,
  string
> = {
  Admissions: "bg-blue-100 text-blue-700",
  Finance: "bg-indigo-100 text-indigo-700",
  Registrar: "bg-sky-100 text-sky-700",
  Academic: "bg-cyan-100 text-cyan-700",
};

export const knowledgeBaseFilters = [
  "All",
  "Admissions",
  "Finance",
  "Registrar",
  "Academic",
] as const satisfies readonly KnowledgeBaseFilter[];

export const knowledgeBaseCategoryOptions = [
  "Admissions",
  "Finance",
  "Registrar",
  "Academic",
] as const satisfies readonly KnowledgeBaseCategory[];

export const defaultKnowledgeCategorySelection = "Select category";
export const acceptedKnowledgeFileExtensions = [".pdf", ".docx"] as const;
export const acceptedKnowledgeMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const seedKnowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "DOC-1",
    name: "Admissions-International-Policy-2026.pdf",
    category: "Admissions",
    uploadedAt: "2026-03-20",
    pages: 34,
    summary:
      "Core admissions policy for international applicants, language testing rules, and scholarship review timing.",
    previewExcerpt:
      "International applicants must document English-language proficiency unless their prior education was completed in English.",
    origin: "seeded",
    referenceCount: 0,
  },
  {
    id: "DOC-2",
    name: "Student-Billing-Handbook-2026.docx",
    category: "Finance",
    uploadedAt: "2026-03-18",
    pages: 21,
    summary:
      "Billing handbook covering payment plans, overdue balances, and student-finance escalation paths.",
    previewExcerpt:
      "Monthly payment plans can be activated through the billing portal before the published tuition deadline.",
    origin: "seeded",
    referenceCount: 0,
  },
  {
    id: "DOC-3",
    name: "Transcript-Request-Workflow-v4.pdf",
    category: "Registrar",
    uploadedAt: "2026-03-14",
    pages: 12,
    summary:
      "Registrar workflow for transcript requests, verification holds, and exception handling for identity mismatches.",
    previewExcerpt:
      "Requests with legal-name discrepancies remain on hold until Registrar Operations completes identity verification.",
    origin: "seeded",
    referenceCount: 0,
  },
  {
    id: "DOC-4",
    name: "Academic-Records-SOP-2026.pdf",
    category: "Academic",
    uploadedAt: "2026-03-10",
    pages: 27,
    summary:
      "Academic records SOP covering grade corrections, faculty approvals, and registrar posting timelines.",
    previewExcerpt:
      "Grade corrections require department approval before the Registrar posts the updated record.",
    origin: "seeded",
    referenceCount: 0,
  },
  {
    id: "DOC-5",
    name: "Academic-Calendar-2026.pdf",
    category: "Registrar",
    uploadedAt: "2026-03-08",
    pages: 9,
    summary:
      "Registrar calendar for add/drop deadlines, registration cutoffs, and transcript-impact milestones.",
    previewExcerpt:
      "The last day to drop an elective without a W grade is April 4 at 11:59 PM local time.",
    origin: "seeded",
    referenceCount: 0,
  },
];

export function getInitialKnowledgeDocuments() {
  return seedKnowledgeDocuments.map((document) => ({ ...document }));
}

export function filterKnowledgeDocuments(
  documents: KnowledgeDocument[],
  activeFilter: KnowledgeBaseFilter
) {
  if (activeFilter === "All") {
    return documents;
  }

  return documents.filter((document) => document.category === activeFilter);
}

export function isKnowledgeCategorySelection(
  value: KnowledgeCategorySelectValue
): value is KnowledgeBaseCategory {
  return value !== defaultKnowledgeCategorySelection;
}

export function isKnowledgeBaseCategory(
  value: string
): value is KnowledgeBaseCategory {
  const allowedCategories = new Set<string>(knowledgeBaseCategoryOptions);
  return allowedCategories.has(value);
}

export function isAcceptedKnowledgeFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  const allowedMimeTypes = new Set<string>(acceptedKnowledgeMimeTypes);

  return (
    acceptedKnowledgeFileExtensions.some((extension) =>
      normalizedName.endsWith(extension)
    ) || allowedMimeTypes.has(file.type)
  );
}

export function formatKnowledgeFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatKnowledgeMimeType(mimeType: string) {
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  const normalizedMimeType = mimeType.trim();

  if (normalizedMimeType.length === 0) {
    return "Unknown";
  }

  return normalizedMimeType.toUpperCase();
}

export function getKnowledgeDocumentOriginLabel(
  origin: KnowledgeDocumentOrigin
) {
  return origin === "uploaded" ? "Stored File" : "Seeded Metadata";
}

export function buildKnowledgeDocumentSummary(
  name: string,
  category: KnowledgeBaseCategory
) {
  return `${category} reference document for ${name.replace(/\.[^.]+$/, "")}.`;
}

export function buildKnowledgeDocumentPreview(
  name: string,
  category: KnowledgeBaseCategory
) {
  return `Local ${category.toLowerCase()} guidance is available in ${name} for future retrieval-grounded replies.`;
}

export function estimateKnowledgeDocumentPages(file: File) {
  return Math.max(1, Math.ceil(file.size / 18000));
}

export function createKnowledgeDocumentDraft(
  file: File
): KnowledgeDocumentDraft {
  return {
    file,
    name: file.name,
    mimeTypeLabel: formatKnowledgeMimeType(file.type),
    sizeLabel: formatKnowledgeFileSize(file.size),
    estimatedPages: estimateKnowledgeDocumentPages(file),
  };
}
