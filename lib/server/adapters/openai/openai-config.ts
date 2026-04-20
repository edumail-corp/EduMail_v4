export type OpenAIDraftConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxOutputTokens: number;
};

function normalizeEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function getOpenAIDraftConfig(): OpenAIDraftConfig | null {
  const apiKey = normalizeEnvValue(process.env.EDUMAILAI_AI_API_KEY);

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: normalizeEnvValue(process.env.EDUMAILAI_AI_MODEL) ?? "gpt-4.1-mini",
    baseUrl:
      normalizeEnvValue(process.env.EDUMAILAI_OPENAI_BASE_URL) ??
      "https://api.openai.com/v1",
    maxOutputTokens: parsePositiveInteger(
      process.env.EDUMAILAI_AI_MAX_OUTPUT_TOKENS,
      900
    ),
  };
}

export function hasConfiguredOpenAIDraftProvider() {
  return getOpenAIDraftConfig() !== null;
}
