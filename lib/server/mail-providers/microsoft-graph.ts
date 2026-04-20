import type { MicrosoftGraphMailConfig } from "@/lib/server/mail-provider-config";

type MicrosoftGraphMessage = {
  id: string;
  internetMessageId?: string | null;
  conversationId?: string | null;
  subject?: string | null;
  receivedDateTime?: string | null;
  webLink?: string | null;
  bodyPreview?: string | null;
  body?: {
    contentType?: string | null;
    content?: string | null;
  } | null;
  from?: {
    emailAddress?: {
      name?: string | null;
      address?: string | null;
    } | null;
  } | null;
};

type MicrosoftGraphListResponse = {
  value?: MicrosoftGraphMessage[];
};

type MicrosoftGraphTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type MicrosoftGraphInboundMessage = {
  externalMessageId: string;
  externalConversationId: string | null;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  referenceUrl: string | null;
};

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedAccessToken: CachedAccessToken | null = null;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToPlainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/tr)>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<\/h\d>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function normalizeMessageBody(message: MicrosoftGraphMessage) {
  const rawBody = message.body?.content?.trim();

  if (rawBody && message.body?.contentType?.toLowerCase() === "html") {
    return htmlToPlainText(rawBody);
  }

  if (rawBody) {
    return rawBody;
  }

  return message.bodyPreview?.trim() || "";
}

function buildGraphApiUrl(pathname: string) {
  return new URL(pathname, "https://graph.microsoft.com/v1.0/");
}

async function getAccessToken(config: MicrosoftGraphMailConfig) {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > now) {
    return cachedAccessToken.accessToken;
  }

  const tokenUrl = new URL(
    `/` +
      `${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    "https://login.microsoftonline.com"
  );
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | MicrosoftGraphTokenResponse
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Microsoft Graph token exchange failed."
    );
  }

  cachedAccessToken = {
    accessToken: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
  };

  return cachedAccessToken.accessToken;
}

async function fetchMicrosoftGraphJson<T>(
  config: MicrosoftGraphMailConfig,
  input: URL | string,
  init?: RequestInit
) {
  const accessToken = await getAccessToken(config);
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText || `Microsoft Graph request failed with ${response.status}.`
    );
  }

  if (response.status === 204 || response.status === 202) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function listMicrosoftGraphInboxMessages(
  config: MicrosoftGraphMailConfig
) {
  const url = buildGraphApiUrl(
    `users/${encodeURIComponent(config.mailboxUser)}/mailFolders/inbox/messages`
  );
  url.searchParams.set("$top", String(config.syncBatchSize));
  url.searchParams.set("$orderby", "receivedDateTime DESC");
  url.searchParams.set(
    "$select",
    [
      "id",
      "internetMessageId",
      "conversationId",
      "subject",
      "receivedDateTime",
      "webLink",
      "bodyPreview",
      "body",
      "from",
    ].join(",")
  );

  const payload = await fetchMicrosoftGraphJson<MicrosoftGraphListResponse>(
    config,
    url
  );
  const messages = payload?.value ?? [];

  return messages
    .map((message): MicrosoftGraphInboundMessage | null => {
      const senderEmail = message.from?.emailAddress?.address?.trim().toLowerCase() ?? "";
      const senderName =
        message.from?.emailAddress?.name?.trim() ||
        senderEmail ||
        "Unknown sender";
      const subject = message.subject?.trim() || "(no subject)";
      const body = normalizeMessageBody(message);

      if (!senderEmail || body.length === 0) {
        return null;
      }

      return {
        externalMessageId:
          message.internetMessageId?.trim() || message.id,
        externalConversationId: message.conversationId?.trim() || null,
        senderName,
        senderEmail,
        subject,
        body,
        receivedAt: message.receivedDateTime?.trim() || new Date().toISOString(),
        referenceUrl: message.webLink?.trim() || null,
      };
    })
    .filter((message): message is MicrosoftGraphInboundMessage => message !== null);
}

function ensureReplySubject(subject: string) {
  return /^re:/i.test(subject.trim()) ? subject.trim() : `RE: ${subject.trim()}`;
}

export async function sendMicrosoftGraphMail(
  config: MicrosoftGraphMailConfig,
  input: {
    to: string;
    subject: string;
    body: string;
  }
) {
  const url = buildGraphApiUrl(
    `users/${encodeURIComponent(config.mailboxUser)}/sendMail`
  );
  const sentAt = new Date().toISOString();

  await fetchMicrosoftGraphJson(
    config,
    url,
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          subject: ensureReplySubject(input.subject),
          body: {
            contentType: "Text",
            content: input.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: input.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  );

  return {
    providerMessageId: null,
    sentAt,
  };
}
