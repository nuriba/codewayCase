import admin from 'firebase-admin';
import { env } from './env.js';

let app;

if (!admin.apps.length) {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }
} else {
  app = admin.apps[0];
}

export const db = admin.firestore();
export const auth = admin.auth();
export default app;
