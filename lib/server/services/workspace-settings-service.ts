import type { LanguagePreference } from "@/lib/user-preferences";
import {
  getAIDraftAdapter,
  getWorkspaceSettingsAdapter,
} from "@/lib/server/adapters";

export async function getWorkspaceSettingsSnapshot(
  language: LanguagePreference = "English"
) {
  const draftProvider = await (await getAIDraftAdapter()).getProviderStatus(
    language
  );

  return (await getWorkspaceSettingsAdapter()).getSnapshot({
    language,
    draftProvider,
  });
}
