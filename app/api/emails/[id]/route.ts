import { NextResponse } from "next/server";
import {
  isEmailStatus,
  isStaffAssignee,
  type StaffEmailUpdateInput,
} from "@/lib/email-data";
import { updateMailboxEmail } from "@/lib/server/services/mailbox-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEmailUpdatePayload(value: unknown): value is StaffEmailUpdateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StaffEmailUpdateInput>;
  const hasStatus = typeof candidate.status === "string";
  const hasAssignee =
    typeof candidate.assignee === "string" || candidate.assignee === null;
  const hasDraft = typeof candidate.aiDraft === "string";
  const hasNote =
    typeof candidate.staffNote === "string" || candidate.staffNote === null;

  if (!hasStatus && !hasAssignee && !hasDraft && !hasNote) {
    return false;
  }

  if (hasStatus) {
    const status = candidate.status;

    if (typeof status !== "string" || !isEmailStatus(status)) {
      return false;
    }
  }

  if (hasAssignee) {
    const assignee = candidate.assignee;

    if (typeof assignee === "string" && !isStaffAssignee(assignee)) {
      return false;
    }
  }

  if (hasDraft) {
    const aiDraft = candidate.aiDraft;

    if (typeof aiDraft !== "string" || aiDraft.trim().length === 0) {
      return false;
    }
  }

  return true;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const payload = await request.json().catch(() => null);

  if (!isEmailUpdatePayload(payload)) {
    return NextResponse.json(
      { error: "Invalid email update payload." },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const email = await updateMailboxEmail(id, {
    ...(typeof payload.status === "string" ? { status: payload.status } : {}),
    ...("assignee" in payload ? { assignee: payload.assignee ?? null } : {}),
    ...(typeof payload.aiDraft === "string"
      ? { aiDraft: payload.aiDraft.trim() }
      : {}),
    ...("staffNote" in payload
      ? {
          staffNote:
            typeof payload.staffNote === "string"
              ? payload.staffNote.trim() || null
              : null,
        }
      : {}),
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found." }, { status: 404 });
  }

  return NextResponse.json({ email });
}
