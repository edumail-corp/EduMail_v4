"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailboxView } from "@/components/dashboard/mailbox-view";

export function InboxWithTabs() {
  const searchParams = useSearchParams();
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
          All messages
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
          Escalations
        </Link>
      </div>

      {isEscalations ? (
        <MailboxView
          key="escalations"
          filter="Escalated"
          eyebrow="Escalation Desk"
          title="Escalations"
          description="Review messages that fell below the confidence threshold or need a staff member to intervene before a response can be finalized."
          metaSuffix="escalations open"
          listTitle="Escalated Cases"
          listDescription="Messages that need manual handling or deeper policy review."
          emptyMessage="No escalations at this time."
        />
      ) : (
        <MailboxView
          key="all"
          filter="All"
          eyebrow="Operations"
          title="Inbox"
          description="Browse the full message queue, inspect the retrieved context, and decide whether the suggested response is ready to move forward."
          metaSuffix="total messages"
          listTitle="Message Queue"
          listDescription="All captured inbound messages across the current prototype mailbox."
          emptyMessage="No messages available."
        />
      )}
    </>
  );
}
