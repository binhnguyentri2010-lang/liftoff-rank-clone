(function () {
  'use strict';

  const catalog = window.LiftoffExercises;
  const core = window.LiftoffCore;
  const storage = window.LiftoffStorage;
  const i18n = window.LiftoffI18n;
  const badges = window.LiftoffBadges;
  const bodygraph = window.LiftoffBodygraph;
  const sound = window.LiftoffSound;

  let appState = storage.loadState();

  const ui = {
    activeTab: 'home', // workout | home | ranks | nutrition | friends | profile
    homeSubtab: 'foryou', // foryou | friends | discovery
    ranksViewMode: 'front', // front | back
    selectedMuscleId: 'lower_chest',
    pickerOpen: false,
    pickerAddingToActive: false,
    pickerCategory: 'all',
    pickerSearch: '',
    pickerSelectedIds: ['bench_press', 'barbell_squat', 'lat_pulldown'],
    celebrationData: null,
    toastMessage: '',
    restEndAtMs: 0,
    calcExerciseId: 'bench_press',
    calcWeightText: '70',
    calcRepsText: '8'
  };

  let tickerId = null;

  function stopTicker() {
    if (tickerId !== null) {
      clearInterval(tickerId);
      tickerId = null;
    }
  }

  function syncTicker() {
    if (typeof document !== 'undefined' && document.hidden) {
      stopTicker();
      return;
    }
    const needsTick = Boolean(appState.activeSession) || ui.restEndAtMs > Date.now();
    if (needsTick && tickerId === null) {
      tickerId = setInterval(onSecondTick, 1000);
    } else if (!needsTick && tickerId !== null) {
      stopTicker();
    }
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return String(m).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
  }

  function onSecondTick() {
    const now = Date.now();
    if (ui.restEndAtMs > 0 && now >= ui.restEndAtMs) {
      ui.restEndAtMs = 0;
      sound.playRestDone(appState.soundEnabled);
      renderAll();
      return;
    }

    const durEl = document.getElementById('live-session-duration');
    if (durEl && appState.activeSession) {
      const elapsedSec = Math.max(0, Math.floor((now - appState.activeSession.startedAtMs) / 1000));
      durEl.textContent = formatDuration(elapsedSec);
    }

    const restEl = document.getElementById('live-rest-countdown');
    if (restEl) {
      if (ui.restEndAtMs > now) {
        const leftSec = Math.ceil((ui.restEndAtMs - now) / 1000);
        restEl.textContent = i18n.t(appState.lang, 'restTimer') + ' ' + formatDuration(leftSec);
      } else {
        restEl.textContent = i18n.t(appState.lang, 'restTimer') + ' ' + String(appState.profile.restTimerSec) + 's';
      }
    }
    syncTicker();
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tr(key) {
    return i18n.t(appState.lang, key);
  }

  function exName(ex) {
    if (!ex) return '';
    return appState.lang === 'vi' ? ex.nameVi : ex.nameEn;
  }

  function exCue(ex) {
    if (!ex) return '';
    return appState.lang === 'vi' ? ex.cueVi : ex.cueEn;
  }

  function tierName(tier) {
    if (!tier) return '';
    return appState.lang === 'vi' ? tier.nameVi : tier.nameEn;
  }

  function muscleName(m) {
    if (!m) return '';
    return appState.lang === 'vi' ? m.nameVi : m.nameEn;
  }

  function dispatch(action) {
    const now = Date.now();
    const outcome = core.reduceAppState(appState, action, now);
    appState = outcome.state;
    storage.saveState(appState);

    if (outcome.celebration) {
      if (outcome.celebration.emptyError) {
        showToast(tr('emptyPostWarn'));
      } else {
        ui.celebrationData = outcome.celebration;
        ui.restEndAtMs = 0;
        const anyTierUp = outcome.celebration.overallTierUpgraded ||
          outcome.celebration.exerciseRankUps.some(function (x) { return x.tierUpgraded; });
        sound.playRankUpFanfare(appState.soundEnabled, anyTierUp);
      }
    }
    syncTicker();
    renderAll();
  }

  let toastTimeout = null;
  function showToast(msg) {
    ui.toastMessage = msg;
    renderToast();
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      ui.toastMessage = '';
      renderToast();
    }, 3200);
  }

  function renderToast() {
    const el = document.getElementById('toast-container');
    if (!el) return;
    if (!ui.toastMessage) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML =
      '<div style="background:#1E293B;border:1px solid #F59E0B;color:#FEF3C7;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:700;box-shadow:0 10px 24px rgba(0,0,0,0.5);">' +
      escapeHtml(ui.toastMessage) +
      '</div>';
  }

  function renderQuestRingSvg(pct) {
    const r = 18;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
    return (
      '<div class="quest-ring-wrap tabular">' +
      '<svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true" style="position:absolute;inset:0;transform:rotate(-90deg);">' +
      '<circle cx="23" cy="23" r="' + r + '" stroke="rgba(255,255,255,0.22)" stroke-width="4" fill="none"/>' +
      '<circle cx="23" cy="23" r="' + r + '" stroke="#4ADE80" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" fill="none"/>' +
      '</svg>' +
      '<span>' + String(pct) + '%</span>' +
      '</div>'
    );
  }

  function renderHeader(snap) {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    const soundBellSvg = appState.soundEnabled
      ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="#FACC15" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>'
      : '<svg width="19" height="19" viewBox="0 0 24 24" fill="#64748B" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/><line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" stroke-width="2.2"/></svg>';

    const flameColor = snap.streakDays > 0 ? '#FB923C' : '#525870';

    headerEl.innerHTML =
      '<button type="button" id="btn-header-profile" class="level-cluster" data-action="go-tab" data-tab="profile" aria-label="Profile Level ' + snap.level + '">' +
      '<span class="avatar-wrap">' + badges.renderAvatarSvg() + '</span>' +
      '<span class="level-track-group">' +
      '<span class="level-label tabular">Lv.' + String(snap.level) + '</span>' +
      '<span class="xp-bar-outer"><span class="xp-bar-inner" style="width:' + Math.max(10, snap.levelProgressPct) + '%;"></span></span>' +
      '</span>' +
      '</button>' +

      '<div class="header-counters">' +
      '<div class="counter-pill tabular" title="Workout Streak">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + flameColor + '" aria-hidden="true"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>' +
      '<span>' + String(snap.streakDays) + '</span>' +
      '</div>' +
      '<div class="counter-pill tabular" title="Liftoff Gems">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#38BDF8" stroke="#BAE6FD" stroke-width="1.4"/><polygon points="12,5 17,12 12,19 7,12" fill="#E0F2FE"/></svg>' +
      '<span>' + String(snap.gems) + '</span>' +
      '</div>' +
      '<button type="button" id="btn-lang-toggle" class="lang-toggle-btn" data-action="toggle-lang" aria-label="Switch Language">' +
      (appState.lang === 'vi' ? 'VI' : 'EN') +
      '</button>' +
      '<button type="button" id="btn-sound-bell" class="icon-action-btn" data-action="toggle-sound" aria-label="Toggle Sound Effects">' +
      soundBellSvg +
      '</button>' +
      '</div>';
  }

  function renderHomeView(snap) {
    const hasRanked = snap.overallRating > 0;
    const heroEyebrow = hasRanked
      ? tr('bodyrankActiveTitle') + ' • ' + String(snap.rankedMusclesCount) + '/15'
      : tr('levelingUp');
    const heroHeadline = hasRanked
      ? tierName(snap.overallTierInfo.tier) + ' • ' + String(snap.overallRating) + ' pts (' + String(snap.overallTierInfo.lp) + ' LP)'
      : tr('unlockBodyrank');
    const heroPct = hasRanked
      ? (snap.overallTierInfo.tier.id === 'olympian' ? 100 : Math.max(12, snap.overallTierInfo.lp))
      : snap.bodyrankUnlockPct;

    const subtabsHtml =
      '<nav class="subtabs-row" aria-label="Home Feed Sections">' +
      '<button type="button" id="subtab-foryou" class="subtab-btn' + (ui.homeSubtab === 'foryou' ? ' is-active' : '') + '" data-action="set-home-subtab" data-subtab="foryou">' + escapeHtml(tr('forYou')) + '</button>' +
      '<button type="button" id="subtab-friends" class="subtab-btn' + (ui.homeSubtab === 'friends' ? ' is-active' : '') + '" data-action="set-home-subtab" data-subtab="friends">' + escapeHtml(tr('friends')) + '</button>' +
      '<button type="button" id="subtab-discovery" class="subtab-btn' + (ui.homeSubtab === 'discovery' ? ' is-active' : '') + '" data-action="set-home-subtab" data-subtab="discovery">' + escapeHtml(tr('discovery')) + '</button>' +
      '</nav>';

    if (ui.homeSubtab === 'friends') {
      return subtabsHtml + '<div class="main-content">' + renderFriendsLeaderboardInner(snap) + '</div>';
    }

    if (ui.homeSubtab === 'discovery') {
      return subtabsHtml + '<div class="main-content">' + renderDiscoveryFeedInner(snap) + '</div>';
    }

    // Group recovery summary across 6 major muscle zones
    const zones = [
      { labelEn: 'Chest', labelVi: 'Ngực', ids: ['upper_chest', 'lower_chest'] },
      { labelEn: 'Back & Lats', labelVi: 'Lưng & Xô', ids: ['lats', 'traps'] },
      { labelEn: 'Shoulders', labelVi: 'Vai', ids: ['front_delts', 'side_delts', 'rear_delts'] },
      { labelEn: 'Arms', labelVi: 'Tay trước/sau', ids: ['biceps', 'triceps', 'forearms'] },
      { labelEn: 'Quads & Glutes', labelVi: 'Đùi & Mông', ids: ['quads', 'glutes'] },
      { labelEn: 'Hamstrings & Core', labelVi: 'Đùi sau & Bụng', ids: ['hamstrings', 'calves', 'abs'] }
    ];

    let recoveryCellsHtml = '';
    for (let i = 0; i < zones.length; i += 1) {
      const z = zones[i];
      let minRec = 100;
      let bestTier = core.RANK_TIERS[0];
      for (let j = 0; j < z.ids.length; j += 1) {
        const mr = snap.muscleRanks[z.ids[j]];
        if (mr) {
          if (mr.recoveryPct < minRec) minRec = mr.recoveryPct;
          if (mr.tierInfo.tier.index > bestTier.index) bestTier = mr.tierInfo.tier;
        }
      }
      const barColor = minRec >= 85 ? '#4ADE80' : (minRec >= 55 ? '#FBBF24' : '#FB7185');
      const zName = appState.lang === 'vi' ? z.labelVi : z.labelEn;
      recoveryCellsHtml +=
        '<div class="recovery-item">' +
        '<div class="recovery-top">' +
        '<span>' + escapeHtml(zName) + '</span>' +
        '<span class="tabular" style="color:' + barColor + ';">' + String(minRec) + '%</span>' +
        '</div>' +
        '<div class="recovery-bar"><div class="recovery-bar-fill" style="width:' + String(minRec) + '%;background:' + barColor + ';"></div></div>' +
        '<div style="font-size:11.5px;color:' + bestTier.color + ';font-weight:700;">' + escapeHtml(tierName(bestTier)) + '</div>' +
        '</div>';
    }

    const unitLabel = appState.profile.unit;
    const bwDisplay = core.formatWeight(appState.profile.bodyweightKg, unitLabel) + '\u00A0' + unitLabel;
    const hasActiveSession = Boolean(appState.activeSession);

    return (
      subtabsHtml +
      '<main class="main-content">' +
      // Hero Bodyrank Progress Card
      '<button type="button" id="btn-hero-bodyrank" class="bodyrank-hero-card" data-action="go-tab" data-tab="ranks">' +
      '<div class="bodyrank-hero-top">' +
      '<div class="bodyrank-copy">' +
      '<p class="bodyrank-eyebrow">' + escapeHtml(heroEyebrow) + '</p>' +
      '<p class="bodyrank-headline">' + escapeHtml(heroHeadline) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="bodyrank-progress-track">' +
      '<div class="bodyrank-progress-fill" style="width:' + String(heroPct) + '%;"></div>' +
      '</div>' +
      '<div class="bodyrank-art-wrap">' +
      bodygraph.renderHeroTwinBodygraph(snap.muscleRanks, hasRanked) +
      '<span class="bodyrank-badge-float">' + badges.renderRankHexBadge(snap.overallTierInfo.tier.id, 46) + '</span>' +
      '</div>' +
      '</button>' +

      // Getting Started Section
      '<section class="section-block" aria-labelledby="sec-getting-started">' +
      '<div class="section-heading-row"><h2 id="sec-getting-started" class="section-title">' + escapeHtml(tr('gettingStarted')) + '</h2></div>' +
      '<div class="quest-carousel">' +
      '<div class="quest-card is-green">' +
      '<div>' +
      '<h3 class="quest-card-title">' + escapeHtml(tr('welcomeQuest')) + '</h3>' +
      '<p class="quest-card-desc">' + escapeHtml(tr('welcomeQuestDesc')) + '</p>' +
      '</div>' +
      '<div class="quest-card-footer">' +
      renderQuestRingSvg(snap.welcomeQuestPct) +
      '<button type="button" id="btn-quest-continue" class="quest-cta-btn" data-action="open-picker">' + escapeHtml(tr('continueBtn')) + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="quest-card is-blue">' +
      '<div>' +
      '<h3 class="quest-card-title">' + escapeHtml(tr('bwQuestTitle')) + ' (' + escapeHtml(bwDisplay) + ')</h3>' +
      '<p class="quest-card-desc">' + escapeHtml(tr('bwQuestDesc')) + '</p>' +
      '</div>' +
      '<div class="quest-card-footer">' +
      '<span class="tabular" style="font-size:13px;font-weight:800;color:#BAE6FD;">1-1000 LP</span>' +
      '<button type="button" id="btn-quest-bw" class="quest-cta-btn" data-action="go-tab" data-tab="profile">' + escapeHtml(tr('calibrateBtn')) + '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +

      // Rank Your Workout Crimson CTA Section
      '<section class="section-block" aria-labelledby="sec-rank-workout">' +
      '<div class="section-heading-row"><h2 id="sec-rank-workout" class="section-title">' + escapeHtml(tr('rankYourWorkout')) + '</h2></div>' +
      '<button type="button" id="btn-start-workout-cta" class="rank-workout-cta-card" data-action="' + (hasActiveSession ? 'go-tab' : 'open-picker') + '" data-tab="workout">' +
      '<span class="rank-workout-left">' +
      badges.renderDeadliftIllustration() +
      '<span>' +
      '<span class="rank-workout-label">' + escapeHtml(hasActiveSession ? tr('resumeWorkout') : tr('chooseExercises')) + '</span>' +
      '<span class="rank-workout-sub">' + escapeHtml(hasActiveSession ? (String(appState.activeSession.entries.length) + ' exercises active') : ('36+ lifts • Wood → Olympian')) + '</span>' +
      '</span>' +
      '</span>' +
      '<span class="rank-workout-start">' + escapeHtml(tr('startBtn')) + ' &#9654;</span>' +
      '</button>' +
      '</section>' +

      // Recovery Zone Section
      '<section class="section-block" aria-labelledby="sec-recovery">' +
      '<div class="section-heading-row"><h2 id="sec-recovery" class="section-title">' + escapeHtml(tr('recoveryZone')) + '</h2></div>' +
      '<div class="recovery-card">' + recoveryCellsHtml + '</div>' +
      '</section>' +
      '</main>'
    );
  }

  function buildNextRankHintHtml(ex, currentBestRating, sampleReps, bwKg, sex, unit) {
    const tierInfo = core.ratingToTierAndLp(currentBestRating);
    if (!tierInfo.nextTier) {
      return '<span>' + escapeHtml(tr('maxTierReached')) + '</span><span style="color:#FDE047;font-weight:800;">900+ LP</span>';
    }
    const targetFloor = tierInfo.nextTier.index === 1 ? 200 : tierInfo.nextTier.min;
    const nextTierObj = tierInfo.nextTier.index === 1 ? core.RANK_TIERS[2] : tierInfo.nextTier;
    const solved = core.solveWeightForRating(ex, targetFloor, sampleReps || 8, bwKg, sex, unit);
    if (!solved) return '';
    const loadLabel = ex.isBodyweight && solved.weightInUnit === 0
      ? ('BW × ' + String(solved.reps))
      : (String(solved.weightInUnit) + '\u00A0' + unit + ' × ' + String(solved.reps));
    return (
      '<span>' + escapeHtml(tr('nextRankTargetPrefix')) + ' <strong style="color:' + nextTierObj.color + ';">' +
      escapeHtml(tierName(nextTierObj)) + '</strong>:</span>' +
      '<strong class="tabular" style="color:#F8FAFC;">' + escapeHtml(loadLabel) + '</strong>'
    );
  }

  function renderSetRankBadgeInner(setItem, ex) {
    if (setItem.setType === 'warmup') {
      return '<span style="color:#FBBF24;">WARM</span><span style="color:#94A3B8;font-size:10px;">0 LP</span>';
    }
    const ev = core.evaluateSetStrength(setItem, ex, appState.profile.bodyweightKg, appState.profile.sex);
    if (!ev.valid) {
      return '<span style="color:#64748B;">—</span>';
    }
    return (
      '<span style="color:' + ev.tier.color + ';">' + escapeHtml(ev.tier.nameEn) + '</span>' +
      '<span class="tabular" style="color:#CBD5E1;font-size:10.5px;">' + String(ev.rating) + ' • ' + String(ev.lp) + 'LP</span>'
    );
  }

  function renderWorkoutTab(snap) {
    const unit = appState.profile.unit;
    if (!appState.activeSession) {
      let presetsHtml = '';
      for (let i = 0; i < catalog.WORKOUT_PRESETS.length; i += 1) {
        const p = catalog.WORKOUT_PRESETS[i];
        const title = appState.lang === 'vi' ? p.nameVi : p.nameEn;
        const subNames = p.exerciseIds.map(function (id) {
          return catalog.EXERCISE_BY_ID[id] ? catalog.EXERCISE_BY_ID[id].nameEn : id;
        }).join(' • ');
        presetsHtml +=
          '<div class="exercise-log-card">' +
          '<div>' +
          '<h3 class="exercise-log-title">' + escapeHtml(title) + '</h3>' +
          '<p class="exercise-cue">' + escapeHtml(subNames) + '</p>' +
          '</div>' +
          '<button type="button" class="quest-cta-btn" style="align-self:flex-start;background:#2563EB;" data-action="start-preset" data-preset="' + p.id + '">' +
          escapeHtml(tr('startRankedSession')) + ' &#9654;' +
          '</button>' +
          '</div>';
      }

      return (
        '<main class="main-content">' +
        '<button type="button" class="rank-workout-cta-card" data-action="open-picker">' +
        '<span class="rank-workout-left">' +
        badges.renderDeadliftIllustration() +
        '<span><span class="rank-workout-label">' + escapeHtml(tr('chooseExercises')) + '</span>' +
        '<span class="rank-workout-sub">' + escapeHtml(tr('startEmptyOrPick')) + '</span></span>' +
        '</span>' +
        '<span class="rank-workout-start">' + escapeHtml(tr('startBtn')) + ' &#9654;</span>' +
        '</button>' +
        '<section class="section-block">' +
        '<h2 class="section-title">' + escapeHtml(tr('quickPresets')) + '</h2>' +
        presetsHtml +
        '</section>' +
        '</main>'
      );
    }

    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - appState.activeSession.startedAtMs) / 1000));
    const isResting = ui.restEndAtMs > now;
    const restText = isResting
      ? (tr('restTimer') + ' ' + formatDuration(Math.ceil((ui.restEndAtMs - now) / 1000)))
      : (tr('restTimer') + ' ' + String(appState.profile.restTimerSec) + 's');

    const bwInUnit = core.formatWeight(appState.profile.bodyweightKg, unit);

    let entriesHtml = '';
    for (let i = 0; i < appState.activeSession.entries.length; i += 1) {
      const entry = appState.activeSession.entries[i];
      const ex = catalog.EXERCISE_BY_ID[entry.exerciseId];
      if (!ex) continue;
      const histStat = snap.exerciseStats[ex.id];

      // Determine best rating between historical and current session working sets
      let liveBestRating = histStat ? histStat.bestRating : 0;
      let refReps = 8;
      for (let sIdx = 0; sIdx < entry.sets.length; sIdx += 1) {
        const s = entry.sets[sIdx];
        if (s.reps >= 1) refReps = s.reps;
        const ev = core.evaluateSetStrength(s, ex, appState.profile.bodyweightKg, appState.profile.sex);
        if (ev.valid && ev.rating > liveBestRating) liveBestRating = ev.rating;
      }

      const currentTierInfo = core.ratingToTierAndLp(liveBestRating);

      let setsHtml = '';
      let workCounter = 0;
      for (let sIdx = 0; sIdx < entry.sets.length; sIdx += 1) {
        const s = entry.sets[sIdx];
        let badgeLabel = '';
        let typeCls = 'set-type-btn';
        if (s.setType === 'warmup') {
          badgeLabel = 'W';
          typeCls += ' is-warmup';
        } else if (s.setType === 'dropset') {
          badgeLabel = 'D';
          typeCls += ' is-dropset';
        } else {
          workCounter += 1;
          badgeLabel = String(workCounter);
        }

        const wDisplay = core.formatWeight(s.weightKg, unit);
        setsHtml +=
          '<div class="set-row' + (s.completed ? ' is-completed' : '') + '" data-set-row="' + s.id + '">' +
          '<button type="button" class="' + typeCls + '" data-action="cycle-set-type" data-ex="' + ex.id + '" data-set="' + s.id + '" title="Tap to switch Normal / Warmup (W) / Dropset (D)">' +
          badgeLabel +
          '</button>' +
          '<input type="text" inputmode="decimal" class="set-input tabular" aria-label="Weight in ' + unit + '" data-set-input="weight" data-ex="' + ex.id + '" data-set="' + s.id + '" value="' + escapeHtml(wDisplay) + '">' +
          '<input type="text" inputmode="numeric" class="set-input tabular" aria-label="Reps" data-set-input="reps" data-ex="' + ex.id + '" data-set="' + s.id + '" value="' + String(s.reps) + '">' +
          '<div class="live-rank-pill" id="rank-pill-' + s.id + '">' +
          renderSetRankBadgeInner(s, ex) +
          '</div>' +
          '<button type="button" class="set-check-btn' + (s.completed ? ' is-checked' : '') + '" data-action="toggle-set-done" data-ex="' + ex.id + '" data-set="' + s.id + '" aria-label="Complete set">' +
          '&#10003;' +
          '</button>' +
          '</div>';
      }

      const prevHint = histStat && histStat.lastSet
        ? (tr('prevCol') + ': ' + core.formatWeight(histStat.lastSet.weightKg, unit) + unit + ' × ' + String(histStat.lastSet.reps))
        : '';

      entriesHtml +=
        '<section class="exercise-log-card" data-ex-card="' + ex.id + '">' +
        '<div class="exercise-log-head">' +
        '<div>' +
        '<h3 class="exercise-log-title">' + escapeHtml(exName(ex)) + '</h3>' +
        '<p class="exercise-cue">' + escapeHtml(exCue(ex)) + (prevHint ? (' • ' + escapeHtml(prevHint)) : '') + '</p>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
        badges.renderRankHexBadge(currentTierInfo.tier.id, 38) +
        '</div>' +
        '</div>' +
        '<div class="next-rank-banner" id="next-banner-' + ex.id + '">' +
        buildNextRankHintHtml(ex, liveBestRating, refReps, appState.profile.bodyweightKg, appState.profile.sex, unit) +
        '</div>' +
        '<div class="set-grid-header">' +
        '<span>' + escapeHtml(tr('setCol')) + '</span>' +
        '<span>' + (unit === 'lbs' ? 'LBS' : 'KG') + '</span>' +
        '<span>' + escapeHtml(tr('repsCol')) + '</span>' +
        '<span>' + escapeHtml(tr('liveRankCol')) + '</span>' +
        '<span>&#10003;</span>' +
        '</div>' +
        setsHtml +
        '<div class="exercise-card-actions">' +
        '<button type="button" class="secondary-btn" data-action="add-set" data-ex="' + ex.id + '">' + escapeHtml(tr('addSetBtn')) + '</button>' +
        (entry.sets.length > 1
          ? '<button type="button" class="danger-text-btn" data-action="delete-last-set" data-ex="' + ex.id + '">&minus; Set</button>'
          : '<button type="button" class="danger-text-btn" data-action="remove-ex-session" data-ex="' + ex.id + '">&times;</button>') +
        '</div>' +
        '</section>';
    }

    return (
      '<main class="main-content">' +
      '<div class="logger-header-card">' +
      '<div class="logger-top-row">' +
      '<button type="button" class="timer-pill' + (isResting ? ' is-resting' : '') + '" data-action="start-or-skip-rest">' +
      '&#9201; <span id="live-rest-countdown">' + escapeHtml(restText) + '</span>' +
      '</button>' +
      '<span class="timer-pill tabular">&#9679; <span id="live-session-duration">' + formatDuration(elapsedSec) + '</span></span>' +
      '<button type="button" id="btn-post-workout" class="post-workout-btn" data-action="post-workout">' + escapeHtml(tr('finishPostBtn')) + '</button>' +
      '</div>' +
      '<div class="bw-inline-bar">' +
      '<span style="font-size:13px;font-weight:700;color:#CBD5E1;">' + escapeHtml(tr('bodyweightPill')) + ' (' + escapeHtml(appState.profile.sex === 'female' ? tr('sexFemale') : tr('sexMale')) + '):</span>' +
      '<div class="bw-inline-controls">' +
      '<input type="text" inputmode="decimal" id="logger-bw-input" class="compact-num-input tabular" aria-label="Bodyweight" value="' + escapeHtml(bwInUnit) + '">' +
      '<button type="button" id="btn-unit-toggle" class="unit-switch-btn" data-action="toggle-unit">' + escapeHtml(unit) + '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      entriesHtml +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
      '<button type="button" class="secondary-btn" style="flex:1;" data-action="open-picker-add">' + escapeHtml(tr('addExerciseBtn')) + '</button>' +
      '<button type="button" class="danger-text-btn" data-action="cancel-workout">' + escapeHtml(tr('cancelWorkoutBtn')) + '</button>' +
      '</div>' +
      '</main>'
    );
  }

  function renderRanksTab(snap) {
    const unit = appState.profile.unit;
    const selMuscle = catalog.MUSCLE_BY_ID[ui.selectedMuscleId] || catalog.MUSCLE_GROUPS[0];
    const selRank = snap.muscleRanks[selMuscle.id];
    const selTier = selRank.tierInfo.tier;

    // Instant 1RM & Rank Calculator evaluation
    const calcEx = catalog.EXERCISE_BY_ID[ui.calcExerciseId] || catalog.EXERCISES[0];
    const calcWNum = storage.parseDecimalInput(ui.calcWeightText);
    const calcRNum = storage.parseDecimalInput(ui.calcRepsText);
    const calcWeightKg = Number.isFinite(calcWNum) ? core.unitToKg(calcWNum, unit) : 0;
    const calcEval = core.evaluateSetStrength(
      { weightKg: calcWeightKg, reps: Number.isFinite(calcRNum) ? calcRNum : 0, setType: 'working' },
      calcEx,
      appState.profile.bodyweightKg,
      appState.profile.sex
    );

    let exOptionsHtml = '';
    for (let i = 0; i < catalog.EXERCISES.length; i += 1) {
      const ex = catalog.EXERCISES[i];
      exOptionsHtml +=
        '<option value="' + ex.id + '"' + (ex.id === calcEx.id ? ' selected' : '') + '>' +
        escapeHtml(exName(ex)) +
        '</option>';
    }

    let muscleRowsHtml = '';
    for (let i = 0; i < catalog.MUSCLE_GROUPS.length; i += 1) {
      const m = catalog.MUSCLE_GROUPS[i];
      const mr = snap.muscleRanks[m.id];
      const tier = mr.tierInfo.tier;
      const topEx = mr.topExerciseId ? catalog.EXERCISE_BY_ID[mr.topExerciseId] : null;
      muscleRowsHtml +=
        '<button type="button" class="muscle-row-card' + (ui.selectedMuscleId === m.id ? ' is-selected' : '') + '" data-action="select-muscle" data-muscle="' + m.id + '" data-view="' + m.view + '">' +
        '<span style="display:flex;align-items:center;gap:10px;">' +
        badges.renderRankHexBadge(tier.id, 38) +
        '<span>' +
        '<strong style="display:block;font-size:14.5px;color:#FFFFFF;">' + escapeHtml(muscleName(m)) + '</strong>' +
        '<span style="font-size:12px;color:#94A3B8;">' +
        (topEx ? escapeHtml(exName(topEx)) : escapeHtml(tr('noRankedLiftsYet'))) +
        '</span>' +
        '</span>' +
        '</span>' +
        '<span class="tabular" style="text-align:right;">' +
        '<strong style="display:block;font-size:13.5px;color:' + tier.color + ';">' + escapeHtml(tierName(tier)) + '</strong>' +
        '<span style="font-size:11.5px;color:#CBD5E1;">' + (mr.rating > 0 ? (String(mr.rating) + ' • ' + String(mr.tierInfo.lp) + ' LP') : '0 LP') + '</span>' +
        '</span>' +
        '</button>';
    }

    let ladderCellsHtml = '';
    for (let i = 1; i < core.RANK_TIERS.length; i += 1) {
      const tObj = core.RANK_TIERS[i];
      const rangeStr = tObj.id === 'olympian' ? '900+' : (String(tObj.min) + '–' + String(tObj.max));
      ladderCellsHtml +=
        '<div class="tier-ladder-cell">' +
        badges.renderRankHexBadge(tObj.id, 34) +
        '<strong style="font-size:12px;color:' + tObj.color + ';">' + escapeHtml(tObj.nameEn) + '</strong>' +
        '<span class="tabular" style="font-size:11px;color:#94A3B8;">' + rangeStr + '</span>' +
        '</div>';
    }

    return (
      '<main class="main-content">' +
      // Interactive Bodygraph Stage
      '<section class="ranks-stage-card">' +
      '<div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<div>' +
      '<div style="font-size:12px;color:#94A3B8;font-weight:700;">' + escapeHtml(tr('overallBodyrankLabel')) + '</div>' +
      '<div class="tabular" style="font-size:18px;font-weight:800;color:' + snap.overallTierInfo.tier.color + ';">' +
      escapeHtml(tierName(snap.overallTierInfo.tier)) +
      (snap.overallRating > 0 ? (' • ' + String(snap.overallRating) + ' (' + String(snap.overallTierInfo.lp) + ' LP)') : '') +
      '</div>' +
      '</div>' +
      '<div class="segmented-toggle">' +
      '<button type="button" class="segmented-btn' + (ui.ranksViewMode === 'front' ? ' is-active' : '') + '" data-action="set-bodygraph-view" data-view="front">' + escapeHtml(tr('frontView')) + '</button>' +
      '<button type="button" class="segmented-btn' + (ui.ranksViewMode === 'back' ? ' is-active' : '') + '" data-action="set-bodygraph-view" data-view="back">' + escapeHtml(tr('backView')) + '</button>' +
      '</div>' +
      '</div>' +

      '<div class="bodygraph-stage-wrap">' +
      bodygraph.renderInteractiveBodygraph(snap.muscleRanks, ui.ranksViewMode, ui.selectedMuscleId) +
      '</div>' +

      '<div class="muscle-Detail-strip">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      badges.renderRankHexBadge(selTier.id, 42) +
      '<div>' +
      '<div style="font-size:15px;font-weight:800;color:#FFFFFF;">' + escapeHtml(muscleName(selMuscle)) + '</div>' +
      '<div class="tabular" style="font-size:12.5px;color:' + selTier.color + ';font-weight:700;">' +
      escapeHtml(tierName(selTier)) + ' • ' + String(selRank.rating) + ' pts (' + String(selRank.tierInfo.lp) + ' LP)' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="quest-cta-btn" style="background:#2563EB;padding:0 14px;font-size:13px;" data-action="train-muscle" data-group="' + selMuscle.group + '">' +
      escapeHtml(tr('trainMuscleBtn')) +
      '</button>' +
      '</div>' +
      '</section>' +

      // Live 1RM & Rank Calculator (Liftoff Free Tool)
      '<section class="calc-card">' +
      '<div>' +
      '<h2 class="section-title" style="font-size:16.5px;">' + escapeHtml(tr('rankCalculatorTitle')) + '</h2>' +
      '<p class="exercise-cue">' + escapeHtml(tr('rankCalculatorSub')) + '</p>' +
      '</div>' +
      '<select id="calc-ex-select" class="calc-select" aria-label="Calculator Exercise">' + exOptionsHtml + '</select>' +
      '<div class="calc-inputs-row">' +
      '<input type="text" inputmode="decimal" id="calc-weight-input" class="set-input tabular" aria-label="Calculator Weight (' + unit + ')" placeholder="' + unit + '" value="' + escapeHtml(ui.calcWeightText) + '">' +
      '<input type="text" inputmode="numeric" id="calc-reps-input" class="set-input tabular" aria-label="Calculator Reps" placeholder="Reps" value="' + escapeHtml(ui.calcRepsText) + '">' +
      '<button type="button" class="secondary-btn" data-action="run-calc">' + escapeHtml(tr('calcCheckBtn')) + '</button>' +
      '</div>' +
      (calcEval.valid
        ? ('<div class="muscle-Detail-strip">' +
           '<div style="display:flex;align-items:center;gap:10px;">' +
           badges.renderRankHexBadge(calcEval.tier.id, 40) +
           '<div>' +
           '<strong style="font-size:14.5px;color:' + calcEval.tier.color + ';">' + escapeHtml(tierName(calcEval.tier)) + ' (' + String(calcEval.lp) + ' LP)</strong>' +
           '<div class="tabular" style="font-size:12.5px;color:#CBD5E1;">1RM ≈ ' + core.formatWeight(calcEval.e1rmKg, unit) + '\u00A0' + unit + ' • Score ' + String(calcEval.rating) + '/1000</div>' +
           '</div></div></div>')
        : '') +
      '</section>' +

      // 15 Muscle Ranks Breakdown
      '<section class="section-block">' +
      '<h2 class="section-title">' + escapeHtml(tr('allMuscles')) + '</h2>' +
      '<div class="muscle-grid-list">' + muscleRowsHtml + '</div>' +
      '</section>' +

      // 9-Tier Reference Ladder
      '<section class="section-block">' +
      '<h2 class="section-title">' + escapeHtml(tr('tierLadderTitle')) + '</h2>' +
      '<div class="tier-ladder-grid">' + ladderCellsHtml + '</div>' +
      '</section>' +
      '</main>'
    );
  }

  function renderFriendsLeaderboardInner(snap) {
    const rivals = [
      { name: 'Minh Khoa', rating: 645, streak: 19, isUser: false },
      { name: 'Hải Đăng', rating: 520, streak: 11, isUser: false },
      { name: 'Tuấn Kiệt', rating: 418, streak: 7, isUser: false },
      { name: 'Gia Huy', rating: 312, streak: 4, isUser: false },
      { name: 'Bảo Nam', rating: 215, streak: 2, isUser: false },
      { name: appState.profile.name, rating: snap.overallRating, streak: snap.streakDays, isUser: true }
    ];
    rivals.sort(function (a, b) { return b.rating - a.rating; });

    let rowsHtml = '';
    for (let i = 0; i < rivals.length; i += 1) {
      const r = rivals[i];
      const tInfo = core.ratingToTierAndLp(r.rating);
      rowsHtml +=
        '<div class="muscle-row-card' + (r.isUser ? ' is-selected' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span class="tabular" style="width:22px;font-weight:800;color:#94A3B8;">#' + String(i + 1) + '</span>' +
        badges.renderRankHexBadge(tInfo.tier.id, 38) +
        '<div>' +
        '<strong style="font-size:14.5px;color:#FFFFFF;">' + escapeHtml(r.name) +
        (r.isUser ? (' <span class="pr-tag" style="margin-left:4px;">' + escapeHtml(tr('youTag')) + '</span>') : '') +
        '</strong>' +
        '<div class="tabular" style="font-size:12px;color:#94A3B8;">&#128293; ' + String(r.streak) + 'd streak</div>' +
        '</div>' +
        '</div>' +
        '<div class="tabular" style="text-align:right;">' +
        '<strong style="display:block;font-size:14px;color:' + tInfo.tier.color + ';">' + escapeHtml(tInfo.tier.nameEn) + '</strong>' +
        '<span style="font-size:12px;color:#CBD5E1;">' + String(r.rating) + ' pts</span>' +
        '</div>' +
        '</div>';
    }

    return (
      '<section class="section-block">' +
      '<div><h2 class="section-title">' + escapeHtml(tr('leaderboardTitle')) + '</h2>' +
      '<p class="exercise-cue">' + escapeHtml(tr('leaderboardSub')) + '</p></div>' +
      '<div class="muscle-grid-list">' + rowsHtml + '</div>' +
      '</section>'
    );
  }

  function renderDiscoveryFeedInner(snap) {
    const posts = [
      { lifter: 'Minh Khoa', lift: 'Barbell Bench Press', load: '95 kg × 5', tierId: 'diamond', rating: 618 },
      { lifter: 'Thảo Vy', lift: 'Barbell Hip Thrust', load: '110 kg × 8', tierId: 'champion', rating: 724 },
      { lifter: 'Hải Đăng', lift: 'Barbell Back Squat', load: '120 kg × 6', tierId: 'platinum', rating: 554 }
    ];
    let html = '';
    if (appState.workouts.length > 0) {
      const latest = appState.workouts[appState.workouts.length - 1];
      html +=
        '<div class="exercise-log-card" style="border-color:#3898FF;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong>' + escapeHtml(appState.profile.name) + ' • ' + escapeHtml(tr('youTag')) + '</strong>' +
        badges.renderRankHexBadge(snap.overallTierInfo.tier.id, 34) +
        '</div>' +
        '<p class="exercise-cue" style="margin:0;">Posted ' + String(latest.entries.length) + ' ranked exercises • Bodyrank ' + String(snap.overallRating) + '</p>' +
        '</div>';
    }
    for (let i = 0; i < posts.length; i += 1) {
      const p = posts[i];
      html +=
        '<div class="exercise-log-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong>' + escapeHtml(p.lifter) + '</strong>' +
        badges.renderRankHexBadge(p.tierId, 34) +
        '</div>' +
        '<div class="tabular" style="font-size:14px;color:#E2E8F0;">' + escapeHtml(p.lift) + ' — <strong>' + escapeHtml(p.load) + '</strong> (' + String(p.rating) + ' pts)</div>' +
        '</div>';
    }
    return '<section class="section-block"><h2 class="section-title">' + escapeHtml(tr('discovery')) + '</h2>' + html + '</section>';
  }

  function renderNutritionTab() {
    const meals = appState.nutritionLog.meals || [];
    let kcalSum = 0;
    let proSum = 0;
    for (let i = 0; i < meals.length; i += 1) {
      kcalSum += meals[i].kcal;
      proSum += meals[i].proteinG;
    }
    const kcalPct = Math.min(100, Math.round((kcalSum / appState.nutritionLog.caloriesTarget) * 100));
    const proPct = Math.min(100, Math.round((proSum / appState.nutritionLog.proteinTargetG) * 100));

    let mealRows = '';
    for (let i = meals.length - 1; i >= 0; i -= 1) {
      const m = meals[i];
      mealRows +=
        '<div class="muscle-row-card">' +
        '<div><strong style="font-size:14.5px;">' + escapeHtml(m.name) + '</strong>' +
        '<div class="tabular" style="font-size:12.5px;color:#94A3B8;">' + String(m.kcal) + ' kcal • ' + String(m.proteinG) + '\u00A0g protein</div></div>' +
        '<button type="button" class="danger-text-btn" data-action="delete-meal" data-meal="' + m.id + '">&times;</button>' +
        '</div>';
    }

    return (
      '<main class="main-content">' +
      '<section class="calc-card">' +
      '<h2 class="section-title">' + escapeHtml(tr('nutritionTitle')) + '</h2>' +
      '<p class="exercise-cue">' + escapeHtml(tr('nutritionSub')) + '</p>' +
      '<div class="recovery-item">' +
      '<div class="recovery-top"><span>' + escapeHtml(tr('caloriesLabel')) + '</span><span class="tabular">' + String(kcalSum) + ' / ' + String(appState.nutritionLog.caloriesTarget) + ' kcal</span></div>' +
      '<div class="recovery-bar"><div class="recovery-bar-fill" style="width:' + String(kcalPct) + '%;background:#38BDF8;"></div></div>' +
      '</div>' +
      '<div class="recovery-item">' +
      '<div class="recovery-top"><span>' + escapeHtml(tr('proteinLabel')) + '</span><span class="tabular">' + String(proSum) + ' / ' + String(appState.nutritionLog.proteinTargetG) + '\u00A0g</span></div>' +
      '<div class="recovery-bar"><div class="recovery-bar-fill" style="width:' + String(proPct) + '%;background:#4ADE80;"></div></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">' +
      '<button type="button" class="secondary-btn" data-action="quick-meal" data-name="Whey Shake + Banana" data-kcal="240" data-pro="28">+ Whey (28g P)</button>' +
      '<button type="button" class="secondary-btn" data-action="quick-meal" data-name="Chicken Rice Bowl" data-kcal="620" data-pro="48">+ Chicken Rice (48g P)</button>' +
      '<button type="button" class="secondary-btn" data-action="quick-meal" data-name="Eggs & Oats" data-kcal="430" data-pro="26">+ Eggs & Oats (26g P)</button>' +
      '</div>' +
      '</section>' +
      (mealRows ? ('<div class="muscle-grid-list">' + mealRows + '</div>') : '') +
      '</main>'
    );
  }

  function renderProfileTab(snap) {
    const unit = appState.profile.unit;
    const bwDisp = core.formatWeight(appState.profile.bodyweightKg, unit);

    let historyHtml = '';
    for (let i = appState.workouts.length - 1; i >= 0; i -= 1) {
      const w = appState.workouts[i];
      const dateStr = w.completedAtMs > 0 ? new Date(w.completedAtMs).toLocaleDateString() : '';
      const exSummaries = w.entries.map(function (e) {
        const ex = catalog.EXERCISE_BY_ID[e.exerciseId];
        return (ex ? ex.nameEn : e.exerciseId) + ' (' + String(e.sets.length) + ' sets)';
      }).join(' • ');

      historyHtml +=
        '<div class="exercise-log-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div><strong style="font-size:15px;">' + escapeHtml(w.title || ('Ranked Session #' + String(i + 1))) + '</strong>' +
        '<div class="tabular" style="font-size:12px;color:#94A3B8;">' + escapeHtml(dateStr) + ' • BW ' + core.formatWeight(w.bodyweightKg, unit) + '\u00A0' + unit + '</div></div>' +
        '<button type="button" class="danger-text-btn" data-action="delete-workout" data-wk="' + w.id + '">&#128465;</button>' +
        '</div>' +
        '<div style="font-size:13px;color:#CBD5E1;">' + escapeHtml(exSummaries) + '</div>' +
        '</div>';
    }

    return (
      '<main class="main-content">' +
      '<section class="calc-card">' +
      '<h2 class="section-title">' + escapeHtml(tr('profileSettingsTitle')) + '</h2>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '<div>' +
      '<label for="prof-bw-input" style="font-size:12.5px;color:#94A3B8;display:block;margin-bottom:4px;">' + escapeHtml(tr('bodyweightPill')) + ' (' + unit + ')</label>' +
      '<input type="text" inputmode="decimal" id="prof-bw-input" class="set-input tabular" value="' + escapeHtml(bwDisp) + '">' +
      '</div>' +
      '<div>' +
      '<label for="prof-rest-input" style="font-size:12.5px;color:#94A3B8;display:block;margin-bottom:4px;">Rest Timer (s)</label>' +
      '<input type="text" inputmode="numeric" id="prof-rest-input" class="set-input tabular" value="' + String(appState.profile.restTimerSec) + '">' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" class="segmented-btn' + (appState.profile.sex === 'male' ? ' is-active' : '') + '" style="border:1px solid #333B63;" data-action="set-sex" data-sex="male">' + escapeHtml(tr('sexMale')) + '</button>' +
      '<button type="button" class="segmented-btn' + (appState.profile.sex === 'female' ? ' is-active' : '') + '" style="border:1px solid #333B63;" data-action="set-sex" data-sex="female">' + escapeHtml(tr('sexFemale')) + '</button>' +
      '<button type="button" class="unit-switch-btn" data-action="toggle-unit">' + unit.toUpperCase() + '</button>' +
      '</div>' +
      '<button type="button" id="btn-save-profile" class="post-workout-btn" data-action="save-profile">' + escapeHtml(tr('saveProfileBtn')) + '</button>' +
      '</section>' +

      '<section class="calc-card">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">' +
      '<div class="recovery-item"><span style="font-size:11.5px;color:#94A3B8;">Workouts</span><strong class="tabular" style="font-size:18px;">' + String(snap.totalWorkouts) + '</strong></div>' +
      '<div class="recovery-item"><span style="font-size:11.5px;color:#94A3B8;">Ranked Sets</span><strong class="tabular" style="font-size:18px;">' + String(snap.totalWorkingSets) + '</strong></div>' +
      '<div class="recovery-item"><span style="font-size:11.5px;color:#94A3B8;">Bodyrank</span><strong class="tabular" style="font-size:18px;color:' + snap.overallTierInfo.tier.color + ';">' + String(snap.overallRating) + '</strong></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" id="btn-load-demo" class="secondary-btn" data-action="load-demo">' + escapeHtml(tr('loadDemoBtn')) + '</button>' +
      '<button type="button" class="secondary-btn" data-action="export-json">' + escapeHtml(tr('exportJsonBtn')) + '</button>' +
      '<button type="button" class="danger-text-btn" data-action="reset-all">' + escapeHtml(tr('resetDataBtn')) + '</button>' +
      '</div>' +
      '</section>' +

      '<section class="section-block">' +
      '<h2 class="section-title">' + escapeHtml(tr('workoutHistoryTitle')) + '</h2>' +
      (historyHtml || ('<p class="exercise-cue">' + escapeHtml(tr('noRankedLiftsYet')) + '</p>')) +
      '</section>' +
      '</main>'
    );
  }

  function renderBottomDock() {
    const dockEl = document.getElementById('bottom-dock');
    if (!dockEl) return;
    const tabs = [
      { id: 'workout', labelKey: 'navWorkout' },
      { id: 'home', labelKey: 'navHome' },
      { id: 'ranks', labelKey: 'navRanks' },
      { id: 'nutrition', labelKey: 'navNutrition' },
      { id: 'friends', labelKey: 'navFriends' },
      { id: 'profile', labelKey: 'navProfile' }
    ];

    let html = '';
    for (let i = 0; i < tabs.length; i += 1) {
      const item = tabs[i];
      const active = ui.activeTab === item.id;
      html +=
        '<button type="button" id="nav-tab-' + item.id + '" class="dock-tab-btn' + (active ? ' is-active' : '') + '" data-action="go-tab" data-tab="' + item.id + '">' +
        badges.renderNavIcon(item.id, active) +
        '<span>' + escapeHtml(tr(item.labelKey)) + '</span>' +
        '</button>';
    }
    dockEl.innerHTML = html;
  }

  function renderPickerModal(snap) {
    const modalEl = document.getElementById('picker-modal');
    if (!modalEl) return;
    if (!ui.pickerOpen) {
      modalEl.hidden = true;
      modalEl.innerHTML = '';
      return;
    }
    modalEl.hidden = false;

    let chipsHtml = '';
    for (let i = 0; i < catalog.CATEGORY_FILTERS.length; i += 1) {
      const cat = catalog.CATEGORY_FILTERS[i];
      const lbl = appState.lang === 'vi' ? cat.nameVi : cat.nameEn;
      chipsHtml +=
        '<button type="button" class="filter-chip' + (ui.pickerCategory === cat.id ? ' is-active' : '') + '" data-action="picker-cat" data-cat="' + cat.id + '">' +
        escapeHtml(lbl) +
        '</button>';
    }

    const q = ui.pickerSearch.trim().toLowerCase();
    let listHtml = '';
    for (let i = 0; i < catalog.EXERCISES.length; i += 1) {
      const ex = catalog.EXERCISES[i];
      if (ui.pickerCategory !== 'all' && ex.category !== ui.pickerCategory) continue;
      if (q) {
        const hay = (ex.nameEn + ' ' + ex.nameVi + ' ' + ex.equipment).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      const picked = ui.pickerSelectedIds.indexOf(ex.id) !== -1;
      const st = snap.exerciseStats[ex.id];
      const tier = st ? st.tierInfo.tier : core.RANK_TIERS[0];

      listHtml +=
        '<button type="button" class="picker-exercise-btn' + (picked ? ' is-picked' : '') + '" data-action="toggle-pick-ex" data-ex="' + ex.id + '">' +
        '<span style="display:flex;align-items:center;gap:10px;">' +
        badges.renderRankHexBadge(tier.id, 36) +
        '<span>' +
        '<strong style="display:block;font-size:14.5px;color:#FFFFFF;">' + escapeHtml(exName(ex)) + '</strong>' +
        '<span style="font-size:12px;color:#94A3B8;">' + escapeHtml(tierName(tier)) + (st && st.bestRating > 0 ? (' • ' + String(st.bestRating) + ' pts') : '') + '</span>' +
        '</span>' +
        '</span>' +
        '<span style="font-size:18px;font-weight:900;color:' + (picked ? '#38BDF8' : '#64748B') + ';">' + (picked ? '&#10003;' : '+') + '</span>' +
        '</button>';
    }

    const confirmText = ui.pickerAddingToActive
      ? (tr('addSelectedToWorkout') + ' (' + String(ui.pickerSelectedIds.length) + ')')
      : (tr('startRankedSession') + ' (' + String(ui.pickerSelectedIds.length) + ')');

    modalEl.innerHTML =
      '<div class="modal-sheet" role="dialog" aria-modal="true" aria-label="Choose Ranked Exercises">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<h2 class="section-title">' + escapeHtml(tr('chooseExercises')) + '</h2>' +
      '<button type="button" class="icon-action-btn" data-action="close-picker" aria-label="Close">&times;</button>' +
      '</div>' +
      '<input type="search" id="picker-search-input" class="search-input" placeholder="' + escapeHtml(tr('searchExercisesPlaceholder')) + '" value="' + escapeHtml(ui.pickerSearch) + '">' +
      '<div class="filter-chips-row">' + chipsHtml + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;max-height:46dvh;overflow-y:auto;">' + listHtml + '</div>' +
      '<button type="button" id="btn-confirm-picker" class="post-workout-btn" style="width:100%;min-height:48px;font-size:15.5px;" data-action="confirm-picker">' +
      escapeHtml(confirmText) +
      '</button>' +
      '</div>';
  }

  function renderCelebrationModal() {
    const modalEl = document.getElementById('celebration-modal');
    if (!modalEl) return;
    const cel = ui.celebrationData;
    if (!cel) {
      modalEl.hidden = true;
      modalEl.innerHTML = '';
      return;
    }
    modalEl.hidden = false;

    const unit = appState.profile.unit;
    let exCardsHtml = '';
    for (let i = 0; i < cel.exerciseRankUps.length; i += 1) {
      const item = cel.exerciseRankUps[i];
      const ex = catalog.EXERCISE_BY_ID[item.exerciseId];
      exCardsHtml +=
        '<div class="muscle-row-card">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        badges.renderRankHexBadge(item.newTier.id, 42) +
        '<div>' +
        '<strong style="font-size:14.5px;color:#FFFFFF;">' + escapeHtml(exName(ex)) + '</strong>' +
        '<div class="tabular" style="font-size:12px;color:#CBD5E1;">1RM ' + core.formatWeight(item.session1RMKg, unit) + '\u00A0' + unit + ' • ' + String(item.newLp) + ' LP</div>' +
        '<div style="display:flex;gap:4px;margin-top:3px;">' +
        (item.tierUpgraded ? ('<span class="pr-tag" style="color:#4ADE80;border-color:#4ADE80;background:rgba(74,222,128,0.15);">' + escapeHtml(tr('rankUpBadge')) + '</span>') : '') +
        (item.isNewPR ? ('<span class="pr-tag">' + escapeHtml(tr('newPrBadge')) + '</span>') : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="tabular" style="text-align:right;">' +
        '<strong style="color:' + item.newTier.color + ';font-size:14px;">' + escapeHtml(tierName(item.newTier)) + '</strong>' +
        '<div style="font-size:12px;color:#4ADE80;font-weight:800;">+' + String(item.ratingDelta) + ' pts</div>' +
        '</div>' +
        '</div>';
    }

    let musclePillsHtml = '';
    for (let i = 0; i < cel.muscleUpgrades.length; i += 1) {
      const mu = cel.muscleUpgrades[i];
      const mObj = catalog.MUSCLE_BY_ID[mu.muscleId];
      musclePillsHtml +=
        '<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:#181C32;border:1px solid ' + mu.newTier.color + ';font-size:12px;font-weight:700;color:' + mu.newTier.color + ';">' +
        escapeHtml(muscleName(mObj)) + ' → ' + escapeHtml(mu.newTier.nameEn) +
        '</span>';
    }

    modalEl.innerHTML =
      '<div class="modal-sheet" role="dialog" aria-modal="true" aria-label="Workout Ranked Summary">' +
      '<div class="celebration-hero">' +
      badges.renderRankHexBadge(cel.newOverallTier.id, 72) +
      '<h2 class="section-title" style="font-size:21px;">' + escapeHtml(tr('workoutRankedTitle')) + '</h2>' +
      '<div class="tabular" style="font-size:16px;font-weight:800;color:' + cel.newOverallTier.color + ';">' +
      escapeHtml(tr('overallBodyrankLabel')) + ': ' + escapeHtml(tierName(cel.newOverallTier)) + ' • ' + String(cel.newOverallRating) + ' pts' +
      '</div>' +
      '<div class="tabular" style="font-size:13px;color:#BAE6FD;font-weight:700;">+' + String(cel.xpEarned) + ' XP (Lv.' + String(cel.newLevel) + ') • +' + String(cel.gemsEarned) + ' Gems • &#128293; ' + String(cel.streakDays) + 'd</div>' +
      '</div>' +
      '<h3 class="section-title" style="font-size:15.5px;">' + escapeHtml(tr('exerciseRanksEarned')) + '</h3>' +
      '<div class="muscle-grid-list">' + exCardsHtml + '</div>' +
      (musclePillsHtml
        ? ('<h3 class="section-title" style="font-size:15px;">' + escapeHtml(tr('musclesUpgradedLabel')) + '</h3>' +
           '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + musclePillsHtml + '</div>')
        : '') +
      '<button type="button" id="btn-celebration-done" class="post-workout-btn" style="width:100%;min-height:48px;font-size:15.5px;" data-action="close-celebration">' +
      escapeHtml(tr('awesomeContinue')) +
      '</button>' +
      '</div>';
  }

  function renderAll() {
    const now = Date.now();
    const snap = core.computeDerivedRankSnapshot(appState.profile, appState.workouts, now);
    renderHeader(snap);

    const viewHost = document.getElementById('app-view-host');
    if (viewHost) {
      let activeBanner = '';
      if (appState.activeSession && ui.activeTab !== 'workout') {
        activeBanner =
          '<div style="padding:10px 14px 0;">' +
          '<div class="active-workout-banner">' +
          '<span style="font-size:13.5px;font-weight:700;">&#128170; ' + escapeHtml(tr('resumeWorkout')) + ' (' + String(appState.activeSession.entries.length) + ')</span>' +
          '<button type="button" class="active-workout-banner-btn" data-action="go-tab" data-tab="workout">' + escapeHtml(tr('continueBtn')) + '</button>' +
          '</div></div>';
      }

      let bodyHtml = '';
      if (ui.activeTab === 'workout') bodyHtml = renderWorkoutTab(snap);
      else if (ui.activeTab === 'ranks') bodyHtml = renderRanksTab(snap);
      else if (ui.activeTab === 'nutrition') bodyHtml = renderNutritionTab();
      else if (ui.activeTab === 'friends') bodyHtml = '<main class="main-content">' + renderFriendsLeaderboardInner(snap) + '</main>';
      else if (ui.activeTab === 'profile') bodyHtml = renderProfileTab(snap);
      else bodyHtml = renderHomeView(snap);

      viewHost.innerHTML = activeBanner + bodyHtml;
    }

    renderBottomDock();
    renderPickerModal(snap);
    renderCelebrationModal();
    renderToast();
  }

  // Surgical live update while typing weight/reps so iOS Safari numeric keyboard NEVER loses focus!
  function handleLiveSetInput(target) {
    const field = target.getAttribute('data-set-input');
    const exId = target.getAttribute('data-ex');
    const setId = target.getAttribute('data-set');
    if (!field || !exId || !setId || !appState.activeSession) return;

    const numVal = storage.parseDecimalInput(target.value);
    if (!Number.isFinite(numVal) || numVal < 0) return;

    const unit = appState.profile.unit;
    const action = { type: 'UPDATE_SET', exerciseId: exId, setId: setId };
    if (field === 'weight') {
      action.weightKg = core.unitToKg(numVal, unit);
    } else {
      action.reps = Math.floor(numVal);
    }

    appState = core.reduceAppState(appState, action, Date.now()).state;
    storage.saveState(appState);

    // Update only the live rank pill & next-rank target banner in place
    const ex = catalog.EXERCISE_BY_ID[exId];
    let entryObj = null;
    for (let i = 0; i < appState.activeSession.entries.length; i += 1) {
      if (appState.activeSession.entries[i].exerciseId === exId) {
        entryObj = appState.activeSession.entries[i];
        break;
      }
    }
    if (!entryObj || !ex) return;

    let setObj = null;
    let bestRating = 0;
    let refReps = 8;
    const snap = core.computeDerivedRankSnapshot(appState.profile, appState.workouts, Date.now());
    if (snap.exerciseStats[exId]) bestRating = snap.exerciseStats[exId].bestRating;

    for (let i = 0; i < entryObj.sets.length; i += 1) {
      const s = entryObj.sets[i];
      if (s.id === setId) setObj = s;
      if (s.reps >= 1) refReps = s.reps;
      const ev = core.evaluateSetStrength(s, ex, appState.profile.bodyweightKg, appState.profile.sex);
      if (ev.valid && ev.rating > bestRating) bestRating = ev.rating;
    }

    const pillEl = document.getElementById('rank-pill-' + setId);
    if (pillEl && setObj) {
      pillEl.innerHTML = renderSetRankBadgeInner(setObj, ex);
    }
    const bannerEl = document.getElementById('next-banner-' + exId);
    if (bannerEl) {
      bannerEl.innerHTML = buildNextRankHintHtml(ex, bestRating, refReps, appState.profile.bodyweightKg, appState.profile.sex, unit);
    }
  }

  function bindGlobalEvents() {
    document.addEventListener('click', function (ev) {
      // Check interactive SVG muscle region click first
      const musclePath = ev.target.closest ? ev.target.closest('.muscle-region') : null;
      if (musclePath) {
        const mId = musclePath.getAttribute('data-muscle');
        if (mId) {
          ui.selectedMuscleId = mId;
          renderAll();
          return;
        }
      }

      const btn = ev.target.closest ? ev.target.closest('[data-action]') : null;
      if (!btn) return;
      const act = btn.getAttribute('data-action');

      switch (act) {
        case 'toggle-lang':
          dispatch({ type: 'SET_LANG', lang: appState.lang === 'vi' ? 'en' : 'vi' });
          break;

        case 'toggle-sound':
          dispatch({ type: 'TOGGLE_SOUND' });
          break;

        case 'go-tab': {
          const targetTab = btn.getAttribute('data-tab') || 'home';
          ui.activeTab = targetTab;
          renderAll();
          window.scrollTo(0, 0);
          break;
        }

        case 'set-home-subtab':
          ui.homeSubtab = btn.getAttribute('data-subtab') || 'foryou';
          renderAll();
          break;

        case 'open-picker':
          ui.pickerAddingToActive = false;
          ui.pickerOpen = true;
          renderAll();
          break;

        case 'open-picker-add':
          ui.pickerAddingToActive = true;
          ui.pickerSelectedIds = [];
          ui.pickerOpen = true;
          renderAll();
          break;

        case 'close-picker':
          ui.pickerOpen = false;
          renderAll();
          break;

        case 'picker-cat':
          ui.pickerCategory = btn.getAttribute('data-cat') || 'all';
          renderPickerModal(core.computeDerivedRankSnapshot(appState.profile, appState.workouts, Date.now()));
          break;

        case 'toggle-pick-ex': {
          const exId = btn.getAttribute('data-ex');
          const idx = ui.pickerSelectedIds.indexOf(exId);
          if (idx === -1) ui.pickerSelectedIds.push(exId);
          else ui.pickerSelectedIds.splice(idx, 1);
          renderPickerModal(core.computeDerivedRankSnapshot(appState.profile, appState.workouts, Date.now()));
          break;
        }

        case 'confirm-picker': {
          if (ui.pickerSelectedIds.length === 0) {
            ui.pickerSelectedIds = ['bench_press'];
          }
          ui.pickerOpen = false;
          if (ui.pickerAddingToActive && appState.activeSession) {
            dispatch({ type: 'ADD_EXERCISES_TO_SESSION', exerciseIds: ui.pickerSelectedIds.slice() });
          } else {
            ui.activeTab = 'workout';
            dispatch({ type: 'START_WORKOUT', exerciseIds: ui.pickerSelectedIds.slice() });
          }
          break;
        }

        case 'start-preset': {
          const pId = btn.getAttribute('data-preset');
          const preset = catalog.WORKOUT_PRESETS.find(function (p) { return p.id === pId; });
          if (preset) {
            ui.activeTab = 'workout';
            dispatch({
              type: 'START_WORKOUT',
              title: appState.lang === 'vi' ? preset.nameVi : preset.nameEn,
              exerciseIds: preset.exerciseIds
            });
          }
          break;
        }

        case 'toggle-unit': {
          const nextUnit = appState.profile.unit === 'kg' ? 'lbs' : 'kg';
          dispatch({ type: 'UPDATE_PROFILE', unit: nextUnit });
          break;
        }

        case 'cycle-set-type': {
          const exId = btn.getAttribute('data-ex');
          const setId = btn.getAttribute('data-set');
          if (!appState.activeSession) break;
          const entry = appState.activeSession.entries.find(function (e) { return e.exerciseId === exId; });
          const s = entry && entry.sets.find(function (x) { return x.id === setId; });
          if (s) {
            const order = ['working', 'warmup', 'dropset'];
            const nextType = order[(order.indexOf(s.setType || 'working') + 1) % order.length];
            dispatch({ type: 'UPDATE_SET', exerciseId: exId, setId: setId, setType: nextType });
          }
          break;
        }

        case 'toggle-set-done': {
          const exId = btn.getAttribute('data-ex');
          const setId = btn.getAttribute('data-set');
          if (!appState.activeSession) break;
          const entry = appState.activeSession.entries.find(function (e) { return e.exerciseId === exId; });
          const s = entry && entry.sets.find(function (x) { return x.id === setId; });
          if (s) {
            const nextDone = !s.completed;
            if (nextDone) {
              sound.playSetCheck(appState.soundEnabled);
              ui.restEndAtMs = Date.now() + appState.profile.restTimerSec * 1000;
            }
            dispatch({ type: 'UPDATE_SET', exerciseId: exId, setId: setId, completed: nextDone });
          }
          break;
        }

        case 'add-set':
          dispatch({ type: 'ADD_SET', exerciseId: btn.getAttribute('data-ex') });
          break;

        case 'delete-last-set': {
          const exId = btn.getAttribute('data-ex');
          if (!appState.activeSession) break;
          const entry = appState.activeSession.entries.find(function (e) { return e.exerciseId === exId; });
          if (entry && entry.sets.length > 1) {
            const lastSet = entry.sets[entry.sets.length - 1];
            dispatch({ type: 'DELETE_SET', exerciseId: exId, setId: lastSet.id });
          }
          break;
        }

        case 'remove-ex-session':
          dispatch({ type: 'REMOVE_EXERCISE_FROM_SESSION', exerciseId: btn.getAttribute('data-ex') });
          break;

        case 'start-or-skip-rest':
          if (ui.restEndAtMs > Date.now()) {
            ui.restEndAtMs = 0;
          } else {
            ui.restEndAtMs = Date.now() + appState.profile.restTimerSec * 1000;
          }
          syncTicker();
          renderAll();
          break;

        case 'post-workout':
          dispatch({ type: 'POST_WORKOUT' });
          break;

        case 'cancel-workout':
          ui.restEndAtMs = 0;
          dispatch({ type: 'CANCEL_WORKOUT' });
          break;

        case 'close-celebration':
          ui.celebrationData = null;
          ui.activeTab = 'ranks';
          renderAll();
          window.scrollTo(0, 0);
          break;

        case 'set-bodygraph-view':
          ui.ranksViewMode = btn.getAttribute('data-view') === 'back' ? 'back' : 'front';
          renderAll();
          break;

        case 'select-muscle':
          ui.selectedMuscleId = btn.getAttribute('data-muscle') || 'lower_chest';
          ui.ranksViewMode = btn.getAttribute('data-view') === 'back' ? 'back' : 'front';
          renderAll();
          break;

        case 'train-muscle': {
          const grp = btn.getAttribute('data-group') || 'all';
          ui.pickerCategory = grp;
          const matching = catalog.EXERCISES
            .filter(function (ex) { return ex.primaryMuscles.indexOf(ui.selectedMuscleId) !== -1; })
            .slice(0, 2)
            .map(function (ex) { return ex.id; });
          if (matching.length > 0) ui.pickerSelectedIds = matching;
          ui.pickerAddingToActive = Boolean(appState.activeSession);
          ui.pickerOpen = true;
          renderAll();
          break;
        }

        case 'run-calc': {
          const selEl = document.getElementById('calc-ex-select');
          const wEl = document.getElementById('calc-weight-input');
          const rEl = document.getElementById('calc-reps-input');
          if (selEl) ui.calcExerciseId = selEl.value;
          if (wEl) ui.calcWeightText = wEl.value;
          if (rEl) ui.calcRepsText = rEl.value;
          renderAll();
          break;
        }

        case 'quick-meal':
          dispatch({
            type: 'ADD_MEAL',
            name: btn.getAttribute('data-name'),
            kcal: Number(btn.getAttribute('data-kcal')),
            proteinG: Number(btn.getAttribute('data-pro'))
          });
          break;

        case 'delete-meal':
          dispatch({ type: 'DELETE_MEAL', mealId: btn.getAttribute('data-meal') });
          break;

        case 'set-sex':
          dispatch({ type: 'UPDATE_PROFILE', sex: btn.getAttribute('data-sex') });
          break;

        case 'save-profile': {
          const bwInput = document.getElementById('prof-bw-input');
          const restInput = document.getElementById('prof-rest-input');
          const bwVal = bwInput ? storage.parseDecimalInput(bwInput.value) : NaN;
          const restVal = restInput ? storage.parseDecimalInput(restInput.value) : NaN;
          dispatch({
            type: 'UPDATE_PROFILE',
            bodyweightKg: Number.isFinite(bwVal) ? core.unitToKg(bwVal, appState.profile.unit) : appState.profile.bodyweightKg,
            restTimerSec: Number.isFinite(restVal) ? restVal : appState.profile.restTimerSec
          });
          showToast(appState.lang === 'vi' ? 'Đã cập nhật chuẩn cân nặng!' : 'Bodyweight standard saved!');
          break;
        }

        case 'delete-workout':
          dispatch({ type: 'DELETE_WORKOUT', workoutId: btn.getAttribute('data-wk') });
          break;

        case 'load-demo':
          dispatch({ type: 'LOAD_DEMO_DATA' });
          showToast(appState.lang === 'vi' ? 'Đã nạp dữ liệu mẫu lên Rank!' : 'Loaded sample ranked workouts!');
          break;

        case 'reset-all':
          dispatch({ type: 'RESET_ALL' });
          break;

        case 'export-json': {
          const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'liftoff-ranks-backup.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }

        default:
          break;
      }
    });

    document.addEventListener('input', function (ev) {
      const t = ev.target;
      if (!t || !t.getAttribute) return;

      if (t.getAttribute('data-set-input')) {
        handleLiveSetInput(t);
        return;
      }

      if (t.id === 'logger-bw-input') {
        const v = storage.parseDecimalInput(t.value);
        if (Number.isFinite(v) && v >= 25 && v <= 550) {
          appState = core.reduceAppState(
            appState,
            { type: 'UPDATE_PROFILE', bodyweightKg: core.unitToKg(v, appState.profile.unit) },
            Date.now()
          ).state;
          storage.saveState(appState);
        }
        return;
      }

      if (t.id === 'picker-search-input') {
        ui.pickerSearch = t.value;
        const pos = t.selectionStart;
        renderPickerModal(core.computeDerivedRankSnapshot(appState.profile, appState.workouts, Date.now()));
        const nextInput = document.getElementById('picker-search-input');
        if (nextInput) {
          nextInput.focus();
          try {
            nextInput.setSelectionRange(pos, pos);
          } catch (_e) {}
        }
        return;
      }

      if (t.id === 'calc-weight-input') ui.calcWeightText = t.value;
      if (t.id === 'calc-reps-input') ui.calcRepsText = t.value;
    });

    document.addEventListener('change', function (ev) {
      const t = ev.target;
      if (t && t.id === 'calc-ex-select') {
        ui.calcExerciseId = t.value;
        renderAll();
      }
    });

    document.addEventListener('visibilitychange', function () {
      syncTicker();
    });
  }

  bindGlobalEvents();
  renderAll();
  syncTicker();
})();
