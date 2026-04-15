import { describe, expect, it } from "vitest";
import { parseCliArgs, validatePublishBuildInput } from "./publishBuildInput";

describe("publish build input", () => {
  it("parses CLI flags and validates required metadata", () => {
    const parsed = parseCliArgs([
      "--appId",
      "com.example.app",
      "--platform=windows",
      "--version",
      "1.2.3",
      "--buildNumber",
      "42",
      "--driveFileId",
      "drive-id",
      "--driveUrl",
      "https://drive.google.com/file/d/drive-id/view",
      "--diawiUrl",
      "https://i.diawi.com/example",
      "--fileName",
      "example.apk",
      "--fileSize",
      "2048"
    ]);

    expect(validatePublishBuildInput(parsed)).toMatchObject({
      appId: "com.example.app",
      platform: "windows",
      version: "1.2.3",
      buildNumber: "42",
      releaseNotes: "",
      driveFileId: "drive-id",
      diawiUrl: "https://i.diawi.com/example",
      fileName: "example.apk",
      fileSize: 2048
    });
  });

  it("rejects missing required fields", () => {
    expect(() => validatePublishBuildInput({ platform: "ios" })).toThrow(
      "Missing required fields"
    );
  });

  it("rejects unsupported platforms", () => {
    expect(() =>
      validatePublishBuildInput({
        appId: "app",
        platform: "web",
        version: "1",
        buildNumber: "1",
        driveFileId: "drive-id",
        driveUrl: "https://drive.google.com/file/d/drive-id/view",
        fileName: "app.zip"
      })
    ).toThrow("platform must be ios, android, or windows");
  });

  it("rejects non-HTTPS Diawi URLs", () => {
    expect(() =>
      validatePublishBuildInput({
        appId: "app",
        platform: "ios",
        version: "1",
        buildNumber: "1",
        driveFileId: "drive-id",
        driveUrl: "https://drive.google.com/file/d/drive-id/view",
        diawiUrl: "http://i.diawi.com/example",
        fileName: "app.ipa"
      })
    ).toThrow("diawiUrl must be a valid HTTPS URL");
  });
});
