import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDmfy_57U-T8BUZ7KBA3yUpeFkRTD7t4ic",
  authDomain: "caribbean-academy.firebaseapp.com",
  projectId: "caribbean-academy",
  storageBucket: "caribbean-academy.firebasestorage.app",
  messagingSenderId: "169287200195",
  appId: "1:169287200195:web:f6ccc25fa39a947642e176"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);