import type {
  Department,
  EmailSourceCitation,
  StaffEmailCreateInput,
} from "@/lib/email-data";
import type { KnowledgeDocument } from "@/lib/knowledge-base-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import type {
  AIDraftAdapter,
  DraftProviderStatus,
  DraftSuggestion,
} from "@/lib/server/adapters/contracts";
import { getKnowledgeBaseAdapter } from "@/lib/server/adapters";
import { localAIDraftAdapter } from "@/lib/server/adapters/local/local-ai-draft-adapter";
import {
  getOpenAIDraftConfig,
  type OpenAIDraftConfig,
} from "@/lib/server/adapters/openai/openai-config";
import {
  buildGroundingPassages,
  getKnowledgeDocumentGroundingText,
} from "@/lib/server/knowledge-document-grounding";

type GroundingCandidate = Pick<
  KnowledgeDocument,
  "name" | "category" | "summary" | "previewExcerpt"
> & {
  groundingText: string;
  relevantPassages: string[];
  citationExcerpt: string;
  relevanceScore: number;
};

type OpenAIDraftResult = {
  summary: string;
  replyDraft: string;
  requiresManualReview: boolean;
  manualReviewReason: string;
  primarySourceDocument: string;
  citations: Array<{
    documentName: string;
    reason: string;
  }>;
};

type OpenAIResponsesContentItem = {
  type?: string;
  text?: string;
};

type OpenAIResponsesOutputItem = {
  content?: OpenAIResponsesContentItem[];
};

type OpenAIResponsesCreateResponse = {
  output_text?: string;
  output?: OpenAIResponsesOutputItem[];
  error?: {
    message?: string;
  };
};

const knowledgeBaseAdapter = getKnowledgeBaseAdapter();
const maxRelevantPassagesPerDocument = 3;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function tokenizeSearchText(value: string) {
  return [...new Set(
    normalizeSearchText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  )];
}

function countTokenMatches(haystack: string, tokens: readonly string[]) {
  return tokens.reduce(
    (count, token) => count + (haystack.includes(token) ? 1 : 0),
    0
  );
}

function selectRelevantPassages(
  passages: readonly string[],
  caseTokens: readonly string[],
  previewExcerpt: string,
  summary: string
) {
  const scoredPassages = passages
    .map((passage) => ({
      passage,
      tokenMatches: countTokenMatches(normalizeSearchText(passage), caseTokens),
    }))
    .sort((left, right) => {
      if (right.tokenMatches !== left.tokenMatches) {
        return right.tokenMatches - left.tokenMatches;
      }

      return right.passage.length - left.passage.length;
    });
  const matchedPassages = scoredPassages
    .filter((entry) => entry.tokenMatches > 0)
    .map((entry) => entry.passage);

  if (matchedPassages.length > 0) {
    return matchedPassages.slice(0, maxRelevantPassagesPerDocument);
  }

  const fallbackPassages = scoredPassages
    .map((entry) => entry.passage)
    .filter(Boolean)
    .slice(0, maxRelevantPassagesPerDocument);

  if (fallbackPassages.length > 0) {
    return fallbackPassages;
  }

  return [previewExcerpt, summary]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, maxRelevantPassagesPerDocument);
}

