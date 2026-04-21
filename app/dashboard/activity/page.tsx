import { ActivityStreamView } from "@/components/dashboard/activity-stream-view";
import { listWorkspaceActivity } from "@/lib/server/services/activity-service";

export default async function ActivityPage() {
  let activityEvents: Awaited<ReturnType<typeof listWorkspaceActivity>> = [];
  const generatedAt = new Date().toISOString();

  try {
    activityEvents = await listWorkspaceActivity(250);
  } catch (error) {
    console.error("Failed to load activity events. Falling back to empty state.", error);
  }

  return <ActivityStreamView events={activityEvents} generatedAt={generatedAt} />;
}
