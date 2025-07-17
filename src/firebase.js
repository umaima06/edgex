import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCHS52OJz8dlhTOA3BFv3lhTT02v6BfZM8",
  authDomain: "edgex-e6582.firebaseapp.com",
  projectId: "edgex-e6582",
  storageBucket: "edgex-e6582.appspot.com",
  messagingSenderId: "1005678739291",
  appId: "1:1005678739291:web:29360b6d2d6f2ef884e47e",
  measurementId: "G-MX6KJMJH62",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const signInAnon = () => signInAnonymously(auth);