function selectGroundingCandidates(
  input: StaffEmailCreateInput,
  department: Department
) {
  return knowledgeBaseAdapter.listDocuments().then((documents) => {
    const caseTokens = tokenizeSearchText(
      `${input.subject} ${input.body} ${input.category} ${department}`
    );
    const rankedDocuments = documents
      .map((document) => {
        const groundingText = getKnowledgeDocumentGroundingText({
          name: document.name,
          category: document.category,
          summary: document.summary,
          previewExcerpt: document.previewExcerpt,
          groundingText: document.groundingText,
        });
        const relevantPassages = selectRelevantPassages(
          buildGroundingPassages(groundingText),
          caseTokens,
          document.previewExcerpt,
          document.summary
        );
        const haystack = normalizeSearchText(
          `${document.name} ${document.summary} ${document.previewExcerpt} ${groundingText} ${document.category}`
        );
        const tokenMatches = countTokenMatches(haystack, caseTokens);
        const passageMatches = relevantPassages.reduce(
          (count, passage) =>
            count + countTokenMatches(normalizeSearchText(passage), caseTokens),
          0
        );
        const categoryBonus = document.category === department ? 16 : 0;
        const originBonus = document.origin === "uploaded" ? 2 : 0;
        const score =
          categoryBonus + originBonus + tokenMatches * 4 + passageMatches * 6;

        return {
          name: document.name,
          category: document.category,
          summary: document.summary,
          previewExcerpt: document.previewExcerpt,
          groundingText,
          relevantPassages,
          citationExcerpt:
            relevantPassages[0] ?? document.previewExcerpt ?? document.summary,
          relevanceScore: score,
        } satisfies GroundingCandidate;
      })
      .sort((left, right) => {
        if (right.relevanceScore !== left.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }

        return left.name.localeCompare(right.name);
      });

    const preferredCandidates = rankedDocuments.filter(
      (document) => document.relevanceScore > 0
    );
    const fallbackCandidates = rankedDocuments.filter(
      (document) => document.category === department
    );

    return (preferredCandidates.length > 0
      ? preferredCandidates
      : fallbackCandidates
    ).slice(0, 3);
  });
}

function buildOpenAIOutputSchema(candidateNames: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "replyDraft",
      "requiresManualReview",
      "manualReviewReason",
      "primarySourceDocument",
      "citations",
    ],
    properties: {
      summary: {
        type: "string",
      },
      replyDraft: {
        type: "string",
      },
      requiresManualReview: {
        type: "boolean",
      },
      manualReviewReason: {
        type: "string",
      },
      primarySourceDocument: {
        type: "string",
        enum: [...candidateNames, ""],
      },
      citations: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["documentName", "reason"],
          properties: {
            documentName: {
              type: "string",
              enum: candidateNames,
            },
            reason: {
              type: "string",
            },
          },
        },
      },
    },
  };
}

function buildSystemPrompt(language: LanguagePreference) {
  if (language === "Polish") {
    return [
      "Jesteś EduMailAI, ostrożnym asystentem operacyjnym dla uczelni.",
      "Tworzysz szkic odpowiedzi dla pracownika, a nie finalną obietnicę dla studenta.",
      "Wolno Ci używać wyłącznie dostarczonych źródeł wiedzy i kontekstu routingu.",
      "Nie wymyślaj polityk, terminów, wyjątków, opłat ani gwarancji, których nie wspierają źródła.",
      "Jeśli źródła są zbyt słabe dla bezpiecznej odpowiedzi, ustaw requiresManualReview=true i zostaw replyDraft pusty.",
      "Zwróć wyłącznie JSON zgodny ze schematem.",
    ].join(" ");
  }

  return [
    "You are EduMailAI, a careful university operations drafting assistant.",
    "You are preparing a staff review draft, not a final unsupported promise to the sender.",
    "Use only the supplied routing context and knowledge sources.",
    "Do not invent policies, dates, exceptions, fees, or guarantees that are not supported by the sources.",
    "If the sources are too weak for a safe reply, set requiresManualReview=true and leave replyDraft empty.",
    "Return only JSON that matches the schema.",
  ].join(" ");
}

function buildUserPrompt(
  input: StaffEmailCreateInput,
  language: LanguagePreference,
  department: Department,
  routingReason: string,
  candidates: GroundingCandidate[]
) {
  return [
    `Language: ${language}`,
    `Routed department: ${department}`,
    `Routing reason: ${routingReason}`,
    `Sender name: ${input.senderName.trim()}`,
    `Sender email: ${input.senderEmail.trim().toLowerCase()}`,
    `Subject: ${input.subject.trim()}`,
    `Body:\n${input.body.trim()}`,
    "Knowledge sources:",
    ...candidates.map(
      (candidate, index) => [
        `${index + 1}. ${candidate.name}`,
        `Category: ${candidate.category}`,
        `Summary: ${candidate.summary}`,
        "Relevant passages:",
        ...candidate.relevantPassages.map((passage) => `- ${passage}`),
      ].join("\n")
    ),
    language === "Polish"
      ? "Przygotuj krótkie podsumowanie wewnętrzne i praktyczną, ostrożną odpowiedź dla nadawcy. Cytuj tylko dokumenty, których fragmenty naprawdę wspierają odpowiedź."
      : "Prepare a concise internal summary and a practical, cautious reply for the sender. Cite only documents whose passages directly support the reply.",
  ].join("\n\n");
}

