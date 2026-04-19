import { spawn } from "node:child_process";
import path from "node:path";
import nextEnv from "@next/env";

const projectRoot = process.cwd();
const verifyScriptPath = path.join(
  projectRoot,
  "scripts",
  "verify-knowledge-base-workflow.mjs"
);
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectRoot);

function getConfiguredDatabaseUrl() {
  const configuredValue = process.env.EDUMAILAI_DATABASE_URL?.trim();
  return configuredValue && configuredValue.length > 0
    ? configuredValue
    : "sqlite:edumailai.verify.database.sqlite";
}

const configuredDatabaseUrl = process.env.EDUMAILAI_DATABASE_URL?.trim();
const child = spawn(process.execPath, [verifyScriptPath], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    EDUMAILAI_MAILBOX_ADAPTER: "database",
    EDUMAILAI_KNOWLEDGE_BASE_ADAPTER: "database",
    EDUMAILAI_ACTIVITY_ADAPTER: "database",
    EDUMAILAI_FILE_STORAGE_ADAPTER: "local",
    EDUMAILAI_DATABASE_URL: getConfiguredDatabaseUrl(),
    EDUMAILAI_VERIFY_DATABASE_SOURCE: configuredDatabaseUrl
      ? "configured"
      : "sqlite-fallback",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
