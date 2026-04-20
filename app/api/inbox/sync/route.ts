import { NextResponse } from "next/server";
import { syncConfiguredInbox } from "@/lib/server/services/mail-runtime-service";
import { requireWorkspaceUserForApi } from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const result = await syncConfiguredInbox();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync the inbox.",
      },
      { status: 500 }
    );
  }
}
