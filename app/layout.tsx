import type { Metadata } from "next";
import type { ReactNode } from "react";
import { UserPreferencesProvider } from "@/components/dashboard/user-preferences-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EduMailAI",
    template: "%s | EduMailAI",
  },
  description:
    "EduMailAI is a university staff workspace for triaging inbound email, reviewing AI-generated drafts, and maintaining a searchable policy knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <UserPreferencesProvider>{children}</UserPreferencesProvider>
      </body>
    </html>
  );
}
