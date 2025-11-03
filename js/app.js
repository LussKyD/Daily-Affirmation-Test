/* app.js - preserved v2.1 stable logic with safe splash and starfield integration */

const STORAGE_KEY = 'affirm:v2.1:saves';
const THEME_KEY = 'affirm:v2.1:theme';
const CONSENT_KEY = 'affirm:v2.1:consent';
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

/* DOM */
const splash = document.getElementById('splash');
const starCanvas = document.getElementById('starfield');
const appMain = document.getElementById('app');
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
const btnSave = document.getElementById('btn-save');
const btnGenerate = document.getElementById('btn-generate');

const themeAutoBtn = document.getElementById('themeAuto');
const themeLightBtn = document.getElementById('themeLight');
const themeDarkBtn = document.getElementById('themeDark');

const consentBanner = document.getElementById('consentBanner');
const consentAccept = document.getElementById('consentAccept');
const consentDecline = document.getElementById('consentDecline');

let saves = [];
let pool = [];
let currentIndex = 0;
let deferredPrompt = null;

/* ---------- Starfield (canvas) - non-blocking, lightweight ---------- */
function startStarfield(){
  const canvas = starCanvas;
  if(!canvas) return ()=>{};
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  function resize(){ canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; }
  resize();
  window.addEventListener('resize', resize);
  const stars = [];
  const STAR_COUNT = Math.max(60, Math.floor((canvas.width*canvas.height)/(140000)));
  for(let i=0;i<STAR_COUNT;i++){
    stars.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*1.4 + 0.2,
      vx: (Math.random()-0.5)*0.03,
      vy: (Math.random()-0.5)*0.03,
      alpha: Math.random()*0.9 + 0.1
    });
  }
  let running = true;
  function frame(){
    if(!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const s of stars){
      s.x += s.vx; s.y += s.vy;
      if(s.x<0) s.x = canvas.width;
      if(s.x>canvas.width) s.x = 0;
      if(s.y<0) s.y = canvas.height;
      if(s.y>canvas.height) s.y = 0;
      ctx.beginPath();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = 'white';
      ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
  return ()=>{ running=false; };
}

/* ---------- Theme handling (preserve v2.1 behavior) ---------- */
function applyTheme(mode){
  if(mode==='auto'){
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
  }
  if(themeAutoBtn) themeAutoBtn.setAttribute('aria-pressed', mode==='auto');
  if(themeLightBtn) themeLightBtn.setAttribute('aria-pressed', mode==='light');
  if(themeDarkBtn) themeDarkBtn.setAttribute('aria-pressed', mode==='dark');
  try{ localStorage.setItem(THEME_KEY, mode); }catch(e){}
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
  if(saved==='auto' && window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=> applyTheme('auto'));
  }
}
if(themeAutoBtn) themeAutoBtn.addEventListener('click', ()=> applyTheme('auto'));
if(themeLightBtn) themeLightBtn.addEventListener('click', ()=> applyTheme('light'));
if(themeDarkBtn) themeDarkBtn.addEventListener('click', ()=> applyTheme('dark'));

/* ---------- Date/time ---------- */
function now(){ return new Date(); }
function formatTime(d){ return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }
function formatDate(d){ return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}); }
function updateDateTime(){ if(dateTime) dateTime.textContent = `${formatDate(now())} • ${formatTime(now())}`; }
setInterval(updateDateTime,1000); updateDateTime();

/* ---------- Storage ---------- */
function loadSaves(){ try{ const raw=localStorage.getItem(STORAGE_KEY); saves = raw?JSON.parse(raw):[]; }catch(e){ saves=[]; } }
function saveSaves(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(saves)); }catch(e){} }

