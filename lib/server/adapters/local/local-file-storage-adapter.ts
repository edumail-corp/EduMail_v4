import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorageAdapter } from "@/lib/server/adapters/contracts";
import { getWritableDataRootPath } from "@/lib/server/storage-path";

const localFileStorageRoot = getWritableDataRootPath();

function resolveStoragePath(storageKey: string) {
  const normalizedSegments = storageKey
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (
    normalizedSegments.length === 0 ||
    normalizedSegments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  return path.join(localFileStorageRoot, ...normalizedSegments);
}

export const localFileStorageAdapter: FileStorageAdapter = {
  async writeBinaryFile(storageKey, fileBuffer) {
    const filePath = resolveStoragePath(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, fileBuffer);
  },
  async readBinaryFile(storageKey) {
    const filePath = resolveStoragePath(storageKey);
    return readFile(filePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    });
  },
  async deleteBinaryFile(storageKey) {
    const filePath = resolveStoragePath(storageKey);
    return unlink(filePath)
      .then(() => true)
      .catch((error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return false;
        }

        throw error;
      });
  },
};