function extractResponseText(response: OpenAIResponsesCreateResponse) {
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }

  for (const outputItem of response.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (
        typeof contentItem.text === "string" &&
        contentItem.text.trim().length > 0
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function parseOpenAIDraftResult(
  value: unknown,
  candidateMap: Map<string, GroundingCandidate>
) {
  if (!value || typeof value !== "object") {
    throw new Error("OpenAI draft output was not an object.");
  }

  const candidate = value as Partial<OpenAIDraftResult>;

  if (
    typeof candidate.summary !== "string" ||
    typeof candidate.replyDraft !== "string" ||
    typeof candidate.requiresManualReview !== "boolean" ||
    typeof candidate.manualReviewReason !== "string" ||
    typeof candidate.primarySourceDocument !== "string" ||
    !Array.isArray(candidate.citations)
  ) {
    throw new Error("OpenAI draft output did not match the expected shape.");
  }

  const normalizedCitations = candidate.citations
    .filter(
      (citation): citation is { documentName: string; reason: string } =>
        Boolean(citation) &&
        typeof citation === "object" &&
        typeof citation.documentName === "string" &&
        typeof citation.reason === "string" &&
        candidateMap.has(citation.documentName)
    )
    .slice(0, 3);

  const primarySourceDocument = candidateMap.has(candidate.primarySourceDocument)
    ? candidate.primarySourceDocument
    : normalizedCitations[0]?.documentName ?? "";

  return {
    summary: candidate.summary.trim(),
    replyDraft: candidate.replyDraft.trim(),
    requiresManualReview: candidate.requiresManualReview,
    manualReviewReason: candidate.manualReviewReason.trim(),
    primarySourceDocument,
    citations: normalizedCitations,
  } satisfies OpenAIDraftResult;
}

async function fetchOpenAIDraftResult(
  config: OpenAIDraftConfig,
  input: StaffEmailCreateInput,
  language: LanguagePreference,
  department: Department,
  routingReason: string,
  candidates: GroundingCandidate[]
) {
  const schema = buildOpenAIOutputSchema(candidates.map((candidate) => candidate.name));
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      instructions: buildSystemPrompt(language),
      input: buildUserPrompt(
        input,
        language,
        department,
        routingReason,
        candidates
      ),
      temperature: 0.3,
      max_output_tokens: config.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "edumailai_draft_suggestion",
          strict: true,
          schema,
        },
      },
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | OpenAIResponsesCreateResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        `OpenAI draft request failed with status ${response.status}.`
    );
  }

  const responseText = payload ? extractResponseText(payload) : null;

  if (!responseText) {
    throw new Error("OpenAI draft request completed without response text.");
  }

  return parseOpenAIDraftResult(
    JSON.parse(responseText),
    new Map(candidates.map((candidate) => [candidate.name, candidate]))
  );
}

function buildSourceCitations(
  citations: OpenAIDraftResult["citations"],
  candidateMap: Map<string, GroundingCandidate>
): EmailSourceCitation[] {
  return citations.map((citation, index) => {
    const sourceDocument = candidateMap.get(citation.documentName);

    return {
      id: `SRC-OPENAI-${index + 1}`,
      documentName: citation.documentName,
      excerpt: sourceDocument?.citationExcerpt ?? sourceDocument?.summary ?? "",
      reason: citation.reason.trim(),
    };
  });
}

