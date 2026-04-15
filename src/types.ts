export type BuildPlatform = "ios" | "android";

export interface AppRecord {
  id: string;
  name: string;
  bundleIdOrPackageName: string;
  platforms: BuildPlatform[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BuildRecord {
  id: string;
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
  createdAt?: Date;
  createdBy?: string;
  sourceProject?: string;
  commitSha?: string;
}
