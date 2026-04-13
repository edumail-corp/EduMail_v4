import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { SettingsPreferences } from "@/components/dashboard/settings-preferences";

export default function SettingsPage() {
  return (
    <>
      <DashboardTopBar label="Preferences" />

      <DashboardPageHeader
        eyebrow="Personal Settings"
        title="Settings"
        description="Keep the workspace simple with a few local preferences for language, appearance, and notifications."
        meta="Saved locally on this device"
      />

      <SettingsPreferences />
    </>
  );
}
