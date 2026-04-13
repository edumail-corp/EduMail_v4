export type ThemePreference = "light" | "system" | "dark";
export type LanguagePreference = "English" | "Polish";
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
export const userPreferencesLanguageCookie = "edumailai.language";

export const themePreferenceOptions = [
  "light",
  "system",
  "dark",
] as const satisfies readonly ThemePreference[];

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
];

export const timeFormatOptions = ["12h", "24h"] as const satisfies readonly TimeFormatPreference[];
export const inboxDensityOptions = [
  "comfortable",
  "compact",
] as const satisfies readonly InboxDensityPreference[];

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    themePreferenceOptions.includes(value as ThemePreference)
  );
}

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return (
    typeof value === "string" &&
    languageOptions.includes(value as LanguagePreference)
  );
}

export function isTimeFormatPreference(
  value: unknown
): value is TimeFormatPreference {
  return (
    typeof value === "string" &&
    timeFormatOptions.includes(value as TimeFormatPreference)
  );
}

export function isInboxDensityPreference(
  value: unknown
): value is InboxDensityPreference {
  return (
    typeof value === "string" &&
    inboxDensityOptions.includes(value as InboxDensityPreference)
  );
}

export function sanitizeUserPreferences(
  value: Partial<UserPreferences> | null | undefined
): UserPreferences {
  return {
    theme: isThemePreference(value?.theme)
      ? value.theme
      : defaultUserPreferences.theme,
    language: isLanguagePreference(value?.language)
      ? value.language
      : defaultUserPreferences.language,
    timeFormat: isTimeFormatPreference(value?.timeFormat)
      ? value.timeFormat
      : defaultUserPreferences.timeFormat,
    inboxDensity: isInboxDensityPreference(value?.inboxDensity)
      ? value.inboxDensity
      : defaultUserPreferences.inboxDensity,
    desktopNotifications:
      typeof value?.desktopNotifications === "boolean"
        ? value.desktopNotifications
        : defaultUserPreferences.desktopNotifications,
    sendConfirmations:
      typeof value?.sendConfirmations === "boolean"
        ? value.sendConfirmations
        : defaultUserPreferences.sendConfirmations,
  };
}

export function getLocaleForLanguage(language: LanguagePreference) {
  if (language === "Polish") {
    return "pl-PL";
  }

  return "en-US";
}

export function getHtmlLangForLanguage(language: LanguagePreference) {
  if (language === "Polish") {
    return "pl";
  }

  return "en";
}
