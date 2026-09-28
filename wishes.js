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
    "Firebase isn't configured yet — Wall of Wishes is running in local-only demo mode. " +
    "Fill in firebase-config.js to make it live for all visitors."
  );
}

/* ---------------- Scroll reveal ---------------- */
(function initReveal() {
  document.querySelectorAll(".fw-section .container").forEach((el) => el.classList.add("reveal"));
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

/* ---------------- Background music (follows the main page's choice) ---------------- */
const MUSIC_PREF_KEY = "halimat-music-playing";

(function initMusicPlayer() {
  const btn = document.getElementById("music-toggle");
  const audio = document.getElementById("bg-audio");
  const iconUse = btn ? btn.querySelector("use") : null;
  if (!btn || !audio || !iconUse) return;

  function setPlaying(isPlaying) {
    btn.classList.toggle("playing", isPlaying);
    btn.setAttribute("aria-pressed", String(isPlaying));
    btn.setAttribute("aria-label", isPlaying ? "Pause background music" : "Play background music");
    iconUse.setAttribute("href", isPlaying ? "#icon-sound-on" : "#icon-sound-off");
    try {
      localStorage.setItem(MUSIC_PREF_KEY, isPlaying ? "1" : "0");
    } catch {
      /* ignore quota/privacy errors */
    }
  }

  async function playMusic() {
    try {
      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.error("Couldn't play background audio.", err);
    }
  }

  function pauseMusic() {
    audio.pause();
    setPlaying(false);
  }

  btn.addEventListener("click", () => {
    if (audio.paused) playMusic();
    else pauseMusic();
  });

  audio.addEventListener("ended", () => setPlaying(false));

  // Pick up whatever the visitor chose on the main invite page. Browsers
  // may still block this autoplay-with-sound attempt without a fresh
  // gesture on this page — if so it just stays off until they tap the
  // toggle themselves, no error surfaced to the user.
  let wantsMusic = false;
  try {
    wantsMusic = localStorage.getItem(MUSIC_PREF_KEY) === "1";
  } catch {
    /* ignore privacy errors */
  }
  if (wantsMusic) playMusic();
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

/* ---------------- Wall of Wishes (full list) ---------------- */
const wishForm = document.getElementById("wish-form");
const wishStatus = document.getElementById("wish-status");
const wishSubmit = document.getElementById("wish-submit");
const wishesWall = document.getElementById("wishes-wall");
const wishesEmpty = document.getElementById("wishes-empty");
const wishesLead = document.querySelector(".wishes-lead");

function wishCardHtml(w) {
  const tag = w.relationship
    ? `<span class="tag">${escapeHtml(w.relationship)}</span>`
    : "";
  return `
    <svg class="icon wish-card-doodle" aria-hidden="true"><use href="#icon-heart-doodle"/></svg>
    <p class="msg">${escapeHtml(w.message)}</p>
    <p class="author">— ${escapeHtml(w.name)} ${tag}</p>
  `;
}

function renderWishes(wishes) {
  wishesWall.querySelectorAll(".wish-card").forEach((el) => el.remove());
  if (!wishes.length) {
    wishesEmpty.style.display = "block";
    if (wishesLead) wishesLead.style.display = "none";
    return;
  }
  wishesEmpty.style.display = "none";
  if (wishesLead) wishesLead.style.display = "block";
  wishes.forEach((w) => {
    const card = document.createElement("div");
    card.className = "wish-card";
    card.innerHTML = wishCardHtml(w);
    wishesWall.appendChild(card);
  });
}

if (db) {
  const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"), limit(500));
  onSnapshot(q, (snap) => {
    renderWishes(snap.docs.map((d) => d.data()));
  });
} else {
  renderWishes(readLocal(LOCAL_WISH_KEY));
}

wishForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("wish-name").value.trim();
  const message = document.getElementById("wish-message").value.trim();
  const relationship = document.getElementById("wish-relationship").value;
  if (!name || !message) return;

  wishSubmit.disabled = true;
  wishStatus.textContent = "Posting...";
  wishStatus.className = "form-status";

  try {
    if (db) {
      await addDoc(collection(db, "wishes"), { name, message, relationship, createdAt: serverTimestamp() });
    } else {
      const local = readLocal(LOCAL_WISH_KEY);
      local.unshift({ name, message, relationship });
      writeLocal(LOCAL_WISH_KEY, local);
      renderWishes(local);
    }
    wishStatus.textContent = "Your wish is on the wall!";
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
