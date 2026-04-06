import { Suspense } from "react";
import { MailboxView } from "@/components/dashboard/mailbox-view";

export default function DraftsPage() {
  return (
    <Suspense fallback={null}>
      <MailboxView
        filter="Draft"
        eyebrow="Review Queue"
        title="Draft Queue"
        description="Focus on messages that still need a human sign-off before anything is sent to the student or staff member."
        metaSuffix="drafts awaiting review"
        listTitle="Pending Drafts"
        listDescription="Drafts that still need review, edits, or approval."
        emptyMessage="No drafts pending review."
      />
    </Suspense>
  );
}
