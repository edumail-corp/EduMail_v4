import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import nextEnv from "@next/env";

const projectRoot = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectRoot);

const nextCliPath = path.join(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

const defaultPort = 3200 + Math.floor(Math.random() * 400);
const port = Number(process.env.EDUMAILAI_VERIFY_PORT ?? String(defaultPort));
const baseUrl = `http://127.0.0.1:${port}`;
const logBuffer = [];
const tempRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "edumailai-kb-verify-")
);
const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");

let serverProcess = null;

function appendLog(source, chunk) {
  const lines = chunk
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) {
    logBuffer.push(`[${source}] ${line}`);
  }

  if (logBuffer.length > 200) {
    logBuffer.splice(0, logBuffer.length - 200);
  }

  if (process.env.EDUMAILAI_VERIFY_VERBOSE === "1") {
    process.stdout.write(chunk);
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function describeDatabaseVerificationTarget() {
  const usesDatabaseAdapter = [
    process.env.EDUMAILAI_MAILBOX_ADAPTER,
    process.env.EDUMAILAI_KNOWLEDGE_BASE_ADAPTER,
    process.env.EDUMAILAI_ACTIVITY_ADAPTER,
  ].some((value) => value?.trim().toLowerCase() === "database");

  if (!usesDatabaseAdapter) {
    return null;
  }

  const configuredUrl = process.env.EDUMAILAI_DATABASE_URL?.trim();

  if (!configuredUrl) {
    return {
      driver: "missing",
      source: process.env.EDUMAILAI_VERIFY_DATABASE_SOURCE ?? "unset",
      target: null,
    };
  }

  if (/^postgres(ql)?:/i.test(configuredUrl)) {
    try {
      const parsedUrl = new URL(configuredUrl);
      const databaseName = parsedUrl.pathname.replace(/^\/+/, "") || "postgres";

      return {
        driver: "postgres",
        source: process.env.EDUMAILAI_VERIFY_DATABASE_SOURCE ?? "configured",
        target: `${parsedUrl.hostname}${
          parsedUrl.port ? `:${parsedUrl.port}` : ""
        }/${databaseName}`,
      };
    } catch {
      return {
        driver: "postgres",
        source: process.env.EDUMAILAI_VERIFY_DATABASE_SOURCE ?? "configured",
        target: "unparseable-postgres-url",
      };
    }
  }

  return {
    driver: "sqlite",
    source: process.env.EDUMAILAI_VERIFY_DATABASE_SOURCE ?? "configured",
    target: configuredUrl.startsWith("sqlite:")
      ? configuredUrl.slice("sqlite:".length).replace(/^\/\//, "")
      : configuredUrl,
  };
}

async function hasBuildOutput() {
  try {
    await fs.access(buildIdPath);
    return true;
  } catch {
    return false;
  }
}

async function waitForServerReady(url) {
  const startedAt = Date.now();
  const timeoutMs = 45_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(
        `Verification server exited early with code ${serverProcess.exitCode}.`
      );
    }

    try {
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url} to become ready.`);
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => "");
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const body = await readResponseBody(response);

  return {
    response,
    body,
  };
}

async function cleanupCreatedDocument(documentId) {
  if (!documentId) {
    return;
  }

  try {
    await fetch(`${baseUrl}/api/knowledge-base/documents/${documentId}`, {
      method: "DELETE",
    });
  } catch {
    // Best-effort cleanup only.
  }
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill("SIGTERM");

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
      resolve();
    }, 10_000);

    serverProcess.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function main() {
  const serverMode =
    process.env.EDUMAILAI_VERIFY_SERVER_MODE ??
    ((await hasBuildOutput()) ? "start" : "dev");
  const serverArgs =
    serverMode === "start"
      ? [nextCliPath, "start", "--hostname", "127.0.0.1", "--port", String(port)]
      : [
          nextCliPath,
          "dev",
          "--webpack",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ];

  const serverEnv = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    TMPDIR: tempRoot,
    VERCEL: process.env.VERCEL ?? "1",
  };

  serverProcess = spawn(process.execPath, serverArgs, {
    cwd: projectRoot,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (chunk) => appendLog("server", chunk));
  serverProcess.stderr?.on("data", (chunk) => appendLog("server", chunk));

  let createdDocumentId = null;

  try {
    await waitForServerReady(`${baseUrl}/api/knowledge-base/documents`);

    const initialList = await requestJson(`${baseUrl}/api/knowledge-base/documents`, {
      cache: "no-store",
    });
    assertCondition(
      initialList.response.ok &&
        initialList.body &&
        typeof initialList.body === "object" &&
        Array.isArray(initialList.body.documents),
      "Initial knowledge-base list request did not return a documents array."
    );

    const initialDocuments = initialList.body.documents;
    const seededDocuments = initialDocuments.filter(
      (document) => document && document.origin === "seeded"
    );
    const seededMetadataOnlyCount = seededDocuments.filter(
      (document) =>
        typeof document.downloadUrl !== "string" &&
        !document.storageProvider &&
        !document.storagePath
    ).length;

    if (seededDocuments.length > 0) {
      assertCondition(
        seededMetadataOnlyCount > 0,
        "Expected seeded knowledge-base documents to remain metadata-only."
      );
    }

    const fileName = `kb-verify-${Date.now()}.pdf`;
    const fileContents = Buffer.from(
      `%PDF-1.4\n% EduMailAI verify ${new Date().toISOString()}\n`
    );
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([fileContents], { type: "application/pdf" }),
      fileName
    );
    formData.append("category", "Admissions");

    const createResult = await requestJson(`${baseUrl}/api/knowledge-base/documents`, {
      method: "POST",
      body: formData,
    });

    assertCondition(
      createResult.response.status === 201 &&
        createResult.body &&
        typeof createResult.body === "object" &&
        createResult.body.document,
      `Knowledge-base upload failed: ${
        typeof createResult.body === "object" && createResult.body?.error
          ? createResult.body.error
          : createResult.response.statusText
      }`
    );

    const createdDocument = createResult.body.document;
    createdDocumentId = createdDocument.id;

    assertCondition(
      createdDocument.origin === "uploaded",
      "Uploaded knowledge-base document did not return origin=uploaded."
    );
    assertCondition(
      typeof createdDocument.downloadUrl === "string" &&
        createdDocument.downloadUrl.includes(createdDocument.id),
      "Uploaded knowledge-base document did not expose a download URL."
    );
    assertCondition(
      typeof createdDocument.storageProvider === "string" &&
        createdDocument.storageProvider.length > 0,
      "Uploaded knowledge-base document did not expose storageProvider."
    );
    assertCondition(
      typeof createdDocument.storagePath === "string" &&
        createdDocument.storagePath.length > 0,
      "Uploaded knowledge-base document did not expose storagePath."
    );

    const afterCreateList = await requestJson(
      `${baseUrl}/api/knowledge-base/documents`,
      { cache: "no-store" }
    );
    assertCondition(
      afterCreateList.response.ok &&
        afterCreateList.body &&
        typeof afterCreateList.body === "object" &&
        Array.isArray(afterCreateList.body.documents),
      "Knowledge-base list after upload did not return a documents array."
    );

    const persistedDocument = afterCreateList.body.documents.find(
      (document) => document.id === createdDocument.id
    );
    assertCondition(
      Boolean(persistedDocument),
      "Uploaded knowledge-base document was not present in the next list response."
    );
    assertCondition(
      persistedDocument.storageProvider === createdDocument.storageProvider,
      "Uploaded knowledge-base document changed storageProvider after reload."
    );
    assertCondition(
      persistedDocument.storagePath === createdDocument.storagePath,
      "Uploaded knowledge-base document changed storagePath after reload."
    );

    const downloadResult = await fetch(
      `${baseUrl}/api/knowledge-base/documents/${createdDocument.id}/file`,
      {
        cache: "no-store",
      }
    );
    assertCondition(
      downloadResult.ok,
      `Knowledge-base download failed with status ${downloadResult.status}.`
    );

    const downloadedBuffer = Buffer.from(await downloadResult.arrayBuffer());
    assertCondition(
      downloadedBuffer.equals(fileContents),
      "Downloaded knowledge-base file did not match the uploaded bytes."
    );

    const deleteResult = await fetch(
      `${baseUrl}/api/knowledge-base/documents/${createdDocument.id}`,
      {
        method: "DELETE",
      }
    );
    assertCondition(
      deleteResult.status === 204,
      `Knowledge-base delete failed with status ${deleteResult.status}.`
    );

    createdDocumentId = null;

    const afterDeleteList = await requestJson(
      `${baseUrl}/api/knowledge-base/documents`,
      { cache: "no-store" }
    );
    assertCondition(
      afterDeleteList.response.ok &&
        afterDeleteList.body &&
        typeof afterDeleteList.body === "object" &&
        Array.isArray(afterDeleteList.body.documents),
      "Knowledge-base list after delete did not return a documents array."
    );
    assertCondition(
      !afterDeleteList.body.documents.some(
        (document) => document.id === createdDocument.id
      ),
      "Deleted knowledge-base document still appeared after refresh."
    );

    const missingDownloadResult = await fetch(
      `${baseUrl}/api/knowledge-base/documents/${createdDocument.id}/file`,
      {
        cache: "no-store",
      }
    );
    assertCondition(
      missingDownloadResult.status === 404,
      "Deleted knowledge-base file still resolved through the download route."
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          serverMode,
          baseUrl,
          database: describeDatabaseVerificationTarget(),
          uploadedDocument: {
            id: createdDocument.id,
            name: createdDocument.name,
            storageProvider: createdDocument.storageProvider,
            storagePath: createdDocument.storagePath,
          },
          initialDocumentCount: initialDocuments.length,
          seededMetadataOnlyCount,
        },
        null,
        2
      )
    );
  } catch (error) {
    await cleanupCreatedDocument(createdDocumentId);

    const message =
      error instanceof Error ? error.message : "Unknown KB workflow verification error.";

    console.error(message);

    if (logBuffer.length > 0) {
      console.error("Recent verification server output:");
      console.error(logBuffer.join("\n"));
    }

    process.exitCode = 1;
  } finally {
    await stopServer();
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

await main();
