"use client";

import { MailboxView } from "@/components/dashboard/mailbox-view";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export function InboxWithTabs({
  staffAssigneeOptions,
  canSyncInbox = false,
}: Readonly<{
  staffAssigneeOptions: readonly string[];
  canSyncInbox?: boolean;
}>) {
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";

  return (
    <MailboxView
      key="all"
      filter="All"
      eyebrow={isPolish ? "Operacje" : "Operations"}
      title={isPolish ? "Skrzynka" : "Inbox"}
      description={
        isPolish
          ? "Otwórz wiadomość, przeczytaj zapytanie i przejdź od szkicu opartego na źródłach do końcowej decyzji człowieka."
          : "Open a message, read the inquiry, and move from a grounded draft to a final human decision."
      }
      metaSuffix={isPolish ? "wszystkich wiadomości" : "total messages"}
      listTitle={isPolish ? "Wiadomości" : "Messages"}
      listDescription={
        isPolish
          ? "Bieżące wiadomości i sprawy gotowe do przeglądu przez zespół."
          : "Current messages and cases ready for staff review."
      }
      emptyMessage={isPolish ? "Brak dostępnych wiadomości." : "No messages available."}
      staffAssigneeOptions={staffAssigneeOptions}
      interfaceMode="email"
      canSyncInbox={canSyncInbox}
    />
  );
}
