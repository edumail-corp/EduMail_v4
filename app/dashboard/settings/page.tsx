"use client";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { SettingsPreferences } from "@/components/dashboard/settings-preferences";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export default function SettingsPage() {
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";

  return (
    <>
      <DashboardTopBar label={isPolish ? "Preferencje" : "Preferences"} />

      <DashboardPageHeader
        eyebrow={isPolish ? "Ustawienia osobiste" : "Personal Settings"}
        title={isPolish ? "Ustawienia" : "Settings"}
        description={
          isPolish
            ? "Zachowaj prostotę workspace dzięki kilku lokalnym preferencjom języka, wyglądu i powiadomień."
            : "Keep the workspace simple with a few local preferences for language, appearance, and notifications."
        }
        meta={isPolish ? "Zapisane lokalnie na tym urządzeniu" : "Saved locally on this device"}
      />

      <SettingsPreferences />
    </>
  );
}
