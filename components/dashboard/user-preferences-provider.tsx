"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { formatEmailDate, formatEmailDay } from "@/lib/dashboard";
import {
  defaultUserPreferences,
  getHtmlLangForLanguage,
  getLocaleForLanguage,
  userPreferencesStorageKey,
  type UserPreferences,
} from "@/lib/user-preferences";

type UserPreferencesContextValue = {
  hasHydrated: boolean;
  preferences: UserPreferences;
  locale: string;
  resolvedTheme: "light" | "dark";
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  resetPreferences: () => void;
  formatDateTime: (iso: string) => string;
  formatDay: (iso: string) => string;
  sendDesktopNotification: (title: string, body: string) => void;
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

function getResolvedTheme(theme: UserPreferences["theme"]) {
  if (theme !== "system") {
    return theme;
  }

  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function applyThemePreference(theme: UserPreferences["theme"]) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return "light";
  }

  const root = document.documentElement;
  const resolvedTheme = getResolvedTheme(theme);

  root.dataset.themePreference = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  root.classList.toggle("dark", resolvedTheme === "dark");

  return resolvedTheme;
}

export function UserPreferencesProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultUserPreferences);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [hasHydrated, setHasHydrated] = useState(false);
  const locale = getLocaleForLanguage(preferences.language);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(userPreferencesStorageKey);

      if (storedValue) {
        const parsed = JSON.parse(storedValue) as Partial<UserPreferences>;
        setPreferences((current) => ({
          ...current,
          ...parsed,
        }));
      }
    } catch {
      window.localStorage.removeItem(userPreferencesStorageKey);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = getHtmlLangForLanguage(preferences.language);
    root.dataset.languagePreference = preferences.language;
    root.dataset.locale = locale;
    root.dataset.timeFormat = preferences.timeFormat;
    root.dataset.inboxDensity = preferences.inboxDensity;
    setResolvedTheme(applyThemePreference(preferences.theme));
  }, [locale, preferences.inboxDensity, preferences.language, preferences.theme, preferences.timeFormat]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(
      userPreferencesStorageKey,
      JSON.stringify(preferences)
    );
  }, [hasHydrated, preferences]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleThemeChange() {
      if (preferences.theme === "system") {
        setResolvedTheme(applyThemePreference("system"));
      }
    }

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [preferences.theme]);

  useEffect(() => {
    if (
      !hasHydrated ||
      !preferences.desktopNotifications ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default"
    ) {
      return;
    }

    void Notification.requestPermission().catch(() => undefined);
  }, [hasHydrated, preferences.desktopNotifications]);

  function updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetPreferences() {
    setPreferences(defaultUserPreferences);
    window.localStorage.removeItem(userPreferencesStorageKey);
  }

  function sendDesktopNotification(title: string, body: string) {
    if (
      !preferences.desktopNotifications ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    new Notification(title, { body });
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        hasHydrated,
        preferences,
        locale,
        resolvedTheme,
        updatePreference,
        resetPreferences,
        formatDateTime: (iso) =>
          formatEmailDate(iso, {
            locale,
            timeFormat: preferences.timeFormat,
          }),
        formatDay: (iso) =>
          formatEmailDay(iso, {
            locale,
          }),
        sendDesktopNotification,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);

  if (!context) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider."
    );
  }

  return context;
}
