/* app.js - updated: corrected paths, theme toggle (light/dark/auto), responsive UI */

const STORAGE_KEY = 'daily-aff-dashboard-v2:saves';
const THEME_KEY = 'daily-aff-theme';
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

const affirmationTextEl = document.getElementById('affirmationText');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');
const btnRandom = document.getElementById('btn-random');
const btnAddToggle = document.getElementById('btn-add-toggle');
const addForm = document.getElementById('addForm');
const newAff = document.getElementById('newAffirmation');
const btnCancel = document.getElementById('btn-cancel');
const savedList = document.getElementById('savedList');
const dateTime = document.getElementById('dateTime');
const weatherEl = document.getElementById('weather');
const btnSave = document.getElementById('btn-save');
const btnGenerate = document.getElementById('btn-generate');

const themeAutoBtn = document.getElementById('themeAuto');
const themeLightBtn = document.getElementById('themeLight');
const themeDarkBtn = document.getElementById('themeDark');

let saves = [];
let pool = [];
let currentIndex = 0;
let deferredPrompt = null;

/* ---------- Theme handling ---------- */
function applyTheme(mode) {
  if (mode === 'auto') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
  }
  themeAutoBtn.setAttribute('aria-pressed', mode === 'auto');
  themeLightBtn.setAttribute('aria-pressed', mode === 'light');
  themeDarkBtn.setAttribute('aria-pressed', mode === 'dark');
  localStorage.setItem(THEME_KEY, mode);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
  if (saved === 'auto' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      applyTheme('auto');
    });
  }
}
themeAutoBtn.addEventListener('click', ()=> applyTheme('auto'));
themeLightBtn.addEventListener('click', ()=> applyTheme('light'));
themeDarkBtn.addEventListener('click', ()=> applyTheme('dark'));

/* ---------- Date/time ---------- */
function now(){ return new Date(); }
function formatTime(d){ return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }
function formatDate(d){ return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}); }

