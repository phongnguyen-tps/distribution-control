import { describe, expect, it } from "vitest";
import { formatFileSize, mapAppDoc, mapBuildDoc } from "./firestoreModels";

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
        diawiUrl: "https://i.diawi.com/example",
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
      diawiUrl: "https://i.diawi.com/example",
      fileName: "app.ipa",
      fileSize: 10485760,
      createdAt
    });
  });

  it("formats file sizes for package metadata", () => {
    expect(formatFileSize(10485760)).toBe("10.0 MB");
    expect(formatFileSize(undefined)).toBe("Unknown size");
  });

  it("keeps Windows build platform values", () => {
    const record = mapBuildDoc(
      doc({
        appId: "app-1",
        platform: "windows",
        version: "1.0.0",
        buildNumber: "100",
        driveUrl: "https://drive.google.com/file/d/drive-file/view"
      }) as never
    );

    expect(record.platform).toBe("windows");
  });

  it("keeps Web build platform values", () => {
    const record = mapBuildDoc(
      doc({
        appId: "app-1",
        platform: "web",
        version: "1.0.0",
        buildNumber: "100",
        driveUrl: "https://drive.google.com/file/d/drive-file/view"
      }) as never
    );

    expect(record.platform).toBe("web");
  });

  it("keeps Web app platform values", () => {
    const record = mapAppDoc(
      doc({
        name: "Web App",
        platforms: ["web", "android", "linux"]
      }) as never
    );

    expect(record.platforms).toEqual(["web", "android"]);
  });

  it("maps release note aliases from Firestore data", () => {
    const record = mapBuildDoc(
      doc({
        appId: "app-1",
        platform: "android",
        version: "1.0.0",
        buildNumber: "100",
        releaseNote: "Alias release notes",
        driveUrl: "https://drive.google.com/file/d/drive-file/view"
      }) as never
    );

    expect(record.releaseNotes).toBe("Alias release notes");
  });
});
