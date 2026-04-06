import { Suspense } from "react";
import { MailboxView } from "@/components/dashboard/mailbox-view";

export default function EscalationsPage() {
  return (
    <Suspense fallback={null}>
      <MailboxView
        filter="Escalated"
        eyebrow="Escalation Desk"
        title="Escalations"
        description="Review messages that fell below the confidence threshold or need a staff member to intervene before a response can be finalized."
        metaSuffix="escalations open"
        listTitle="Escalated Cases"
        listDescription="Messages that need manual handling or deeper policy review."
        emptyMessage="No escalations at this time."
      />
    </Suspense>
  );
}
