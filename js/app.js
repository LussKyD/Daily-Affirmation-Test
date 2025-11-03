/* app.js
   Vanilla JS PWA-ready Daily Affirmation Dashboard.
   - localStorage for saved affirmations
   - dynamic background by time of day
   - optional weather fetch (OpenWeatherMap)
   - service worker registration
   - install prompt handling
*/

/* ---------- Config ---------- */
const APP_PREFIX = 'daily-aff-dashboard';
const STORAGE_KEY = `${APP_PREFIX}:affirms`;
const DEFAULT_AFFIRMATIONS = [
  "I am capable of amazing things.",
  "Today I choose progress over perfection.",
  "I accept myself unconditionally.",
  "I attract positivity and opportunity.",
  "I am enough — exactly as I am.",
  "Every small step counts.",
  "I create my future with what I do today.",
  "I deserve time to rest and recharge."
];

/* Optional: Replace with your own OpenWeatherMap API key for better results.
   If you don't have one, the app will gracefully skip weather requests.
*/
const OWM_API_KEY = ''; // <-- add your API key here (optional)
const OWM_ENDPOINT = 'https://api.openweathermap.org/data/2.5/weather';

/* ---------- DOM ---------- */
const affirmationTextEl = document.getElementById('affirmationText');
const btnNext = document.getElementById('btn-next');
const btnRandom = document.getElementById('btn-random');
const btnAddToggle = document.getElementById('btn-add-toggle');
const addForm = document.getElementById('addForm');
const newAff = document.getElementById('newAffirmation');
const btnCancel = document.getElementById('btn-cancel');
const savedList = document.getElementById('savedList');
const dateTime = document.getElementById('dateTime');
const weatherEl = document.getElementById('weather');
const btnSave = document.getElementById('btn-save');
const installPromptEl = document.getElementById('installPrompt');
const btnInstall = document.getElementById('btn-install');
const btnDismissInstall = document.getElementById('btn-dismiss-install');

/* ---------- State ---------- */
let saves = [];
let pool = [];
let currentIndex = 0;
let deferredPrompt = null;

/* ---------- Utilities ---------- */
function now() {
  return new Date();
}
function formatTime(d) {
  // 12-hour time with minutes
  return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
}
function formatDate(d) {
  return d.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'});
}
function fadeIn(element) {
  element.style.opacity = 0;
  element.style.transform = 'translateY(6px)';
  requestAnimationFrame(() => {
    element.style.transition = 'opacity .35s ease, transform .45s cubic-bezier(.2,.9,.2,1)';
    element.style.opacity = 1;
    element.style.transform = 'translateY(0)';
  });
}

/* ---------- Storage ---------- */
function loadSaves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saves = raw ? JSON.parse(raw) : [];
  } catch(e) {
    console.warn('Failed to load saves', e);
    saves = [];
  }
}
function saveSaves() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch(e) {
    console.warn('Failed to save', e);
  }
}

/* ---------- Affirmation management ---------- */
function buildPool() {
  pool = [...DEFAULT_AFFIRMATIONS, ...saves];
}
function showAffirmation(index) {
  if (!pool.length) return;
  currentIndex = ((index % pool.length) + pool.length) % pool.length;
  const text = pool[currentIndex];
  affirmationTextEl.textContent = '';
  // animate text
  setTimeout(() => {
    affirmationTextEl.textContent = text;
    fadeIn(affirmationTextEl);
  }, 40);
}
function showNext() {
  showAffirmation(currentIndex + 1);
}
function showRandom() {
  const idx = Math.floor(Math.random() * pool.length);
  showAffirmation(idx);
}

