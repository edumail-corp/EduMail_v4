import { spawn } from "node:child_process";
import path from "node:path";
import nextEnv from "@next/env";

const projectRoot = process.cwd();
const nextCliPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectRoot);

const child = spawn(
  process.execPath,
  [nextCliPath, "build", "--webpack"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      EDUMAILAI_MAILBOX_ADAPTER: "database",
      EDUMAILAI_KNOWLEDGE_BASE_ADAPTER: "database",
      EDUMAILAI_ACTIVITY_ADAPTER: "database",
      EDUMAILAI_DATABASE_URL:
        process.env.EDUMAILAI_DATABASE_URL?.trim() ||
        "sqlite:edumailai.database.sqlite",
    },
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
