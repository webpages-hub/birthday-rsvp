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

/* ---------------- "25 Years Later..." doodle badge ---------------- */
(function initYearsBadge() {
  const badge = document.getElementById("years-badge");
  if (!badge) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          badge.classList.add("play");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  obs.observe(badge);
})();

/* ---------------- Background music toggle ---------------- */
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

  /* ---- On-load "play my favorite song?" prompt ---- */
  const modal = document.getElementById("music-modal");
  const modalYes = document.getElementById("music-modal-yes");
  const modalNo = document.getElementById("music-modal-no");
  const modalClose = document.getElementById("music-modal-close");
  if (modal && modalYes && modalNo && modalClose) {
    const closeModal = () => modal.classList.remove("show");
    modalYes.addEventListener("click", () => {
      playMusic();
      closeModal();
    });
    modalNo.addEventListener("click", closeModal);
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    modal.classList.add("show");
  }
})();

function fireConfetti() {
  if (typeof confetti !== "function") return;
  const colors = ["#ff2fb1", "#a855f7", "#d8b4fe", "#ffd700", "#ffffff"];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }), 200);
}

/* ---------------- Balloon-toss celebration ---------------- */
function throwBalloons() {
  const layer = document.getElementById("balloon-layer");
  if (!layer) return;
  const colors = ["#ff2fb1", "#7b2ff7", "#2dd4bf", "#a3e635", "#ffd700", "#ff8c42"];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("balloon-fx");
    svg.setAttribute("viewBox", "0 0 32 48");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-balloon-single");
    use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#icon-balloon-single");
    svg.appendChild(use);

    const left = 4 + Math.random() * 92;
    const drift = 16 + Math.random() * 40;
    const size = 32 + Math.random() * 26;
    const duration = 3.8 + Math.random() * 2.2;
    const delay = Math.random() * 1.4;

    svg.style.left = left + "vw";
    svg.style.width = size + "px";
    svg.style.height = size * 1.5 + "px";
    svg.style.color = colors[Math.floor(Math.random() * colors.length)];
    svg.style.setProperty("--drift", drift + "px");
    svg.style.animationDuration = duration + "s";
    svg.style.animationDelay = delay + "s";

    svg.addEventListener("animationend", () => svg.remove());
    layer.appendChild(svg);
  }
}

