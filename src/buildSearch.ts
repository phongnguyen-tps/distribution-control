import type { BuildRecord } from "./types";

export function getBuildDisplayName(build: Pick<BuildRecord, "version" | "buildNumber">) {
  return `v${build.version} (${build.buildNumber})`;
}

export function matchesBuildSearch(build: BuildRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    getBuildDisplayName(build),
    build.id,
    build.version,
    build.buildNumber,
    build.releaseNotes,
    build.commitSha,
    build.sourceProject
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}
