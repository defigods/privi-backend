const admin = require("firebase-admin");
const serviceAccount = require("./ServiceAccountKey.json");    

const firebaseConfig = {
    apiKey: "AIzaSyBHGkjcA4qbCn_IMOwsbBCE1Y68qGCZwjs",
    authDomain: "testnet-b31b0.firebaseapp.com",
    databaseURL: "https://testnet-b31b0.firebaseio.com",
    projectId: "testnet-b31b0",
    storageBucket: "testnet-b31b0.appspot.com",
    messagingSenderId: "392193144076",
    appId: "1:392193144076:web:ec51f1bcf7f8b9a3328529",
    measurementId: "G-K645P0YV0L"
  };

module.exports.getDb = () => {
    if (admin.apps.length == 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        // admin.initializeApp(firebaseConfig);
    }
    return admin.firestore();
}

module.exports.getAdmin = () => {
    if (admin.apps.length == 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        // admin.initializeApp(firebaseConfig);
    }
    return admin;
}