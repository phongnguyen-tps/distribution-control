import type { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";
import type { AppRecord, BuildPlatform, BuildRecord } from "./types";

function asDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }

  return undefined;
}

function asPlatform(value: unknown): BuildPlatform {
  if (value === "ios" || value === "android" || value === "windows") {
    return value;
  }

  return "windows";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function mapAppDoc(doc: QueryDocumentSnapshot<DocumentData>): AppRecord {
  const data = doc.data();
  const platforms = Array.isArray(data.platforms)
    ? data.platforms.filter(
        (platform): platform is BuildPlatform =>
          platform === "ios" || platform === "android" || platform === "windows"
      )
    : [];

  return {
    id: doc.id,
    name: asString(data.name, "Untitled app"),
    bundleIdOrPackageName: asString(data.bundleIdOrPackageName),
    platforms,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt)
  };
}

export function mapBuildDoc(doc: QueryDocumentSnapshot<DocumentData>): BuildRecord {
  const data = doc.data();

  return {
    id: doc.id,
    appId: asString(data.appId),
    platform: asPlatform(data.platform),
    version: asString(data.version),
    buildNumber: asString(data.buildNumber),
    releaseNotes: asString(data.releaseNotes || data.releaseNote || data.notes),
    driveFileId: asString(data.driveFileId),
    driveUrl: asString(data.driveUrl),
    diawiUrl: asString(data.diawiUrl) || undefined,
    fileName: asString(data.fileName),
    fileSize: asNumber(data.fileSize),
    checksum: asString(data.checksum) || undefined,
    createdAt: asDate(data.createdAt),
    createdBy: asString(data.createdBy) || undefined,
    sourceProject: asString(data.sourceProject) || undefined,
    commitSha: asString(data.commitSha) || undefined
  };
}

export function formatFileSize(size?: number): string {
  if (!size || size < 0) {
    return "Unknown size";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date?: Date): string {
  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
