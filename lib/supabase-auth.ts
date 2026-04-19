function normalizeEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export type SupabaseAuthConfig = {
  projectUrl: string;
  anonKey: string;
};

export function getConfiguredSupabaseAuth() {
  const projectUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!projectUrl || !anonKey) {
    return null;
  }

  return {
    projectUrl,
    anonKey,
  } satisfies SupabaseAuthConfig;
}

export function hasConfiguredSupabaseAuth() {
  return getConfiguredSupabaseAuth() !== null;
}

export function getRequiredSupabaseAuthConfig() {
  const config = getConfiguredSupabaseAuth();

  if (!config) {
    throw new Error(
      "Supabase Auth requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return config;
}

