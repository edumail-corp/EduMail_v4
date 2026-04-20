"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { WorkspaceRole, WorkspaceUserStatus } from "@/lib/workspace-config";
import { requireWorkspaceRole } from "@/lib/server/workspace-auth";
import {
  createWorkspaceStaffUser,
  deleteWorkspaceStaffUser,
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

function revalidateWorkspaceMembershipPages() {
  revalidatePath("/dashboard/admin");
  revalidatePath("/sign-in");
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

    revalidateWorkspaceMembershipPages();
    redirectToAdmin({ staffMessage: "member-created" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the staff member.";
    redirectToAdmin({ staffError: message });
  }
}

export async function updateWorkspaceStaffMemberAction(formData: FormData) {
  const currentUser = await requireWorkspaceRole("operations_admin");
  const userId = getFormValue(formData, "userId");
  const email = getFormValue(formData, "email");
  const role = getFormValue(formData, "role") as WorkspaceRole;
  const status = getFormValue(formData, "status") as WorkspaceUserStatus;

  try {
    if (
      userId === currentUser.id &&
      email.toLowerCase() !== currentUser.email.toLowerCase()
    ) {
      throw new Error(
        "Sign in as another active admin before changing the email on your current admin account."
      );
    }

    if (
      userId === currentUser.id &&
      (role !== "operations_admin" || status !== "active")
    ) {
      throw new Error(
        "Sign in as another active admin before removing admin access from your current account."
      );
    }

    await updateWorkspaceStaffUser(userId, {
      name: getFormValue(formData, "name"),
      email,
      role,
      status,
    });

    revalidateWorkspaceMembershipPages();
    redirectToAdmin({ staffMessage: "member-updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the staff member.";
    redirectToAdmin({ staffError: message });
  }
}

export async function deleteWorkspaceStaffMemberAction(formData: FormData) {
  const currentUser = await requireWorkspaceRole("operations_admin");
  const userId = getFormValue(formData, "userId");

  try {
    if (userId === currentUser.id) {
      throw new Error(
        "Sign in as another active admin before removing your current admin account."
      );
    }

    await deleteWorkspaceStaffUser(userId);
    revalidateWorkspaceMembershipPages();
    redirectToAdmin({ staffMessage: "member-deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete the staff member.";
    redirectToAdmin({ staffError: message });
  }
}
