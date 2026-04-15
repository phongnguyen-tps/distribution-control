import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  parseCliArgs,
  validatePublishBuildInput,
  type PublishBuildInput
} from "./publishBuildInput";

function initializeAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson))
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

async function publishBuild(input: PublishBuildInput) {
  initializeAdmin();
  const db = getFirestore();

  if (input.appName || input.bundleIdOrPackageName) {
    const appRef = db.collection("apps").doc(input.appId);
    const appSnapshot = await appRef.get();
    await appRef.set(
      {
        name: input.appName ?? appSnapshot.get("name") ?? input.appId,
        bundleIdOrPackageName:
          input.bundleIdOrPackageName ??
          appSnapshot.get("bundleIdOrPackageName") ??
          "",
        platforms: FieldValue.arrayUnion(input.platform),
        updatedAt: FieldValue.serverTimestamp(),
        ...(!appSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
      },
      { merge: true }
    );
  }

  const buildRef = await db.collection("builds").add({
    appId: input.appId,
    platform: input.platform,
    version: input.version,
    buildNumber: input.buildNumber,
    releaseNotes: input.releaseNotes,
    driveFileId: input.driveFileId,
    driveUrl: input.driveUrl,
    ...(input.diawiUrl ? { diawiUrl: input.diawiUrl } : {}),
    fileName: input.fileName,
    ...(input.fileSize !== undefined ? { fileSize: input.fileSize } : {}),
    ...(input.checksum ? { checksum: input.checksum } : {}),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.sourceProject ? { sourceProject: input.sourceProject } : {}),
    ...(input.commitSha ? { commitSha: input.commitSha } : {}),
    createdAt: FieldValue.serverTimestamp()
  });

  return buildRef.id;
}

async function main() {
  const input = validatePublishBuildInput(parseCliArgs(process.argv.slice(2)));
  const buildId = await publishBuild(input);
  console.log(`Published build metadata: ${buildId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
