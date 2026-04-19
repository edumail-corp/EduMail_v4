"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { WorkspaceRole, WorkspaceUserStatus } from "@/lib/workspace-config";
import { requireWorkspaceRole } from "@/lib/server/workspace-auth";
import {
  createWorkspaceStaffUser,
  updateWorkspaceStaffUser,
} from "@/lib/server/workspace-staff-directory";

function getFormValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToAdmin(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();
  redirect(query.length > 0 ? `/dashboard/admin?${query}` : "/dashboard/admin");
}

export async function createWorkspaceStaffMemberAction(formData: FormData) {
  await requireWorkspaceRole("operations_admin");

  try {
    await createWorkspaceStaffUser({
      name: getFormValue(formData, "name"),
      email: getFormValue(formData, "email"),
      role: getFormValue(formData, "role") as WorkspaceRole,
      status: getFormValue(formData, "status") as WorkspaceUserStatus,
    });

    revalidatePath("/dashboard/admin");
    redirectToAdmin({ staffMessage: "member-created" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the staff member.";
    redirectToAdmin({ staffError: message });
  }
}

export async function updateWorkspaceStaffMemberAction(formData: FormData) {
  await requireWorkspaceRole("operations_admin");

  try {
    await updateWorkspaceStaffUser(getFormValue(formData, "userId"), {
      name: getFormValue(formData, "name"),
      email: getFormValue(formData, "email"),
      role: getFormValue(formData, "role") as WorkspaceRole,
      status: getFormValue(formData, "status") as WorkspaceUserStatus,
    });

    revalidatePath("/dashboard/admin");
    redirectToAdmin({ staffMessage: "member-updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the staff member.";
    redirectToAdmin({ staffError: message });
  }
}
