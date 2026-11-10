import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/exercises.js');
const core = require('../src/core/rankEngine.js');
const storage = require('../src/core/storage.js');

test('Catalog covers all 15 anatomical muscle groups with primary exercises', () => {
  assert.equal(catalog.MUSCLE_GROUPS.length, 15);
  assert.ok(catalog.EXERCISES.length >= 36);
  for (const muscle of catalog.MUSCLE_GROUPS) {
    const primaryHits = catalog.EXERCISES.filter((ex) => ex.primaryMuscles.includes(muscle.id));
    assert.ok(
      primaryHits.length >= 1,
      `Muscle ${muscle.id} must have at least 1 primary ranked exercise`
    );
  }
});

test('Epley 1RM formula excludes warmups and caps reps strictly at 30', () => {
  const bench = catalog.EXERCISE_BY_ID.bench_press;
  assert.equal(
    core.estimateSet1RMKg({ weightKg: 80, reps: 10, setType: 'warmup' }, bench, 70),
    0
  );
  const r10 = core.estimateSet1RMKg({ weightKg: 60, reps: 10, setType: 'working' }, bench, 70);
  assert.ok(Math.abs(r10 - 80) < 1e-9);

  const r30 = core.estimateSet1RMKg({ weightKg: 50, reps: 30, setType: 'working' }, bench, 70);
  const r99 = core.estimateSet1RMKg({ weightKg: 50, reps: 99, setType: 'working' }, bench, 70);
  assert.equal(r30, 100);
  assert.equal(r99, r30, 'Reps beyond 30 must be capped at 30 per Liftoff specification');
});

test('All 9 Liftoff tier boundaries and LP partitions match official specification', () => {
  assert.equal(core.ratingToTierAndLp(0).tier.id, 'unranked');
  assert.equal(core.ratingToTierAndLp(1).tier.id, 'wood');
  assert.equal(core.ratingToTierAndLp(199).tier.id, 'wood');

  const bFloor = core.ratingToTierAndLp(200);
  assert.equal(bFloor.tier.id, 'bronze');
  assert.equal(bFloor.lp, 0);

  const gMid = core.ratingToTierAndLp(442);
  assert.equal(gMid.tier.id, 'gold');
  assert.equal(gMid.lp, 42);
  assert.equal(gMid.nextTier.id, 'platinum');
  assert.equal(gMid.pointsToNext, 58);

  const titanTop = core.ratingToTierAndLp(899);
  assert.equal(titanTop.tier.id, 'titan');
  assert.equal(titanTop.lp, 99);

  const olympian = core.ratingToTierAndLp(935);
  assert.equal(olympian.tier.id, 'olympian');
  assert.equal(olympian.lp, 35);
  assert.equal(olympian.nextTier, null);
});

test('Empirical calibration: 225 lbs x 10 Bench Press at 165 lbs bodyweight reaches Titan', () => {
  const bench = catalog.EXERCISE_BY_ID.bench_press;
  const bwKg = core.unitToKg(165, 'lbs');
  const weightKg = core.unitToKg(225, 'lbs');
  const res = core.evaluateSetStrength({ weightKg, reps: 10, setType: 'working' }, bench, bwKg, 'male');
  assert.equal(res.tier.id, 'titan');
  assert.ok(res.rating >= 800 && res.rating < 900);
});

test('Strict monotonicity across load, reps (1..30), and lighter bodyweight advantage', () => {
  for (const ex of catalog.EXERCISES) {
    let prevRating = -1;
    for (let w = 5; w <= 160; w += 5) {
      const r = core.evaluateSetStrength({ weightKg: w, reps: 8, setType: 'working' }, ex, 70, 'male').rating;
      assert.ok(r >= prevRating, `Non-monotonic weight on ${ex.id} at ${w}kg`);
      prevRating = r;
    }

    let prevRepRating = -1;
    for (let reps = 1; reps <= 30; reps += 1) {
      const r = core.evaluateSetStrength({ weightKg: 40, reps, setType: 'working' }, ex, 70, 'male').rating;
      assert.ok(r >= prevRepRating, `Non-monotonic reps on ${ex.id} at ${reps} reps`);
      prevRepRating = r;
    }

    if (!ex.isBodyweight) {
      const lighterLifter = core.evaluateSetStrength({ weightKg: 80, reps: 6, setType: 'working' }, ex, 60, 'male').rating;
      const heavierLifter = core.evaluateSetStrength({ weightKg: 80, reps: 6, setType: 'working' }, ex, 100, 'male').rating;
      assert.ok(lighterLifter >= heavierLifter, `Relative bodyweight scaling violated on ${ex.id}`);
    }
  }
});

