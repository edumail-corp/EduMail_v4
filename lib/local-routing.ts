import type {
  Department,
  EmailCategory,
  RoutingConfidence,
  RoutingDecision,
  StaffEmailCreateInput,
} from "@/lib/email-data";
import {
  getDepartmentSuggestedAssignees,
  translateDepartment,
  translateRoutingConfidence,
  translateRoutingSignal,
} from "@/lib/email-data";
import type { LanguagePreference } from "@/lib/user-preferences";

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
  input: Pick<StaffEmailCreateInput, "category" | "priority" | "subject" | "body">,
  language: LanguagePreference = "English"
): RoutingDecision {
  const isPolish = language === "Polish";
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
  const selectedCategoryLabel = translateDepartment(input.category, language);
  const departmentLabel = translateDepartment(department, language);
  const escalationReason =
    riskySignals.length > 0
      ? isPolish
        ? `Wykryto sygnały eskalacji: ${riskySignals
            .map((signal) => translateRoutingSignal(signal, language))
            .join(", ")}.`
        : `Escalation signals detected: ${riskySignals.join(", ")}.`
      : hasWeakSignalCoverage
        ? isPolish
          ? "Treść zgłoszenia nie zawiera wystarczającej liczby sygnałów działowych, aby bezpiecznie przypisać ją bez ręcznego przeglądu."
          : `The intake does not contain enough department-specific signals to route without manual review.`
        : confidence === "Low"
        ? isPolish
          ? "Pewność routingu jest niska, więc tę sprawę należy sprawdzić ręcznie przed dalszym przetwarzaniem."
          : `Routing confidence is low, so this case should be checked manually before it moves forward.`
        : null;

  const reason = hasWeakSignalCoverage
    ? isPolish
      ? `Zgłoszenie tymczasowo opiera się na wybranej kategorii ${selectedCategoryLabel}, ponieważ tekst nie daje jeszcze wystarczająco bezpośrednich sygnałów routingu.`
      : `The intake is currently leaning on the selected ${input.category} category because the text does not provide enough direct routing evidence yet.`
    : isAmbiguousDepartmentMatch
      ? isPolish
        ? `Treść zgłoszenia zahacza o kilka działów, ale ${departmentLabel} ma obecnie najsilniejsze dopasowanie sygnałów.`
        : `The intake overlaps multiple departments, but ${department} currently has the strongest signal match.`
      : shouldOverrideSelectedCategory
        ? isPolish
          ? `Treść zgłoszenia silniej wskazuje na dział ${departmentLabel} niż na pierwotnie wybraną kategorię ${selectedCategoryLabel}.`
          : `The intake text aligns more strongly with ${department} than the originally selected ${input.category} category.`
        : isPolish
          ? `Język zgłoszenia najlepiej pasuje do działu ${departmentLabel}, więc sprawa pozostaje w tej kolejce operacyjnej.`
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

export function getLocalizedRoutingDecisionReason(
  decision: Pick<
    RoutingDecision,
    "department" | "confidence" | "confidenceScore" | "signals" | "escalationReason"
  >,
  language: LanguagePreference = "English"
) {
  const isPolish = language === "Polish";
  const departmentLabel = translateDepartment(decision.department, language);
  const signalList = decision.signals
    .map((signal) => translateRoutingSignal(signal, language))
    .join(", ");

  if (decision.escalationReason) {
    return isPolish
      ? `Sprawa pozostaje w ręcznym przeglądzie dla działu ${departmentLabel}, ponieważ sygnały routingu wskazują na potrzebę dodatkowej kontroli.`
      : `This case remains in manual review for ${decision.department} because the routing signals indicate that extra review is needed.`;
  }

  if (decision.signals.length > 0) {
    return isPolish
      ? `Najsilniejsze sygnały (${signalList}) wskazują na dział ${departmentLabel}, a pewność routingu wynosi ${decision.confidenceScore}%.`
      : `The strongest visible signals (${decision.signals.join(", ")}) point to ${decision.department}, with routing confidence at ${decision.confidenceScore}%.`;
  }

  return isPolish
    ? `Sprawa obecnie pozostaje w kolejce ${departmentLabel} z pewnością routingu ${decision.confidenceScore}%.`
    : `This case currently remains in the ${decision.department} queue with routing confidence at ${decision.confidenceScore}%.`;
}

export function getRoutingDestinationLabel(
  decision: RoutingDecision,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    return decision.escalationReason ? "Eskalacje" : "Skrzynka";
  }

  return decision.escalationReason ? "Escalations" : "Inbox";
}

export function getDraftPathLabel(
  decision: RoutingDecision,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    return decision.escalationReason
      ? "Prawdopodobny ręczny przegląd"
      : "Prawdopodobny szkic lokalny";
  }

  return decision.escalationReason ? "Manual review likely" : "Seeded draft likely";
}

export function getLocalizedRoutingDepartmentLabel(
  category: EmailCategory,
  language: LanguagePreference = "English"
) {
  return translateDepartment(category, language);
}

export function getLocalizedRoutingConfidenceLabel(
  confidence: RoutingConfidence,
  language: LanguagePreference = "English"
) {
  return translateRoutingConfidence(confidence, language);
}

export function getLocalizedRoutingSignalList(
  signals: RoutingDecision["signals"],
  language: LanguagePreference = "English"
) {
  return signals.map((signal) => translateRoutingSignal(signal, language));
}
