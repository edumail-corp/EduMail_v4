import type {
  Department,
  RoutingConfidence,
  RoutingDecision,
  StaffEmailCreateInput,
} from "@/lib/email-data";
import { getDepartmentSuggestedAssignees } from "@/lib/email-data";

const departmentKeywords: Record<Department, string[]> = {
  Admissions: [
    "admission",
    "apply",
    "application",
    "enrollment",
    "scholarship",
    "international",
    "deadline",
    "acceptance",
  ],
  Finance: [
    "billing",
    "tuition",
    "payment",
    "refund",
    "invoice",
    "balance",
    "fee",
    "financial aid",
  ],
  Registrar: [
    "transcript",
    "registration",
    "records",
    "enrollment verification",
    "drop",
    "withdrawal",
    "calendar",
    "name change",
  ],
  Academic: [
    "credit",
    "grade",
    "faculty",
    "course",
    "appeal",
    "academic advising",
    "degree",
    "curriculum",
  ],
};

const escalationKeywords = [
  "appeal",
  "dispute",
  "error",
  "urgent",
  "complaint",
  "legal",
  "grievance",
  "exception",
  "refund",
  "mismatch",
] as const;

export const departmentSourceDocumentMap: Record<Department, string> = {
  Admissions: "Admissions-International-Policy-2026.pdf",
  Finance: "Student-Billing-Handbook-2026.docx",
  Registrar: "Transcript-Request-Workflow-v4.pdf",
  Academic: "Academic-Records-SOP-2026.pdf",
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getConfidenceLabel(score: number): RoutingConfidence {
  if (score >= 82) {
    return "High";
  }

  if (score >= 66) {
    return "Medium";
  }

  return "Low";
}

export function inferLocalRoutingDecision(
  input: Pick<StaffEmailCreateInput, "category" | "priority" | "subject" | "body">
): RoutingDecision {
  const subject = normalizeText(input.subject);
  const body = normalizeText(input.body);
  const combined = `${subject} ${body}`;
  const riskySignals = escalationKeywords.filter((signal) =>
    combined.includes(signal)
  );

  const scoredDepartments = (Object.entries(departmentKeywords) as Array<
    [Department, string[]]
  >).map(([department, keywords]) => {
    const matchedSignals = keywords.filter((keyword) => combined.includes(keyword));
    const subjectMatches = keywords.filter((keyword) => subject.includes(keyword));
    const baseScore =
      matchedSignals.length * 9 +
      subjectMatches.length * 4 +
      (department === input.category ? 12 : 0) +
      (input.priority === "High" && department === input.category ? 4 : 0);

    return {
      department,
      score: baseScore,
      matchedSignals,
    };
  });

  const topDepartment =
    [...scoredDepartments].sort((left, right) => right.score - left.score)[0] ?? {
      department: input.category,
      score: 0,
      matchedSignals: [],
    };
  const secondDepartment =
    [...scoredDepartments].sort((left, right) => right.score - left.score)[1] ?? null;

  const selectedDepartmentScore =
    scoredDepartments.find((entry) => entry.department === input.category)?.score ?? 0;
  const shouldOverrideSelectedCategory =
    topDepartment.department !== input.category &&
    topDepartment.score >= selectedDepartmentScore + 10;
  const department = shouldOverrideSelectedCategory
    ? topDepartment.department
    : input.category;

  const effectiveSignals =
    scoredDepartments.find((entry) => entry.department === department)?.matchedSignals ??
    [];
  const hasWeakSignalCoverage = effectiveSignals.length === 0 && riskySignals.length === 0;
  const isAmbiguousDepartmentMatch =
    secondDepartment !== null &&
    topDepartment.score > 0 &&
    Math.abs(topDepartment.score - secondDepartment.score) <= 6;

  const confidenceScore = Math.max(
    42,
    Math.min(
      96,
      58 +
        (shouldOverrideSelectedCategory ? 10 : 0) +
        Math.min(topDepartment.score, 24) +
        (riskySignals.length > 0 ? -8 : 0) +
        (hasWeakSignalCoverage ? -10 : 0) +
        (isAmbiguousDepartmentMatch ? -8 : 0)
    )
  );

  const confidence = getConfidenceLabel(confidenceScore);
  const escalationReason =
    riskySignals.length > 0
      ? `Escalation signals detected: ${riskySignals.join(", ")}.`
      : hasWeakSignalCoverage
        ? `The intake does not contain enough department-specific signals to route without manual review.`
        : confidence === "Low"
        ? `Routing confidence is low, so this case should be checked manually before it moves forward.`
        : null;

  const reason = hasWeakSignalCoverage
    ? `The intake is currently leaning on the selected ${input.category} category because the text does not provide enough direct routing evidence yet.`
    : isAmbiguousDepartmentMatch
      ? `The intake overlaps multiple departments, but ${department} currently has the strongest signal match.`
      : shouldOverrideSelectedCategory
        ? `The intake text aligns more strongly with ${department} than the originally selected ${input.category} category.`
        : `The intake language aligns with ${department}, so the case stays in that operational queue.`;

  return {
    department,
    confidence,
    confidenceScore,
    reason,
    signals: [...new Set([...effectiveSignals, ...riskySignals])]
      .slice(0, 5),
    escalationReason,
    suggestedAssignees: getDepartmentSuggestedAssignees(department),
  };
}

export function getDepartmentSourceDocument(department: Department) {
  return departmentSourceDocumentMap[department];
}

export function getRoutingDestinationLabel(decision: RoutingDecision) {
  return decision.escalationReason ? "Escalations" : "Inbox";
}

export function getDraftPathLabel(decision: RoutingDecision) {
  return decision.escalationReason ? "Manual review likely" : "Seeded draft likely";
}
