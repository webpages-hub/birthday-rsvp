import { FIREBASE_CONFIG } from "./firebase-config.js";

const isConfigured = FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");

let db = null;
let collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot;

if (isConfigured) {
  try {
    const [{ initializeApp }, firestore] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);
    ({ collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } = firestore);
    const app = initializeApp(FIREBASE_CONFIG);
    db = firestore.getFirestore(app);
  } catch (err) {
    console.error("Failed to load Firebase — falling back to local-only demo mode.", err);
    db = null;
  }
} else {
  console.warn(
    "Firebase isn't configured yet — RSVP and Wall of Wishes are running in local-only demo mode. " +
    "Fill in firebase-config.js to make them live for all visitors."
  );
}

/* ---------------- Floating background balloons/confetti ---------------- */
(function initFloaters() {
  const layer = document.getElementById("floaters");
  const emojis = ["🎈", "🎉", "💜", "💎", "✨", "🎊"];
  const count = window.innerWidth < 640 ? 10 : 18;
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = Math.random() * 100 + "vw";
    span.style.fontSize = 1.2 + Math.random() * 1.8 + "rem";
    const duration = 14 + Math.random() * 14;
    span.style.animationDuration = duration + "s";
    span.style.animationDelay = -Math.random() * duration + "s";
    layer.appendChild(span);
  }
})();

/* ---------------- Scroll reveal ---------------- */
(function initReveal() {
  document.querySelectorAll(".section > *").forEach((el) => el.classList.add("reveal"));
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
})();

function fireConfetti() {
  if (typeof confetti !== "function") return;
  const colors = ["#ff2fb1", "#a855f7", "#d8b4fe", "#ffd700", "#ffffff"];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }), 200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- RSVP ---------------- */
const rsvpForm = document.getElementById("rsvp-form");
const rsvpStatus = document.getElementById("rsvp-status");
const rsvpSubmit = document.getElementById("rsvp-submit");
const rsvpList = document.getElementById("rsvp-list");
const rsvpCount = document.getElementById("rsvp-count");

const LOCAL_RSVP_KEY = "halimat-rsvp-local";
const LOCAL_WISH_KEY = "halimat-wishes-local";

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* ignore quota errors */
  }
}

function renderRsvps(names) {
  rsvpList.innerHTML = "";
  rsvpCount.textContent = `(${names.length})`;
  names.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = "🎈 " + name;
    rsvpList.appendChild(li);
  });
}

if (db) {
  const q = query(collection(db, "rsvps"), orderBy("createdAt", "desc"), limit(200));
  onSnapshot(q, (snap) => {
    const names = snap.docs.map((d) => d.data().name).filter(Boolean);
    renderRsvps(names);
  });
} else {
  renderRsvps(readLocal(LOCAL_RSVP_KEY).map((r) => r.name));
}

rsvpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("rsvp-name");
  const name = nameInput.value.trim();
  if (!name) return;

  rsvpSubmit.disabled = true;
  rsvpStatus.textContent = "Sending...";
  rsvpStatus.className = "form-status";

  try {
    if (db) {
      await addDoc(collection(db, "rsvps"), { name, createdAt: serverTimestamp() });
    } else {
      const local = readLocal(LOCAL_RSVP_KEY);
      local.unshift({ name });
      writeLocal(LOCAL_RSVP_KEY, local);
      renderRsvps(local.map((r) => r.name));
    }
    rsvpStatus.textContent = "You're on the list! 🎉 Location details coming your way.";
    rsvpStatus.className = "form-status success";
    rsvpForm.reset();
    fireConfetti();
  } catch (err) {
    console.error(err);
    rsvpStatus.textContent = "Something went wrong — please try again.";
    rsvpStatus.className = "form-status error";
  } finally {
    rsvpSubmit.disabled = false;
  }
});

/* ---------------- Wall of Wishes ---------------- */
const wishForm = document.getElementById("wish-form");
const wishStatus = document.getElementById("wish-status");
const wishSubmit = document.getElementById("wish-submit");
const wishesWall = document.getElementById("wishes-wall");
const wishesEmpty = document.getElementById("wishes-empty");

function renderWishes(wishes) {
  wishesWall.querySelectorAll(".wish-card").forEach((el) => el.remove());
  if (!wishes.length) {
    wishesEmpty.style.display = "block";
    return;
  }
  wishesEmpty.style.display = "none";
  wishes.forEach((w) => {
    const card = document.createElement("div");
    card.className = "wish-card";
    card.innerHTML = `
      <span class="quote-icon">💜</span>
      <p class="msg">${escapeHtml(w.message)}</p>
      <p class="author">— ${escapeHtml(w.name)}</p>
    `;
    wishesWall.appendChild(card);
  });
}

if (db) {
  const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"), limit(200));
  onSnapshot(q, (snap) => {
    const wishes = snap.docs.map((d) => d.data());
    renderWishes(wishes);
  });
} else {
  renderWishes(readLocal(LOCAL_WISH_KEY));
}

wishForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("wish-name").value.trim();
  const message = document.getElementById("wish-message").value.trim();
  if (!name || !message) return;

  wishSubmit.disabled = true;
  wishStatus.textContent = "Posting...";
  wishStatus.className = "form-status";

  try {
    if (db) {
      await addDoc(collection(db, "wishes"), { name, message, createdAt: serverTimestamp() });
    } else {
      const local = readLocal(LOCAL_WISH_KEY);
      local.unshift({ name, message });
      writeLocal(LOCAL_WISH_KEY, local);
      renderWishes(local);
    }
    wishStatus.textContent = "Your wish is on the wall! 💜";
    wishStatus.className = "form-status success";
    wishForm.reset();
    fireConfetti();
  } catch (err) {
    console.error(err);
    wishStatus.textContent = "Something went wrong — please try again.";
    wishStatus.className = "form-status error";
  } finally {
    wishSubmit.disabled = false;
  }
});
