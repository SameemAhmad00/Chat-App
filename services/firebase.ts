
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';
import 'firebase/compat/messaging';

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

// FIX: Initialize Firebase using the compat library.
const app: firebase.app.App = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;

export { app, auth, db, storage, messaging };
