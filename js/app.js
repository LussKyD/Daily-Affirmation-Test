/* app.js - v2.4: preserved v2.3 behavior + shooting-star emitter (non-blocking) */

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

/* DOM refs */
const splash = document.getElementById('splash');
const starCanvas = document.getElementById('starfield');
const appMain = document.getElementById('app');
const affirmationTextEl = document.getElementById('affirmationText');
const savedList = document.getElementById('savedList');
const dateTime = document.getElementById('dateTime');

/* theme buttons */
const themeAutoBtn = document.getElementById('themeAuto');
const themeLightBtn = document.getElementById('themeLight');
const themeDarkBtn = document.getElementById('themeDark');

/* consent/install */
const consentBanner = document.getElementById('consentBanner');
const consentAccept = document.getElementById('consentAccept');
const consentDecline = document.getElementById('consentDecline');
const installPromptEl = document.getElementById('installPrompt');
const installBtn = document.getElementById('btn-install');
const installDismiss = document.getElementById('btn-dismiss-install');

let saves = [];
let pool = [];
let currentIndex = 0;
let deferredPrompt = null;

/* ---------- Shooting star emitter (non-blocking) ---------- */
function shootStarOnce(){
  // create a small element, animate across screen, then remove
  const star = document.createElement('div');
  star.className = 'shooting-star';
  // random start near top-left quadrant, random length and speed
  const startX = Math.random() * window.innerWidth * 0.6;
  const startY = Math.random() * window.innerHeight * 0.35;
  const length = 200 + Math.random() * 300;
  star.style.left = `${startX}px`;
  star.style.top = `${startY}px`;
  star.style.opacity = '0';
  document.body.appendChild(star);
  // force reflow then animate via transform
  requestAnimationFrame(()=>{
    star.style.transition = 'transform 1.2s cubic-bezier(.2,.8,.2,1), opacity .9s ease';
    star.style.opacity = '1';
    const dx = length * (0.8 + Math.random()*0.6);
    const dy = length * (0.1 + Math.random()*0.5);
    star.style.transform = `translate(${dx}px, ${dy}px) rotate(-30deg)`;
    // fade out then remove
    setTimeout(()=>{ star.style.opacity = '0'; }, 900);
    setTimeout(()=>{ try{ document.body.removeChild(star); }catch(e){} }, 1400);
  });
}
// periodically emit a shooting star, but very infrequent to keep CPU low
function startShootingStars(){
  const min = 3500; const max = 9000;
  let running = true;
  function tick(){
    if(!running) return;
    if(Math.random() < 0.45) shootStarOnce();
    setTimeout(tick, min + Math.random()*(max-min));
  }
  tick();
  return ()=>{ running=false; };
}

/* ---------- preserved v2.3 app logic (trimmed) ---------- */
function now(){ return new Date(); }
function formatTime(d){ return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }
function formatDate(d){ return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}); }
function updateDateTime(){ if(dateTime) dateTime.textContent = `${formatDate(now())} • ${formatTime(now())}`; }
setInterval(updateDateTime,1000); updateDateTime();

function loadSaves(){ try{ const raw=localStorage.getItem(STORAGE_KEY); saves = raw?JSON.parse(raw):[]; }catch(e){ saves=[]; } }
function saveSaves(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(saves)); }catch(e){} }
function buildPool(){ pool = [...DEFAULT_AFFIRMATIONS, ...saves]; }
function animateText(text){ if(!affirmationTextEl) return; affirmationTextEl.style.opacity = 0; affirmationTextEl.style.transform = 'translateY(6px)'; setTimeout(()=>{ affirmationTextEl.textContent = text; affirmationTextEl.style.transition='opacity .35s ease, transform .35s ease'; affirmationTextEl.style.opacity=1; affirmationTextEl.style.transform='translateY(0)'; },120); }
function showAffirmation(index){ if(!pool || !pool.length) return; currentIndex = ((index%pool.length)+pool.length)%pool.length; animateText(pool[currentIndex]); }
function showNext(){ showAffirmation(currentIndex+1); }
function showPrev(){ showAffirmation(currentIndex-1); }
function showRandom(){ showAffirmation(Math.floor(Math.random()*pool.length)); }

