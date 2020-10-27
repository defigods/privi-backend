import admin from 'firebase-admin';
const serviceAccount = require("./ServiceAccountKey.json");

function getDb() {
    if (admin.apps.length == 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    return admin.firestore();
}

function getAdmin() {
    if (admin.apps.length == 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    return admin;
}

export const db = getDb();
export const firebase = getAdmin();