/* ---------- Affirmations ---------- */
function buildPool(){ pool = [...DEFAULT_AFFIRMATIONS, ...saves]; }
function animateText(text){
  if(!affirmationTextEl) return;
  affirmationTextEl.style.opacity = 0;
  affirmationTextEl.style.transform = 'translateY(6px)';
  setTimeout(()=>{ affirmationTextEl.textContent = text; affirmationTextEl.style.transition='opacity .35s ease, transform .35s ease'; affirmationTextEl.style.opacity=1; affirmationTextEl.style.transform='translateY(0)'; },120);
}
function showAffirmation(index){
  if(!pool || !pool.length) return;
  currentIndex = ((index%pool.length)+pool.length)%pool.length;
  animateText(pool[currentIndex]);
}
function showNext(){ showAffirmation(currentIndex+1); }
function showPrev(){ showAffirmation(currentIndex-1); }
function showRandom(){ showAffirmation(Math.floor(Math.random()*pool.length)); }

/* Simple on-device generator */
const SUBJECTS=["You","I","We","This moment","Your heart"];
const TRAITS=["are capable","are enough","deserve rest","are growing","bring light","are resilient"];
const ADVERBS=["today","right now","with ease","without apology","gently"];
const COMPLEMENTS=["to create what you imagine.","and attract good things.","and learn with grace.","and breathe deeply.","and take one small step forward.","and rebuild with kindness."];
function generateAffirmation(seedText=''){
  const s=SUBJECTS[Math.floor(Math.random()*SUBJECTS.length)];
  const t=TRAITS[Math.floor(Math.random()*TRAITS.length)];
  const a=ADVERBS[Math.floor(Math.random()*ADVERBS.length)];
  const c=COMPLEMENTS[Math.floor(Math.random()*COMPLEMENTS.length)];
  const parts=[`${s} ${t} ${a}`, c];
  if(seedText && Math.random()>0.3){ const cleaned=seedText.trim().split(' ').slice(0,3).join(' '); parts.unshift(`${cleaned},`); }
  return parts.join(' ');
}

/* ---------- Saved list UI ---------- */
function renderSavedList(){
  if(!savedList) return;
  savedList.innerHTML=''; if(!saves.length){ savedList.textContent='No saved affirmations yet.'; return; }
  saves.forEach((s,i)=>{ const div=document.createElement('div'); div.className='item'; const span=document.createElement('div'); span.textContent=s; span.style.flex='1'; span.style.marginRight='8px'; const useBtn=document.createElement('button'); useBtn.textContent='Use'; useBtn.addEventListener('click',()=>{ const idx=pool.indexOf(s); if(idx>=0) showAffirmation(idx); }); const delBtn=document.createElement('button'); delBtn.textContent='Delete'; delBtn.addEventListener('click',()=>{ saves.splice(i,1); saveSaves(); buildPool(); renderSavedList(); }); const actions=document.createElement('div'); actions.appendChild(useBtn); actions.appendChild(delBtn); div.appendChild(span); div.appendChild(actions); savedList.appendChild(div); });
}

/* ---------- UI interactions ---------- */
if(document.getElementById('btn-next')) document.getElementById('btn-next').addEventListener('click', showNext);
if(document.getElementById('btn-prev')) document.getElementById('btn-prev').addEventListener('click', showPrev);
if(document.getElementById('btn-random')) document.getElementById('btn-random').addEventListener('click', showRandom);
if(document.getElementById('btn-generate')) document.getElementById('btn-generate').addEventListener('click', ()=>{ const seed=prompt('Give a seed word (optional) to bias the affirmation:'); const gen=generateAffirmation(seed||''); animateText(gen); });

