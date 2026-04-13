import type {
  Department,
  EmailSourceCitation,
  StaffEmailCreateInput,
} from "@/lib/email-data";
import {
  getDepartmentSourceDocument,
  inferLocalRoutingDecision,
} from "@/lib/local-routing";
import { translateDepartment } from "@/lib/email-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import type {
  AIDraftAdapter,
  DraftProviderStatus,
  DraftSuggestion,
} from "@/lib/server/adapters/contracts";

const departmentReplyOpeners: Record<
  LanguagePreference,
  Record<Department, string>
> = {
  English: {
    Admissions:
      "Thank you for reaching out to the admissions team. Based on the information you shared, here is the clearest next-step guidance we can give right now.",
    Finance:
      "Thank you for contacting student finance. Based on the billing and payment context in your message, here is the best next-step guidance for now.",
    Registrar:
      "Thank you for contacting the registrar office. Based on your records and registration request, here is the best next-step guidance we can give right now.",
    Academic:
      "Thank you for reaching out about an academic issue. Based on the course and advising context in your message, here is the clearest next-step guidance for now.",
  },
  Polish: {
    Admissions:
      "Dziękujemy za kontakt z działem rekrutacji. Na podstawie podanych informacji przekazujemy najjaśniejsze kolejne kroki, jakie możemy wskazać na ten moment.",
    Finance:
      "Dziękujemy za kontakt z działem finansowym. Na podstawie kontekstu płatności i rozliczeń w Twojej wiadomości przekazujemy najlepsze kolejne kroki na teraz.",
    Registrar:
      "Dziękujemy za kontakt z dziekanatem. Na podstawie prośby dotyczącej dokumentacji i rejestracji przekazujemy najlepsze kolejne kroki na teraz.",
    Academic:
      "Dziękujemy za kontakt w sprawie akademickiej. Na podstawie kontekstu kursu i doradztwa przekazujemy najjaśniejsze kolejne kroki na teraz.",
  },
};

const departmentSummaryPrefixes: Record<
  LanguagePreference,
  Record<Department, string>
> = {
  English: {
    Admissions: "Admissions case about",
    Finance: "Finance case about",
    Registrar: "Registrar case about",
    Academic: "Academic case about",
  },
  Polish: {
    Admissions: "Sprawa rekrutacyjna dotycząca",
    Finance: "Sprawa finansowa dotycząca",
    Registrar: "Sprawa dziekanatu dotycząca",
    Academic: "Sprawa akademicka dotycząca",
  },
};

function buildSummary(
  input: StaffEmailCreateInput,
  department: Department,
  reason: string,
  language: LanguagePreference
) {
  return `${departmentSummaryPrefixes[language][department]} ${input.subject.trim().toLowerCase()}. ${reason}`;
}

function buildSourceCitations(
  department: Department,
  sourceDocument: string,
  language: LanguagePreference
): EmailSourceCitation[] {
  const citationTemplates: Record<
    LanguagePreference,
    Record<Department, Array<{ excerpt: string; reason: string }>>
  > = {
    English: {
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
    },
    Polish: {
      Admissions: [
        {
          excerpt:
            "Wytyczne rekrutacyjne określają, jak komunikować studentom terminy stypendialne, terminy składania dokumentów i wymagania aplikacyjne.",
          reason: "Wspiera język dotyczący harmonogramu i wymagań rekrutacyjnych w szkicu.",
        },
      ],
      Finance: [
        {
          excerpt:
            "Wytyczne rozliczeniowe obejmują oczekiwania dotyczące płatności, zwroty i kroki rozwiązania salda w sprawach finansowych.",
          reason: "Wspiera wskazówki dotyczące płatności i zwrotów w szkicu.",
        },
      ],
      Registrar: [
        {
          excerpt:
            "Wytyczne dziekanatu obejmują prośby o dokumentację, wstrzymania weryfikacyjne, terminy rejestracji i kolejne kroki proceduralne.",
          reason: "Wspiera opis procesu dokumentacyjnego i dziekanatu w szkicu.",
        },
      ],
      Academic: [
        {
          excerpt:
            "Wytyczne akademickie obejmują ścieżki doradcze, problemy z kursami, decyzje o zaliczeniach i oczekiwania dotyczące zatwierdzeń.",
          reason: "Wspiera wyjaśnienie procesu akademickiego w szkicu.",
        },
      ],
    },
  };

  return citationTemplates[language][department].map((citation, index) => ({
    id: `SRC-${department}-${index + 1}`,
    documentName: sourceDocument,
    excerpt: citation.excerpt,
    reason: citation.reason,
  }));
}

function buildSeededDraft(
  input: StaffEmailCreateInput,
  department: Department,
  language: LanguagePreference
) {
  const senderFirstName = input.senderName.trim().split(/\s+/)[0] ?? "there";

  if (language === "Polish") {
    const localizedDepartment = translateDepartment(department, language);

    return [
      `Dzień dobry ${senderFirstName},`,
      "",
      departmentReplyOpeners[language][department],
      "",
      `Analizujemy wiadomość dotyczącą tematu "${input.subject.trim()}". Pracownik potwierdzi dokładne kroki wynikające z zasad i wróci z najbardziej właściwą odpowiedzią dla ścieżki ${localizedDepartment.toLowerCase()}.`,
      "",
      "Jeśli będą potrzebne dodatkowe dokumenty lub doprecyzowanie, uwzględnimy to w kolejnej odpowiedzi.",
      "",
      "Z wyrazami szacunku,",
      `${localizedDepartment} Operations`,
    ].join("\n");
  }

  return [
    `Hello ${senderFirstName},`,
    "",
    departmentReplyOpeners[language][department],
    "",
    `We are reviewing your message about "${input.subject.trim()}". A staff member will confirm the exact policy steps and follow up with the most appropriate answer for the ${department.toLowerCase()} workflow.`,
    "",
    "If additional documents or clarification are required, we will include that in the next response.",
    "",
    "Best regards,",
    `${department} Operations`,
  ].join("\n");
}

function getLocalizedProviderStatus(
  language: LanguagePreference = "English"
): DraftProviderStatus {
  if (language === "Polish") {
    return {
      summary:
        "Szkice są obecnie generowane przez lokalny przepływ routingu i cytowań zamiast przez zewnętrznego dostawcę modelu.",
      nextStep:
        "Utrzymaj obecny kontrakt szkicu lokalnego, a następnie podłącz produkcyjnego dostawcę AI za wymienialnym adapterem.",
    };
  }

  return {
    summary:
      "Drafts are currently generated by the local seeded routing and citation flow rather than a live external model provider.",
    nextStep:
      "Keep the current local draft contract stable, then plug in a production AI provider behind a swappable adapter.",
  };
}

export const localAIDraftAdapter: AIDraftAdapter = {
  async generateDraftSuggestion(
    input,
    language = "English"
  ): Promise<DraftSuggestion> {
    const routingDecision = inferLocalRoutingDecision(input, language);
    const sourceDocument = getDepartmentSourceDocument(routingDecision.department);
    const manualReviewReason = routingDecision.escalationReason;

    return {
      confidence: routingDecision.confidenceScore,
      aiDraft: manualReviewReason
        ? null
        : buildSeededDraft(input, routingDecision.department, language),
      source: sourceDocument,
      summary: buildSummary(
        input,
        routingDecision.department,
        routingDecision.reason,
        language
      ),
      manualReviewReason,
      sourceCitations: buildSourceCitations(
        routingDecision.department,
        sourceDocument,
        language
      ),
      routingDecision,
    };
  },
  async getProviderStatus(language = "English") {
    return getLocalizedProviderStatus(language);
  },
};
