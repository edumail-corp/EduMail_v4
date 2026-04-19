import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredSupabaseAuth } from "@/lib/supabase-auth";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const authConfig = getConfiguredSupabaseAuth();

  if (!authConfig) {
    return response;
  }

  const supabase = createServerClient(
    authConfig.projectUrl,
    authConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/sign-in", "/auth/callback"],
};