/* ---------- Saved list UI ---------- */
function renderSavedList() {
  savedList.innerHTML = '';
  if (!saves.length) {
    savedList.textContent = 'No saved affirmations yet.';
    return;
  }
  saves.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<span>${s}</span>`;
    const actions = document.createElement('div');
    const useBtn = document.createElement('button');
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', () => {
      const chosenIndex = pool.indexOf(s);
      if (chosenIndex >= 0) showAffirmation(chosenIndex);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      saves.splice(i,1);
      saveSaves();
      buildPool();
      renderSavedList();
    });
    actions.appendChild(useBtn);
    actions.appendChild(delBtn);
    div.appendChild(actions);
    savedList.appendChild(div);
  });
}

/* ---------- Date & time widget ---------- */
function updateDateTime() {
  const d = now();
  dateTime.textContent = `${formatDate(d)} • ${formatTime(d)}`;
  // Update background class
  applyTimeOfDayClass(d);
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* ---------- Background by time ---------- */
function applyTimeOfDayClass(d) {
  const h = d.getHours();
  const body = document.body;
  body.classList.remove('morning','afternoon','evening','night');
  if (h >= 5 && h < 11) body.classList.add('morning');     // 5-10
  else if (h >= 11 && h < 17) body.classList.add('afternoon'); // 11-16
  else if (h >= 17 && h < 20) body.classList.add('evening');   // 17-19
  else body.classList.add('night');                         // 20-4
}

/* ---------- Weather (optional) ---------- */
async function fetchWeather() {
  if (!OWM_API_KEY) {
    weatherEl.textContent = ''; // not configured
    return;
  }
  try {
    // Try geolocation first for better UX — fallback to IP-based via freegeoip or skip
    const loc = await getLatLon();
    if (!loc) throw new Error('No location available');
    const url = `${OWM_ENDPOINT}?lat=${loc.lat}&lon=${loc.lon}&units=metric&appid=${OWM_API_KEY}`;
    const res = await fetch(url, {cache: 'no-cache'});
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    weatherEl.textContent = `${data.name}: ${Math.round(data.main.temp)}°C`;
  } catch(err) {
    console.warn('Weather fetch failed:', err);
    weatherEl.textContent = '';
  }
}
function getLatLon() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timer = setTimeout(()=> resolve(null), 8000);
    navigator.geolocation.getCurrentPosition(pos => {
      clearTimeout(timer);
      resolve({lat: pos.coords.latitude, lon: pos.coords.longitude});
    }, () => {
      clearTimeout(timer);
      resolve(null);
    }, {maximumAge:600000, timeout:7000});
  });
}

/* ---------- UI interactions ---------- */
btnNext.addEventListener('click', showNext);
btnRandom.addEventListener('click', showRandom);
btnAddToggle.addEventListener('click', () => {
  const open = addForm.classList.contains('hidden');
  addForm.classList.toggle('hidden', !open);
  addForm.setAttribute('aria-hidden', String(!open));
  btnAddToggle.setAttribute('aria-expanded', String(open));
  if (open) newAff.focus();
});
btnCancel.addEventListener('click', () => {
  addForm.classList.add('hidden');
  addForm.setAttribute('aria-hidden','true');
  btnAddToggle.setAttribute('aria-expanded','false');
});
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = newAff.value.trim();
  if (!text) return;
  saves.unshift(text);
  saveSaves();
  buildPool();
  renderSavedList();
  newAff.value = '';
  addForm.classList.add('hidden');
  addForm.setAttribute('aria-hidden','true');
});

/* Save current to local saves */
btnSave.addEventListener('click', () => {
  const text = affirmationTextEl.textContent.trim();
  if (!text) return;
  if (saves.includes(text)) {
    // Move existing to top
    saves = [text, ...saves.filter(s=>s!==text)];
  } else {
    saves.unshift(text);
  }
  saveSaves();
  buildPool();
  renderSavedList();
});

/* Install prompt */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPromptEl.classList.remove('hidden');
  installPromptEl.setAttribute('aria-hidden','false');
});
btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installPromptEl.classList.add('hidden');
  installPromptEl.setAttribute('aria-hidden','true');
});
btnDismissInstall.addEventListener('click', () => {
  deferredPrompt = null;
  installPromptEl.classList.add('hidden');
  installPromptEl.setAttribute('aria-hidden','true');
});

/* ---------- Service Worker registration ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered');
    } catch (err) {
      console.warn('SW registration failed', err);
    }
  });
}

/* ---------- Init ---------- */
function init() {
  loadSaves();
  buildPool();
  renderSavedList();
  showRandom();

  // Live time/clock already started above
  fetchWeather().catch(()=>{ /* silent */ });
}
init();

/* Optional: keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') showNext();
  if (e.key === 'r') showRandom();
});
