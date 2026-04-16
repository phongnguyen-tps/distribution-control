# Distribution Control

Static GitHub Pages app for managing internal iOS and Android build metadata.

## What it does

- Uses Firebase Authentication with Google Sign-In and email/password sign-in.
- Reads `apps` and `builds` metadata from Cloud Firestore.
- Opens private Google Drive links for Android APK and Windows packages, and
  Diawi install links for iOS builds when `diawiUrl` is present.
- Lets external CI publish build metadata through a Firebase Admin SDK script.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web app config:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

For GitHub Pages, keep `VITE_BASE_PATH=/distribution-control/` unless the site is
served from a custom domain or different path.

## Firestore

Deploy `firestore.rules` to allow only authorized signed-in users to read
metadata while blocking client writes:

```sh
firebase deploy --only firestore:rules
```

Expected collections:

- `apps`: `name`, `bundleIdOrPackageName`, `platforms`, `createdAt`, `updatedAt`
- `builds`: `appId`, `platform`, `version`, `buildNumber`, `releaseNotes`,
  `driveFileId`, `driveUrl`, `diawiUrl`, `fileName`, `fileSize`, `checksum`,
  `createdAt`, `createdBy`, `sourceProject`, `commitSha`. `platform` can be
  `ios`, `android`, or `windows`.
- `authorizedUsers`: document ID must be the Firebase Auth user UID. Set
  `active` to `true` to grant access.

Example allowlist document:

```json
// authorizedUsers/USER_UID
{
  "email": "user@example.com",
  "active": true,
  "role": "viewer"
}
```

Create at least one `authorizedUsers/{uid}` document before deploying the
restricted rules, otherwise every client user will be denied access.

For iOS builds, set `diawiUrl` to the Diawi install page. If `diawiUrl` is not
present, the UI falls back to the Drive link.

## CI metadata publish

From the project that builds and uploads IPA/APK files to Drive:

```sh
npm run publish-build -- \
  --appId com.example.app \
  --appName "Example App" \
  --bundleIdOrPackageName com.example.app \
  --platform android \
  --version 1.2.3 \
  --buildNumber 42 \
  --releaseNotes "Internal QA build" \
  --driveFileId 1abcDriveFileId \
  --driveUrl https://drive.google.com/file/d/1abcDriveFileId/view \
  --diawiUrl https://i.diawi.com/example \
  --fileName example-1.2.3-42.apk \
  --fileSize 58240000 \
  --sourceProject mobile-app \
  --commitSha abc1234
```

The CI environment needs either `FIREBASE_SERVICE_ACCOUNT_JSON` or
`GOOGLE_APPLICATION_CREDENTIALS` for Firebase Admin SDK credentials.

## Checks

```sh
npm test
npm run build
```
