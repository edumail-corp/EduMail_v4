import { redirect } from "next/navigation";
import { SignInClient } from "./sign-in-client";
import { getCurrentWorkspaceUser } from "@/lib/server/workspace-auth";
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
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (!authConfigured) {
    return (
      <SignInClient
        authConfigured={false}
        errorCode={getSearchParamValue(resolvedSearchParams.error)}
        nextPath={getSearchParamValue(resolvedSearchParams.next) ?? "/dashboard"}
        status={getSearchParamValue(resolvedSearchParams.status)}
      />
    );
  }

  const currentUser = await getCurrentWorkspaceUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <SignInClient
      authConfigured
      errorCode={getSearchParamValue(resolvedSearchParams.error)}
      nextPath={getSearchParamValue(resolvedSearchParams.next) ?? "/dashboard"}
      status={getSearchParamValue(resolvedSearchParams.status)}
    />
  );
}
