import {
  getEmailWorkflowHref,
  type MailProvider,
  type MailboxIntegration,
  type StaffEmail,
} from "@/lib/email-data";
import type { ActivityAction } from "@/lib/activity-log";
import { getActivityAdapter } from "@/lib/server/adapters";
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

const activityAdapter = getActivityAdapter();
const inboxSyncEntityId = "workspace-inbox";
const inboxSyncActivityLimit = 120;

export type InboxSyncResult = {
  provider: MailProvider;
  live: boolean;
  processedCount: number;
  importedCount: number;
  duplicateCount: number;
  summary: string;
  importedEmailIds: string[];
  completedAt: string;
};

export type InboxSyncStatus = {
  provider: MailProvider;
  live: boolean;
  lastAttempt: {
    attemptedAt: string;
    status: "success" | "failed";
    title: string;
    summary: string;
  } | null;
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

function getInboxSyncActivityAction(success: boolean): ActivityAction {
  return success ? "inbox_sync_completed" : "inbox_sync_failed";
}

function isInboxSyncActivityAction(
  action: ActivityAction
): action is "inbox_sync_completed" | "inbox_sync_failed" {
  return action === "inbox_sync_completed" || action === "inbox_sync_failed";
}

function getInboxProviderLabel(provider: MailProvider, live: boolean) {
  if (provider === "microsoft_graph") {
    return live ? "Microsoft Graph inbox sync" : "Microsoft Graph mailbox sync";
  }

  return live ? "Live inbox sync" : "Inbox sync";
}

function getOutboundProviderLabel(provider: MailProvider, live: boolean) {
  if (provider === "microsoft_graph") {
    return live ? "Microsoft Graph outbound delivery" : "Microsoft Graph send";
  }

  return live ? "Live outbound delivery" : "Local outbound delivery";
}

function buildMailboxIntegrationState(
  email: StaffEmail,
  overrides?: Partial<MailboxIntegration>
): MailboxIntegration {
  return {
    inboundProvider: email.integration?.inboundProvider ?? null,
    inboundMessageId: email.integration?.inboundMessageId ?? null,
    inboundConversationId: email.integration?.inboundConversationId ?? null,
    inboundSyncedAt: email.integration?.inboundSyncedAt ?? null,
    inboundReferenceUrl: email.integration?.inboundReferenceUrl ?? null,
    outboundProvider: email.integration?.outboundProvider ?? null,
    outboundMessageId: email.integration?.outboundMessageId ?? null,
    outboundSentAt: email.integration?.outboundSentAt ?? null,
    outboundAttemptCount: email.integration?.outboundAttemptCount ?? 0,
    outboundLastAttemptAt: email.integration?.outboundLastAttemptAt ?? null,
    outboundLastError: email.integration?.outboundLastError ?? null,
    outboundLastStatus: email.integration?.outboundLastStatus ?? null,
    ...overrides,
  };
}

async function appendInboxSyncActivityEvent(input: {
  success: boolean;
  provider: MailProvider;
  live: boolean;
  summary: string;
}) {
  try {
    await activityAdapter.appendEvent({
      action: getInboxSyncActivityAction(input.success),
      entityType: "inbox",
      entityId: inboxSyncEntityId,
      title: input.success
        ? `${getInboxProviderLabel(input.provider, input.live)} completed`
        : `${getInboxProviderLabel(input.provider, input.live)} failed`,
      description: input.summary,
      href: "/dashboard/inbox",
    });
  } catch (error) {
    console.error("Failed to append inbox sync activity event.", error);
  }
}

async function appendSendFailureActivityEvent(input: {
  email: StaffEmail;
  provider: MailProvider;
  live: boolean;
  summary: string;
}) {
  try {
    await activityAdapter.appendEvent({
      action: "email_send_failed",
      entityType: "email",
      entityId: input.email.id,
      title: `${getOutboundProviderLabel(input.provider, input.live)} failed`,
      description: input.summary,
      href: getEmailWorkflowHref(input.email),
    });
  } catch (error) {
    console.error("Failed to append outbound send failure activity event.", error);
  }
}

export async function getInboxSyncStatus(): Promise<InboxSyncStatus> {
  const runtimeStatus = getMailRuntimeStatus();
  const events = await activityAdapter.listEvents(inboxSyncActivityLimit);
  const latestEvent =
    events.find(
      (event) =>
        event.entityType === "inbox" &&
        event.entityId === inboxSyncEntityId &&
        isInboxSyncActivityAction(event.action)
    ) ?? null;

  return {
    provider: runtimeStatus.inboxProvider,
    live: runtimeStatus.hasLiveInboxSync,
    lastAttempt: latestEvent
      ? {
          attemptedAt: latestEvent.timestamp,
          status:
            latestEvent.action === "inbox_sync_failed" ? "failed" : "success",
          title: latestEvent.title,
          summary: latestEvent.description,
        }
      : null,
  };
}

export async function syncConfiguredInbox(): Promise<InboxSyncResult> {
  const provider = getConfiguredInboxProvider();
  const runtimeStatus = getMailRuntimeStatus();

  try {
    if (provider !== "microsoft_graph" || !runtimeStatus.hasLiveInboxSync) {
      const result: InboxSyncResult = {
        provider,
        live: false,
        processedCount: 0,
        importedCount: 0,
        duplicateCount: 0,
        importedEmailIds: [],
        summary:
          "No live inbox provider is configured yet. Manual compose remains available.",
        completedAt: new Date().toISOString(),
      };

      await appendInboxSyncActivityEvent({
        success: true,
        provider: result.provider,
        live: result.live,
        summary: result.summary,
      });

      return result;
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

    const result: InboxSyncResult = {
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
      completedAt: new Date().toISOString(),
    };

    await appendInboxSyncActivityEvent({
      success: true,
      provider: result.provider,
      live: result.live,
      summary: result.summary,
    });

    return result;
  } catch (error) {
    await appendInboxSyncActivityEvent({
      success: false,
      provider,
      live: runtimeStatus.hasLiveInboxSync,
      summary:
        error instanceof Error ? error.message : "Unable to sync the inbox.",
    });

    throw error;
  }
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
  const attemptedAt = new Date().toISOString();
  const attemptCount = (email.integration?.outboundAttemptCount ?? 0) + 1;
  let providerMessageId: string | null = null;
  let sentAt = attemptedAt;

  try {
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
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unable to send the reply.";

    await updateMailboxEmail(email.id, {
      integration: buildMailboxIntegrationState(email, {
        outboundAttemptCount: attemptCount,
        outboundLastAttemptAt: attemptedAt,
        outboundLastError: errorMessage,
        outboundLastStatus: "failed",
      }),
    }).catch(() => null);

    await appendSendFailureActivityEvent({
      email,
      provider,
      live,
      summary: `Attempt ${attemptCount} to send the reply to ${recipientEmail} failed. ${errorMessage}`,
    });

    throw error;
  }

  const updatedEmail = await updateMailboxEmail(email.id, {
    status: "Auto-sent",
    integration: buildMailboxIntegrationState(email, {
      outboundProvider: live ? provider : "local",
      outboundMessageId: providerMessageId,
      outboundSentAt: sentAt,
      outboundAttemptCount: attemptCount,
      outboundLastAttemptAt: attemptedAt,
      outboundLastError: null,
      outboundLastStatus: "sent",
    }),
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
