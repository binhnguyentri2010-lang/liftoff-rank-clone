(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LiftoffSound = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let audioCtx = null;
  let activeVoices = 0;
  const MAX_VOICES = 6;

  function ensureContext() {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      try {
        audioCtx = new Ctx();
      } catch (_e) {
        return null;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playTone(freqHz, startOffsetSec, durationSec, gainPeak, type) {
    if (activeVoices >= MAX_VOICES) return;
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + (startOffsetSec || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freqHz, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainPeak || 0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);
      activeVoices += 1;
      osc.onended = function () {
        activeVoices = Math.max(0, activeVoices - 1);
      };
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch (_e) {
      // Ignore blocked autoplay
    }
  }

  function playSetCheck(enabled) {
    if (!enabled) return;
    playTone(587.33, 0, 0.09, 0.07, 'sine');
    playTone(880.0, 0.05, 0.12, 0.08, 'triangle');
  }

  function playRestDone(enabled) {
    if (!enabled) return;
    playTone(659.25, 0, 0.14, 0.09, 'triangle');
    playTone(783.99, 0.12, 0.14, 0.09, 'triangle');
    playTone(1046.5, 0.24, 0.28, 0.11, 'sine');
  }

  function playRankUpFanfare(enabled, didUpgradeTier) {
    if (!enabled) return;
    if (didUpgradeTier) {
      playTone(523.25, 0, 0.16, 0.09, 'triangle');
      playTone(659.25, 0.1, 0.16, 0.09, 'triangle');
      playTone(783.99, 0.2, 0.18, 0.10, 'triangle');
      playTone(1046.5, 0.32, 0.42, 0.12, 'sine');
    } else {
      playTone(523.25, 0, 0.14, 0.08, 'sine');
      playTone(783.99, 0.1, 0.25, 0.09, 'triangle');
    }
  }

  return {
    playSetCheck: playSetCheck,
    playRestDone: playRestDone,
    playRankUpFanfare: playRankUpFanfare
  };
});
