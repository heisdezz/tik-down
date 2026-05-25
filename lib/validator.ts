import * as FileSystem from "expo-file-system/legacy";
import Logger from "@/lib/logger";

/**
 * Validates if a file exists at the given path or SAF URI.
 */
export async function validateFileExists(path: string | undefined): Promise<boolean> {
  if (!path) return false;

  try {
    if (path.startsWith("content://")) {
      // For SAF, we try to get info.
      // Note: getInfoAsync on SAF URIs might return exists: true even if not accessible
      // without permissions, but here we assume the app has persistent access or it's in a managed folder.
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    }

    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch (err) {
    Logger.error("Error validating file existence", { path, error: (err as Error).message });
    return false;
  }
}
