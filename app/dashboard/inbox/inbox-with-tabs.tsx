"use client";

import { MailboxView } from "@/components/dashboard/mailbox-view";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export function InboxWithTabs({
  staffAssigneeOptions,
}: Readonly<{
  staffAssigneeOptions: readonly string[];
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
          ? "Otwórz wiadomość, przeczytaj zapytanie i przejrzyj wygenerowaną odpowiedź w bardziej standardowym widoku skrzynki."
          : "Open a message, read the inquiry, and review the generated reply in a more standard inbox view."
      }
      metaSuffix={isPolish ? "wszystkich wiadomości" : "total messages"}
      listTitle={isPolish ? "Wiadomości" : "Messages"}
      listDescription={
        isPolish
          ? "Wszystkie przechwycone wiadomości przychodzące w bieżącym prototypie skrzynki."
          : "All captured inbound messages across the current prototype mailbox."
      }
      emptyMessage={isPolish ? "Brak dostępnych wiadomości." : "No messages available."}
      staffAssigneeOptions={staffAssigneeOptions}
      interfaceMode="email"
    />
  );
}
