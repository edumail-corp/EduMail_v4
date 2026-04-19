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
import { workspaceStaffDirectory } from "@/lib/workspace-config";

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

function isAuthBypassedForVerification() {
  return process.env.EDUMAILAI_DISABLE_AUTH_FOR_VERIFY === "1";
}

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function getWorkspaceUserByEmail(email: string) {
  const normalizedEmail = normalizeEmailAddress(email);

  return (
    workspaceStaffDirectory.find(
      (staffUser) => normalizeEmailAddress(staffUser.email) === normalizedEmail
    ) ?? null
  );
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

function getVerificationWorkspaceUser() {
  const staffUser =
    workspaceStaffDirectory.find(
      (candidate) =>
        candidate.status === "active" && candidate.role === "operations_admin"
    ) ??
    workspaceStaffDirectory.find((candidate) => candidate.status === "active") ??
    workspaceStaffDirectory[0];

  return {
    ...staffUser,
    authEmail: normalizeEmailAddress(staffUser.email),
    authUserId: "VERIFY-WORKSPACE-USER",
  } satisfies AuthenticatedWorkspaceUser;
}

function resolveWorkspaceUser(authUser: User | null): WorkspaceAuthResolution {
  if (!authUser?.email) {
    return {
      workspaceUser: null,
      failureReason: "unauthenticated",
    };
  }

  const staffUser = getWorkspaceUserByEmail(authUser.email);

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

  if (!hasConfiguredSupabaseAuth()) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return resolveWorkspaceUser(user).workspaceUser;
}

export async function requireWorkspaceUser(
  redirectPath = "/sign-in?next=/dashboard"
) {
  if (!hasConfiguredSupabaseAuth()) {
    redirect("/sign-in?error=config-missing");
  }

  const workspaceUser = await getCurrentWorkspaceUser();

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
      workspaceUser: getVerificationWorkspaceUser(),
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

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolution = resolveWorkspaceUser(user);

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
    ...resolveWorkspaceUser(user),
  };
}

export async function signOutWorkspaceSession() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  await supabase.auth.signOut();
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
