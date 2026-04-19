import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireWorkspaceUser } from "@/lib/server/workspace-auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await requireWorkspaceUser();

  return <DashboardShell currentUser={currentUser}>{children}</DashboardShell>;
}
