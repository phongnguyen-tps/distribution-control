# CI metadata publisher

Use `npm run publish-build -- ...` from the build project after the IPA/APK has
already been uploaded to Google Drive and Drive permissions have been shared.

Authentication is handled by Firebase Admin SDK. Set one of:

- `FIREBASE_SERVICE_ACCOUNT_JSON` with the full service account JSON.
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account file, with
  optional `FIREBASE_PROJECT_ID`.

Example:

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