if(document.getElementById('btn-add-toggle')) document.getElementById('btn-add-toggle').addEventListener('click', ()=>{ const open=addForm.classList.contains('hidden'); addForm.classList.toggle('hidden', !open); addForm.setAttribute('aria-hidden', String(!open)); if(open) newAff.focus(); });
if(document.getElementById('btn-save')) document.getElementById('btn-save').addEventListener('click', ()=>{ const text = (affirmationTextEl && affirmationTextEl.textContent) ? affirmationTextEl.textContent.trim() : ''; if(!text) return; if(!saves.includes(text)) saves.unshift(text); else saves=[text,...saves.filter(s=>s!==text)]; saveSaves(); buildPool(); renderSavedList(); });
if(document.getElementById('btn-cancel')) document.getElementById('btn-cancel').addEventListener('click', ()=>{ addForm.classList.add('hidden'); addForm.setAttribute('aria-hidden','true'); });
if(addForm) addForm.addEventListener('submit',(e)=>{ e.preventDefault(); const text=newAff.value.trim(); if(!text) return; saves.unshift(text); saveSaves(); buildPool(); renderSavedList(); newAff.value=''; addForm.classList.add('hidden'); });

/* Consent banner */
function showConsentIfNeeded(){ const c = localStorage.getItem(CONSENT_KEY); if(c===null){ if(consentBanner) consentBanner.classList.remove('hidden'); if(consentBanner) consentBanner.setAttribute('aria-hidden','false'); } else { if(c==='accepted') Analytics.init(); } }
if(consentAccept) consentAccept.addEventListener('click', ()=>{ localStorage.setItem(CONSENT_KEY,'accepted'); if(consentBanner) consentBanner.classList.add('hidden'); Analytics.init(); });
if(consentDecline) consentDecline.addEventListener('click', ()=>{ localStorage.setItem(CONSENT_KEY,'declined'); if(consentBanner) consentBanner.classList.add('hidden'); });

/* service worker registration (preserve behavior) */
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=> {
    try{ await navigator.serviceWorker.register('sw.js'); console.log('SW registered'); }catch(e){ console.warn('SW failed', e); }
  });
}

/* install prompt handling (preserve) */
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; const ip=document.getElementById('installPrompt'); if(ip) ip.classList.remove('hidden'); if(ip) ip.setAttribute('aria-hidden','false'); });
const installBtn = document.getElementById('btn-install');
if(installBtn) installBtn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt=null; const ip=document.getElementById('installPrompt'); if(ip) ip.classList.add('hidden'); });
const installDismiss = document.getElementById('btn-dismiss-install');
if(installDismiss) installDismiss.addEventListener('click', ()=>{ deferredPrompt=null; const ip=document.getElementById('installPrompt'); if(ip) ip.classList.add('hidden'); });

/* Init */
let stopStarfield = ()=>{};
function init(){
  loadSaves(); buildPool(); renderSavedList();
  stopStarfield = startStarfield();
  setTimeout(()=>{ if(splash){ splash.style.opacity=0; setTimeout(()=>{ splash.style.display='none'; stopStarfield(); if(appMain) appMain.classList.remove('hidden'); },400); } }, 2600);
  showConsentIfNeeded();
  setTimeout(()=> showRandom(), 3000);
}
init();

/* Analytics stub (local-first) */
const Analytics = {
  endpoint: '',
  queueKey: 'affirm:v2.1:analytics_queue',
  enabled: false,
  init(){ this.enabled = true; const q = this._loadQueue(); if(this.endpoint){ q.forEach(evt=> navigator.sendBeacon(this.endpoint, JSON.stringify(evt))); localStorage.removeItem(this.queueKey);} },
  track(eventName, payload={}){ if(!localStorage.getItem(CONSENT_KEY) || localStorage.getItem(CONSENT_KEY)!=='accepted') return; const evt={name:eventName,ts:Date.now(),payload}; const q=this._loadQueue(); q.push(evt); localStorage.setItem(this.queueKey, JSON.stringify(q)); if(this.endpoint){ try{ navigator.sendBeacon(this.endpoint, JSON.stringify(evt)); }catch(e){} } },
  _loadQueue(){ try{ const raw = localStorage.getItem(this.queueKey); return raw?JSON.parse(raw):[] }catch(e){ return [] } }
};