/* ---------------- "Unscramble Halimat" tap-to-swap game ---------------- */
(function initScrambleGame() {
  const wrap = document.getElementById("scramble-tiles");
  const status = document.getElementById("scramble-status");
  const swapsEl = document.getElementById("scramble-swaps");
  const playBtn = document.getElementById("scramble-play");
  const resetBtn = document.getElementById("scramble-reset");
  if (!wrap || !status || !swapsEl || !playBtn || !resetBtn) return;

  const TARGETS = ["HALIMAT", "TAMILAH"];
  const MAX_SWAPS = 4;
  let tiles = [];
  let selected = null;
  let gameOver = false;
  let primarySolved = false;
  let primaryTarget = null;
  let swapsUsed = 0;

  function shuffledLetters() {
    const letters = TARGETS[0].split("");
    let arr;
    let attempts = 0;
    do {
      arr = letters.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      attempts++;
    } while (isTooRecognizable(arr) && attempts < 50);
    return arr;
  }

  function isTooRecognizable(arr) {
    const str = arr.join("");
    if (TARGETS.includes(str)) return true;
    return TARGETS.some((target) => {
      let matches = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target[i]) matches++;
      }
      return matches > 1;
    });
  }

  function render(letters) {
    wrap.innerHTML = "";
    wrap.classList.remove("solved");
    tiles = letters.map((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile";
      btn.textContent = letter;
      btn.addEventListener("click", () => onTileClick(btn));
      wrap.appendChild(btn);
      return btn;
    });
  }

  function updateSwapsLabel() {
    if (primarySolved) {
      swapsEl.textContent = "";
      return;
    }
    const left = MAX_SWAPS - swapsUsed;
    swapsEl.textContent = `${left} swap${left === 1 ? "" : "s"} left`;
  }

  function startGame() {
    gameOver = false;
    primarySolved = false;
    primaryTarget = null;
    swapsUsed = 0;
    selected = null;
    playBtn.hidden = true;
    playBtn.textContent = "Play";
    resetBtn.hidden = true;
    resetBtn.textContent = "Try Again";
    status.textContent = "Tap two letters to swap them.";
    updateSwapsLabel();
    render(shuffledLetters());
  }

  function endGame(finalMessage, isWin) {
    gameOver = true;
    if (isWin) wrap.classList.add("solved");
    tiles.forEach((t) => (t.tabIndex = -1));
    resetBtn.textContent = isWin ? "Play Again" : "Try Again";
    resetBtn.hidden = false;
    if (finalMessage) status.textContent = finalMessage;
  }

  function startBonusRound() {
    playBtn.hidden = true;
    playBtn.textContent = "Play";
    gameOver = false;
    status.textContent = "Tap two letters to swap them.";
    render(shuffledLetters());
  }

  // Converting between HALIMAT and TAMILAH always takes exactly two swaps
  // (positions 0<->6 and 2<->4), regardless of how the puzzle was scrambled.
  // The bonus round is left uncapped by MAX_SWAPS so that's always reachable.
  function checkSolved() {
    const current = tiles.map((t) => t.textContent).join("");

    if (!primarySolved) {
      if (TARGETS.includes(current)) {
        primarySolved = true;
        primaryTarget = current;
        status.textContent = "You got it! Can you also spell it in another variant?";
        updateSwapsLabel();
        throwBalloons();
        gameOver = true;
        playBtn.textContent = "Play";
        playBtn.hidden = false;
        return;
      }
      if (swapsUsed >= MAX_SWAPS) {
        endGame("Out of swaps — try again!", false);
      }
      return;
    }

    const other = TARGETS.find((t) => t !== primaryTarget);
    if (current === other) {
      throwBalloons();
      endGame("Halimat says thank you and she looks forward to seeing you at her birthday party.", true);
      return;
    }
    if (current === primaryTarget) {
      status.textContent = "You've already got that one! Try spelling it another way.";
      gameOver = true;
      playBtn.textContent = "Try Again";
      playBtn.hidden = false;
    }
  }

  function onTileClick(tile) {
    if (gameOver) return;
    if (!selected) {
      selected = tile;
      tile.classList.add("selected");
      return;
    }
    if (selected === tile) {
      selected.classList.remove("selected");
      selected = null;
      return;
    }
    const a = selected.textContent;
    const b = tile.textContent;
    selected.textContent = b;
    tile.textContent = a;
    selected.classList.remove("selected");
    selected = null;
    swapsUsed++;
    updateSwapsLabel();
    checkSolved();
  }

  playBtn.addEventListener("click", startBonusRound);
  resetBtn.addEventListener("click", startGame);
  startGame();
})();

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- RSVP ---------------- */
const rsvpForm = document.getElementById("rsvp-form");
const rsvpStatus = document.getElementById("rsvp-status");
const rsvpSubmit = document.getElementById("rsvp-submit");

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

const GOOGLE_FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScu6knwyXz_VMd88Bg5Tg6QJ5ojhfoK5UEnzazHntDF1SKt-g/formResponse";
const GOOGLE_FORM_NAME_ENTRY = "entry.2114240558";

rsvpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("rsvp-name");
  const name = nameInput.value.trim();
  if (!name) return;

  rsvpSubmit.disabled = true;
  rsvpStatus.textContent = "Sending...";
  rsvpStatus.className = "form-status";

  try {
    const body = new URLSearchParams();
    body.set(GOOGLE_FORM_NAME_ENTRY, name);
    // Google Forms doesn't send CORS headers, so the response is opaque —
    // "no-cors" is the only mode that lets the POST go through at all; we
    // can't read back success/failure, only whether the request itself
    // could be sent (network errors still throw and land in the catch).
    await fetch(GOOGLE_FORM_RESPONSE_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    rsvpStatus.textContent = "You're on the list! Location details coming your way.";
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
const wishesMore = document.getElementById("wishes-more");

const HOME_WISHES_LIMIT = 2;

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

function renderWishes(wishes, hasMore) {
  wishesWall.querySelectorAll(".wish-card").forEach((el) => el.remove());
  if (wishesMore) wishesMore.hidden = !hasMore;
  if (!wishes.length) {
    wishesEmpty.style.display = "block";
    return;
  }
  wishesEmpty.style.display = "none";
  wishes.forEach((w) => {
    const card = document.createElement("div");
    card.className = "wish-card";
    card.innerHTML = wishCardHtml(w);
    wishesWall.appendChild(card);
  });
}

if (db) {
  const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"), limit(HOME_WISHES_LIMIT + 1));
  onSnapshot(q, (snap) => {
    const wishes = snap.docs.map((d) => d.data());
    renderWishes(wishes.slice(0, HOME_WISHES_LIMIT), wishes.length > HOME_WISHES_LIMIT);
  });
} else {
  const local = readLocal(LOCAL_WISH_KEY);
  renderWishes(local.slice(0, HOME_WISHES_LIMIT), local.length > HOME_WISHES_LIMIT);
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
      renderWishes(local.slice(0, HOME_WISHES_LIMIT), local.length > HOME_WISHES_LIMIT);
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
