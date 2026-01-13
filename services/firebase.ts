
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// It is recommended to use environment variables for Firebase config keys in a real production app.
const firebaseConfig = {
  apiKey: "AIzaSyCnih2rU5U154XvtVb8FEKZ6D1y9rOHITY",
  authDomain: "chat-8e53b.firebaseapp.com",
  databaseURL: "https://chat-8e53b-default-rtdb.firebaseio.com",
  projectId: "chat-8e53b",
  storageBucket: "chat-8e53b.appspot.com",
  messagingSenderId: "252562150408",
  appId: "1:252562150408:web:376c343f99f8a0c3442dbd",
  measurementId: "G-8JCCFDQYE4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { auth, db, storage };