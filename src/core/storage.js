(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const core = require('./rankEngine.js');
    module.exports = factory(core);
  } else {
    root.LiftoffStorage = factory(root.LiftoffCore);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  const STORAGE_KEY = 'liftoff_rank_clone_v1';
  const memoryFallback = Object.create(null);

  // Normalizes Vietnamese / iOS decimal keyboard input ("," -> ".", strips invisible chars, handles Unicode minus)
  function parseDecimalInput(rawText) {
    if (typeof rawText === 'number') {
      return Number.isFinite(rawText) ? rawText : NaN;
    }
    if (typeof rawText !== 'string') return NaN;
    const cleaned = rawText
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF\s]/g, '')
      .replace(/[−–—]/g, '-')
      .replace(',', '.');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  // Strict whitelist sanitizer preventing NaN / corrupted JSON from poisoning state
  function validateStateSchema(candidate) {
    const base = core.createInitialState();
    if (!candidate || typeof candidate !== 'object') return base;

    base.lang = candidate.lang === 'vi' ? 'vi' : 'en';
    base.soundEnabled = candidate.soundEnabled !== false;

    if (candidate.profile && typeof candidate.profile === 'object') {
      if (typeof candidate.profile.name === 'string' && candidate.profile.name.trim()) {
        base.profile.name = candidate.profile.name.trim().slice(0, 32);
      }
      base.profile.sex = candidate.profile.sex === 'female' ? 'female' : 'male';
      base.profile.unit = candidate.profile.unit === 'lbs' ? 'lbs' : 'kg';
      base.profile.bodyweightKg = core.sanitizeBodyweightKg(Number(candidate.profile.bodyweightKg));
      base.profile.bodyweightConfirmed = Boolean(candidate.profile.bodyweightConfirmed);
      const rt = Number(candidate.profile.restTimerSec);
      if (Number.isFinite(rt) && rt >= 15 && rt <= 600) {
        base.profile.restTimerSec = Math.round(rt);
      }
    }

    if (Array.isArray(candidate.workouts)) {
      base.workouts = [];
      for (let i = 0; i < candidate.workouts.length; i += 1) {
        const w = candidate.workouts[i];
        if (!w || typeof w !== 'object' || !Array.isArray(w.entries)) continue;
        const safeEntries = [];
        for (let eIdx = 0; eIdx < w.entries.length; eIdx += 1) {
          const entry = w.entries[eIdx];
          if (!entry || typeof entry.exerciseId !== 'string' || !Array.isArray(entry.sets)) continue;
          const safeSets = [];
          for (let sIdx = 0; sIdx < entry.sets.length; sIdx += 1) {
            const s = entry.sets[sIdx];
            if (!s || typeof s !== 'object') continue;
            const wKg = Number(s.weightKg);
            const reps = Number(s.reps);
            if (!Number.isFinite(wKg) || !Number.isFinite(reps) || wKg < 0 || reps < 0) continue;
            safeSets.push({
              id: String(s.id || ('s_' + String(sIdx))),
              setType: s.setType === 'warmup' || s.setType === 'dropset' ? s.setType : 'working',
              weightKg: wKg,
              reps: Math.floor(reps),
              completed: s.completed !== false
            });
          }
          if (safeSets.length > 0) {
            safeEntries.push({ exerciseId: entry.exerciseId, sets: safeSets });
          }
        }
        if (safeEntries.length > 0) {
          base.workouts.push({
            id: String(w.id || ('wk_' + String(i))),
            title: typeof w.title === 'string' ? w.title.slice(0, 60) : '',
            completedAtMs: Number.isFinite(Number(w.completedAtMs)) ? Number(w.completedAtMs) : 0,
            durationSec: Number.isFinite(Number(w.durationSec)) ? Math.max(60, Math.round(Number(w.durationSec))) : 1800,
            bodyweightKg: core.sanitizeBodyweightKg(Number(w.bodyweightKg) || base.profile.bodyweightKg),
            entries: safeEntries
          });
        }
      }
    }

    if (candidate.nutritionLog && typeof candidate.nutritionLog === 'object') {
      const calT = Number(candidate.nutritionLog.caloriesTarget);
      const proT = Number(candidate.nutritionLog.proteinTargetG);
      if (Number.isFinite(calT) && calT >= 800 && calT <= 8000) base.nutritionLog.caloriesTarget = Math.round(calT);
      if (Number.isFinite(proT) && proT >= 30 && proT <= 400) base.nutritionLog.proteinTargetG = Math.round(proT);
      if (Array.isArray(candidate.nutritionLog.meals)) {
        base.nutritionLog.meals = candidate.nutritionLog.meals
          .filter(function (m) { return m && typeof m === 'object' && Number.isFinite(Number(m.kcal)); })
          .map(function (m, idx) {
            return {
              id: String(m.id || ('meal_' + String(idx))),
              name: String(m.name || 'Meal').slice(0, 40),
              kcal: Math.max(0, Math.round(Number(m.kcal))),
              proteinG: Math.max(0, Math.round(Number(m.proteinG) || 0)),
              loggedAtMs: Number.isFinite(Number(m.loggedAtMs)) ? Number(m.loggedAtMs) : 0
            };
          });
      }
    }

    if (candidate.activeSession && typeof candidate.activeSession === 'object' && Array.isArray(candidate.activeSession.entries)) {
      base.activeSession = candidate.activeSession;
    }

    return base;
  }

  function loadState() {
    let raw = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } catch (_err) {
      raw = memoryFallback[STORAGE_KEY] || null;
    }
    if (!raw) {
      raw = memoryFallback[STORAGE_KEY] || null;
    }
    if (!raw) return core.createInitialState();

    try {
      const parsed = JSON.parse(raw);
      return validateStateSchema(parsed);
    } catch (_parseErr) {
      return core.createInitialState();
    }
  }

  function saveState(state) {
    const clean = validateStateSchema(state);
    const serialized = JSON.stringify(clean);
    memoryFallback[STORAGE_KEY] = serialized;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
        return true;
      }
    } catch (_err) {
      return false;
    }
    return true;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    parseDecimalInput: parseDecimalInput,
    validateStateSchema: validateStateSchema,
    loadState: loadState,
    saveState: saveState
  };
});
