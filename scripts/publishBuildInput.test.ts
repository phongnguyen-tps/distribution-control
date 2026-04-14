import { describe, expect, it } from "vitest";
import { parseCliArgs, validatePublishBuildInput } from "./publishBuildInput";

describe("publish build input", () => {
  it("parses CLI flags and validates required metadata", () => {
    const parsed = parseCliArgs([
      "--appId",
      "com.example.app",
      "--platform=android",
      "--version",
      "1.2.3",
      "--buildNumber",
      "42",
      "--driveFileId",
      "drive-id",
      "--driveUrl",
      "https://drive.google.com/file/d/drive-id/view",
      "--fileName",
      "example.apk",
      "--fileSize",
      "2048"
    ]);

    expect(validatePublishBuildInput(parsed)).toMatchObject({
      appId: "com.example.app",
      platform: "android",
      version: "1.2.3",
      buildNumber: "42",
      releaseNotes: "",
      driveFileId: "drive-id",
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
    ).toThrow("platform must be either ios or android");
  });
});
