import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorageAdapter } from "@/lib/server/adapters/contracts";

export const localFileStorageAdapter: FileStorageAdapter = {
  async ensureDirectory(directoryPath) {
    await mkdir(directoryPath, { recursive: true });
  },
  async writeBinaryFile(filePath, fileBuffer) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, fileBuffer);
  },
  async readBinaryFile(filePath) {
    return readFile(filePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    });
  },
  async deleteBinaryFile(filePath) {
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
