import { NextResponse } from "next/server";
import { getMailRuntimeStatus } from "@/lib/server/mail-provider-config";
import { syncConfiguredInbox } from "@/lib/server/services/mail-runtime-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getCronSecret() {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  return secret.length > 0 ? secret : null;
}

function isAuthorizedCronRequest(request: Request) {
  const secret = getCronSecret();

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return NextResponse.json(
      {
        error: "CRON_SECRET is not configured for scheduled inbox sync.",
      },
      { status: 503 }
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized cron request.",
      },
      { status: 401 }
    );
  }

  const runtimeStatus = getMailRuntimeStatus();

  if (!runtimeStatus.hasLiveInboxSync) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      summary:
        "Scheduled inbox sync skipped because live Microsoft Graph inbox sync is not configured.",
    });
  }

  try {
    const result = await syncConfiguredInbox();
    return NextResponse.json({
      ok: true,
      skipped: false,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Scheduled inbox sync failed.",
      },
      { status: 500 }
    );
  }
}
