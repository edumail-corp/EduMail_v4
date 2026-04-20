import { InboxWithTabs } from "./inbox-with-tabs";
import { getMailRuntimeStatus } from "@/lib/server/mail-provider-config";
import { listActiveWorkspaceStaffAssignees } from "@/lib/server/workspace-staff-directory";

export default async function InboxPage() {
  const [staffAssigneeOptions, mailRuntimeStatus] = await Promise.all([
    listActiveWorkspaceStaffAssignees(),
    getMailRuntimeStatus(),
  ]);

  return (
    <InboxWithTabs
      staffAssigneeOptions={staffAssigneeOptions}
      canSyncInbox={mailRuntimeStatus.hasLiveInboxSync}
    />
  );
}
