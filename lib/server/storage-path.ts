import path from "node:path";

function getWritableBaseDir() {
  if (process.env.VERCEL) {
    return process.env.TMPDIR ?? "/tmp";
  }

  return process.cwd();
}

export function getWritableDataRootPath() {
  return path.join(getWritableBaseDir(), "data");
}

export function getWritableDataPath(...segments: string[]) {
  return path.join(getWritableDataRootPath(), ...segments);
}
