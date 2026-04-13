import { getActivityAdapter } from "@/lib/server/adapters";

const activityAdapter = getActivityAdapter();

export async function listWorkspaceActivity(limit?: number) {
  return activityAdapter.listEvents(limit);
}

export async function exportWorkspaceActivityAsJson() {
  const events = await activityAdapter.listEvents();
  return `${JSON.stringify(events, null, 2)}\n`;
}
