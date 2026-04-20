import type { MailProvider } from "@/lib/email-data";

export type MicrosoftGraphMailConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailboxUser: string;
  syncBatchSize: number;
};

export type MailRuntimeStatus = {
  inboxProvider: MailProvider;
  outboundProvider: MailProvider;
  hasLiveInboxSync: boolean;
  hasLiveOutboundSend: boolean;
};

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeProvider(value: string | undefined): MailProvider {
  const normalized = normalizeEnvValue(value)?.toLowerCase();
  return normalized === "microsoft_graph" ? "microsoft_graph" : "local";
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function getConfiguredInboxProvider() {
  return normalizeProvider(process.env.EDUMAILAI_INBOX_PROVIDER);
}

export function getConfiguredOutboundProvider() {
  return normalizeProvider(process.env.EDUMAILAI_OUTBOUND_PROVIDER);
}

export function getMicrosoftGraphMailConfig(): MicrosoftGraphMailConfig | null {
  const tenantId = normalizeEnvValue(process.env.EDUMAILAI_MICROSOFT_TENANT_ID);
  const clientId = normalizeEnvValue(process.env.EDUMAILAI_MICROSOFT_CLIENT_ID);
  const clientSecret = normalizeEnvValue(
    process.env.EDUMAILAI_MICROSOFT_CLIENT_SECRET
  );
  const mailboxUser = normalizeEnvValue(
    process.env.EDUMAILAI_MICROSOFT_MAILBOX_USER
  );

  if (!tenantId || !clientId || !clientSecret || !mailboxUser) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    mailboxUser,
    syncBatchSize: parsePositiveInteger(
      process.env.EDUMAILAI_MICROSOFT_SYNC_BATCH_SIZE,
      25
    ),
  };
}

export function hasConfiguredMicrosoftGraphMail() {
  return getMicrosoftGraphMailConfig() !== null;
}

export function getMailRuntimeStatus(): MailRuntimeStatus {
  const inboxProvider = getConfiguredInboxProvider();
  const outboundProvider = getConfiguredOutboundProvider();
  const hasGraphMail = hasConfiguredMicrosoftGraphMail();

  return {
    inboxProvider,
    outboundProvider,
    hasLiveInboxSync:
      inboxProvider === "microsoft_graph" && hasGraphMail,
    hasLiveOutboundSend:
      outboundProvider === "microsoft_graph" && hasGraphMail,
  };
}
