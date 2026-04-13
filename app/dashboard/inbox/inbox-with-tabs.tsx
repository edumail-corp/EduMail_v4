"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailboxView } from "@/components/dashboard/mailbox-view";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export function InboxWithTabs() {
  const searchParams = useSearchParams();
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const isEscalations = searchParams.get("view") === "escalations";

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/inbox"
          scroll={false}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
            !isEscalations
              ? "bg-[#5C61FF] text-white shadow-[0_16px_34px_rgba(92,97,255,0.24)]"
              : "border border-white/80 bg-white/70 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
          }`}
        >
          {isPolish ? "Skrzynka" : "Inbox"}
        </Link>
        <Link
          href="/dashboard/inbox?view=escalations"
          scroll={false}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
            isEscalations
              ? "bg-[#5C61FF] text-white shadow-[0_16px_34px_rgba(92,97,255,0.24)]"
              : "border border-white/80 bg-white/70 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
          }`}
        >
          {isPolish ? "Eskalacje" : "Escalations"}
        </Link>
      </div>

      {isEscalations ? (
        <MailboxView
          key="escalations"
          filter="Escalated"
          eyebrow={isPolish ? "Biurko eskalacji" : "Escalation Desk"}
          title={isPolish ? "Eskalacje" : "Escalations"}
          description={
            isPolish
              ? "Przeglądaj wiadomości, które spadły poniżej progu pewności lub wymagają interwencji pracownika przed finalizacją odpowiedzi."
              : "Review messages that fell below the confidence threshold or need a staff member to intervene before a response can be finalized."
          }
          metaSuffix={isPolish ? "otwartych eskalacji" : "escalations open"}
          listTitle={isPolish ? "Sprawy eskalowane" : "Escalated Cases"}
          listDescription={
            isPolish
              ? "Wiadomości wymagające ręcznej obsługi albo głębszego sprawdzenia zasad."
              : "Messages that need manual handling or deeper policy review."
          }
          emptyMessage={isPolish ? "Brak eskalacji w tej chwili." : "No escalations at this time."}
        />
      ) : (
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
          interfaceMode="email"
        />
      )}
    </>
  );
}
