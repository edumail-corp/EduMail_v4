import { Suspense } from "react";
import { ActivityLogView } from "@/components/dashboard/activity-log-view";
import { listWorkspaceActivity } from "@/lib/server/services/activity-service";
import { listMailboxEmails } from "@/lib/server/services/mailbox-service";

export default async function ActivityPage() {
  let events: Awaited<ReturnType<typeof listWorkspaceActivity>> = [];
  let emails: Awaited<ReturnType<typeof listMailboxEmails>> = [];

  try {
    [events, emails] = await Promise.all([
      listWorkspaceActivity(80),
      listMailboxEmails(),
    ]);
  } catch (error) {
    console.error("Failed to load activity page data. Falling back to empty state.", error);
  }

  return (
    <Suspense fallback={null}>
      <ActivityLogView events={events} emails={emails} />
    </Suspense>
  );
}
