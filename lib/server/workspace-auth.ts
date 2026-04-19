import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  getRequiredSupabaseAuthConfig,
  hasConfiguredSupabaseAuth,
} from "@/lib/supabase-auth";
import type {
  WorkspaceRole,
  WorkspaceStaffUser,
} from "@/lib/workspace-config";
import {
  findWorkspaceStaffUserByEmail,
  listWorkspaceStaffDirectory,
} from "@/lib/server/workspace-staff-directory";

export type AuthenticatedWorkspaceUser = WorkspaceStaffUser & {
  authEmail: string;
  authUserId: string;
};

type WorkspaceAuthFailureReason =
  | "unauthenticated"
  | "not-authorized"
  | "inactive";

type WorkspaceAuthResolution =
  | {
      workspaceUser: AuthenticatedWorkspaceUser;
      failureReason: null;
    }
  | {
      workspaceUser: null;
      failureReason: WorkspaceAuthFailureReason;
    };

type CookieStoreLike = Awaited<ReturnType<typeof cookies>>;
const developmentAccessCookieName = "edumailai.dev-access-user-id";

function isAuthBypassedForVerification() {
  return process.env.EDUMAILAI_DISABLE_AUTH_FOR_VERIFY === "1";
}

export function isDevelopmentAccessEnabled() {
  const configuredValue = process.env.EDUMAILAI_ENABLE_DEV_ACCESS?.trim();

  if (configuredValue === "1") {
    return true;
  }

  if (configuredValue === "0") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

async function getWorkspaceUserByEmail(email: string) {
  return findWorkspaceStaffUserByEmail(email);
}

function buildDevelopmentAccessWorkspaceUser(
  staffUser: WorkspaceStaffUser
): AuthenticatedWorkspaceUser {
  return {
    ...staffUser,
    authEmail: normalizeEmailAddress(staffUser.email),
    authUserId: `DEV-ACCESS-${staffUser.id}`,
  };
}

function buildAuthenticatedWorkspaceUser(
  staffUser: WorkspaceStaffUser,
  authUser: User
): AuthenticatedWorkspaceUser {
  return {
    ...staffUser,
    authEmail: authUser.email ? normalizeEmailAddress(authUser.email) : "",
    authUserId: authUser.id,
  };
}

async function getVerificationWorkspaceUser() {
  const staffDirectory = await listWorkspaceStaffDirectory();
  const staffUser =
    staffDirectory.find(
      (candidate) =>
        candidate.status === "active" && candidate.role === "operations_admin"
    ) ??
    staffDirectory.find((candidate) => candidate.status === "active") ??
    staffDirectory[0];

  return {
    ...staffUser,
    authEmail: normalizeEmailAddress(staffUser.email),
    authUserId: "VERIFY-WORKSPACE-USER",
  } satisfies AuthenticatedWorkspaceUser;
}

async function getDevelopmentAccessWorkspaceUser(
  cookieStore: Pick<CookieStoreLike, "get">
) {
  if (!isDevelopmentAccessEnabled()) {
    return null;
  }

  const selectedUserId = cookieStore.get(developmentAccessCookieName)?.value;

  if (!selectedUserId) {
    return null;
  }

  const staffDirectory = await listWorkspaceStaffDirectory();
  const staffUser =
    staffDirectory.find(
      (candidate) =>
        candidate.id === selectedUserId && candidate.status === "active"
    ) ?? null;

  return staffUser ? buildDevelopmentAccessWorkspaceUser(staffUser) : null;
}

async function resolveWorkspaceUser(
  authUser: User | null
): Promise<WorkspaceAuthResolution> {
  if (!authUser?.email) {
    return {
      workspaceUser: null,
      failureReason: "unauthenticated",
    };
  }

  const staffUser = await getWorkspaceUserByEmail(authUser.email);

  if (!staffUser) {
    return {
      workspaceUser: null,
      failureReason: "not-authorized",
    };
  }

  if (staffUser.status !== "active") {
    return {
      workspaceUser: null,
      failureReason: "inactive",
    };
  }

  return {
    workspaceUser: buildAuthenticatedWorkspaceUser(staffUser, authUser),
    failureReason: null,
  };
}

function createSupabaseServerClient(cookieStore: CookieStoreLike) {
  const config = getRequiredSupabaseAuthConfig();

  return createServerClient(config.projectUrl, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always mutate cookies. Proxy/callback/route
          // handlers handle persistence when available.
        }
      },
    },
  });
}

