import { NextResponse } from "next/server";
import { isLanguagePreference } from "@/lib/user-preferences";
import { regenerateMailboxEmailDraft } from "@/lib/server/services/mailbox-service";
import { requireWorkspaceUserForApi } from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorStatus(error: Error) {
  if (error.message === "Email not found.") {
    return 404;
  }

  if (
    error.message === "This reply was already sent." ||
    error.message === "The sender email address could not be parsed."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireWorkspaceUserForApi();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await request.json().catch(() => null);
  const requestedLanguage = (payload as { language?: unknown } | null)?.language;
  const language = isLanguagePreference(requestedLanguage)
    ? requestedLanguage
    : "English";

  try {
    const { id } = await context.params;
    const email = await regenerateMailboxEmailDraft(id, language);
    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to regenerate the reply draft.",
      },
      {
        status: error instanceof Error ? getErrorStatus(error) : 500,
      }
    );
  }
}
