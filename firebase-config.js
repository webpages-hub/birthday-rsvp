// ============================================================
// FIREBASE SETUP — fill this in before the site goes live.
//
// 1. Go to https://console.firebase.google.com/ and create a free project.
// 2. In the project, go to Build > Firestore Database > Create database
//    (start in "production mode", pick any region).
// 3. Go to Project settings (gear icon) > General > "Your apps" >
//    click the web icon (</>) to register a web app, and copy the
//    firebaseConfig object it gives you into FIREBASE_CONFIG below.
// 4. In Firestore > Rules, paste the rules from firestore.rules in this
//    repo and click "Publish" — this lets visitors submit RSVPs/wishes
//    and read them, without allowing edits/deletes of others' entries.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
