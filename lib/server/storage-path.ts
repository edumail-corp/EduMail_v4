import path from "node:path";

function getWritableBaseDir() {
  if (process.env.VERCEL) {
    return process.env.TMPDIR ?? "/tmp";
  }

  return process.cwd();
}

export function getWritableDataPath(...segments: string[]) {
  return path.join(getWritableBaseDir(), "data", ...segments);
}

