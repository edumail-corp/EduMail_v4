export type ThemePreference = "light" | "system" | "dark";
export type LanguagePreference = "English" | "Polish" | "Spanish";
export type TimeFormatPreference = "12h" | "24h";
export type InboxDensityPreference = "comfortable" | "compact";

export type UserPreferences = {
  theme: ThemePreference;
  language: LanguagePreference;
  timeFormat: TimeFormatPreference;
  inboxDensity: InboxDensityPreference;
  desktopNotifications: boolean;
  sendConfirmations: boolean;
};

export const userPreferencesStorageKey = "edumailai.user-preferences";

export const defaultUserPreferences: UserPreferences = {
  theme: "light",
  language: "English",
  timeFormat: "24h",
  inboxDensity: "comfortable",
  desktopNotifications: true,
  sendConfirmations: true,
};

export const languageOptions: LanguagePreference[] = [
  "English",
  "Polish",
  "Spanish",
];

export function getLocaleForLanguage(language: LanguagePreference) {
  if (language === "Polish") {
    return "pl-PL";
  }

  if (language === "Spanish") {
    return "es-ES";
  }

  return "en-US";
}

export function getHtmlLangForLanguage(language: LanguagePreference) {
  if (language === "Polish") {
    return "pl";
  }

  if (language === "Spanish") {
    return "es";
  }

  return "en";
}
