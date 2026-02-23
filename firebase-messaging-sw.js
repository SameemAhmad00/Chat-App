
// Import the Firebase app and messaging libraries.
// Using compat versions for broader browser support in service workers.
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
// This needs to be present in the service worker file to initialize Firebase.
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * onBackgroundMessage is called when the app is in the background or closed
 * and a push notification is received.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Customize the notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // You can add an icon here. It must be a publicly accessible URL.
    // icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
