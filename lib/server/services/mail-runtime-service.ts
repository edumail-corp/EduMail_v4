import type { MailProvider, StaffEmail } from "@/lib/email-data";
import {
  getConfiguredInboxProvider,
  getConfiguredOutboundProvider,
  getMailRuntimeStatus,
  getMicrosoftGraphMailConfig,
} from "@/lib/server/mail-provider-config";
import {
  listMicrosoftGraphInboxMessages,
  sendMicrosoftGraphMail,
} from "@/lib/server/mail-providers/microsoft-graph";
import {
  getMailboxEmail,
  ingestMailboxEmail,
  updateMailboxEmail,
} from "@/lib/server/services/mailbox-service";
import type { AuthenticatedWorkspaceUser } from "@/lib/server/workspace-auth";

export type InboxSyncResult = {
  provider: MailProvider;
  live: boolean;
  processedCount: number;
  importedCount: number;
  duplicateCount: number;
  summary: string;
  importedEmailIds: string[];
};

export type SendMailboxReplyResult = {
  email: StaffEmail;
  provider: MailProvider;
  live: boolean;
  summary: string;
};

function getSenderEmailAddress(sender: string) {
  const matchedSender = /<(.*)>/.exec(sender);
  return matchedSender?.[1]?.trim().toLowerCase() || null;
}

export async function syncConfiguredInbox(): Promise<InboxSyncResult> {
  const provider = getConfiguredInboxProvider();
  const runtimeStatus = getMailRuntimeStatus();

  if (provider !== "microsoft_graph" || !runtimeStatus.hasLiveInboxSync) {
    return {
      provider,
      live: false,
      processedCount: 0,
      importedCount: 0,
      duplicateCount: 0,
      importedEmailIds: [],
      summary:
        "No live inbox provider is configured yet. Manual compose remains available.",
    };
  }

  const config = getMicrosoftGraphMailConfig();

  if (!config) {
    throw new Error(
      "Microsoft Graph inbox sync is selected, but the mailbox credentials are incomplete."
    );
  }

  const messages = await listMicrosoftGraphInboxMessages(config);
  let importedCount = 0;
  let duplicateCount = 0;
  const importedEmailIds: string[] = [];

  for (const message of messages) {
    const result = await ingestMailboxEmail({
      ...message,
      provider,
    });

    if (result.duplicate) {
      duplicateCount += 1;
      continue;
    }

    importedCount += 1;
    importedEmailIds.push(result.email.id);
  }

  return {
    provider,
    live: true,
    processedCount: messages.length,
    importedCount,
    duplicateCount,
    importedEmailIds,
    summary:
      importedCount > 0
        ? `Imported ${importedCount} new inbox message${importedCount === 1 ? "" : "s"} from Microsoft Graph.`
        : duplicateCount > 0
          ? "Microsoft Graph inbox sync found only messages that were already imported."
          : "Microsoft Graph inbox sync did not return any importable messages.",
  };
}

export async function sendMailboxReply(
  emailId: string,
  workspaceUser: AuthenticatedWorkspaceUser
): Promise<SendMailboxReplyResult> {
  const email = await getMailboxEmail(emailId);

  if (!email) {
    throw new Error("Email not found.");
  }

  if (!email.aiDraft || email.aiDraft.trim().length === 0) {
    throw new Error("This case does not have a reply draft yet.");
  }

  if (email.status === "Auto-sent") {
    throw new Error("This reply was already sent.");
  }

  const recipientEmail = getSenderEmailAddress(email.sender);

  if (!recipientEmail) {
    throw new Error("The recipient email address could not be parsed.");
  }

  const provider = getConfiguredOutboundProvider();
  const runtimeStatus = getMailRuntimeStatus();
  const live = provider === "microsoft_graph" && runtimeStatus.hasLiveOutboundSend;
  let providerMessageId: string | null = null;
  let sentAt = new Date().toISOString();

  if (live) {
    const config = getMicrosoftGraphMailConfig();

    if (!config) {
      throw new Error(
        "Microsoft Graph outbound mail is selected, but the mailbox credentials are incomplete."
      );
    }

    const delivery = await sendMicrosoftGraphMail(config, {
      to: recipientEmail,
      subject: email.subject,
      body: email.aiDraft,
    });

    providerMessageId = delivery.providerMessageId;
    sentAt = delivery.sentAt;
  }

  const updatedEmail = await updateMailboxEmail(email.id, {
    status: "Auto-sent",
    integration: {
      inboundProvider: email.integration?.inboundProvider ?? null,
      inboundMessageId: email.integration?.inboundMessageId ?? null,
      inboundConversationId: email.integration?.inboundConversationId ?? null,
      inboundSyncedAt: email.integration?.inboundSyncedAt ?? null,
      inboundReferenceUrl: email.integration?.inboundReferenceUrl ?? null,
      outboundProvider: live ? provider : "local",
      outboundMessageId: providerMessageId,
      outboundSentAt: sentAt,
    },
    assignee: email.assignee ?? workspaceUser.name,
  });

  if (!updatedEmail) {
    throw new Error("Reply send completed, but the mailbox record could not be updated.");
  }

  return {
    email: updatedEmail,
    provider: live ? provider : "local",
    live,
    summary: live
      ? `Reply sent to ${recipientEmail} through Microsoft Graph.`
      : `Reply marked as sent locally for ${recipientEmail}. Configure Microsoft Graph to deliver it outward.`,
  };
}
