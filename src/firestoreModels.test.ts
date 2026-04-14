import { describe, expect, it } from "vitest";
import { formatFileSize, mapBuildDoc } from "./firestoreModels";

function doc(data: Record<string, unknown>) {
  return {
    id: "build-1",
    data: () => data
  };
}

describe("mapBuildDoc", () => {
  it("maps Firestore build fields into a BuildRecord", () => {
    const createdAt = new Date("2026-04-14T10:00:00.000Z");
    const record = mapBuildDoc(
      doc({
        appId: "app-1",
        platform: "ios",
        version: "1.0.0",
        buildNumber: "100",
        releaseNotes: "QA build",
        driveFileId: "drive-file",
        driveUrl: "https://drive.google.com/file/d/drive-file/view",
        fileName: "app.ipa",
        fileSize: 10485760,
        createdAt
      }) as never
    );

    expect(record).toMatchObject({
      id: "build-1",
      appId: "app-1",
      platform: "ios",
      version: "1.0.0",
      buildNumber: "100",
      releaseNotes: "QA build",
      driveFileId: "drive-file",
      driveUrl: "https://drive.google.com/file/d/drive-file/view",
      fileName: "app.ipa",
      fileSize: 10485760,
      createdAt
    });
  });

  it("formats file sizes for package metadata", () => {
    expect(formatFileSize(10485760)).toBe("10.0 MB");
    expect(formatFileSize(undefined)).toBe("Unknown size");
  });
});
