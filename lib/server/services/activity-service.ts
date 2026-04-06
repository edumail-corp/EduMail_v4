import { listActivityEvents } from "@/lib/server/activity-log-store";

export async function listWorkspaceActivity(limit?: number) {
  return listActivityEvents(limit);
}

export async function exportWorkspaceActivityAsJson() {
  const events = await listActivityEvents();
  return `${JSON.stringify(events, null, 2)}\n`;
}
