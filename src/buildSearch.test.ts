import { describe, expect, it } from "vitest";
import { getBuildDisplayName, matchesBuildSearch } from "./buildSearch";
import type { BuildRecord } from "./types";

const build: BuildRecord = {
  id: "build-1",
  appId: "app-1",
  platform: "ios",
  version: "5.5.1.10",
  buildNumber: "2",
  releaseNotes: "QA build",
  driveFileId: "drive-file",
  driveUrl: "https://drive.google.com/file/d/drive-file/view",
  fileName: "app.ipa"
};

describe("build search", () => {
  it("formats the visible build name", () => {
    expect(getBuildDisplayName(build)).toBe("v5.5.1.10 (2)");
  });

  it("matches the visible build name", () => {
    expect(matchesBuildSearch(build, "v5.5.1.10 (2)")).toBe(true);
  });
});