function buildFallbackSourceCitation(
  primarySourceDocument: string | null,
  candidateMap: Map<string, GroundingCandidate>,
  language: LanguagePreference
) {
  if (!primarySourceDocument) {
    return [] as EmailSourceCitation[];
  }

  const sourceDocument = candidateMap.get(primarySourceDocument);

  if (!sourceDocument) {
    return [] as EmailSourceCitation[];
  }

  return [
    {
      id: "SRC-OPENAI-1",
      documentName: primarySourceDocument,
      excerpt: sourceDocument.citationExcerpt,
      reason:
        language === "Polish"
          ? "Główny dokument ugruntowujący wybrany dla tej odpowiedzi."
          : "Primary grounding document selected for this reply.",
    },
  ];
}

function getOpenAIProviderStatus(
  config: OpenAIDraftConfig,
  language: LanguagePreference = "English"
): DraftProviderStatus {
  if (language === "Polish") {
    return {
      summary: `Szkice są teraz generowane przez OpenAI (${config.model}) z ugruntowaniem opartym na wybranych fragmentach dokumentów bazy wiedzy.`,
      nextStep:
        "Następnym krokiem jest strojenie promptu, kontrola jakości odpowiedzi i ocena cytatów na prawdziwych sprawach operacyjnych.",
    };
  }

  return {
    summary: `Drafts are now generated through OpenAI (${config.model}) with passage-based grounding from selected knowledge-base documents.`,
    nextStep:
      "Next, tune the prompt, evaluate reply quality, and review citation quality on real operational cases.",
  };
}

export const openAIAIDraftAdapter: AIDraftAdapter = {
  async generateDraftSuggestion(
    input,
    language = "English"
  ): Promise<DraftSuggestion> {
    const localSuggestion = await localAIDraftAdapter.generateDraftSuggestion(
      input,
      language
    );

    if (localSuggestion.manualReviewReason) {
      return localSuggestion;
    }

    const config = getOpenAIDraftConfig();

    if (!config) {
      return localSuggestion;
    }

    try {
      const candidates = await selectGroundingCandidates(
        input,
        localSuggestion.routingDecision.department
      );

      if (candidates.length === 0) {
        return {
          ...localSuggestion,
          manualReviewReason:
            language === "Polish"
              ? "Brakuje dokumentów bazy wiedzy wystarczających do ugruntowania szkicu odpowiedzi."
              : "The knowledge base does not currently have enough source material to ground this reply draft.",
          aiDraft: null,
          source: null,
          sourceCitations: [],
        };
      }

      const openAIResult = await fetchOpenAIDraftResult(
        config,
        input,
        language,
        localSuggestion.routingDecision.department,
        localSuggestion.routingDecision.reason,
        candidates
      );
      const candidateMap = new Map(
        candidates.map((candidate) => [candidate.name, candidate])
      );
      const modelSourceCitations = buildSourceCitations(
        openAIResult.citations,
        candidateMap
      );
      const sourceDocument =
        openAIResult.primarySourceDocument ||
        modelSourceCitations[0]?.documentName ||
        candidates[0]?.name ||
        null;
      const sourceCitations =
        modelSourceCitations.length > 0
          ? modelSourceCitations
          : buildFallbackSourceCitation(sourceDocument, candidateMap, language);
      const manualReviewReason = openAIResult.requiresManualReview
        ? openAIResult.manualReviewReason ||
          (language === "Polish"
            ? "Model oznaczył tę sprawę do ręcznego przeglądu ze względu na zbyt słabe ugruntowanie."
            : "The model flagged this case for manual review because the available grounding was too weak.")
        : null;

      return {
        ...localSuggestion,
        aiDraft: manualReviewReason ? null : openAIResult.replyDraft,
        source: sourceDocument,
        summary: openAIResult.summary || localSuggestion.summary,
        manualReviewReason,
        sourceCitations,
      };
    } catch {
      return localSuggestion;
    }
  },
  async getProviderStatus(language = "English") {
    const config = getOpenAIDraftConfig();

    if (!config) {
      return localAIDraftAdapter.getProviderStatus(language);
    }

    return getOpenAIProviderStatus(config, language);
  },
};
