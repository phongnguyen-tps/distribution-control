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
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
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
      setSelectedBuildId(null);
      return undefined;
    }

    const handleError = (firestoreError: FirestoreError) => {
      setError(firestoreError.message);
    };

    const unsubscribeApps = onSnapshot(
      query(collection(firebaseState.services.db, "apps")),
      (snapshot) => {
        setApps(snapshot.docs.map(mapAppDoc));
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

  const visibleBuilds = useMemo(() => {
    if (platformFilter === "all") {
      return builds;
    }

    return builds.filter((build) => build.platform === platformFilter);
  }, [builds, platformFilter]);

  const selectedBuild =
    visibleBuilds.find((build) => build.id === selectedBuildId) ??
    visibleBuilds[0] ??
    null;

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
          <h1>Mobile builds</h1>
        </div>
        <div className="user-bar">
          <span>{user.email}</span>
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

      <section className="toolbar" aria-label="Build filters">
        <button
          className={platformFilter === "all" ? "active" : ""}
          onClick={() => setPlatformFilter("all")}
        >
          All
        </button>
        <button
          className={platformFilter === "ios" ? "active" : ""}
          onClick={() => setPlatformFilter("ios")}
        >
          iOS
        </button>
        <button
          className={platformFilter === "android" ? "active" : ""}
          onClick={() => setPlatformFilter("android")}
        >
          Android
        </button>
      </section>

      {visibleBuilds.length === 0 ? (
        <section className="empty-state">
          <h2>No builds yet</h2>
          <p>
            Once CI publishes metadata to Firestore, builds will appear here for
            signed-in users.
          </p>
        </section>
      ) : (
        <section className="content-grid">
          <BuildList
            appById={appById}
            builds={visibleBuilds}
            selectedBuildId={selectedBuild?.id ?? null}
            onSelect={setSelectedBuildId}
          />
          {selectedBuild && (
            <BuildDetail
              app={appById.get(selectedBuild.appId)}
              build={selectedBuild}
            />
          )}
        </section>
      )}
    </main>
  );
}

function compareBuilds(first: BuildRecord, second: BuildRecord) {
  return (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0);
}

interface BuildListProps {
  appById: Map<string, AppRecord>;
  builds: BuildRecord[];
  selectedBuildId: string | null;
  onSelect: (buildId: string) => void;
}

function BuildList({
  appById,
  builds,
  selectedBuildId,
  onSelect
}: BuildListProps) {
  return (
    <section className="build-list" aria-label="Build list">
      {builds.map((build) => {
        const app = appById.get(build.appId);
        return (
          <button
            key={build.id}
            className={`build-row ${selectedBuildId === build.id ? "selected" : ""}`}
            onClick={() => onSelect(build.id)}
          >
            <span className={`platform ${build.platform}`}>{build.platform}</span>
            <span className="build-summary">
              <strong>{app?.name ?? "Unknown app"}</strong>
              <span>
                v{build.version} ({build.buildNumber}) · {formatDate(build.createdAt)}
              </span>
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
            : "Open APK in Drive"}
      </a>

      <p className="drive-note">
        {build.platform === "ios" && build.diawiUrl
          ? "Diawi handles iOS install for this build. The app still must be signed for this device."
          : "Google Drive controls access to this package. If Drive says you need permission, ask the build owner to share the file with your account."}
      </p>
    </section>
  );
}

export default App;
