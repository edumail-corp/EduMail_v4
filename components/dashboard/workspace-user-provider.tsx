"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { AuthenticatedWorkspaceUser } from "@/lib/server/workspace-auth";

const WorkspaceUserContext = createContext<AuthenticatedWorkspaceUser | null>(null);

export function WorkspaceUserProvider({
  currentUser,
  children,
}: Readonly<{
  currentUser: AuthenticatedWorkspaceUser;
  children: ReactNode;
}>) {
  return (
    <WorkspaceUserContext.Provider value={currentUser}>
      {children}
    </WorkspaceUserContext.Provider>
  );
}

export function useWorkspaceUser() {
  const currentUser = useContext(WorkspaceUserContext);

  if (!currentUser) {
    throw new Error("useWorkspaceUser must be used within a WorkspaceUserProvider.");
  }

  return currentUser;
}