/* generator */
const SUBJECTS=["You","I","We","This moment","Your heart"];
const TRAITS=["are capable","are enough","deserve rest","are growing","bring light","are resilient"];
const ADVERBS=["today","right now","with ease","without apology","gently"];
const COMPLEMENTS=["to create what you imagine.","and attract good things.","and learn with grace.","and breathe deeply.","and take one small step forward.","and rebuild with kindness."];
function generateAffirmation(seedText=''){ const s=SUBJECTS[Math.floor(Math.random()*SUBJECTS.length)]; const t=TRAITS[Math.floor(Math.random()*TRAITS.length)]; const a=ADVERBS[Math.floor(Math.random()*ADVERBS.length)]; const c=COMPLEMENTS[Math.floor(Math.random()*COMPLEMENTS.length)]; const parts=[`${s} ${t} ${a}`, c]; if(seedText && Math.random()>0.3){ const cleaned=seedText.trim().split(' ').slice(0,3).join(' '); parts.unshift(`${cleaned},`); } return parts.join(' '); }

/* UI hooks (safe checks) */
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'btn-next') showNext();
  if(e.target && e.target.id === 'btn-prev') showPrev();
  if(e.target && e.target.id === 'btn-generate') { const seed = prompt('Give a seed word (optional) to bias the affirmation:'); const gen = generateAffirmation(seed || ''); animateText(gen); }
});

/* consent/install handlers */
if(consentAccept) consentAccept.addEventListener('click', ()=>{ localStorage.setItem(CONSENT_KEY,'accepted'); if(consentBanner) consentBanner.style.display='none'; Analytics.init(); });
if(consentDecline) consentDecline.addEventListener('click', ()=>{ localStorage.setItem(CONSENT_KEY,'declined'); if(consentBanner) consentBanner.style.display='none'; });
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; if(installPromptEl) installPromptEl.style.display='flex'; });
if(installBtn) installBtn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt=null; if(installPromptEl) installPromptEl.style.display='none'; });
if(installDismiss) installDismiss.addEventListener('click', ()=>{ deferredPrompt=null; if(installPromptEl) installPromptEl.style.display='none'; });

/* service worker registration */
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=> {
    try{ await navigator.serviceWorker.register('sw.js'); console.log('SW registered'); }catch(e){ console.warn('SW failed', e); }
  });
}

/* Init */
let stopStars = ()=>{};
function init(){ loadSaves(); buildPool(); try{ showRandom(); }catch(e){}; stopStars = startShootingStars(); // start stars
  // splash hide sequence (preserve timing)
  setTimeout(()=>{ if(splash){ splash.style.opacity=0; setTimeout(()=>{ try{ splash.style.display='none'; }catch(e){} if(appMain) appMain.classList.remove('hidden'); },400); } }, 2600);
  // consent show if needed
  const c = localStorage.getItem(CONSENT_KEY);
  if(c===null && consentBanner) { consentBanner.style.display='flex'; }
}
init();

/* Analytics stub */
const Analytics = {
  endpoint:'',
  queueKey:'affirm:v2.1:analytics_queue',
  enabled:false,
  init(){ this.enabled=true; const q=this._loadQueue(); if(this.endpoint){ q.forEach(evt=> navigator.sendBeacon(this.endpoint, JSON.stringify(evt))); localStorage.removeItem(this.queueKey); } },
  track(name,payload={}){ if(!localStorage.getItem(CONSENT_KEY) || localStorage.getItem(CONSENT_KEY)!=='accepted') return; const evt={name,ts:Date.now(),payload}; const q=this._loadQueue(); q.push(evt); localStorage.setItem(this.queueKey, JSON.stringify(q)); if(this.endpoint){ try{ navigator.sendBeacon(this.endpoint, JSON.stringify(evt)); }catch(e){} } },
  _loadQueue(){ try{ const raw=localStorage.getItem(this.queueKey); return raw?JSON.parse(raw):[] }catch(e){ return [] } }
};
