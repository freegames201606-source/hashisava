/* =========================================================
   audio.js - Web Audio API で効果音 & BGM を合成
   ========================================================= */

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let seGain = null;

  let bgmTimer = null;
  let bgmStep = 0;
  let currentBgm = null; // 'main' | 'boss' | 'midboss' | null

  let sirenOsc = null;
  let sirenLfo = null;
  let sirenGain = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);

    seGain = ctx.createGain();
    seGain.gain.value = 0.55;
    seGain.connect(masterGain);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.22;
    bgmGain.connect(masterGain);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ---------- 効果音 ---------- */
  function seShoot() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(440, t + 0.08);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(seGain);
    o.start(t); o.stop(t + 0.09);
  }

  function seHit() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 800;
    src.connect(f); f.connect(g); g.connect(seGain);
    src.start(t);

    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    g2.gain.setValueAtTime(0.4, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g2); g2.connect(seGain);
    o.start(t); o.stop(t + 0.16);
  }

  function seLevelUp() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const st = t + i * 0.08;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.4, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.24);
    });
  }

  function seGameOver() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 392, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const st = t + i * 0.15;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.35, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.36);
    });
  }

  /* ---------- 蜂の羽音（ブーン） ---------- */
  function seBeeBuzz() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 400;
    o.connect(f); f.connect(g); g.connect(seGain);
    o.start(t); o.stop(t + 0.3);
  }

  /* ---------- 警告サイレン ---------- */
  function startSiren() {
    if (!ctx) return;
    if (sirenOsc) return;
    const t = ctx.currentTime;

    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.value = 220;

    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.0001, t);
    sirenGain.gain.exponentialRampToValueAtTime(0.32, t + 0.3);

    sirenLfo = ctx.createOscillator();
    sirenLfo.type = 'sine';
    sirenLfo.frequency.value = 0.9;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;

    sirenOsc.connect(filter);
    filter.connect(sirenGain);
    sirenGain.connect(seGain);

    sirenOsc.start(t);
    sirenLfo.start(t);
  }

  function stopSiren() {
    if (!ctx) return;
    if (!sirenOsc) return;
    const t = ctx.currentTime;
    try {
      sirenGain.gain.cancelScheduledValues(t);
      sirenGain.gain.setValueAtTime(sirenGain.gain.value, t);
      sirenGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      sirenOsc.stop(t + 0.35);
      if (sirenLfo) sirenLfo.stop(t + 0.35);
    } catch (e) {}
    sirenOsc = null;
    sirenLfo = null;
    sirenGain = null;
  }

  /* ---------- 登場ファンファーレ（赤ロボ） ---------- */
  function seBossAppear() {
    if (!ctx) return;
    const t = ctx.currentTime;

    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(110, t);
    o1.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    g1.gain.setValueAtTime(0.6, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o1.connect(g1); g1.connect(seGain);
    o1.start(t); o1.stop(t + 0.75);

    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(220, t);
    o2.frequency.exponentialRampToValueAtTime(880, t + 0.6);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    o2.connect(g2); g2.connect(seGain);
    o2.start(t); o2.stop(t + 0.8);

    [0, 0.15, 0.3].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 440;
      const st = t + delay + 0.5;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.25, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.12);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.14);
    });
  }

  /* ---------- 中ボス登場ファンファーレ（女王蜂） ---------- */
  function seMidBossAppear() {
    if (!ctx) return;
    const t = ctx.currentTime;

    /* 蜂の羽音風（ブーン） */
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(200, t);
    o1.frequency.linearRampToValueAtTime(120, t + 0.8);
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500;
    o1.connect(f); f.connect(g1); g1.connect(seGain);
    o1.start(t); o1.stop(t + 0.95);

    /* 短い3連打 */
    [0.1, 0.25, 0.4].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 660;
      const st = t + delay;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.3, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.15);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.17);
    });
  }

  /* ---------- 撃破ファンファーレ（赤ロボ） ---------- */
  function seBossDefeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.4, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.32);
    });
    const chord = [523.25, 659.25, 783.99];
    chord.forEach(freq => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const st = t + 0.5;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.3, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.6);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.62);
    });
  }

  /* ---------- 撃破ファンファーレ（女王蜂：短め） ---------- */
  function seMidBossDefeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const st = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.35, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
      o.connect(g); g.connect(seGain);
      o.start(st); o.stop(st + 0.24);
    });
  }

  /* ---------- BGM（通常：明るいチップチューン） ---------- */
  const MELODY = [
    659.25, 0, 783.99, 0, 880, 0, 783.99, 0,
    659.25, 0, 587.33, 0, 523.25, 0, 0, 0,
    587.33, 0, 659.25, 0, 783.99, 0, 880, 0,
    783.99, 0, 659.25, 0, 587.33, 0, 0, 0,
  ];
  const BASS = [
    130.81, 0, 0, 0, 130.81, 0, 0, 0,
    146.83, 0, 0, 0, 146.83, 0, 0, 0,
    174.61, 0, 0, 0, 174.61, 0, 0, 0,
    196.00, 0, 0, 0, 196.00, 0, 0, 0,
  ];
  const STEP_MS_MAIN = 200;

  /* ---------- BGM（赤ロボ：短調・ダーク・速め） ---------- */
  const BOSS_MELODY = [
    220.00, 0, 261.63, 0, 329.63, 0, 261.63, 0,
    246.94, 0, 220.00, 0, 196.00, 0, 0, 0,
    220.00, 0, 261.63, 0, 329.63, 0, 392.00, 0,
    329.63, 0, 261.63, 0, 220.00, 0, 0, 0,
  ];
  const BOSS_BASS = [
    55.00, 55.00, 0, 55.00, 55.00, 0, 55.00, 0,
    61.74, 61.74, 0, 61.74, 61.74, 0, 61.74, 0,
    55.00, 55.00, 0, 55.00, 55.00, 0, 55.00, 0,
    49.00, 49.00, 0, 49.00, 49.00, 0, 49.00, 0,
  ];
  const STEP_MS_BOSS = 130;

  /* ---------- BGM（中ボス：軽快・短調） ---------- */
  const MID_MELODY = [
    329.63, 0, 349.23, 0, 392.00, 0, 349.23, 0,
    329.63, 0, 293.66, 0, 261.63, 0, 0, 0,
    293.66, 0, 329.63, 0, 392.00, 0, 440.00, 0,
    392.00, 0, 329.63, 0, 293.66, 0, 0, 0,
  ];
  const MID_BASS = [
    82.41, 0, 0, 82.41, 0, 0, 82.41, 0,
    87.31, 0, 0, 87.31, 0, 0, 87.31, 0,
    98.00, 0, 0, 98.00, 0, 0, 98.00, 0,
    82.41, 0, 0, 82.41, 0, 0, 82.41, 0,
  ];
  const STEP_MS_MID = 160;

  function tickBGM() {
    if (!ctx) return;
    const t = ctx.currentTime;

    if (currentBgm === 'main') {
      const m = MELODY[bgmStep % MELODY.length];
      const b = BASS[bgmStep % BASS.length];
      if (m > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = m;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.2);
      }
      if (b > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = b;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.24);
      }
    } else if (currentBgm === 'boss') {
      const m = BOSS_MELODY[bgmStep % BOSS_MELODY.length];
      const b = BOSS_BASS[bgmStep % BOSS_BASS.length];
      if (m > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.value = m;
        f.type = 'lowpass';
        f.frequency.value = 2200;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        o.connect(f); f.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.14);
      }
      if (b > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = b;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.36, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.17);
      }
      if (bgmStep % 2 === 1) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 4000;
        src.connect(f); f.connect(g); g.connect(bgmGain);
        src.start(t);
      }
    } else if (currentBgm === 'midboss') {
      const m = MID_MELODY[bgmStep % MID_MELODY.length];
      const b = MID_BASS[bgmStep % MID_BASS.length];
      if (m > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = m;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.18);
      }
      if (b > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = b;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(bgmGain);
        o.start(t); o.stop(t + 0.22);
      }
    }
    bgmStep++;
  }

  function _startBgmLoop(stepMs) {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    bgmStep = 0;
    tickBGM();
    bgmTimer = setInterval(tickBGM, stepMs);
  }

  function startBGM() {
    if (!ctx) return;
    if (currentBgm === 'main') return;
    currentBgm = 'main';
    _startBgmLoop(STEP_MS_MAIN);
  }

  function startBossBGM() {
    if (!ctx) return;
    if (currentBgm === 'boss') return;
    currentBgm = 'boss';
    _startBgmLoop(STEP_MS_BOSS);
  }

  function startMidBossBGM() {
    if (!ctx) return;
    if (currentBgm === 'midboss') return;
    currentBgm = 'midboss';
    _startBgmLoop(STEP_MS_MID);
  }

  function stopBGM() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    currentBgm = null;
  }

  function setBGMVolume(v) { if (bgmGain) bgmGain.gain.value = v; }
  function setSEVolume(v)  { if (seGain)  seGain.gain.value  = v; }

  return {
    init, resume,
    seShoot, seHit, seLevelUp, seGameOver,
    seBeeBuzz,
    seBossAppear, seBossDefeat,
    seMidBossAppear, seMidBossDefeat,
    startSiren, stopSiren,
    startBGM, startBossBGM, startMidBossBGM, stopBGM,
    setBGMVolume, setSEVolume,
  };
})();