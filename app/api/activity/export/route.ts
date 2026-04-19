import { exportWorkspaceActivityAsJson } from "@/lib/server/services/activity-service";
import { requireWorkspaceUserForApi } from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

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
