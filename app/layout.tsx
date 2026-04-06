import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
