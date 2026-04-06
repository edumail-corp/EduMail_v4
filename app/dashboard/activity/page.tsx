import { Suspense } from "react";
import { ActivityLogView } from "@/components/dashboard/activity-log-view";
import { listWorkspaceActivity } from "@/lib/server/services/activity-service";

export default async function ActivityPage() {
  const events = await listWorkspaceActivity(40);

  return (
    <Suspense fallback={null}>
      <ActivityLogView events={events} />
    </Suspense>
  );
}
