import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  type FirestoreError
} from "firebase/firestore";
import { getFirebaseServices, type FirebaseServices } from "./firebase";
import {
  formatDate,
  formatFileSize,
  mapAppDoc,
  mapBuildDoc
} from "./firestoreModels";
import type { AppRecord, BuildPlatform, BuildRecord } from "./types";

type PlatformFilter = "all" | BuildPlatform;
const platformOrder: BuildPlatform[] = ["ios", "android", "windows", "web"];

function App() {
  const [firebaseState] = useState<
    | { services: FirebaseServices; initError?: undefined }
    | { services?: undefined; initError: string }
  >(() => {
    try {
      return { services: getFirebaseServices() };
    } catch (initError) {
      return {
        initError:
          initError instanceof Error
            ? initError.message
            : "Unable to initialize Firebase."
      };
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!firebaseState.services) {
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(firebaseState.services.auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, [firebaseState.services]);

  useEffect(() => {
    if (!user || !firebaseState.services) {
      setApps([]);
      setBuilds([]);
      setSelectedAppId(null);
      setSelectedBuildId(null);
      return undefined;
    }

    const handleError = (firestoreError: FirestoreError) => {
      setError(firestoreError.message);
    };

    const unsubscribeApps = onSnapshot(
      query(collection(firebaseState.services.db, "apps")),
      (snapshot) => {
        const records = snapshot.docs
          .map(mapAppDoc)
          .sort((first, second) => first.name.localeCompare(second.name));
        setApps(records);
        setSelectedAppId((currentId) => {
          if (currentId && records.some((app) => app.id === currentId)) {
            return currentId;
          }

          return records[0]?.id ?? null;
        });
        setError(null);
      },
      handleError
    );

    const unsubscribeBuilds = onSnapshot(
      query(collection(firebaseState.services.db, "builds")),
      (snapshot) => {
        const records = snapshot.docs.map(mapBuildDoc).sort(compareBuilds);
        setBuilds(records);
        setSelectedBuildId((currentId) => currentId ?? records[0]?.id ?? null);
        setError(null);
      },
      handleError
    );

    return () => {
      unsubscribeApps();
      unsubscribeBuilds();
    };
  }, [firebaseState.services, user]);

  const appById = useMemo(
    () => new Map(apps.map((app) => [app.id, app])),
    [apps]
  );

  const selectedApp = selectedAppId ? appById.get(selectedAppId) : undefined;

  const selectedAppBuilds = useMemo(() => {
    if (!selectedAppId) {
      return [];
    }

    return builds.filter((build) => build.appId === selectedAppId);
  }, [builds, selectedAppId]);

  const availablePlatforms = useMemo(() => {
    const platforms = new Set(selectedApp?.platforms ?? []);

    return platformOrder.filter((platform) => platforms.has(platform));
  }, [selectedApp]);

  useEffect(() => {
    if (availablePlatforms.length === 0) {
      setPlatformFilter("all");
      return;
    }

    if (platformFilter === "all" && availablePlatforms.length > 1) {
      return;
    }

    if (platformFilter !== "all" && availablePlatforms.includes(platformFilter)) {
      return;
    }

    setPlatformFilter(availablePlatforms.length > 1 ? "all" : availablePlatforms[0]);
  }, [availablePlatforms, platformFilter]);

  const visibleBuilds = useMemo(() => {
    const platformBuilds =
      platformFilter === "all"
        ? selectedAppBuilds
        : selectedAppBuilds.filter((build) => build.platform === platformFilter);

    return platformBuilds.filter((build) => matchesBuildSearch(build, searchQuery));
  }, [platformFilter, searchQuery, selectedAppBuilds]);

  const selectedBuild =
    visibleBuilds.find((build) => build.id === selectedBuildId) ??
    visibleBuilds[0] ??
    null;

  function handleSelectApp(appId: string) {
    setSelectedAppId(appId);
    setSelectedBuildId(null);
    setIsDetailOpen(false);
    setPlatformFilter("all");
    setSearchQuery("");
  }

  function handleSelectBuild(buildId: string) {
    setSelectedBuildId(buildId);
    setIsDetailOpen(true);
  }

  async function handleSignIn() {
    if (!firebaseState.services) {
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      await signInWithPopup(
        firebaseState.services.auth,
        firebaseState.services.googleProvider
      );
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Unable to sign in with Google."
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  if (!authReady) {
    return <main className="screen centered">Loading session...</main>;
  }

  if (firebaseState.initError) {
    return (
      <main className="screen auth-screen">
        <section className="auth-panel" aria-labelledby="config-title">
          <p className="eyebrow">Distribution Control</p>
          <h1 id="config-title">Firebase is not configured</h1>
          <p>{firebaseState.initError}</p>
          <p>
            Set the `VITE_FIREBASE_*` values in `.env.local` or GitHub Pages
            repository variables.
          </p>
        </section>
      </main>
    );
  }

  const services = firebaseState.services;

  if (!user) {
    return (
      <main className="screen auth-screen">
        <section className="auth-panel" aria-labelledby="login-title">
          <p className="eyebrow">Distribution Control</p>
          <h1 id="login-title">Sign in to view mobile builds</h1>
          <p>
            Use your Google account to access the internal iOS and Android build
            catalog. Drive controls whether each package can be downloaded.
          </p>
          <button onClick={handleSignIn} disabled={isSigningIn}>
            {isSigningIn ? "Signing in..." : "Sign in with Google"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="screen app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Distribution Control</p>
        </div>
        <div className="user-bar">
          <button
            className="secondary"
            onClick={() => services && signOut(services.auth)}
          >
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <section className="notice" role="alert">
          {error}
        </section>
      )}

      {apps.length === 0 ? (
        <section className="empty-state">
          <h2>No projects yet</h2>
          <p>
            Once CI publishes app metadata to Firestore, projects will appear
            here for signed-in users.
          </p>
        </section>
      ) : (
        <>
          <ProjectPicker
            apps={apps}
            buildCounts={getBuildCountsByApp(builds)}
            selectedAppId={selectedAppId}
            onSelect={handleSelectApp}
          />

          {availablePlatforms.length > 0 && (
            <section className="project-heading">
              <PlatformToolbar
                availablePlatforms={availablePlatforms}
                platformFilter={platformFilter}
                onChange={setPlatformFilter}
              />
            </section>
          )}

          <section className="search-bar" aria-label="Search builds">
            <label htmlFor="build-search">Search builds</label>
            <div>
              <input
                id="build-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Version, build number, release notes"
              />
              {searchQuery && (
                <button className="secondary" onClick={() => setSearchQuery("")}>
                  Clear
                </button>
              )}
            </div>
          </section>

          {visibleBuilds.length === 0 ? (
            <section className="empty-state">
              <h2>No builds for this project</h2>
              <p>
                {searchQuery
                  ? "No builds match this search."
                  : `Builds for ${selectedApp?.name ?? "this project"} will appear here after CI publishes metadata to Firestore.`}
              </p>
            </section>
          ) : (
            <section
              className={`content-grid ${isDetailOpen ? "detail-open" : ""}`}
            >
              <BuildList
                builds={visibleBuilds}
                selectedBuildId={selectedBuild?.id ?? null}
                onSelect={handleSelectBuild}
              />
              {selectedBuild && (
                <BuildDetail
                  app={appById.get(selectedBuild.appId)}
                  build={selectedBuild}
                />
              )}
              {selectedBuild && isDetailOpen && (
                <section className="mobile-detail-view">
                  <button
                    className="secondary back-button"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Back to builds
                  </button>
                  <BuildDetail
                    app={appById.get(selectedBuild.appId)}
                    build={selectedBuild}
                  />
                </section>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

interface PlatformToolbarProps {
  availablePlatforms: BuildPlatform[];
  platformFilter: PlatformFilter;
  onChange: (platform: PlatformFilter) => void;
}

function PlatformToolbar({
  availablePlatforms,
  platformFilter,
  onChange
}: PlatformToolbarProps) {
  return (
    <section className="toolbar" aria-label="Build filters">
      {availablePlatforms.length > 1 && (
        <button
          className={`platform-filter all ${platformFilter === "all" ? "active" : ""}`}
          aria-label="Show all platforms"
          onClick={() => onChange("all")}
          title="All platforms"
        >
          <span className="platform-filter-icon">
            <PlatformIcon platform="all" />
          </span>
          <span className="platform-filter-label">All</span>
        </button>
      )}
      {availablePlatforms.map((platform) => (
        <button
          key={platform}
          className={`platform-filter ${platform} ${platformFilter === platform ? "active" : ""}`}
          aria-label={`Show ${getPlatformLabel(platform)} builds`}
          onClick={() => onChange(platform)}
          title={getPlatformLabel(platform)}
        >
          <span className="platform-filter-icon">
            <PlatformIcon platform={platform} />
          </span>
          <span className="platform-filter-label">{getPlatformLabel(platform)}</span>
        </button>
      ))}
    </section>
  );
}

function PlatformIcon({ platform }: { platform: PlatformFilter }) {
  if (platform === "all") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }

  if (platform === "ios") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M16.95 12.35c-.03-2.18 1.78-3.23 1.86-3.28-1.02-1.48-2.6-1.68-3.16-1.7-1.34-.14-2.62.79-3.3.79-.69 0-1.74-.77-2.86-.75-1.47.02-2.83.86-3.59 2.18-1.53 2.65-.39 6.58 1.1 8.74.73 1.05 1.6 2.24 2.74 2.19 1.1-.04 1.52-.71 2.85-.71s1.71.71 2.87.69c1.19-.02 1.94-1.07 2.66-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.35-.9-2.37-3.56z" />
        <path d="M14.77 5.95c.6-.72 1-1.73.89-2.73-.86.03-1.9.57-2.52 1.29-.55.64-1.04 1.66-.91 2.64.96.07 1.94-.49 2.54-1.2z" />
      </svg>
    );
  }

  if (platform === "android") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6.25 15.25v-1.9a5.75 5.75 0 0 1 11.5 0v1.9z" />
        <path d="M8.75 8.25 7.25 5.9" />
        <path d="m15.25 8.25 1.5-2.35" />
        <circle cx="9.85" cy="12.2" r="0.55" />
        <circle cx="14.15" cy="12.2" r="0.55" />
      </svg>
    );
  }

  if (platform === "web") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.25" />
        <path d="M4 12h16" />
        <path d="M12 3.75c2.2 2.3 3.25 5.05 3.25 8.25S14.2 17.95 12 20.25" />
        <path d="M12 3.75C9.8 6.05 8.75 8.8 8.75 12s1.05 5.95 3.25 8.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5.5 11 4v7.25H4z" />
      <path d="M13 3.6 20 2v9.25h-7z" />
      <path d="M4 12.75h7V20l-7-1.5z" />
      <path d="M13 12.75h7V22l-7-1.6z" />
    </svg>
  );
}

function getPlatformLabel(platform: BuildPlatform) {
  if (platform === "ios") {
    return "iOS";
  }

  if (platform === "android") {
    return "Android";
  }

  if (platform === "web") {
    return "Web";
  }

  return "Windows";
}

function matchesBuildSearch(build: BuildRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
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

function compareBuilds(first: BuildRecord, second: BuildRecord) {
  return (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0);
}

function getBuildCountsByApp(builds: BuildRecord[]) {
  const counts = new Map<string, number>();

  for (const build of builds) {
    counts.set(build.appId, (counts.get(build.appId) ?? 0) + 1);
  }

  return counts;
}

interface ProjectPickerProps {
  apps: AppRecord[];
  buildCounts: Map<string, number>;
  selectedAppId: string | null;
  onSelect: (appId: string) => void;
}

function ProjectPicker({
  apps,
  buildCounts,
  selectedAppId,
  onSelect
}: ProjectPickerProps) {
  return (
    <section className="project-picker" aria-label="Projects">
      {apps.map((app) => (
        <button
          key={app.id}
          className={`project-option ${selectedAppId === app.id ? "selected" : ""}`}
          onClick={() => onSelect(app.id)}
        >
          <span>
            <strong>{app.name}</strong>
          </span>
          <span className="project-count">{buildCounts.get(app.id) ?? 0} builds</span>
        </button>
      ))}
    </section>
  );
}

interface BuildListProps {
  builds: BuildRecord[];
  selectedBuildId: string | null;
  onSelect: (buildId: string) => void;
}

function BuildList({
  builds,
  selectedBuildId,
  onSelect
}: BuildListProps) {
  return (
    <section className="build-list" aria-label="Build list">
      {builds.map((build) => {
        return (
          <button
            key={build.id}
            className={`build-row ${selectedBuildId === build.id ? "selected" : ""}`}
            onClick={() => onSelect(build.id)}
          >
            <span className={`platform ${build.platform}`}>{build.platform}</span>
            <span className="build-summary">
              <strong>
                v{build.version} ({build.buildNumber})
              </strong>
              <span className="release-note-preview">
                {build.releaseNotes || "No release notes"}
              </span>
              <span>{formatDate(build.createdAt)}</span>
              <span className="document-id">Document ID: {build.id}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

interface BuildDetailProps {
  app?: AppRecord;
  build: BuildRecord;
}

function BuildDetail({ app, build }: BuildDetailProps) {
  const packageUrl =
    build.platform === "ios" ? build.diawiUrl ?? build.driveUrl : build.driveUrl;

  return (
    <section className="build-detail" aria-labelledby="build-detail-title">
      <div className="detail-heading">
        <span className={`platform ${build.platform}`}>{build.platform}</span>
        <h2 id="build-detail-title">{app?.name ?? "Unknown app"}</h2>
        <p>
          Version {build.version}, build {build.buildNumber}
        </p>
      </div>

      <dl className="metadata">
        <div>
          <dt>Package</dt>
          <dd>{build.fileName || "Unknown file"}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatFileSize(build.fileSize)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(build.createdAt)}</dd>
        </div>
        <div>
          <dt>Bundle / package</dt>
          <dd>{app?.bundleIdOrPackageName || "Not set"}</dd>
        </div>
        <div>
          <dt>Document ID</dt>
          <dd>{build.id}</dd>
        </div>
        {build.commitSha && (
          <div>
            <dt>Commit</dt>
            <dd>{build.commitSha}</dd>
          </div>
        )}
        {build.checksum && (
          <div>
            <dt>Checksum</dt>
            <dd>{build.checksum}</dd>
          </div>
        )}
      </dl>

      <section className="release-notes">
        <h3>Release notes</h3>
        <p>{build.releaseNotes || "No release notes were published."}</p>
      </section>

      <a
        className="download-link"
        href={packageUrl}
        target="_blank"
        rel="noreferrer"
      >
        {build.platform === "ios" && build.diawiUrl
          ? "Install with Diawi"
          : build.platform === "ios"
            ? "Open IPA in Drive"
            : build.platform === "android"
              ? "Open APK in Drive"
              : build.platform === "web"
                ? "Open Web Build in Drive"
                : "Open Windows Build in Drive"}
      </a>

      <div className="external-links">
        <a href={build.driveUrl} target="_blank" rel="noreferrer">
          Google Drive source
        </a>
      </div>

      <p className="drive-note">
        {build.platform === "ios" && build.diawiUrl
          ? "Diawi handles iOS install for this build. The app still must be signed for this device."
          : "Google Drive controls access to this package. If Drive says you need permission, ask the build owner to share the file with your account."}
      </p>
    </section>
  );
}

export default App;
