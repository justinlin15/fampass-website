// Firebase Admin SDK init for Vercel serverless functions.
//
// Why we need Admin (not the client SDK already loaded in /js/firebase-config.js):
//   The client SDK runs in the browser and is subject to Firestore security rules.
//   We're locking down the tiktok_credentials collection so NO client can read it.
//   Server-side reads/writes need the Admin SDK with a service account, which
//   bypasses rules.
//
// Credentials: a service account JSON downloaded from Firebase Console
//   (Project Settings → Service Accounts → Generate new private key).
//   The entire JSON gets stored in the Vercel env var FIREBASE_SERVICE_ACCOUNT_JSON.
//
// Idempotent init: Vercel may reuse the same Node process across invocations
//   (warm starts). admin.apps.length check prevents double-init.

import admin from "firebase-admin";

let initialized = false;

function init(): void {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. " +
        "Download it from Firebase Console → Project Settings → Service Accounts " +
        "and paste the entire JSON into the Vercel env var.",
    );
  }
  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. ${err instanceof Error ? err.message : ""}`,
    );
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
}

export function getFirestore(): admin.firestore.Firestore {
  init();
  return admin.firestore();
}

export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
