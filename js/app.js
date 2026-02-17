/* v2.4.1 app.js
 * Core behavior for Affirm. PWA
 * - Splash transition + shooting stars
 * - Affirmation deck (defaults + custom + AI-like generator)
 * - Theme switching (auto / light / dark)
 * - LocalStorage persistence
 * - Analytics consent + install prompt wiring
 */

(function () {
  // --- Constants ---------------------------------------------------------

  const STORAGE_KEYS = {
    customAffirmations: 'affirm_custom_v1',
    currentIndex: 'affirm_index_v1',
    theme: 'affirm_theme_v1',
    consent: 'affirm_consent_v1',
    installDismissed: 'affirm_install_dismissed_v1'
  };

  const CONSENT_VALUES = {
    accepted: 'accepted',
    declined: 'declined'
  };

  const INITIAL_MESSAGE =
    'Tap AI ✨ to generate an affirmation.';

  const DEFAULT_AFFIRMATIONS = [
    'I am grounded, present, and at peace.',
    'I am becoming the best version of myself, one small step at a time.',
    'My mind is clear, focused, and creative.',
    'I deserve good things and I welcome them into my life.',
    'I am proud of how far I have already come.',
    'I trust the timing of my life.',
    'I am resilient. I bend, but I do not break.',
    'My work, my art, and my presence matter.',
    'I choose to speak to myself with kindness.',
    'I release what I cannot control and return to what I can.',
    'I am safe, I am supported, and I am loved.',
    'Today, I will find at least one thing to celebrate.'
  ];

  // --- State -------------------------------------------------------------

  const state = {
    customAffirmations: [],
    currentIndex: 0,
    themeMode: 'auto', // 'auto' | 'light' | 'dark'
    consent: null, // 'accepted' | 'declined' | null
    installPromptEvent: null
  };

  const el = {};

  // --- Utilities ---------------------------------------------------------

  function safeLocalStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota / privacy errors
    }
  }

  function getAllAffirmations() {
    return DEFAULT_AFFIRMATIONS.concat(state.customAffirmations);
  }

  function clampIndex(index) {
    const list = getAllAffirmations();
    if (list.length === 0) return 0;
    const max = list.length - 1;
    if (index < 0) return max;
    if (index > max) return 0;
    return index;
  }

  function isInitialMessageShown() {
    return (
      el.affirmationText &&
      el.affirmationText.textContent.trim() === INITIAL_MESSAGE
    );
  }

  function track(eventName, data) {
    const a = window.AffirmAnalytics;
    if (!a || typeof a.track !== 'function') return;
    a.track(eventName, data || {});
  }

  function setAnalyticsConsent(value) {
    state.consent = value;
    safeLocalStorageSet(STORAGE_KEYS.consent, value);

    const a = window.AffirmAnalytics;
    if (!a) return;

    if (value === CONSENT_VALUES.accepted && typeof a.enable === 'function') {
      a.enable();
    }
    if (value === CONSENT_VALUES.declined && typeof a.disable === 'function') {
      a.disable();
    }
  }

  // --- DOM helpers -------------------------------------------------------

  function query(selector) {
    return document.querySelector(selector);
  }

  function cacheElements() {
    el.splash = query('#splash');
    el.app = query('#app');
    el.dateTime = query('#dateTime');
    el.affirmationText = query('#affirmationText');
    el.savedList = query('#savedList');

    el.btnPrev = query('#btn-prev');
    el.btnNext = query('#btn-next');
    el.btnGenerate = query('#btn-generate');
    el.btnAddToggle = query('#btn-add-toggle');
    el.btnSave = query('#btn-save');
    el.btnRandom = query('#btn-random');
    el.btnCancel = query('#btn-cancel');

    el.addForm = query('#addForm');
    el.newAffirmation = query('#newAffirmation');

    el.themeAuto = query('#themeAuto');
    el.themeLight = query('#themeLight');
    el.themeDark = query('#themeDark');

    el.consentBanner = query('#consentBanner');
    el.consentAccept = query('#consentAccept');
    el.consentDecline = query('#consentDecline');

    el.installPrompt = query('#installPrompt');
    el.btnInstall = query('#btn-install');
    el.btnDismissInstall = query('#btn-dismiss-install');
  }

  // --- Splash + stars ----------------------------------------------------

  function hideSplash() {
    if (!el.splash || !el.app) return;

    el.splash.setAttribute('aria-hidden', 'true');
    el.splash.classList.add('hidden');

    el.app.classList.remove('hidden');
  }

  function spawnShootingStar() {
    const star = document.createElement('div');
    star.className = 'shooting-star';

    const top = 10 + Math.random() * 50;
    const left = -10 + Math.random() * 40;

    star.style.top = top + 'vh';
    star.style.left = left + 'vw';

    document.body.appendChild(star);

    star.addEventListener('animationend', function () {
      star.remove();
    });
  }

  function startStarEmitter() {
    setInterval(function () {
      if (document.hidden) return;
      if (Math.random() < 0.45) {
        spawnShootingStar();
      }
    }, 3500);
  }

  // --- Date + time -------------------------------------------------------

  function formatDateTime(now) {
    const datePart = now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const timePart = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });

    return datePart + ' • ' + timePart;
  }

  function updateDateTime() {
    if (!el.dateTime) return;
    el.dateTime.textContent = formatDateTime(new Date());
  }

  function startClock() {
    updateDateTime();
    setInterval(updateDateTime, 30 * 1000);
  }

  // --- Theme handling ----------------------------------------------------

  function resolveSystemTheme() {
    if (!window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(mode) {
    state.themeMode = mode;
    safeLocalStorageSet(STORAGE_KEYS.theme, mode);

    const resolved =
      mode === 'auto' ? resolveSystemTheme() : mode;

    if (el.app) {
      el.app.setAttribute('data-theme', resolved);
    }

    document.documentElement.setAttribute('data-theme', resolved);

    [el.themeAuto, el.themeLight, el.themeDark].forEach(function (btn) {
      if (!btn) return;
      const isActive = btn.dataset.mode === mode;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    track('theme_change', { mode: mode, resolved: resolved });
  }

  function initTheme() {
    const stored = safeLocalStorageGet(STORAGE_KEYS.theme);
    const initial = stored || 'auto';

    applyTheme(initial);

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', function () {
        if (state.themeMode === 'auto') {
          applyTheme('auto');
        }
      });
    }

    if (el.themeAuto) {
      el.themeAuto.addEventListener('click', function () {
        applyTheme('auto');
      });
    }
    if (el.themeLight) {
      el.themeLight.addEventListener('click', function () {
        applyTheme('light');
      });
    }
    if (el.themeDark) {
      el.themeDark.addEventListener('click', function () {
        applyTheme('dark');
      });
    }
  }

  // --- Affirmations ------------------------------------------------------

  function loadCustomAffirmations() {
    const raw = safeLocalStorageGet(STORAGE_KEYS.customAffirmations);
    if (!raw) {
      state.customAffirmations = [];
      return;
    }
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        state.customAffirmations = list
          .map(function (t) {
            return String(t || '').trim();
          })
          .filter(function (t) {
            return t.length > 0;
          });
      }
    } catch {
      state.customAffirmations = [];
    }
  }

  function persistCustomAffirmations() {
    safeLocalStorageSet(
      STORAGE_KEYS.customAffirmations,
      JSON.stringify(state.customAffirmations)
    );
  }

  function loadCurrentIndex() {
    const raw = safeLocalStorageGet(STORAGE_KEYS.currentIndex);
    if (!raw) return;
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      state.currentIndex = clampIndex(parsed);
    }
  }

  function persistCurrentIndex() {
    safeLocalStorageSet(
      STORAGE_KEYS.currentIndex,
      String(state.currentIndex)
    );
  }

  function renderAffirmation() {
    if (!el.affirmationText) return;

    const list = getAllAffirmations();

    if (list.length === 0) {
      el.affirmationText.textContent = INITIAL_MESSAGE;
      return;
    }

    state.currentIndex = clampIndex(state.currentIndex);
    const text = list[state.currentIndex];

    el.affirmationText.textContent = text;
    persistCurrentIndex();
  }

  function renderSavedList() {
    if (!el.savedList) return;

    el.savedList.innerHTML = '';

    state.customAffirmations.forEach(function (text, index) {
      const item = document.createElement('div');
      item.className = 'item';

      const span = document.createElement('span');
      span.textContent = text;

      const useBtn = document.createElement('button');
      useBtn.className = 'ghost';
      useBtn.textContent = 'Use';

      useBtn.addEventListener('click', function () {
        const offset = DEFAULT_AFFIRMATIONS.length;
        state.currentIndex = offset + index;
        track('saved_use', { index: index });
        renderAffirmation();
      });

      item.appendChild(span);
      item.appendChild(useBtn);

      el.savedList.appendChild(item);
    });
  }

  function nextAffirmation() {
    const list = getAllAffirmations();
    if (list.length === 0) return;
    state.currentIndex = clampIndex(state.currentIndex + 1);
    track('affirm_next', { index: state.currentIndex });
    renderAffirmation();
  }

  function prevAffirmation() {
    const list = getAllAffirmations();
    if (list.length === 0) return;
    state.currentIndex = clampIndex(state.currentIndex - 1);
    track('affirm_prev', { index: state.currentIndex });
    renderAffirmation();
  }

  function generateAffirmation() {
    const subjects = [
      'I',
      'My future self',
      'My mind',
      'My body',
      'My spirit'
    ];

    const verbs = [
      'is aligning with',
      'is open to',
      'is worthy of',
      'is learning from',
      'is gently moving toward'
    ];

    const qualities = [
      'abundance',
      'clarity',
      'peace',
      'courage',
      'creative flow',
      'deep rest',
      'authentic expression',
      'joyful growth'
    ];

    const contexts = [
      'in this exact season of life.',
      'even when I do not see every step.',
      'no matter how slowly I go.',
      'in ways that feel safe and sustainable.',
      'while I stay kind to myself.',
      'one intentional choice at a time.'
    ];

    function pick(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    const parts = [
      pick(subjects),
      pick(verbs),
      pick(qualities),
      pick(contexts)
    ];

    return parts.join(' ');
  }

  function onGenerateClick() {
    const text = generateAffirmation();
    if (!el.affirmationText) return;

    el.affirmationText.textContent = text;

    if (!state.customAffirmations.includes(text)) {
      state.customAffirmations.push(text);
      persistCustomAffirmations();
      renderSavedList();
    }

    const idx = getAllAffirmations().indexOf(text);
    if (idx >= 0) {
      state.currentIndex = idx;
      persistCurrentIndex();
    }

    track('affirm_generate', {});
  }

  function toggleAddForm(show) {
    if (!el.addForm) return;

    const shouldShow =
      typeof show === 'boolean'
        ? show
        : el.addForm.classList.contains('hidden');

    if (shouldShow) {
      el.addForm.classList.remove('hidden');
      el.addForm.setAttribute('aria-hidden', 'false');
      if (el.newAffirmation) {
        el.newAffirmation.focus();
      }
    } else {
      el.addForm.classList.add('hidden');
      el.addForm.setAttribute('aria-hidden', 'true');
      if (el.newAffirmation) {
        el.newAffirmation.value = '';
      }
    }
  }

  function onAddSubmit(event) {
    event.preventDefault();
    if (!el.newAffirmation) return;

    const value = el.newAffirmation.value.trim();
    if (!value) return;

    if (!state.customAffirmations.includes(value)) {
      state.customAffirmations.push(value);
      persistCustomAffirmations();
      renderSavedList();
    }

    const idx = getAllAffirmations().indexOf(value);
    if (idx >= 0) {
      state.currentIndex = idx;
      persistCurrentIndex();
    }

    track('affirm_add_custom', {});

    toggleAddForm(false);
    renderAffirmation();
  }

  function onSaveCurrent() {
    if (!el.affirmationText) return;

    const text = el.affirmationText.textContent.trim();
    if (!text || text === INITIAL_MESSAGE) return;

    if (!state.customAffirmations.includes(text)) {
      state.customAffirmations.push(text);
      persistCustomAffirmations();
      renderSavedList();
      track('affirm_save', {});
    }
  }

  function onRandom() {
    const list = getAllAffirmations();
    if (list.length === 0) return;

    const next = Math.floor(Math.random() * list.length);
    state.currentIndex = next;
    persistCurrentIndex();
    track('affirm_random', { index: next });
    renderAffirmation();
  }

  // --- Focus (fix aria-hidden + focused descendant) ----------------------

  function moveFocusOutOf(elContainer) {
    if (!elContainer || !elContainer.contains(document.activeElement)) return;
    var target = el.app && (el.btnGenerate || el.btnNext || el.affirmationText);
    if (target && typeof target.focus === 'function') {
      target.focus();
    } else {
      document.body.focus();
    }
  }

  // --- Consent banner ----------------------------------------------------

  function initConsent() {
    const stored = safeLocalStorageGet(STORAGE_KEYS.consent);
    if (stored === CONSENT_VALUES.accepted || stored === CONSENT_VALUES.declined) {
      setAnalyticsConsent(stored);
    }

    const shouldShow =
      !state.consent &&
      el.consentBanner &&
      el.consentAccept &&
      el.consentDecline;

    if (!shouldShow) {
      if (el.consentBanner) {
        el.consentBanner.setAttribute('aria-hidden', 'true');
        el.consentBanner.classList.add('hidden');
      }
      return;
    }

    // While consent is showing, keep install prompt hidden
    if (el.installPrompt) {
      el.installPrompt.classList.add('hidden');
      el.installPrompt.setAttribute('aria-hidden', 'true');
    }

    el.consentBanner.classList.remove('hidden');
    el.consentBanner.setAttribute('aria-hidden', 'false');

    el.consentAccept.addEventListener('click', function () {
      setAnalyticsConsent(CONSENT_VALUES.accepted);
      if (el.consentBanner) {
        moveFocusOutOf(el.consentBanner);
        el.consentBanner.classList.add('hidden');
        el.consentBanner.setAttribute('aria-hidden', 'true');
      }
      track('consent_accept', {});
      maybeShowInstallPrompt();
    });

    el.consentDecline.addEventListener('click', function () {
      setAnalyticsConsent(CONSENT_VALUES.declined);
      if (el.consentBanner) {
        moveFocusOutOf(el.consentBanner);
        el.consentBanner.classList.add('hidden');
        el.consentBanner.setAttribute('aria-hidden', 'true');
      }
      track('consent_decline', {});
      maybeShowInstallPrompt();
    });
  }

  // --- Install prompt ----------------------------------------------------

  function maybeShowInstallPrompt() {
    if (!el.installPrompt) return;
    if (!state.installPromptEvent) return;

    const dismissed = safeLocalStorageGet(
      STORAGE_KEYS.installDismissed
    );
    if (dismissed === 'true') return;

    // Do not stack with consent banner
    if (el.consentBanner && !el.consentBanner.classList.contains('hidden')) {
      return;
    }

    el.installPrompt.classList.remove('hidden');
    el.installPrompt.setAttribute('aria-hidden', 'false');

    track('install_prompt_shown', {});
  }

  function initInstallPrompt() {
    if (!el.installPrompt) return;

    el.installPrompt.classList.add('hidden');
    el.installPrompt.setAttribute('aria-hidden', 'true');

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      state.installPromptEvent = event;

      // If consent is not yet resolved, wait until it is handled
      if (!state.consent) {
        return;
      }

      maybeShowInstallPrompt();
    });

    if (el.btnInstall) {
      el.btnInstall.addEventListener('click', function () {
        const e = state.installPromptEvent;
        if (!e) return;

        e.prompt();
        e.userChoice.then(function (choice) {
          track('install_choice', { outcome: choice.outcome });
        });

        moveFocusOutOf(el.installPrompt);
        el.installPrompt.classList.add('hidden');
        el.installPrompt.setAttribute('aria-hidden', 'true');
        state.installPromptEvent = null;
      });
    }

    if (el.btnDismissInstall) {
      el.btnDismissInstall.addEventListener('click', function () {
        moveFocusOutOf(el.installPrompt);
        el.installPrompt.classList.add('hidden');
        el.installPrompt.setAttribute('aria-hidden', 'true');
        safeLocalStorageSet(STORAGE_KEYS.installDismissed, 'true');
        track('install_dismiss', {});
      });
    }
  }

  // --- Service worker registration --------------------------------------

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('./sw.js')
      .then(function () {
        // logged for debugging only
        console.log('Affirm SW registered');
      })
      .catch(function (error) {
        console.warn('Affirm SW registration failed', error);
      });
  }

  // --- Event wiring ------------------------------------------------------

  function wireControls() {
    if (el.btnNext) {
      el.btnNext.addEventListener('click', nextAffirmation);
    }
    if (el.btnPrev) {
      el.btnPrev.addEventListener('click', prevAffirmation);
    }
    if (el.btnGenerate) {
      el.btnGenerate.addEventListener('click', onGenerateClick);
    }
    if (el.btnAddToggle) {
      el.btnAddToggle.addEventListener('click', function () {
        toggleAddForm();
      });
    }
    if (el.btnCancel) {
      el.btnCancel.addEventListener('click', function () {
        toggleAddForm(false);
      });
    }
    if (el.addForm) {
      el.addForm.addEventListener('submit', onAddSubmit);
    }
    if (el.btnSave) {
      el.btnSave.addEventListener('click', onSaveCurrent);
    }
    if (el.btnRandom) {
      el.btnRandom.addEventListener('click', onRandom);
    }
  }

  // --- Init --------------------------------------------------------------

  function loadState() {
    loadCustomAffirmations();
    loadCurrentIndex();
  }

  function initialRender() {
    if (el.affirmationText) {
      el.affirmationText.textContent = INITIAL_MESSAGE;
    }
    renderSavedList();
    renderAffirmation();
  }

  function init() {
    cacheElements();
    loadState();

    wireControls();
    initTheme();
    initConsent();
    initInstallPrompt();

    initialRender();
    startClock();

    setTimeout(hideSplash, 550);
    startStarEmitter();
    registerServiceWorker();

    track('app_init', {});
  }

  document.addEventListener('DOMContentLoaded', init);
})();
