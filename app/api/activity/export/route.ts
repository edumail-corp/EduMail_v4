import { exportWorkspaceActivityAsJson } from "@/lib/server/services/activity-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const activityJson = await exportWorkspaceActivityAsJson();

  return new Response(activityJson, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="edumailai-activity-log.json"',
      "Cache-Control": "no-store",
    },
  });
}
