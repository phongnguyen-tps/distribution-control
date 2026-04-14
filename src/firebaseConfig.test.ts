import { describe, expect, it } from "vitest";
import { getFirebaseConfig } from "./firebaseConfig";

describe("getFirebaseConfig", () => {
  it("maps Vite env values into Firebase config", () => {
    expect(
      getFirebaseConfig({
        VITE_FIREBASE_API_KEY: "api-key",
        VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
        VITE_FIREBASE_PROJECT_ID: "example",
        VITE_FIREBASE_STORAGE_BUCKET: "example.appspot.com",
        VITE_FIREBASE_MESSAGING_SENDER_ID: "sender",
        VITE_FIREBASE_APP_ID: "app-id"
      })
    ).toEqual({
      apiKey: "api-key",
      authDomain: "example.firebaseapp.com",
      projectId: "example",
      storageBucket: "example.appspot.com",
      messagingSenderId: "sender",
      appId: "app-id"
    });
  });

  it("fails clearly when required env vars are missing", () => {
    expect(() => getFirebaseConfig({})).toThrow(
      "Missing Firebase environment variables"
    );
  });
});
