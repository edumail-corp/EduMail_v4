import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const scanTargets = ["app", "components", "lib/server/services"];
const blockedImportPatterns = [
  {
    pattern: /@\/lib\/server\/(?:email-store|knowledge-base-store|activity-log-store)\b/,
    message: "imports a removed concrete store module",
  },
  {
    pattern: /@\/lib\/server\/adapters\/local\//,
    message: "imports a local adapter directly instead of going through the adapter registry",
  },
  {
    pattern: /@\/lib\/server\/adapters\/sqlite\//,
    message: "imports a sqlite adapter directly instead of going through the adapter registry",
  },
  {
    pattern: /@\/lib\/server\/adapters\/database\/database-adapters\b/,
    message: "imports a database adapter directly instead of going through the adapter registry",
  },
];
const ignoredDirectories = new Set(["node_modules", ".next", ".git"]);
const issues = [];

function walk(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const stats = statSync(absolutePath);

  if (stats.isDirectory()) {
    if (ignoredDirectories.has(path.basename(relativePath))) {
      return;
    }

    for (const entry of readdirSync(absolutePath)) {
      walk(path.join(relativePath, entry));
    }

    return;
  }

  if (!/\.(ts|tsx|js|mjs)$/.test(relativePath)) {
    return;
  }

  const contents = readFileSync(absolutePath, "utf8");

  for (const { pattern, message } of blockedImportPatterns) {
    if (pattern.test(contents)) {
      issues.push(`${relativePath} ${message}`);
    }
  }
}

for (const target of scanTargets) {
  walk(target);
}

if (issues.length > 0) {
  console.error("Architecture check failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");
