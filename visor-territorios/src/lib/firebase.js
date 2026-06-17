import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración original extraída de visor.js
const firebaseConfig = {
    apiKey: "AIzaSyAl448oXvGDgH6KSFwh7NP1nUlCXVMWxiU",
    authDomain: "territorios-87a96.firebaseapp.com",
    projectId: "territorios-87a96",
    storageBucket: "territorios-87a96.firebasestorage.app",
    messagingSenderId: "311563209848",
    appId: "1:311563209848:web:7e69a7109266c580bcb18d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
