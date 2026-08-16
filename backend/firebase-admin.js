import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

console.log("Firebase Admin project:", serviceAccount.project_id);
console.log("Firebase Admin connected");

export { db };
