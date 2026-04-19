import { NextResponse } from "next/server";
import {
  sanitizeAuthRedirectPath,
  signOutWorkspaceSession,
} from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = sanitizeAuthRedirectPath(requestUrl.searchParams.get("next"), "/");

  await signOutWorkspaceSession();

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin), {
    status: 303,
  });
}
