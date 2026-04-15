import type { BuildPlatform } from "../src/types";

export interface PublishBuildInput {
  appId: string;
  platform: BuildPlatform;
  version: string;
  buildNumber: string;
  releaseNotes: string;
  driveFileId: string;
  driveUrl: string;
  diawiUrl?: string;
  fileName: string;
  fileSize?: number;
  checksum?: string;
  createdBy?: string;
  sourceProject?: string;
  commitSha?: string;
  appName?: string;
  bundleIdOrPackageName?: string;
}

const requiredFields: Array<keyof PublishBuildInput> = [
  "appId",
  "platform",
  "version",
  "buildNumber",
  "driveFileId",
  "driveUrl",
  "fileName"
];

export function parseCliArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const raw = token.slice(2);
    const equalsIndex = raw.indexOf("=");

    if (equalsIndex >= 0) {
      parsed[raw.slice(0, equalsIndex)] = raw.slice(equalsIndex + 1);
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${raw}`);
    }

    parsed[raw] = next;
    index += 1;
  }

  return parsed;
}

export function validatePublishBuildInput(
  raw: Record<string, string | undefined>
): PublishBuildInput {
  const input: PublishBuildInput = {
    appId: raw.appId ?? "",
    platform: raw.platform as BuildPlatform,
    version: raw.version ?? "",
    buildNumber: raw.buildNumber ?? "",
    releaseNotes: raw.releaseNotes ?? "",
    driveFileId: raw.driveFileId ?? "",
    driveUrl: raw.driveUrl ?? "",
    diawiUrl: raw.diawiUrl || undefined,
    fileName: raw.fileName ?? "",
    fileSize: raw.fileSize ? Number(raw.fileSize) : undefined,
    checksum: raw.checksum || undefined,
    createdBy: raw.createdBy || undefined,
    sourceProject: raw.sourceProject || undefined,
    commitSha: raw.commitSha || undefined,
    appName: raw.appName || undefined,
    bundleIdOrPackageName: raw.bundleIdOrPackageName || undefined
  };

  const missing = requiredFields.filter((field) => !input[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (
    input.platform !== "ios" &&
    input.platform !== "android" &&
    input.platform !== "windows"
  ) {
    throw new Error("platform must be ios, android, or windows");
  }

  if (input.fileSize !== undefined && (!Number.isFinite(input.fileSize) || input.fileSize < 0)) {
    throw new Error("fileSize must be a positive number when provided");
  }

  try {
    new URL(input.driveUrl);
  } catch {
    throw new Error("driveUrl must be a valid URL");
  }

  if (input.diawiUrl) {
    try {
      const diawiUrl = new URL(input.diawiUrl);
      if (diawiUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new Error("diawiUrl must be a valid HTTPS URL when provided");
    }
  }

  return input;
}
