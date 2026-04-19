import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const nextCliPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const child = spawn(
  process.execPath,
  [nextCliPath, "build", "--webpack"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      EDUMAILAI_MAILBOX_ADAPTER: "sqlite",
      EDUMAILAI_KNOWLEDGE_BASE_ADAPTER: "sqlite",
      EDUMAILAI_ACTIVITY_ADAPTER: "sqlite",
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
