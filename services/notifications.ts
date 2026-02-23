
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { db, messaging } from './firebase';

/**
 * To enable push notifications, you need to generate a "Web Push certificate"
 * (which is a VAPID key) in your Firebase project settings.
 * Go to: Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates -> Generate key pair.
 * Then, paste the generated key here.
 */
const VAPID_KEY = "BPM-gQeC9KQoKYTzT3oXmBumW0aVYCrKrfwA_2Z8zAnX8-WjJjM-1Z-E-0Y-vX-9jD-y_1b-d_9c-8a";

/**
 * Sets up Firebase Cloud Messaging for the current user.
 * 1. Requests permission to show notifications.
 * 2. If granted, retrieves the unique FCM token for the device.
 * 3. Saves the token to the user's profile in the database.
 * 4. Sets up a listener for foreground messages.
 * @param uid The current user's ID.
 */
export const setupNotifications = async (uid: string) => {
  // FIX: Use compat version of isSupported.
  if (!firebase.messaging.isSupported()) {
    console.log("Firebase Messaging is not supported in this browser.");
    return;
  }
  
  if (!uid || !messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');

      // Get the service worker registration that is already active.
      const registration = await navigator.serviceWorker.ready;

      // FIX: Use compat version of getToken and pass the existing registration.
      const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (currentToken) {
        // Save the token to the user's profile in the Realtime Database
        // FIX: Use compat version of ref and set.
        const tokenRef = db.ref(`users/${uid}/fcmToken`);
        await tokenRef.set(currentToken);
        console.log('FCM Token saved to DB.');

        // Listen for messages when the app is in the foreground
        // FIX: Use compat version of onMessage.
        messaging.onMessage((payload) => {
          console.log('Message received in foreground: ', payload);
          // In a real app, you might show a custom in-app notification/toast here
          // instead of the default browser notification.
        });

      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token or setting up notifications. ', err);
  }
};
