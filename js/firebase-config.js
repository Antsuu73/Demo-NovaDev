import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAxjPvr_pzrxyM4sXmOVSQLiyw4Cx6wf2s",
    authDomain: "sach-hay-bba95.firebaseapp.com",
    projectId: "sach-hay-bba95",
    storageBucket: "sach-hay-bba95.firebasestorage.app",
    messagingSenderId: "680048521549",
    appId: "1:680048521549:web:9068e4df8f92c5af160704",
    measurementId: "G-HVKRGDGKLR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    serverTimestamp,
    increment
};
