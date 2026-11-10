(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exercisesData = require('../data/exercises.js');
    module.exports = factory(exercisesData);
  } else {
    root.LiftoffCore = factory(root.LiftoffExercises);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (catalog) {
  'use strict';

  const LBS_PER_KG = 2.2046226218;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const FULL_RECOVERY_MS = 60 * 60 * 60 * 1000; // 60 hours to 100% fresh

  // Official 9 Liftoff Strength Ranks (1 - 1000 scale) + Unranked state
  const RANK_TIERS = [
    { id: 'unranked', index: 0, nameEn: 'Unranked', nameVi: 'Chưa có Rank', min: 0, max: 0, color: '#4B5278', glow: 'rgba(75, 82, 120, 0.35)' },
    { id: 'wood', index: 1, nameEn: 'Wood', nameVi: 'Wood (Gỗ)', min: 1, max: 199, color: '#B07D52', glow: 'rgba(176, 125, 82, 0.40)' },
    { id: 'bronze', index: 2, nameEn: 'Bronze', nameVi: 'Bronze (Đồng)', min: 200, max: 299, color: '#D98245', glow: 'rgba(217, 130, 69, 0.42)' },
    { id: 'silver', index: 3, nameEn: 'Silver', nameVi: 'Silver (Bạc)', min: 300, max: 399, color: '#CBD5E1', glow: 'rgba(203, 213, 225, 0.42)' },
    { id: 'gold', index: 4, nameEn: 'Gold', nameVi: 'Gold (Vàng)', min: 400, max: 499, color: '#FACC15', glow: 'rgba(250, 204, 21, 0.45)' },
    { id: 'platinum', index: 5, nameEn: 'Platinum', nameVi: 'Platinum (Bạch Kim)', min: 500, max: 599, color: '#2DD4BF', glow: 'rgba(45, 212, 191, 0.48)' },
    { id: 'diamond', index: 6, nameEn: 'Diamond', nameVi: 'Diamond (Kim Cương)', min: 600, max: 699, color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.50)' },
    { id: 'champion', index: 7, nameEn: 'Champion', nameVi: 'Champion (Quán Quân)', min: 700, max: 799, color: '#C084FC', glow: 'rgba(192, 132, 252, 0.52)' },
    { id: 'titan', index: 8, nameEn: 'Titan', nameVi: 'Titan', min: 800, max: 899, color: '#FB7185', glow: 'rgba(251, 113, 133, 0.54)' },
    { id: 'olympian', index: 9, nameEn: 'Olympian', nameVi: 'Olympian (Đỉnh Cao)', min: 900, max: 1000, color: '#FDE047', glow: 'rgba(253, 224, 71, 0.62)' }
  ];

  // Strictly monotonic piecewise-linear knots mapping normalized strength ratio rho -> [0, 1000] rating.
  // Calibrated so rho = 1.00 maps to Rating 400 (Gold 0 LP) and matches empirical Liftoff Titan/Olympian benchmarks.
  const CURVE_KNOTS = [
    { rho: 0.00, rating: 0 },
    { rho: 0.25, rating: 60 },
    { rho: 0.55, rating: 200 }, // Bronze floor
    { rho: 0.77, rating: 300 }, // Silver floor
    { rho: 1.00, rating: 400 }, // Gold floor
    { rho: 1.20, rating: 500 }, // Platinum floor
    { rho: 1.38, rating: 600 }, // Diamond floor
    { rho: 1.57, rating: 700 }, // Champion floor
    { rho: 1.76, rating: 800 }, // Titan floor
    { rho: 2.00, rating: 900 }, // Olympian floor
    { rho: 2.38, rating: 1000 } // Cap
  ];

  function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function clamp(val, minVal, maxVal) {
    if (!isFiniteNumber(val)) return minVal;
    if (val < minVal) return minVal;
    if (val > maxVal) return maxVal;
    return val;
  }

  function kgToUnit(kg, unit) {
    if (!isFiniteNumber(kg)) return 0;
    return unit === 'lbs' ? kg * LBS_PER_KG : kg;
  }

  function unitToKg(value, unit) {
    if (!isFiniteNumber(value)) return 0;
    return unit === 'lbs' ? value / LBS_PER_KG : value;
  }

  function formatWeight(kg, unit) {
    const converted = kgToUnit(kg, unit);
    const rounded = Math.round(converted * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function sanitizeBodyweightKg(bwKg) {
    if (!isFiniteNumber(bwKg) || bwKg <= 0) return 70;
    return clamp(bwKg, 30, 250);
  }

  function sexCurveMultiplier(sex) {
    return sex === 'female' ? 0.64 : 1.0;
  }

  function getScaledGold1RMKg(exercise, bodyweightKg, sex) {
    if (!exercise || !isFiniteNumber(exercise.ref1RM70kgMale)) return 50;
    const bw = sanitizeBodyweightKg(bodyweightKg);
    const allometric = Math.pow(bw / 70, 2 / 3);
    return exercise.ref1RM70kgMale * allometric * sexCurveMultiplier(sex);
  }

  // Liftoff official Epley formula: weight * (1 + min(reps, 30) / 30), working sets only.
  function estimateSet1RMKg(setInput, exercise, bodyweightKg) {
    if (!setInput || !exercise) return 0;
    if (setInput.setType === 'warmup') return 0;

    const rawReps = isFiniteNumber(setInput.reps) ? Math.floor(setInput.reps) : 0;
    if (rawReps < 1) return 0;
    const cappedReps = Math.min(rawReps, 30);

    const bw = sanitizeBodyweightKg(bodyweightKg);
    const rawWeightKg = isFiniteNumber(setInput.weightKg) ? setInput.weightKg : 0;

    let effectiveLoadKg = rawWeightKg;
    if (exercise.isBodyweight) {
      if (rawWeightKg < 0) return 0;
      effectiveLoadKg = bw * (exercise.bwLoadFactor || 0.9) + rawWeightKg;
    } else if (rawWeightKg <= 0) {
      return 0;
    }

    return effectiveLoadKg * (1 + cappedReps / 30);
  }

  function interpolateRatingFromRho(rho) {
    if (!isFiniteNumber(rho) || rho <= 0) return 0;
    const last = CURVE_KNOTS[CURVE_KNOTS.length - 1];
    if (rho >= last.rho) return 1000;

    for (let i = 0; i < CURVE_KNOTS.length - 1; i += 1) {
      const a = CURVE_KNOTS[i];
      const b = CURVE_KNOTS[i + 1];
      if (rho >= a.rho && rho <= b.rho) {
        const t = (rho - a.rho) / (b.rho - a.rho);
        return a.rating + t * (b.rating - a.rating);
      }
    }
    return 0;
  }

  function invertRhoFromRating(targetRating) {
    const r = clamp(targetRating, 0, 1000);
    if (r <= 0) return 0;
    for (let i = 0; i < CURVE_KNOTS.length - 1; i += 1) {
      const a = CURVE_KNOTS[i];
      const b = CURVE_KNOTS[i + 1];
      if (r >= a.rating && r <= b.rating) {
        const t = (r - a.rating) / (b.rating - a.rating);
        return a.rho + t * (b.rho - a.rho);
      }
    }
    return CURVE_KNOTS[CURVE_KNOTS.length - 1].rho;
  }

  function score1RMToRating(oneRepMaxKg, exercise, bodyweightKg, sex) {
    if (!isFiniteNumber(oneRepMaxKg) || oneRepMaxKg <= 0 || !exercise) return 0;
    const goldRef = getScaledGold1RMKg(exercise, bodyweightKg, sex);
    if (goldRef <= 0) return 0;
    const rho = oneRepMaxKg / goldRef;
    const rawRating = interpolateRatingFromRho(rho);
    return clamp(Math.floor(rawRating + 1e-9), 1, 1000);
  }

  function evaluateSetStrength(setInput, exercise, bodyweightKg, sex) {
    const e1rmKg = estimateSet1RMKg(setInput, exercise, bodyweightKg);
    if (e1rmKg <= 0) {
      return {
        valid: false,
        e1rmKg: 0,
        rating: 0,
        tier: RANK_TIERS[0],
        lp: 0,
        nextTier: RANK_TIERS[1],
        pointsToNext: 1
      };
    }
    const rating = score1RMToRating(e1rmKg, exercise, bodyweightKg, sex);
    const tierInfo = ratingToTierAndLp(rating);
    return {
      valid: true,
      e1rmKg: e1rmKg,
      rating: rating,
      tier: tierInfo.tier,
      lp: tierInfo.lp,
      nextTier: tierInfo.nextTier,
      pointsToNext: tierInfo.pointsToNext
    };
  }

  function ratingToTierAndLp(rating) {
    const r = isFiniteNumber(rating) ? Math.floor(clamp(rating, 0, 1000)) : 0;
    if (r <= 0) {
      return {
        rating: 0,
        tier: RANK_TIERS[0],
        lp: 0,
        nextTier: RANK_TIERS[1],
        pointsToNext: 1
      };
    }

    let matched = RANK_TIERS[1];
    for (let i = 1; i < RANK_TIERS.length; i += 1) {
      if (r >= RANK_TIERS[i].min) {
        matched = RANK_TIERS[i];
      }
    }

    let lp = 0;
    if (matched.id === 'wood') {
      lp = Math.min(99, Math.floor(((r - 1) / 199) * 100));
    } else if (matched.id === 'olympian') {
      lp = r - 900; // 0 to 100+ LP in Olympian
    } else {
      lp = r - matched.min; // Exact 0 - 99 LP per 100-point tier
    }

    const nextIndex = matched.index + 1;
    const nextTier = nextIndex < RANK_TIERS.length ? RANK_TIERS[nextIndex] : null;
    const pointsToNext = nextTier ? Math.max(0, nextTier.min - r) : 0;

    return {
      rating: r,
      tier: matched,
      lp: lp,
      nextTier: nextTier,
      pointsToNext: pointsToNext
    };
  }

  // Exact analytical inverse: computes minimum weight (in requested unit, snapped to 0.5 kg or 1 lb)
  // needed at `reps` so that score1RMToRating >= targetRating.
  function solveWeightForRating(exercise, targetRating, reps, bodyweightKg, sex, unit) {
    if (!exercise || !isFiniteNumber(targetRating) || targetRating <= 0) return null;
    const cappedRating = clamp(Math.ceil(targetRating), 1, 1000);
    const cappedReps = clamp(Math.floor(isFiniteNumber(reps) ? reps : 8), 1, 30);
    const goldRefKg = getScaledGold1RMKg(exercise, bodyweightKg, sex);
    const targetRho = invertRhoFromRating(cappedRating);
    const required1RMKg = targetRho * goldRefKg;
    const requiredEffectiveLoadKg = required1RMKg / (1 + cappedReps / 30);

    const bw = sanitizeBodyweightKg(bodyweightKg);
    let rawExternalKg = requiredEffectiveLoadKg;
    if (exercise.isBodyweight) {
      rawExternalKg = Math.max(0, requiredEffectiveLoadKg - bw * (exercise.bwLoadFactor || 0.9));
    }

    const useLbs = unit === 'lbs';
    const stepUnit = useLbs ? 1.0 : 0.5;
    const rawInUnit = kgToUnit(rawExternalKg, useLbs ? 'lbs' : 'kg');
    let snappedUnit = Math.ceil((rawInUnit - 1e-9) / stepUnit) * stepUnit;
    if (!exercise.isBodyweight && snappedUnit < stepUnit) {
      snappedUnit = stepUnit;
    }

    // Guarantee rounding boundary never falls 1 point short due to floating-point floor
    for (let guard = 0; guard < 5; guard += 1) {
      const checkKg = unitToKg(snappedUnit, useLbs ? 'lbs' : 'kg');
      const checkEval = evaluateSetStrength(
        { weightKg: checkKg, reps: cappedReps, setType: 'working' },
        exercise,
        bw,
        sex
      );
      if (checkEval.rating >= cappedRating) {
        return {
          weightInUnit: Math.round(snappedUnit * 10) / 10,
          weightKg: checkKg,
          reps: cappedReps,
          achievedRating: checkEval.rating
        };
      }
      snappedUnit += stepUnit;
    }

    const finalKg = unitToKg(snappedUnit, useLbs ? 'lbs' : 'kg');
    return {
      weightInUnit: Math.round(snappedUnit * 10) / 10,
      weightKg: finalKg,
      reps: cappedReps,
      achievedRating: cappedRating
    };
  }

  // Recomputes ALL Exercise Ranks, Muscle Ranks, Overall Bodyrank, PRs, Streak, XP, and Recovery deterministically from workouts[]
  function computeDerivedRankSnapshot(profile, workouts, nowMs) {
    const bw = sanitizeBodyweightKg(profile && profile.bodyweightKg);
    const sex = profile && profile.sex === 'female' ? 'female' : 'male';
    const safeNow = isFiniteNumber(nowMs) ? nowMs : 0;
    const sortedWorkouts = Array.isArray(workouts)
      ? workouts.slice().sort(function (a, b) { return (a.completedAtMs || 0) - (b.completedAtMs || 0); })
      : [];

    const exerciseStats = Object.create(null);
    for (let i = 0; i < catalog.EXERCISES.length; i += 1) {
      const ex = catalog.EXERCISES[i];
      exerciseStats[ex.id] = {
        exerciseId: ex.id,
        bestRating: 0,
        best1RMKg: 0,
        bestWeightKg: 0,
        bestSetReps: 0,
        totalWorkingSets: 0,
        lastSet: null,
        lastCompletedAtMs: 0,
        tierInfo: ratingToTierAndLp(0)
      };
    }

    const muscleLastTrainedMs = Object.create(null);
    let totalWorkingSetsAll = 0;
    let totalVolumeKgAll = 0;

    for (let wIdx = 0; wIdx < sortedWorkouts.length; wIdx += 1) {
      const w = sortedWorkouts[wIdx];
      const wBw = sanitizeBodyweightKg(w.bodyweightKg || bw);
      const entries = Array.isArray(w.entries) ? w.entries : [];

      for (let eIdx = 0; eIdx < entries.length; eIdx += 1) {
        const entry = entries[eIdx];
        const ex = catalog.EXERCISE_BY_ID[entry.exerciseId];
        if (!ex) continue;
        const stat = exerciseStats[ex.id];
        const sets = Array.isArray(entry.sets) ? entry.sets : [];
        let workedThisEx = false;

        for (let sIdx = 0; sIdx < sets.length; sIdx += 1) {
          const s = sets[sIdx];
          if (s.completed === false) continue;
          const res = evaluateSetStrength(s, ex, wBw, sex);
          if (!res.valid) continue;

          workedThisEx = true;
          stat.totalWorkingSets += 1;
          totalWorkingSetsAll += 1;
          const volLoad = ex.isBodyweight ? (wBw * (ex.bwLoadFactor || 0.9) + Math.max(0, s.weightKg || 0)) : (s.weightKg || 0);
          totalVolumeKgAll += volLoad * Math.max(1, Math.floor(s.reps || 0));

          stat.lastSet = {
            weightKg: s.weightKg || 0,
            reps: Math.floor(s.reps || 0),
            e1rmKg: res.e1rmKg,
            rating: res.rating
          };
          stat.lastCompletedAtMs = w.completedAtMs || 0;

          if (res.rating > stat.bestRating || (res.rating === stat.bestRating && res.e1rmKg > stat.best1RMKg)) {
            stat.bestRating = res.rating;
            stat.best1RMKg = res.e1rmKg;
            stat.bestWeightKg = s.weightKg || 0;
            stat.bestSetReps = Math.floor(s.reps || 0);
          } else if ((s.weightKg || 0) > stat.bestWeightKg) {
            stat.bestWeightKg = s.weightKg || 0;
          }
        }

        if (workedThisEx) {
          const allMuscles = ex.primaryMuscles.concat(ex.secondaryMuscles || []);
          for (let m = 0; m < allMuscles.length; m += 1) {
            const mId = allMuscles[m];
            if (!muscleLastTrainedMs[mId] || (w.completedAtMs || 0) > muscleLastTrainedMs[mId]) {
              muscleLastTrainedMs[mId] = w.completedAtMs || 0;
            }
          }
        }
      }
    }

    for (let i = 0; i < catalog.EXERCISES.length; i += 1) {
      const exId = catalog.EXERCISES[i].id;
      exerciseStats[exId].tierInfo = ratingToTierAndLp(exerciseStats[exId].bestRating);
    }

    // Rollup 15 Muscle Ranks: take top weighted score among exercises hitting that muscle
    // (Primary contribution = 1.00 * rating, Secondary assist = 0.78 * rating, blended with top-2 consistency)
    const muscleRanks = Object.create(null);
    let rankedMusclesCount = 0;
    let sumAllMuscleRatings = 0;
    const rankedMuscleRatings = [];

    for (let mIdx = 0; mIdx < catalog.MUSCLE_GROUPS.length; mIdx += 1) {
      const mGroup = catalog.MUSCLE_GROUPS[mIdx];
      const mId = mGroup.id;
      const contributions = [];

      for (let eIdx = 0; eIdx < catalog.EXERCISES.length; eIdx += 1) {
        const ex = catalog.EXERCISES[eIdx];
        const rating = exerciseStats[ex.id].bestRating;
        if (rating <= 0) continue;

        if (ex.primaryMuscles.indexOf(mId) !== -1) {
          contributions.push({ exerciseId: ex.id, effectiveRating: rating, role: 'primary' });
        } else if (ex.secondaryMuscles && ex.secondaryMuscles.indexOf(mId) !== -1) {
          contributions.push({ exerciseId: ex.id, effectiveRating: Math.round(rating * 0.78), role: 'secondary' });
        }
      }

      contributions.sort(function (a, b) { return b.effectiveRating - a.effectiveRating; });

      let muscleRating = 0;
      if (contributions.length === 1) {
        muscleRating = contributions[0].effectiveRating;
      } else if (contributions.length >= 2) {
        // Dominated by strongest lift (75%) + second lift (25%) so logging more exercises never lowers your muscle rank!
        muscleRating = Math.round(contributions[0].effectiveRating * 0.75 + contributions[1].effectiveRating * 0.25);
        if (muscleRating < contributions[0].effectiveRating) {
          muscleRating = contributions[0].effectiveRating;
        }
      }

      const lastMs = muscleLastTrainedMs[mId] || 0;
      let recoveryPct = 100;
      if (lastMs > 0 && safeNow >= lastMs) {
        const elapsed = safeNow - lastMs;
        recoveryPct = clamp(Math.round(30 + (elapsed / FULL_RECOVERY_MS) * 70), 30, 100);
      }

      const mTierInfo = ratingToTierAndLp(muscleRating);
      if (muscleRating > 0) {
        rankedMusclesCount += 1;
        sumAllMuscleRatings += muscleRating;
        rankedMuscleRatings.push(muscleRating);
      }

      muscleRanks[mId] = {
        muscleId: mId,
        rating: muscleRating,
        tierInfo: mTierInfo,
        topExerciseId: contributions.length > 0 ? contributions[0].exerciseId : null,
        lastTrainedMs: lastMs,
        recoveryPct: recoveryPct
      };
    }

    // Overall Bodyrank: combines coverage across body + peak muscle strength
    // Unlocks progressively as muscles get ranked; rewards balanced full-body training while staying monotonic!
    let overallRating = 0;
    if (rankedMuscleRatings.length > 0) {
      rankedMuscleRatings.sort(function (a, b) { return b - a; });
      const topSlice = rankedMuscleRatings.slice(0, Math.min(6, rankedMuscleRatings.length));
      let topSum = 0;
      for (let i = 0; i < topSlice.length; i += 1) topSum += topSlice[i];
      const topAvg = topSum / topSlice.length;
      const coverageFactor = 0.55 + 0.45 * Math.min(1, rankedMusclesCount / 10);
      overallRating = clamp(Math.round(topAvg * coverageFactor), 1, 1000);
    }
    const overallTierInfo = ratingToTierAndLp(overallRating);

    // Streak calculation (Liftoff FAQ rule: streak breaks only if > 3 days pass without a workout)
    let streakDays = 0;
    if (sortedWorkouts.length > 0) {
      const dayBuckets = [];
      for (let i = 0; i < sortedWorkouts.length; i += 1) {
        const t = sortedWorkouts[i].completedAtMs || 0;
        const dayIndex = Math.floor(t / (24 * 60 * 60 * 1000));
        if (dayBuckets.length === 0 || dayBuckets[dayBuckets.length - 1] !== dayIndex) {
          dayBuckets.push(dayIndex);
        }
      }
      const lastWorkoutMs = sortedWorkouts[sortedWorkouts.length - 1].completedAtMs || 0;
      if (safeNow <= 0 || safeNow - lastWorkoutMs <= THREE_DAYS_MS) {
        let activeSpanStart = dayBuckets[dayBuckets.length - 1];
        for (let i = dayBuckets.length - 1; i >= 1; i -= 1) {
          const gapDays = dayBuckets[i] - dayBuckets[i - 1];
          if (gapDays <= 3) {
            activeSpanStart = dayBuckets[i - 1];
          } else {
            break;
          }
        }
        streakDays = Math.max(1, dayBuckets[dayBuckets.length - 1] - activeSpanStart + 1);
      }
    }

    // XP & Leveling (Lv.1 starts at 0 XP; every workout + working set + ranked muscle awards XP)
    const xpTotal = sortedWorkouts.length * 120 + totalWorkingSetsAll * 25 + rankedMusclesCount * 40;
    const xpPerLevel = 300;
    const level = 1 + Math.floor(xpTotal / xpPerLevel);
    const levelXp = xpTotal % xpPerLevel;
    const levelProgressPct = Math.round((levelXp / xpPerLevel) * 100);
    const gems = sortedWorkouts.length * 15 + rankedMusclesCount * 10;

    // Welcome Quest progress (matches 40% starting feel when profile is ready, 100% once first ranked workout is posted!)
    let questStepsDone = 1; // Step 1: Opened Liftoff
    if (profile && profile.bodyweightConfirmed) questStepsDone += 1;
    if (sortedWorkouts.length >= 1) questStepsDone += 2;
    if (rankedMusclesCount >= 4) questStepsDone += 1;
    const welcomeQuestPct = Math.min(100, Math.round((questStepsDone / 5) * 100));

    // Unlock Bodyrank Progress bar (0 to 100% across 6 ranked muscle groups)
    const bodyrankUnlockPct = Math.min(100, Math.round((Math.max(1.8, rankedMusclesCount) / 6) * 100));

    return {
      exerciseStats: exerciseStats,
      muscleRanks: muscleRanks,
      rankedMusclesCount: rankedMusclesCount,
      overallRating: overallRating,
      overallTierInfo: overallTierInfo,
      streakDays: streakDays,
      xpTotal: xpTotal,
      level: level,
      levelXp: levelXp,
      xpPerLevel: xpPerLevel,
      levelProgressPct: levelProgressPct,
      gems: gems,
      totalWorkouts: sortedWorkouts.length,
      totalWorkingSets: totalWorkingSetsAll,
      totalVolumeKg: totalVolumeKgAll,
      welcomeQuestPct: sortedWorkouts.length === 0 && !(profile && profile.bodyweightConfirmed) ? 40 : welcomeQuestPct,
      bodyrankUnlockPct: sortedWorkouts.length === 0 ? 58 : bodyrankUnlockPct
    };
  }

  function createInitialState() {
    return {
      schemaVersion: 1,
      lang: 'en',
      soundEnabled: true,
      profile: {
        name: 'Bình',
        sex: 'male',
        bodyweightKg: 68,
        unit: 'kg',
        bodyweightConfirmed: false,
        restTimerSec: 90
      },
      workouts: [],
      nutritionLog: {
        caloriesTarget: 2450,
        proteinTargetG: 140,
        meals: []
      },
      activeSession: null
    };
  }

  function createSessionFromExercises(exerciseIds, state, nowMs) {
    const derived = computeDerivedRankSnapshot(state.profile, state.workouts, nowMs);
    const entries = [];
    const seen = Object.create(null);

    for (let i = 0; i < exerciseIds.length; i += 1) {
      const id = exerciseIds[i];
      if (seen[id] || !catalog.EXERCISE_BY_ID[id]) continue;
      seen[id] = true;
      const ex = catalog.EXERCISE_BY_ID[id];
      const prevStat = derived.exerciseStats[id];
      const defaultWeightKg = prevStat && prevStat.lastSet
        ? prevStat.lastSet.weightKg
        : (ex.isBodyweight ? 0 : Math.round(getScaledGold1RMKg(ex, state.profile.bodyweightKg, state.profile.sex) * 0.55));
      const defaultReps = prevStat && prevStat.lastSet ? prevStat.lastSet.reps : 8;

      entries.push({
        exerciseId: id,
        sets: [
          { id: id + '_s1', setType: 'working', weightKg: defaultWeightKg, reps: defaultReps, completed: false },
          { id: id + '_s2', setType: 'working', weightKg: defaultWeightKg, reps: defaultReps, completed: false },
          { id: id + '_s3', setType: 'working', weightKg: defaultWeightKg, reps: defaultReps, completed: false }
        ]
      });
    }

    return {
      startedAtMs: isFiniteNumber(nowMs) ? nowMs : 0,
      title: '',
      postToDiscovery: true,
      entries: entries
    };
  }

  // Pure functional reducer: (state, action, nowMs) -> { state, celebration }
  function reduceAppState(prevState, action, nowMs) {
    const state = JSON.parse(JSON.stringify(prevState || createInitialState()));
    const safeNow = isFiniteNumber(nowMs) ? nowMs : 0;
    if (!action || typeof action.type !== 'string') {
      return { state: state, celebration: null };
    }

    switch (action.type) {
      case 'SET_LANG': {
        state.lang = action.lang === 'vi' ? 'vi' : 'en';
        return { state: state, celebration: null };
      }

      case 'TOGGLE_SOUND': {
        state.soundEnabled = !state.soundEnabled;
        return { state: state, celebration: null };
      }

      case 'UPDATE_PROFILE': {
        if (action.name && typeof action.name === 'string') {
          state.profile.name = action.name.trim().slice(0, 32) || state.profile.name;
        }
        if (action.sex === 'male' || action.sex === 'female') {
          state.profile.sex = action.sex;
        }
        if (action.unit === 'kg' || action.unit === 'lbs') {
          state.profile.unit = action.unit;
        }
        if (isFiniteNumber(action.bodyweightKg) && action.bodyweightKg > 0) {
          state.profile.bodyweightKg = sanitizeBodyweightKg(action.bodyweightKg);
          state.profile.bodyweightConfirmed = true;
          state.nutritionLog.proteinTargetG = Math.round(state.profile.bodyweightKg * 2.0);
          state.nutritionLog.caloriesTarget = Math.round(state.profile.bodyweightKg * 35);
        }
        if (isFiniteNumber(action.restTimerSec) && action.restTimerSec >= 15) {
          state.profile.restTimerSec = clamp(Math.round(action.restTimerSec), 15, 600);
        }
        return { state: state, celebration: null };
      }

      case 'START_WORKOUT': {
        const ids = Array.isArray(action.exerciseIds) && action.exerciseIds.length > 0
          ? action.exerciseIds
          : ['bench_press', 'barbell_squat', 'lat_pulldown'];
        state.activeSession = createSessionFromExercises(ids, state, safeNow);
        if (action.title) state.activeSession.title = String(action.title).slice(0, 60);
        return { state: state, celebration: null };
      }

      case 'ADD_EXERCISES_TO_SESSION': {
        if (!state.activeSession) {
          state.activeSession = createSessionFromExercises(action.exerciseIds || [], state, safeNow);
          return { state: state, celebration: null };
        }
        const addSession = createSessionFromExercises(action.exerciseIds || [], state, safeNow);
        const existingIds = Object.create(null);
        for (let i = 0; i < state.activeSession.entries.length; i += 1) {
          existingIds[state.activeSession.entries[i].exerciseId] = true;
        }
        for (let i = 0; i < addSession.entries.length; i += 1) {
          const item = addSession.entries[i];
          if (!existingIds[item.exerciseId]) {
            state.activeSession.entries.push(item);
          }
        }
        return { state: state, celebration: null };
      }

      case 'REMOVE_EXERCISE_FROM_SESSION': {
        if (!state.activeSession) return { state: state, celebration: null };
        state.activeSession.entries = state.activeSession.entries.filter(function (e) {
          return e.exerciseId !== action.exerciseId;
        });
        return { state: state, celebration: null };
      }

      case 'ADD_SET': {
        if (!state.activeSession) return { state: state, celebration: null };
        for (let i = 0; i < state.activeSession.entries.length; i += 1) {
          const entry = state.activeSession.entries[i];
          if (entry.exerciseId === action.exerciseId) {
            const last = entry.sets.length > 0 ? entry.sets[entry.sets.length - 1] : null;
            entry.sets.push({
              id: entry.exerciseId + '_s' + String(entry.sets.length + 1) + '_' + String(safeNow % 100000),
              setType: 'working',
              weightKg: last ? last.weightKg : 20,
              reps: last ? last.reps : 8,
              completed: false
            });
            break;
          }
        }
        return { state: state, celebration: null };
      }

      case 'UPDATE_SET': {
        if (!state.activeSession) return { state: state, celebration: null };
        for (let i = 0; i < state.activeSession.entries.length; i += 1) {
          const entry = state.activeSession.entries[i];
          if (entry.exerciseId !== action.exerciseId) continue;
          for (let sIdx = 0; sIdx < entry.sets.length; sIdx += 1) {
            const setItem = entry.sets[sIdx];
            if (setItem.id !== action.setId) continue;
            if (isFiniteNumber(action.weightKg) && action.weightKg >= 0) {
              setItem.weightKg = clamp(action.weightKg, 0, 1500);
            }
            if (isFiniteNumber(action.reps) && action.reps >= 0) {
              setItem.reps = clamp(Math.floor(action.reps), 0, 500);
            }
            if (action.setType === 'working' || action.setType === 'warmup' || action.setType === 'dropset') {
              setItem.setType = action.setType;
            }
            if (typeof action.completed === 'boolean') {
              setItem.completed = action.completed;
            }
            break;
          }
        }
        return { state: state, celebration: null };
      }

      case 'DELETE_SET': {
        if (!state.activeSession) return { state: state, celebration: null };
        for (let i = 0; i < state.activeSession.entries.length; i += 1) {
          const entry = state.activeSession.entries[i];
          if (entry.exerciseId === action.exerciseId) {
            entry.sets = entry.sets.filter(function (s) { return s.id !== action.setId; });
            break;
          }
        }
        return { state: state, celebration: null };
      }

      case 'CANCEL_WORKOUT': {
        state.activeSession = null;
        return { state: state, celebration: null };
      }

      case 'POST_WORKOUT': {
        if (!state.activeSession) return { state: state, celebration: null };
        const beforeSnap = computeDerivedRankSnapshot(state.profile, state.workouts, safeNow);

        // Keep sets that were checked OR have valid positive reps & load (frictionless mobile UX)
        const cleanedEntries = [];
        for (let i = 0; i < state.activeSession.entries.length; i += 1) {
          const entry = state.activeSession.entries[i];
          const ex = catalog.EXERCISE_BY_ID[entry.exerciseId];
          if (!ex) continue;
          const keptSets = [];
          for (let sIdx = 0; sIdx < entry.sets.length; sIdx += 1) {
            const s = entry.sets[sIdx];
            const hasValidNumbers = s.reps >= 1 && (ex.isBodyweight ? s.weightKg >= 0 : s.weightKg > 0);
            if (s.completed && hasValidNumbers) {
              keptSets.push({
                id: s.id,
                setType: s.setType || 'working',
                weightKg: s.weightKg,
                reps: Math.floor(s.reps),
                completed: true
              });
            }
          }
          if (keptSets.length > 0) {
            cleanedEntries.push({
              exerciseId: ex.id,
              sets: keptSets
            });
          }
        }

        if (cleanedEntries.length === 0) {
          return { state: state, celebration: { emptyError: true } };
        }

        const durationSec = state.activeSession.startedAtMs > 0 && safeNow >= state.activeSession.startedAtMs
          ? Math.max(60, Math.round((safeNow - state.activeSession.startedAtMs) / 1000))
          : 1800;

        const workoutRecord = {
          id: 'wk_' + String(safeNow) + '_' + String(state.workouts.length + 1),
          title: state.activeSession.title || '',
          completedAtMs: safeNow,
          durationSec: durationSec,
          bodyweightKg: state.profile.bodyweightKg,
          entries: cleanedEntries
        };

        state.profile.bodyweightConfirmed = true;
        state.workouts.push(workoutRecord);
        state.activeSession = null;

        const afterSnap = computeDerivedRankSnapshot(state.profile, state.workouts, safeNow);

        // Compute Rank-Ups, LP gains, and Personal Records broken in this workout!
        const exerciseRankUps = [];
        for (let i = 0; i < cleanedEntries.length; i += 1) {
          const exId = cleanedEntries[i].exerciseId;
          const prevStat = beforeSnap.exerciseStats[exId];
          const nextStat = afterSnap.exerciseStats[exId];
          if (!nextStat) continue;

          // Best set achieved specifically inside this workout
          let sessionBestRating = 0;
          let sessionBest1RMKg = 0;
          const exObj = catalog.EXERCISE_BY_ID[exId];
          for (let sIdx = 0; sIdx < cleanedEntries[i].sets.length; sIdx += 1) {
            const ev = evaluateSetStrength(
              cleanedEntries[i].sets[sIdx],
              exObj,
              state.profile.bodyweightKg,
              state.profile.sex
            );
            if (ev.valid && ev.rating > sessionBestRating) {
              sessionBestRating = ev.rating;
              sessionBest1RMKg = ev.e1rmKg;
            }
          }

          exerciseRankUps.push({
            exerciseId: exId,
            oldRating: prevStat ? prevStat.bestRating : 0,
            newRating: nextStat.bestRating,
            sessionRating: sessionBestRating,
            session1RMKg: sessionBest1RMKg,
            oldTier: prevStat ? prevStat.tierInfo.tier : RANK_TIERS[0],
            newTier: nextStat.tierInfo.tier,
            newLp: nextStat.tierInfo.lp,
            ratingDelta: Math.max(0, nextStat.bestRating - (prevStat ? prevStat.bestRating : 0)),
            tierUpgraded: nextStat.tierInfo.tier.index > (prevStat ? prevStat.tierInfo.tier.index : 0),
            isNewPR: nextStat.best1RMKg > (prevStat ? prevStat.best1RMKg : 0) + 1e-6
          });
        }

        const muscleUpgrades = [];
        for (let m = 0; m < catalog.MUSCLE_GROUPS.length; m += 1) {
          const mId = catalog.MUSCLE_GROUPS[m].id;
          const prevM = beforeSnap.muscleRanks[mId];
          const nextM = afterSnap.muscleRanks[mId];
          if (nextM.rating > prevM.rating) {
            muscleUpgrades.push({
              muscleId: mId,
              oldRating: prevM.rating,
              newRating: nextM.rating,
              oldTier: prevM.tierInfo.tier,
              newTier: nextM.tierInfo.tier,
              tierUpgraded: nextM.tierInfo.tier.index > prevM.tierInfo.tier.index
            });
          }
        }

        const celebration = {
          workoutId: workoutRecord.id,
          durationSec: durationSec,
          xpEarned: Math.max(0, afterSnap.xpTotal - beforeSnap.xpTotal),
          gemsEarned: Math.max(0, afterSnap.gems - beforeSnap.gems),
          oldLevel: beforeSnap.level,
          newLevel: afterSnap.level,
          oldOverallRating: beforeSnap.overallRating,
          newOverallRating: afterSnap.overallRating,
          oldOverallTier: beforeSnap.overallTierInfo.tier,
          newOverallTier: afterSnap.overallTierInfo.tier,
          newOverallLp: afterSnap.overallTierInfo.lp,
          overallTierUpgraded: afterSnap.overallTierInfo.tier.index > beforeSnap.overallTierInfo.tier.index,
          streakDays: afterSnap.streakDays,
          exerciseRankUps: exerciseRankUps,
          muscleUpgrades: muscleUpgrades
        };

        return { state: state, celebration: celebration };
      }

      case 'DELETE_WORKOUT': {
        state.workouts = state.workouts.filter(function (w) { return w.id !== action.workoutId; });
        return { state: state, celebration: null };
      }

      case 'ADD_MEAL': {
        const name = String(action.name || 'Protein Meal').trim().slice(0, 40);
        const kcal = clamp(Math.round(Number(action.kcal) || 0), 10, 4000);
        const proteinG = clamp(Math.round(Number(action.proteinG) || 0), 0, 300);
        state.nutritionLog.meals.push({
          id: 'meal_' + String(safeNow) + '_' + String(state.nutritionLog.meals.length + 1),
          name: name,
          kcal: kcal,
          proteinG: proteinG,
          loggedAtMs: safeNow
        });
        return { state: state, celebration: null };
      }

      case 'DELETE_MEAL': {
        state.nutritionLog.meals = state.nutritionLog.meals.filter(function (m) { return m.id !== action.mealId; });
        return { state: state, celebration: null };
      }

      case 'LOAD_DEMO_DATA': {
        const base = createInitialState();
        base.lang = state.lang;
        base.profile.bodyweightKg = 68;
        base.profile.bodyweightConfirmed = true;
        const dayMs = 24 * 60 * 60 * 1000;
        base.workouts = [
          {
            id: 'wk_demo_1',
            title: 'Push Strength Calibration',
            completedAtMs: Math.max(1000, safeNow - 2 * dayMs),
            durationSec: 2640,
            bodyweightKg: 68,
            entries: [
              {
                exerciseId: 'bench_press',
                sets: [
                  { id: 'd1', setType: 'warmup', weightKg: 40, reps: 10, completed: true },
                  { id: 'd2', setType: 'working', weightKg: 60, reps: 8, completed: true },
                  { id: 'd3', setType: 'working', weightKg: 65, reps: 6, completed: true }
                ]
              },
              {
                exerciseId: 'overhead_press',
                sets: [
                  { id: 'd4', setType: 'working', weightKg: 40, reps: 8, completed: true }
                ]
              },
              {
                exerciseId: 'tricep_pushdown',
                sets: [
                  { id: 'd5', setType: 'working', weightKg: 30, reps: 10, completed: true }
                ]
              }
            ]
          },
          {
            id: 'wk_demo_2',
            title: 'Pull & Lower Ranked Session',
            completedAtMs: Math.max(2000, safeNow - 1 * dayMs),
            durationSec: 2920,
            bodyweightKg: 68,
            entries: [
              {
                exerciseId: 'barbell_squat',
                sets: [
                  { id: 'd6', setType: 'working', weightKg: 85, reps: 8, completed: true }
                ]
              },
              {
                exerciseId: 'pull_ups',
                sets: [
                  { id: 'd7', setType: 'working', weightKg: 0, reps: 10, completed: true }
                ]
              },
              {
                exerciseId: 'barbell_curl',
                sets: [
                  { id: 'd8', setType: 'working', weightKg: 30, reps: 10, completed: true }
                ]
              }
            ]
          }
        ];
        return { state: base, celebration: null };
      }

      case 'RESET_ALL': {
        const fresh = createInitialState();
        fresh.lang = state.lang;
        return { state: fresh, celebration: null };
      }

      default:
        return { state: state, celebration: null };
    }
  }

  return {
    LBS_PER_KG: LBS_PER_KG,
    RANK_TIERS: RANK_TIERS,
    CURVE_KNOTS: CURVE_KNOTS,
    kgToUnit: kgToUnit,
    unitToKg: unitToKg,
    formatWeight: formatWeight,
    sanitizeBodyweightKg: sanitizeBodyweightKg,
    getScaledGold1RMKg: getScaledGold1RMKg,
    estimateSet1RMKg: estimateSet1RMKg,
    score1RMToRating: score1RMToRating,
    evaluateSetStrength: evaluateSetStrength,
    ratingToTierAndLp: ratingToTierAndLp,
    solveWeightForRating: solveWeightForRating,
    computeDerivedRankSnapshot: computeDerivedRankSnapshot,
    createInitialState: createInitialState,
    reduceAppState: reduceAppState
  };
});
