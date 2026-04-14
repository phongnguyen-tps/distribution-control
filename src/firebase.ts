import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig, type FirebaseEnv } from "./firebaseConfig";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

let services: FirebaseServices | undefined;

export function getFirebaseServices(): FirebaseServices {
  if (!services) {
    const app = initializeApp(getFirebaseConfig(import.meta.env as FirebaseEnv));
    services = {
      app,
      auth: getAuth(app),
      db: initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true
      }),
      googleProvider: new GoogleAuthProvider()
    };
  }

  return services;
}
