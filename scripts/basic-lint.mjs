import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const scanTargets = [
  "app",
  "components",
  "lib",
  "scripts",
  "eslint.config.mjs",
  "next.config.ts",
  "postcss.config.mjs",
  "package.json",
  "tsconfig.json",
];
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".css",
]);
const ignoredDirectories = new Set(["node_modules", ".next", ".git"]);
const issues = [];

function shouldScanFile(filePath) {
  return textExtensions.has(path.extname(filePath));
}

function inspectFile(filePath) {
  const absolutePath = path.join(rootDir, filePath);
  const contents = readFileSync(absolutePath, "utf8").replaceAll("\r\n", "\n");
  const lines = contents.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.includes("\t")) {
      issues.push(`${filePath}:${lineNumber} contains a tab character`);
    }

    if (/\s+$/.test(line)) {
      issues.push(`${filePath}:${lineNumber} has trailing whitespace`);
    }

    if (
      line.startsWith("<<<<<<<") ||
      line.startsWith("=======") ||
      line.startsWith(">>>>>>>")
    ) {
      issues.push(`${filePath}:${lineNumber} contains a merge conflict marker`);
    }
  });
}

function walk(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const stats = statSync(absolutePath);

  if (stats.isDirectory()) {
    if (ignoredDirectories.has(path.basename(relativePath))) {
      return;
    }

    const entries = readdirSync(absolutePath);

    entries.forEach((entry) => {
      const nextRelativePath = path.join(relativePath, entry);
      walk(nextRelativePath);
    });

    return;
  }

  if (shouldScanFile(relativePath)) {
    inspectFile(relativePath);
  }
}

scanTargets.forEach((target) => {
  walk(target);
});

if (issues.length > 0) {
  console.error("Basic lint found issues:\n");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log("Basic lint passed.");
