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
  let currentBgm = null; // 'main' | 'boss' | null

  // サイレン用
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

  /* =========================================================
     効果音
     ========================================================= */

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

  /* ---------- 警告サイレン（低音が揺れる） ---------- */

  function startSiren() {
    if (!ctx) return;
    if (sirenOsc) return; // すでに鳴っている

    const t = ctx.currentTime;

    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.value = 220; // 低めのA3

    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.0001, t);
    sirenGain.gain.exponentialRampToValueAtTime(0.32, t + 0.3);

    /* LFO で音程を揺らす（サイレン） */
    sirenLfo = ctx.createOscillator();
    sirenLfo.type = 'sine';
    sirenLfo.frequency.value = 0.9; // 1秒に約1往復
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80; // ±80Hz 揺らす
    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);

    /* ローパスで丸みを持たせる */
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

  /* ---------- 登場ファンファーレ ---------- */

  function seBossAppear() {
    if (!ctx) return;
    const t = ctx.currentTime;

    /* 低音の「ドーン」 */
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(110, t);
    o1.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    g1.gain.setValueAtTime(0.6, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o1.connect(g1); g1.connect(seGain);
    o1.start(t); o1.stop(t + 0.75);

    /* 上昇する不気味な音 */
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

    /* 短い3連打 */
    [0, 0.15, 0.3].forEach((delay, i) => {
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

  /* ---------- 撃破ファンファーレ ---------- */

  function seBossDefeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    /* 上昇する明るいメロディ */
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
    /* 最後の和音 */
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

  /* =========================================================
     BGM（通常）
     ========================================================= */

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

  /* =========================================================
     BGM（ボス：短調・ダーク・速め）
     ========================================================= */

  /* A minor（A C E） */
  const BOSS_MELODY = [
    /* 4小節 × 8ステップ */
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

      /* 鋸波のリード */
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

      /* 低音ベース（太め） */
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

      /* ハイハット風ノイズ */
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

  function stopBGM() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    currentBgm = null;
  }

  function setBGMVolume(v) { if (bgmGain) bgmGain.gain.value = v; }
  function setSEVolume(v)  { if (seGain)  seGain.gain.value  = v; }

  return {
    init, resume,
    seShoot, seHit, seLevelUp, seGameOver,
    seBossAppear, seBossDefeat,
    startSiren, stopSiren,
    startBGM, startBossBGM, stopBGM,
    setBGMVolume, setSEVolume,
  };
})();