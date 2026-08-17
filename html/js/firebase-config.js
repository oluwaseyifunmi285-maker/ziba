// Firebase Configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyA2RwUMHb8How8D3csM4i9MPQ-R1Lh32Iw",
    authDomain: "ziba-39b1c.firebaseapp.com",
    projectId: "ziba-39b1c",
    storageBucket: "ziba-39b1c.firebasestorage.app",
    messagingSenderId: "550405288979",
    appId: "1:550405288979:web:66b735213c031a38273be6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);