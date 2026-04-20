import { NextResponse } from "next/server";
import { sendMailboxReply } from "@/lib/server/services/mail-runtime-service";
import { requireWorkspaceUserForApi } from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorStatus(error: Error) {
  if (error.message === "Email not found.") {
    return 404;
  }

  if (
    error.message === "This case does not have a reply draft yet." ||
    error.message === "This reply was already sent." ||
    error.message === "The recipient email address could not be parsed."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    const result = await sendMailboxReply(id, authResult.workspaceUser);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send the reply.",
      },
      {
        status: error instanceof Error ? getErrorStatus(error) : 500,
      }
    );
  }
}
