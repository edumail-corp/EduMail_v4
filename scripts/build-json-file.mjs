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
      EDUMAILAI_MAILBOX_ADAPTER: "json_file",
      EDUMAILAI_KNOWLEDGE_BASE_ADAPTER: "json_file",
      EDUMAILAI_ACTIVITY_ADAPTER: "json_file",
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
