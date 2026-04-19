import { NextResponse } from "next/server";
import {
  exchangeCodeForWorkspaceSession,
  sanitizeAuthRedirectPath,
} from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeAuthRedirectPath(
    requestUrl.searchParams.get("next"),
    "/dashboard"
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth-failed", requestUrl.origin)
    );
  }

  try {
    const authResult = await exchangeCodeForWorkspaceSession(code);

    if (!authResult.workspaceUser) {
      await authResult.supabase.auth.signOut();

      return NextResponse.redirect(
        new URL("/sign-in?error=not-authorized", requestUrl.origin)
      );
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch (error) {
    console.error("Unable to finish the Supabase Auth callback.", error);

    return NextResponse.redirect(
      new URL("/sign-in?error=auth-failed", requestUrl.origin)
    );
  }
}

