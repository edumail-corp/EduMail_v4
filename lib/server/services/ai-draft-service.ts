import type { StaffEmailCreateInput } from "@/lib/email-data";
import type { LanguagePreference } from "@/lib/user-preferences";
import { getAIDraftAdapter } from "@/lib/server/adapters";

export async function generateSeededDraftSuggestion(
  input: StaffEmailCreateInput,
  language: LanguagePreference = "English"
) {
  return (await getAIDraftAdapter()).generateDraftSuggestion(input, language);
}

export async function getAIDraftProviderStatus(
  language: LanguagePreference = "English"
) {
  return (await getAIDraftAdapter()).getProviderStatus(language);
}
