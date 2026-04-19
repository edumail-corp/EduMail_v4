import { NextResponse } from "next/server";
import {
  getDevelopmentAccessWorkspaceUserById,
  isDevelopmentAccessEnabled,
  sanitizeAuthRedirectPath,
  setDevelopmentAccessCookie,
} from "@/lib/server/workspace-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);

  if (!isDevelopmentAccessEnabled()) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth-failed", requestUrl.origin),
      { status: 303 }
    );
  }

  const formData = await request.formData();
  const selectedUserId = formData.get("userId");
  const nextPath = sanitizeAuthRedirectPath(
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null,
    "/dashboard"
  );

  if (typeof selectedUserId !== "string" || selectedUserId.trim().length === 0) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth-failed", requestUrl.origin),
      { status: 303 }
    );
  }

  const workspaceUser = await getDevelopmentAccessWorkspaceUserById(
    selectedUserId
  );

  if (!workspaceUser) {
    return NextResponse.redirect(
      new URL("/sign-in?error=not-authorized", requestUrl.origin),
      { status: 303 }
    );
  }

  const response = NextResponse.redirect(
    new URL(nextPath, requestUrl.origin),
    { status: 303 }
  );

  setDevelopmentAccessCookie(response, workspaceUser.id);
  return response;
}