test('Inverse solver solveWeightForRating hits exact target tier in both kg and lbs', () => {
  const targets = [200, 300, 400, 500, 600, 700, 800, 900];
  for (const unit of ['kg', 'lbs']) {
    for (const target of targets) {
      const ex = catalog.EXERCISE_BY_ID.bench_press;
      const solved = core.solveWeightForRating(ex, target, 8, 68, 'male', unit);
      assert.ok(solved !== null);
      const verify = core.evaluateSetStrength(
        { weightKg: solved.weightKg, reps: 8, setType: 'working' },
        ex,
        68,
        'male'
      );
      assert.ok(
        verify.rating >= target,
        `Solved ${solved.weightInUnit} ${unit} gave rating ${verify.rating} < target ${target}`
      );
    }
  }
});

test('Posting and deleting workouts deterministically upgrades and rolls back ranks', () => {
  let state = core.createInitialState();
  const t0 = 1_700_000_000_000;

  state = core.reduceAppState(state, { type: 'UPDATE_PROFILE', bodyweightKg: 70 }, t0).state;
  state = core.reduceAppState(state, { type: 'START_WORKOUT', exerciseIds: ['bench_press'] }, t0).state;

  const firstSetId = state.activeSession.entries[0].sets[0].id;
  state = core.reduceAppState(
    state,
    { type: 'UPDATE_SET', exerciseId: 'bench_press', setId: firstSetId, weightKg: 75, reps: 8, completed: true },
    t0 + 60_000
  ).state;

  const postOutcome = core.reduceAppState(state, { type: 'POST_WORKOUT' }, t0 + 1_200_000);
  state = postOutcome.state;
  assert.ok(postOutcome.celebration !== null);
  assert.equal(postOutcome.celebration.tierUpgraded, undefined);
  assert.equal(postOutcome.celebration.exerciseRankUps[0].tierUpgraded, true);
  assert.equal(postOutcome.celebration.exerciseRankUps[0].newTier.id, 'platinum');

  const snapAfterPost = core.computeDerivedRankSnapshot(state.profile, state.workouts, t0 + 1_200_000);
  assert.equal(snapAfterPost.exerciseStats.bench_press.tierInfo.tier.id, 'platinum');
  assert.ok(snapAfterPost.muscleRanks.lower_chest.rating >= 500);

  // Delete workout -> must roll back cleanly to Unranked (0)
  const wkId = state.workouts[0].id;
  state = core.reduceAppState(state, { type: 'DELETE_WORKOUT', workoutId: wkId }, t0 + 1_300_000).state;
  const snapAfterDelete = core.computeDerivedRankSnapshot(state.profile, state.workouts, t0 + 1_300_000);
  assert.equal(snapAfterDelete.exerciseStats.bench_press.bestRating, 0);
  assert.equal(snapAfterDelete.muscleRanks.lower_chest.rating, 0);
  assert.equal(snapAfterDelete.overallRating, 0);
});

test('Decimal parser & 1000-step deterministic fuzzing produce zero NaN or crashes', () => {
  assert.equal(storage.parseDecimalInput('67,5'), 67.5);
  assert.equal(storage.parseDecimalInput(' 102.5\u200b '), 102.5);
  assert.ok(Number.isNaN(storage.parseDecimalInput('abc')));

  // Deterministic PRNG (Mulberry32)
  let seed = 0xBEEF2026;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let state = core.createInitialState();
  let now = 1_700_000_000_000;
  for (let step = 0; step < 1000; step += 1) {
    now += Math.floor(rand() * 3_600_000);
    const pick = rand();
    if (pick < 0.2) {
      const ex = catalog.EXERCISES[Math.floor(rand() * catalog.EXERCISES.length)];
      state = core.reduceAppState(state, { type: 'START_WORKOUT', exerciseIds: [ex.id] }, now).state;
    } else if (pick < 0.6 && state.activeSession && state.activeSession.entries.length > 0) {
      const entry = state.activeSession.entries[0];
      if (entry.sets.length > 0) {
        const s = entry.sets[Math.floor(rand() * entry.sets.length)];
        state = core.reduceAppState(
          state,
          {
            type: 'UPDATE_SET',
            exerciseId: entry.exerciseId,
            setId: s.id,
            weightKg: rand() < 0.1 ? NaN : rand() * 220,
            reps: Math.floor(rand() * 40),
            completed: rand() > 0.2
          },
          now
        ).state;
      }
    } else if (pick < 0.85) {
      state = core.reduceAppState(state, { type: 'POST_WORKOUT' }, now).state;
    } else if (pick < 0.92 && state.workouts.length > 0) {
      const w = state.workouts[Math.floor(rand() * state.workouts.length)];
      state = core.reduceAppState(state, { type: 'DELETE_WORKOUT', workoutId: w.id }, now).state;
    } else {
      state = core.reduceAppState(
        state,
        { type: 'UPDATE_PROFILE', bodyweightKg: 45 + rand() * 80, sex: rand() > 0.5 ? 'male' : 'female' },
        now
      ).state;
    }

    const snap = core.computeDerivedRankSnapshot(state.profile, state.workouts, now);
    assert.ok(Number.isFinite(snap.overallRating) && snap.overallRating >= 0 && snap.overallRating <= 1000);
    assert.ok(Number.isFinite(snap.level) && snap.level >= 1);
  }
});
