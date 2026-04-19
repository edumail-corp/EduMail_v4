import { InboxWithTabs } from "./inbox-with-tabs";
import { listActiveWorkspaceStaffAssignees } from "@/lib/server/workspace-staff-directory";

export default async function InboxPage() {
  const staffAssigneeOptions = await listActiveWorkspaceStaffAssignees();

  return <InboxWithTabs staffAssigneeOptions={staffAssigneeOptions} />;
}
