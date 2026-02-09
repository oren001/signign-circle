// Firebase Configuration
// הגדרות Firebase לפרויקט "singing circle"

const firebaseConfig = {
    apiKey: "AIzaSyDZPAln8_cWGZ54ElCce7_rGensf5P51Aw",
    authDomain: "singing-circle.firebaseapp.com",
    databaseURL: "https://singing-circle-default-rtdb.firebaseio.com",
    projectId: "singing-circle",
    storageBucket: "singing-circle.firebasestorage.app",
    messagingSenderId: "154350722932",
    appId: "1:154350722932:web:86eaabc6c734c755625621"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

// Get a reference to the storage service
const storage = firebase.storage();

// Get Auth and Google Provider
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Default session ID (you can customize this for multiple singing circles)
const SESSION_ID = 'v2'; // Version 2 - separate session from v1

// Leader PIN (change this to your preferred 4-digit code)
const LEADER_PIN = '1234';

// Export for use in app.js
window.firebaseDB = database;
window.firebaseStorage = storage;
window.firebaseAuth = auth;
window.googleProvider = googleProvider;
window.SESSION_ID = SESSION_ID;
window.LEADER_PIN = LEADER_PIN;
