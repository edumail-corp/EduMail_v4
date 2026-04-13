import { Suspense } from "react";
import { ActivityLogView } from "@/components/dashboard/activity-log-view";
import { listWorkspaceActivity } from "@/lib/server/services/activity-service";
import { listMailboxEmails } from "@/lib/server/services/mailbox-service";

export default async function ActivityPage() {
  const [events, emails] = await Promise.all([
    listWorkspaceActivity(80),
    listMailboxEmails(),
  ]);

  return (
    <Suspense fallback={null}>
      <ActivityLogView events={events} emails={emails} />
    </Suspense>
  );
}
