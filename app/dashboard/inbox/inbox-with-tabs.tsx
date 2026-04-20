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
          ? "Otwórz wiadomość, przeczytaj zapytanie i przejrzyj wygenerowaną odpowiedź w widoku skrzynki, niezależnie od tego, czy sprawa przyszła z synchronizacji, czy z ręcznego intake."
          : "Open a message, read the inquiry, and review the generated reply in the inbox view, whether the case came from live sync or manual intake."
      }
      metaSuffix={isPolish ? "wszystkich wiadomości" : "total messages"}
      listTitle={isPolish ? "Wiadomości" : "Messages"}
      listDescription={
        isPolish
          ? "Wszystkie przechwycone wiadomości przychodzące, zarówno z żywej synchronizacji, jak i z ręcznie utworzonych spraw."
          : "All captured inbound messages, including live-sync imports and manually created cases."
      }
      emptyMessage={isPolish ? "Brak dostępnych wiadomości." : "No messages available."}
      staffAssigneeOptions={staffAssigneeOptions}
      interfaceMode="email"
      canSyncInbox={canSyncInbox}
    />
  );
}
