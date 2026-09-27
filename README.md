# Halimat's 25th Birthday — Invite & RSVP

A single-page invite site: hero, "the vibe" rules, dress code, RSVP, and a
live Wall of Wishes, styled in purple/pink with diamonds for the 25th.

## Files

- `index.html` — page markup
- `style.css` — all styling and animations
- `app.js` — RSVP + Wall of Wishes logic (Firebase Firestore, with a
  local-only fallback if Firebase isn't configured yet)
- `firebase-config.js` — **you need to fill this in** (see below)
- `firestore.rules` — security rules to paste into your Firebase project

## Finish the setup (Firebase)

RSVPs and wishes need to be visible to every visitor, so they're backed by
a free Firebase (Firestore) project rather than just the browser's local
storage.

1. Go to https://console.firebase.google.com/ and create a new project (free tier).
2. In the project: **Build → Firestore Database → Create database**. Start
   in production mode, pick any region.
3. Go to **Project settings** (gear icon) → **General** → scroll to "Your
   apps" → click the web icon `</>` to register a web app. Copy the
   `firebaseConfig` object it shows you.
4. Paste those values into `firebase-config.js` in this repo, replacing the
   `YOUR_...` placeholders.
5. In Firestore → **Rules**, replace the default rules with the contents of
   `firestore.rules` in this repo, then click **Publish**. This lets
   visitors submit and read RSVPs/wishes, but not edit or delete others'
   entries.
6. Deploy the site (e.g. GitHub Pages, Netlify, Vercel — any static host
   works, no build step needed).

Until `firebase-config.js` is filled in, the site still works — RSVPs and
wishes are just saved to that visitor's own browser (`localStorage`) instead
of being shared with everyone else. You'll see a console warning reminding
you it's in local-only demo mode.

## Updating the date & location

Edit the hero section in `index.html`:

```html
<span>Date: <strong>To Be Determined</strong></span>
...
<span>Location: <strong>Revealed after RSVP</strong></span>
```

Once you lock in a date/venue, update the text directly (and consider
emailing/texting the venue to everyone on the RSVP list).
