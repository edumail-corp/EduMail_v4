import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type ReadJsonFileOptions<T> = {
  fallback: () => T;
  retries?: number;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function ensureStoreDirectory(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function writeJsonFileAtomically<T>(
  filePath: string,
  value: T
) {
  await ensureStoreDirectory(filePath);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempFilePath, filePath);
}

export async function readJsonFileWithFallback<T>(
  filePath: string,
  options: ReadJsonFileOptions<T>
) {
  await ensureStoreDirectory(filePath);

  const retries = options.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const fileContents = await readFile(filePath, "utf8");
      return JSON.parse(fileContents) as T;
    } catch (error) {
      const errno = (error as NodeJS.ErrnoException).code;

      if (errno === "ENOENT") {
        return options.fallback();
      }

      if (
        error instanceof SyntaxError &&
        attempt < retries
      ) {
        await wait(40);
        continue;
      }

      if (error instanceof SyntaxError) {
        console.error(`Failed to parse JSON store at ${filePath}. Falling back to seed data.`, error);
        return options.fallback();
      }

      throw error;
    }
  }

  return options.fallback();
}

export async function readJsonFileIfExists<T>(
  filePath: string,
  options?: Pick<ReadJsonFileOptions<T>, "retries">
) {
  await ensureStoreDirectory(filePath);

  const retries = options?.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const fileContents = await readFile(filePath, "utf8");
      return JSON.parse(fileContents) as T;
    } catch (error) {
      const errno = (error as NodeJS.ErrnoException).code;

      if (errno === "ENOENT") {
        return null;
      }

      if (error instanceof SyntaxError && attempt < retries) {
        await wait(40);
        continue;
      }

      if (error instanceof SyntaxError) {
        console.error(
          `Failed to parse JSON store at ${filePath}. Returning null for recovery.`,
          error
        );
        return null;
      }

      throw error;
    }
  }

  return null;
}
