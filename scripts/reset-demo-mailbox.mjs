import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { Pool } from "pg";
import ts from "typescript";

const projectRoot = process.cwd();
const mailboxOrderPath = path.join(projectRoot, "data", "mailbox-cases.json");
const emailDataPath = path.join(projectRoot, "lib", "email-data.ts");

function parseEnvLine(line) {
  const trimmedLine = line.trim();

  if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  let value = trimmedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key.length > 0 ? [key, value] : null;
}

async function loadEnvFile(fileName) {
  try {
    const source = await readFile(path.join(projectRoot, fileName), "utf8");

    for (const line of source.split(/\r?\n/)) {
      const parsedLine = parseEnvLine(line);

      if (!parsedLine) {
        continue;
      }

      const [key, value] = parsedLine;
      process.env[key] ??= value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function loadLocalEnv() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");
}

async function loadSeedEmails() {
  const source = await readFile(emailDataPath, "utf8");
  const compiledSource = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiledSource, {
    console,
    exports: module.exports,
    module,
    require(name) {
      throw new Error(`Unexpected runtime import while loading seed emails: ${name}`);
    },
  });

  if (typeof module.exports.getInitialStaffEmails !== "function") {
    throw new Error("Could not load getInitialStaffEmails from lib/email-data.ts.");
  }

  return module.exports.getInitialStaffEmails();
}

async function loadOrderedSeedEmails() {
  const [seedEmails, mailboxOrderSource] = await Promise.all([
    loadSeedEmails(),
    readFile(mailboxOrderPath, "utf8"),
  ]);
  const emailsById = new Map(seedEmails.map((email) => [email.id, email]));
  const orderedIds = JSON.parse(mailboxOrderSource).map((record) => record.id);
  const missingIds = orderedIds.filter((id) => !emailsById.has(id));

  if (missingIds.length > 0) {
    throw new Error(`Mailbox order references unknown seed IDs: ${missingIds.join(", ")}`);
  }

  return orderedIds.map((id) => emailsById.get(id));
}

function getConfidenceLabel(score) {
  if (score >= 85) {
    return "High";
  }

  if (score >= 65) {
    return "Medium";
  }

  return "Low";
}

function getSuggestedAssignees(department) {
  switch (department) {
    case "Admissions":
      return ["Ava Patel"];
    case "Finance":
      return ["Noah Kim"];
    case "Registrar":
      return ["Priya Shah", "Jordan Lee"];
    case "Academic":
      return ["Jordan Lee", "Priya Shah"];
    default:
      return ["Ava Patel"];
  }
}

function getApprovalState(email) {
  if (email.approvalState) {
    return email.approvalState;
  }

  if (email.status === "Auto-sent") {
    return "Approved";
  }

  if (email.status === "Escalated") {
    return "Escalated";
  }

  return email.aiDraft ? "Needs Review" : "Awaiting Draft";
}

function buildRoutingDecision(email) {
  const department = email.department ?? email.category;
  const escalationReason =
    email.manualReviewReason ??
    (email.status === "Escalated"
      ? "Manual review is required before this reply can be approved."
      : null);

  return {
    department,
    confidence: getConfidenceLabel(email.confidence),
    confidenceScore: email.confidence,
    reason: escalationReason
      ? `${department} signals matched, but the case needs human review before a final response.`
      : `${department} signals matched the current university operations queue.`,
    routingReasons: [
      {
        code: email.status === "Escalated" ? "escalation_signal_detected" : "selected_category_match",
        signal: email.category,
      },
    ],
    signals: [
      email.category,
      department,
      email.priority,
      email.source ?? "No source attached",
    ],
    escalationReason,
    suggestedAssignees: getSuggestedAssignees(department),
  };
}

function toMailboxCaseRecord(email) {
  const department = email.department ?? email.category;

  return {
    id: email.id,
    message: {
      sender: email.sender,
      subject: email.subject,
      body: email.body,
      receivedAt: email.receivedAt,
      threadHistory: email.threadHistory ?? [],
      sourceCitations: email.sourceCitations ?? [],
    },
    workflow: {
      category: email.category,
      department,
      caseOrigin: email.caseOrigin ?? "Email intake",
      routingDecision: email.routingDecision ?? buildRoutingDecision(email),
      approvalState: getApprovalState(email),
      priority: email.priority,
      status: email.status,
      assignee: email.assignee ?? null,
      lastUpdatedAt: email.lastUpdatedAt,
    },
    response: {
      confidence: email.confidence,
      aiDraft: email.aiDraft ?? null,
      staffNote: email.staffNote ?? null,
      source: email.source ?? null,
      summary: email.summary,
      manualReviewReason: email.manualReviewReason ?? null,
    },
    integration: email.integration ?? null,
  };
}

function getConfiguredSSL(connectionString) {
  const configuredSSLMode =
    process.env.EDUMAILAI_DATABASE_SSL_MODE?.trim().toLowerCase() ?? "";

  if (configuredSSLMode === "disable") {
    return false;
  }

  try {
    const hostname = new URL(connectionString).hostname.toLowerCase();

    if (
      configuredSSLMode === "require" ||
      hostname.includes("supabase.co") ||
      hostname.includes("supabase.com") ||
      hostname.includes("supabase.net")
    ) {
      return { rejectUnauthorized: false };
    }
  } catch {
    if (configuredSSLMode === "require") {
      return { rejectUnauthorized: false };
    }
  }

  return undefined;
}

async function resetPostgresMailbox(records) {
  const connectionString = process.env.EDUMAILAI_DATABASE_URL;

  if (!connectionString) {
    throw new Error("EDUMAILAI_DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString,
    ssl: getConfiguredSSL(connectionString),
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM mailbox_cases");

    for (const record of records) {
      await client.query(
        `
          INSERT INTO mailbox_cases (
            id,
            sender,
            subject,
            body,
            received_at,
            thread_history_json,
            source_citations_json,
            category,
            department,
            case_origin,
            routing_decision_json,
            approval_state,
            priority,
            status,
            assignee,
            last_updated_at,
            confidence,
            ai_draft,
            staff_note,
            source,
            summary,
            manual_review_reason,
            integration_json
          ) VALUES (
            $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb,
            $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb
          )
        `,
        [
          record.id,
          record.message.sender,
          record.message.subject,
          record.message.body,
          record.message.receivedAt,
          JSON.stringify(record.message.threadHistory),
          JSON.stringify(record.message.sourceCitations),
          record.workflow.category,
          record.workflow.department,
          record.workflow.caseOrigin,
          JSON.stringify(record.workflow.routingDecision),
          record.workflow.approvalState,
          record.workflow.priority,
          record.workflow.status,
          record.workflow.assignee,
          record.workflow.lastUpdatedAt,
          record.response.confidence,
          record.response.aiDraft,
          record.response.staffNote,
          record.response.source,
          record.response.summary,
          record.response.manualReviewReason,
          JSON.stringify(record.integration),
        ]
      );
    }

    const verificationResult = await client.query(
      `
        SELECT id, subject
        FROM mailbox_cases
        ORDER BY received_at DESC, id DESC
        LIMIT 1
      `
    );

    await client.query("COMMIT");

    return verificationResult.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await loadLocalEnv();

const orderedEmails = await loadOrderedSeedEmails();
const records = orderedEmails.map(toMailboxCaseRecord);
const firstCase = await resetPostgresMailbox(records);

console.log(
  `Reset database mailbox to ${records.length} demo cases. First inbox case: ${firstCase?.subject ?? "none"}.`
);
