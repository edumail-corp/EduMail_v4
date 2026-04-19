import { redirect } from "next/navigation";
import { SignInClient } from "./sign-in-client";
import {
  getCurrentWorkspaceUser,
  isDevelopmentAccessEnabled,
} from "@/lib/server/workspace-auth";
import { listWorkspaceStaffDirectory } from "@/lib/server/workspace-staff-directory";
import { hasConfiguredSupabaseAuth } from "@/lib/supabase-auth";

function getSearchParamValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
}

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const authConfigured = hasConfiguredSupabaseAuth();
  const developmentAccessEnabled = isDevelopmentAccessEnabled();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentUser = await getCurrentWorkspaceUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const developmentAccessUsers = developmentAccessEnabled
    ? (await listWorkspaceStaffDirectory())
        .filter((user) => user.status === "active")
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }))
    : [];

  if (!authConfigured) {
    return (
      <SignInClient
        authConfigured={false}
        developmentAccessEnabled={developmentAccessEnabled}
        developmentAccessUsers={developmentAccessUsers}
        errorCode={getSearchParamValue(resolvedSearchParams.error)}
        nextPath={getSearchParamValue(resolvedSearchParams.next) ?? "/dashboard"}
        status={getSearchParamValue(resolvedSearchParams.status)}
      />
    );
  }

  return (
    <SignInClient
      authConfigured
      developmentAccessEnabled={developmentAccessEnabled}
      developmentAccessUsers={developmentAccessUsers}
      errorCode={getSearchParamValue(resolvedSearchParams.error)}
      nextPath={getSearchParamValue(resolvedSearchParams.next) ?? "/dashboard"}
      status={getSearchParamValue(resolvedSearchParams.status)}
    />
  );
}