export async function getCurrentWorkspaceUser() {
  if (isAuthBypassedForVerification()) {
    return getVerificationWorkspaceUser();
  }

  const cookieStore = await cookies();
  const developmentAccessUser = await getDevelopmentAccessWorkspaceUser(
    cookieStore
  );

  if (developmentAccessUser) {
    return developmentAccessUser;
  }

  if (!hasConfiguredSupabaseAuth()) {
    return null;
  }

  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (await resolveWorkspaceUser(user)).workspaceUser;
}

export async function requireWorkspaceUser(
  redirectPath = "/sign-in?next=/dashboard"
) {
  const workspaceUser = await getCurrentWorkspaceUser();

  if (workspaceUser) {
    return workspaceUser;
  }

  if (!hasConfiguredSupabaseAuth()) {
    redirect("/sign-in?error=config-missing");
  }

  if (!workspaceUser) {
    redirect(redirectPath);
  }

  return workspaceUser;
}

export async function requireWorkspaceRole(
  role: WorkspaceRole,
  redirectPath = "/dashboard?error=admin-access-required"
) {
  const workspaceUser = await requireWorkspaceUser();

  if (workspaceUser.role !== role) {
    redirect(redirectPath);
  }

  return workspaceUser;
}

function getApiErrorMessage(reason: WorkspaceAuthFailureReason) {
  if (reason === "unauthenticated") {
    return "Authentication required.";
  }

  if (reason === "inactive") {
    return "Your workspace access is not active yet.";
  }

  return "Your account is not allowed in this workspace.";
}

export async function requireWorkspaceUserForApi() {
  if (isAuthBypassedForVerification()) {
    return {
      workspaceUser: await getVerificationWorkspaceUser(),
    } as const;
  }

  const cookieStore = await cookies();
  const developmentAccessUser = await getDevelopmentAccessWorkspaceUser(
    cookieStore
  );

  if (developmentAccessUser) {
    return {
      workspaceUser: developmentAccessUser,
    } as const;
  }

  if (!hasConfiguredSupabaseAuth()) {
    return {
      response: NextResponse.json(
        { error: "Supabase Auth is not configured." },
        { status: 503 }
      ),
    } as const;
  }

  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolution = await resolveWorkspaceUser(user);

  if (!resolution.workspaceUser) {
    return {
      response: NextResponse.json(
        { error: getApiErrorMessage(resolution.failureReason) },
        { status: resolution.failureReason === "unauthenticated" ? 401 : 403 }
      ),
    } as const;
  }

  return {
    workspaceUser: resolution.workspaceUser,
  } as const;
}

export async function exchangeCodeForWorkspaceSession(code: string) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    ...(await resolveWorkspaceUser(user)),
  };
}

export async function signOutWorkspaceSession() {
  if (!hasConfiguredSupabaseAuth()) {
    return;
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  await supabase.auth.signOut();
}

export async function getDevelopmentAccessWorkspaceUserById(userId: string) {
  if (!isDevelopmentAccessEnabled()) {
    return null;
  }

  const staffDirectory = await listWorkspaceStaffDirectory();

  return (
    staffDirectory.find(
      (candidate) => candidate.id === userId && candidate.status === "active"
    ) ?? null
  );
}

export function setDevelopmentAccessCookie(
  response: NextResponse,
  userId: string
) {
  response.cookies.set({
    name: developmentAccessCookieName,
    value: userId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearDevelopmentAccessCookie(response: NextResponse) {
  response.cookies.set({
    name: developmentAccessCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function sanitizeAuthRedirectPath(
  value: string | null | undefined,
  fallbackPath = "/dashboard"
) {
  if (!value) {
    return fallbackPath;
  }

  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallbackPath;
}
