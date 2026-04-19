"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequiredSupabaseAuthConfig } from "@/lib/supabase-auth";

let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const config = getRequiredSupabaseAuthConfig();
  cachedBrowserClient = createBrowserClient(config.projectUrl, config.anonKey);
  return cachedBrowserClient;
}

