// Firebase SDK v8.10.0. Keep this file loaded after firebase-app.js,
// firebase-auth.js, and firebase-firestore.js.
const firebaseConfig = {
    apiKey: "AIzaSyAs9i_xDlZAiC1UKtpv6kGon1jbXXyCSJk",
    authDomain: "animal-welfare-and-health-sys.firebaseapp.com",
    projectId: "animal-welfare-and-health-sys",
    storageBucket: "animal-welfare-and-health-sys.firebasestorage.app",
    messagingSenderId: "102100044503",
    appId: "1:102100044503:web:ad467ab4123dfa93abbe92",
    measurementId: "G-M2E4KTZN3R"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Expose Firebase v8 services for page-specific scripts.
window.auth = auth;
window.db = db;
