# Halimat's 25th Birthday — Invite

A single-page invite site: hero, the vibe, the expectation, dress code,
RSVP, a live Wall of Wishes, and an unscramble mini-game.

## Files

- `index.html` — page markup
- `style.css` — all styling and animations
- `app.js` — page interactivity, including Wall of Wishes (Firebase
  Firestore, with a local-only fallback if Firebase isn't configured yet)
- `firebase-config.js` — **you need to fill this in** (see below)
- `firestore.rules` — security rules to paste into your Firebase project

RSVPs go through an external Google Form (linked from the RSVP button) and
aren't stored by this site at all.

## Finish the setup (Firebase, for Wall of Wishes)

Wishes need to be visible to every visitor, so they're backed by a free
Firebase (Firestore) project rather than just the browser's local storage.
Since you've already created a Firebase project, pick up from step 2:

1. ~~Go to https://console.firebase.google.com/ and create a new project (free tier).~~ done
2. In the project: **Build → Firestore Database → Create database**. Start
   in production mode, pick any region.
3. Go to **Project settings** (gear icon) → **General** → scroll to "Your
   apps" → click the web icon `</>` to register a web app (name it anything,
   e.g. "birthday-site"; you don't need Firebase Hosting). Copy the
   `firebaseConfig` object it shows you — it looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
   };
   ```
4. Paste those values into `firebase-config.js` in this repo, replacing the
   `YOUR_...` placeholders (keep the `export const FIREBASE_CONFIG = { ... }`
   wrapper, just swap the values inside).
5. In Firestore → **Rules**, replace the default rules with the contents of
   `firestore.rules` in this repo, then click **Publish**. This lets
   visitors submit and read wishes, but not edit or delete others' entries.
6. Deploy the site (e.g. GitHub Pages, Netlify, Vercel — any static host
   works, no build step needed) and open it. Submit a test wish and confirm
   it shows up — if it doesn't, open the browser console for errors (a
   common one is Firestore rules not yet published, or a typo in a config
   value).

Until `firebase-config.js` is filled in, the site still works — wishes are
just saved to that visitor's own browser (`localStorage`) instead of being
shared with everyone else. You'll see a console warning reminding you it's
in local-only demo mode.

## Updating the RSVP Google Form

The RSVP button links to a Google Form with the guest's name pre-filled.
Both the form URL and the pre-fill field ID are set near the top of the
RSVP handler in `app.js`:

```js
const GOOGLE_FORM_BASE = "https://docs.google.com/forms/d/e/.../viewform";
const GOOGLE_FORM_NAME_ENTRY = "entry.2114240558";
```

If you rebuild the Google Form, update both values (the form's edit URL
and each field's `entry.NNNNNNN` ID are found via Google Forms' own "Get
pre-filled link" feature).