function updateDateTime(){
  const d = now();
  dateTime.textContent = `${formatDate(d)} • ${formatTime(d)}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* ---------- Storage ---------- */
function loadSaves(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saves = raw ? JSON.parse(raw) : [];
  } catch(e){ saves = []; }
}
function saveSaves(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saves)); } catch(e){}
}

/* ---------- Affirmation management ---------- */
function buildPool(){
  pool = [...DEFAULT_AFFIRMATIONS, ...saves];
}
function animateText(text){
  affirmationTextEl.style.opacity = 0;
  affirmationTextEl.style.transform = 'translateY(6px)';
  setTimeout(()=> {
    affirmationTextEl.textContent = text;
    affirmationTextEl.style.transition = 'opacity .35s ease, transform .35s ease';
    affirmationTextEl.style.opacity = 1;
    affirmationTextEl.style.transform = 'translateY(0)';
  }, 120);
}
function showAffirmation(index){
  if (!pool.length) return;
  currentIndex = ((index % pool.length) + pool.length) % pool.length;
  const text = pool[currentIndex];
  animateText(text);
}
function showNext(){ showAffirmation(currentIndex + 1); }
function showPrev(){ showAffirmation(currentIndex - 1); }
function showRandom(){ showAffirmation(Math.floor(Math.random() * pool.length)); }

/* On-device AI-like generator */
const SUBJECTS = ["You", "I", "We", "This moment", "Your heart"];
const TRAITS = ["are capable", "are enough", "deserve rest", "are growing", "bring light", "are resilient"];
const ADVERBS = ["today", "right now", "with ease", "without apology", "gently"];
const COMPLEMENTS = [
  "to create what you imagine.",
  "and attract good things.",
  "and learn with grace.",
  "and breathe deeply.",
  "and take one small step forward.",
  "and rebuild with kindness."
];

function generateAffirmation(seedText=''){
  const s = SUBJECTS[Math.floor(Math.random()*SUBJECTS.length)];
  const t = TRAITS[Math.floor(Math.random()*TRAITS.length)];
  const a = ADVERBS[Math.floor(Math.random()*ADVERBS.length)];
  const c = COMPLEMENTS[Math.floor(Math.random()*COMPLEMENTS.length)];
  const parts = [`${s} ${t} ${a}`, c];
  if (seedText && Math.random() > 0.3) {
    const cleaned = seedText.trim().split(' ').slice(0,3).join(' ');
    parts.unshift(`${cleaned},`);
  }
  return parts.join(' ');
}

/* ---------- Saved list UI ---------- */
function renderSavedList(){
  savedList.innerHTML = '';
  if (!saves.length) {
    savedList.textContent = 'No saved affirmations yet.';
    return;
  }
  saves.forEach((s,i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const span = document.createElement('div');
    span.textContent = s;
    span.style.flex='1';
    span.style.marginRight='8px';
    const useBtn = document.createElement('button');
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', ()=> {
      const idx = pool.indexOf(s);
      if (idx >= 0) showAffirmation(idx);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> {
      saves.splice(i,1); saveSaves(); buildPool(); renderSavedList();
    });
    const actions = document.createElement('div');
    actions.appendChild(useBtn); actions.appendChild(delBtn);
    div.appendChild(span); div.appendChild(actions);
    savedList.appendChild(div);
  });
}

/* ---------- UI interactions ---------- */
document.getElementById('btn-next').addEventListener('click', showNext);
document.getElementById('btn-prev').addEventListener('click', showPrev);
document.getElementById('btn-random').addEventListener('click', showRandom);
document.getElementById('btn-generate').addEventListener('click', ()=> {
  const seed = prompt('Give a seed word (optional) to bias the affirmation:');
  const gen = generateAffirmation(seed || '');
  animateText(gen);
});

document.getElementById('btn-add-toggle').addEventListener('click', ()=> {
  const open = addForm.classList.contains('hidden');
  addForm.classList.toggle('hidden', !open);
  addForm.setAttribute('aria-hidden', String(!open));
  if (open) newAff.focus();
});
document.getElementById('btn-save').addEventListener('click', ()=> {
  const text = affirmationTextEl.textContent.trim();
  if (!text) return;
  if (!saves.includes(text)) saves.unshift(text);
  else saves = [text, ...saves.filter(s=>s!==text)];
  saveSaves(); buildPool(); renderSavedList();
});
document.getElementById('btn-cancel').addEventListener('click', ()=> {
  addForm.classList.add('hidden'); addForm.setAttribute('aria-hidden','true');
});
addForm.addEventListener('submit', (e)=> {
  e.preventDefault();
  const text = newAff.value.trim();
  if (!text) return;
  saves.unshift(text);
  saveSaves(); buildPool(); renderSavedList();
  newAff.value=''; addForm.classList.add('hidden');
});

/* service worker registration */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async ()=> {
    try {
      await navigator.serviceWorker.register('sw.js');
      console.log('sw registered');
    } catch(e){ console.warn('sw failed', e); }
  });
}

/* install prompt handling */
window.addEventListener('beforeinstallprompt', (e)=> {
  e.preventDefault();
  deferredPrompt = e;
  const ip = document.getElementById('installPrompt');
  ip.classList.remove('hidden'); ip.setAttribute('aria-hidden','false');
});
document.getElementById('btn-install').addEventListener('click', async ()=> {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installPrompt').classList.add('hidden');
});
document.getElementById('btn-dismiss-install').addEventListener('click', ()=> {
  deferredPrompt = null;
  document.getElementById('installPrompt').classList.add('hidden');
});

/* Optional weather via IP */
async function fetchWeather() {
  try {
    const r = await fetch('https://ipapi.co/json/');
    if (!r.ok) return;
    const d = await r.json();
    if (d && d.city) weatherEl.textContent = `${d.city}`;
  } catch(e){}
}

/* Init */
function init(){
  initTheme();
  loadSaves();
  buildPool();
  renderSavedList();
  showRandom();
  fetchWeather();
}
init();

/* keyboard shortcuts */
document.addEventListener('keydown', (e)=> {
  if (e.key === 'ArrowRight') showNext();
  if (e.key === 'ArrowLeft') showPrev();
  if (e.key === 'r') showRandom();
});
