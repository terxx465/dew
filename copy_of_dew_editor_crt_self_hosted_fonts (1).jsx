import React, { useEffect, useMemo, useRef, useState } from "react";

// Dew Editor — CRT / Green Phosphor (self‑hosted fonts)
// - Live speed & pitch updates while playing
// - Seamless seek during playback (no pause required)
// - CRT screen vibe: scanlines, vignette, glow, slight flicker
// - NO Google Fonts. Uses self‑hosted fonts (see @font-face below)
//   • Glass TTY VT220 (retro terminal)
//   • PxPlus IBM VGA 8x16 (pixel VGA)
//   • JetBrains Mono (fallback, not Google)
//   Put the WOFF2 files in /public/fonts/ and keep the same file names used below.
// - Keyboard: Space (play/pause), ←/→ (seek), O (open)

export default function DewEditorRetroGreen_CRT() {
  // Inject fonts + CRT CSS once
  useEffect(() => {
    const id = "dew-crt-fonts";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        /* === Self‑hosted fonts (drop files in /public/fonts) === */
        @font-face {
          font-family: 'GlassTTY';
          src: url('/fonts/Glass_TTY_VT220.woff2') format('woff2');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: 'PxPlus_IBM_VGA8';
          src: url('/fonts/PxPlus_IBM_VGA8.woff2') format('woff2');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: 'JetBrainsMono';
          src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
          font-weight: 400; font-style: normal; font-display: swap;
        }

        /* === CRT helpers === */
        :root {
          --crt-bg: #061107;           /* chassis bg */
          --crt-panel: #071508;        /* panel bg */
          --crt-panel-2: #081708;      /* alt panel bg */
          --crt-grid: #1d3e1d;         /* bezel line */
          --crt-green: #c9ff6b;        /* headline */
          --crt-phosphor: #b8ff5a;     /* oscilloscope line */
          --crt-text: #e8ffe8;         /* body text */
          --crt-accent: #7cff00;       /* glow */
        }

        .crt-scan {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .crt-scan::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background:
            repeating-linear-gradient(
              to bottom,
              rgba(124,252,0,0.06), rgba(124,252,0,0.06) 2px,
              transparent 2px, transparent 4px
            );
          mix-blend-mode: screen; opacity: .6;
        }
        .crt-vignette::after {
          content: ""; position: absolute; inset: -2px; pointer-events: none;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.28) 100%);
        }
        .crt-curve { border-radius: 18px; box-shadow: inset 0 0 0 1px #143114, 0 0 28px rgba(124,252,0,.08); }
        .crt-glow { text-shadow: 0 0 6px rgba(124,252,0,.55), 0 0 16px rgba(124,252,0,.25); }
        .crt-flicker { animation: crtFlicker 7s infinite steps(60); }
        @keyframes crtFlicker { 0%,19%,21%,23%,90%,92%,100% {opacity:1} 20%,22%,91% {opacity:.985} }

        /* === Sliders (green hardware look) === */
        .dew-range { -webkit-appearance: none; width: 100%; height: 6px; background: #0b2513; border-radius: 9999px; border: 1px solid #2a5b2a; }
        .dew-range:focus { outline: none; }
        .dew-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--crt-green); border: 1px solid #2a5b2a; box-shadow: 0 0 10px var(--crt-accent); margin-top: -6px; }
        .dew-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--crt-green); border: 1px solid #2a5b2a; box-shadow: 0 0 10px var(--crt-accent); }
        .dew-range::-webkit-slider-runnable-track { height: 6px; background: linear-gradient(90deg, #9CFF4D, #4DFF88); box-shadow: inset 0 0 8px rgba(124,252,0,.2); }
        .dew-range::-moz-range-track { height: 6px; background: linear-gradient(90deg, #9CFF4D, #4DFF88); box-shadow: inset 0 0 8px rgba(124,252,0,.2); }
        .dew-vrange { transform: rotate(-90deg); width: 140px; height: 24px; }
        .dew-vwrap { height: 110px; display: grid; place-items: center; }

        /* Buttons */
        .dew-btn { background: #0a2c17; color: var(--crt-text); border: 1px solid #2a5b2a; padding: .5rem 1rem; border-radius: .7rem; text-transform: uppercase; letter-spacing: .08em; }
        .dew-btn:hover { background: #154a29; box-shadow: 0 0 14px rgba(124,252,0,.12); }
        .dew-btn-primary { background: #134723; }
        .dew-btn-primary:hover { background: #1b6f2b; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Refs for DOM and WebAudio
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const convolverGainRef = useRef<GainNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const mid1Ref = useRef<BiquadFilterNode | null>(null);
  const mid2Ref = useRef<BiquadFilterNode | null>(null);
  const mid3Ref = useRef<BiquadFilterNode | null>(null);
  const geqRefs = useRef<BiquadFilterNode[]>([]);
  const compRef = useRef<DynamicsCompressorNode | null>(null);

  // Transport state
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // Parameters
  const [playbackRate, setPlaybackRate] = useState(1); // 0.25 .. 2.0
  const [pitchSemitones, setPitchSemitones] = useState(0); // -12 .. +12 (detune)
  const [turntable, setTurntable] = useState(true); // when on: pitch follows speed
  const [bass, setBass] = useState(0); // dB
  const [treble, setTreble] = useState(0); // dB
  const [mid1, setMid1] = useState(0);   // dB @ 350 Hz
  const [mid2, setMid2] = useState(0);   // dB @ 1 kHz
  const [mid3, setMid3] = useState(0);   // dB @ 3.5 kHz
  const geqBands = [32,64,125,250,500,1000,2000,4000,8000,16000] as const;
  const [geq, setGeq] = useState<number[]>(new Array(10).fill(0));
  const [pan, setPan] = useState(0); // -1..+1
  const [reverb, setReverb] = useState(0.3); // 0..1 (into convolver)
  const [mixWet, setMixWet] = useState(0.4); // 0..1 (wet/dry)
  const [masterVolume, setMasterVolume] = useState(1.5); // 0..2 (master boost)

  // Internal transport timing
  const startedAtRef = useRef(0); // audioCtx.currentTime when started
  const offsetAtStartRef = useRef(0); // seconds offset inside the buffer at start

  // === Init Audio ===
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Nodes
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dryGainRef.current = dry;
    wetGainRef.current = wet;

    const master = ctx.createGain();
    master.gain.value = masterVolume; // initialize from state
    masterGainRef.current = master;

    const low = ctx.createBiquadFilter();
    low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = 0; lowShelfRef.current = low;

    const high = ctx.createBiquadFilter();
    high.type = "highshelf"; high.frequency.value = 3000; high.gain.value = 0; highShelfRef.current = high;

    // Mini EQ peaking bands
    const m1 = ctx.createBiquadFilter(); m1.type = "peaking"; m1.frequency.value = 350; m1.Q.value = 0.9; m1.gain.value = 0; mid1Ref.current = m1;
    const m2 = ctx.createBiquadFilter(); m2.type = "peaking"; m2.frequency.value = 1000; m2.Q.value = 0.9; m2.gain.value = 0; mid2Ref.current = m2;
    const m3 = ctx.createBiquadFilter(); m3.type = "peaking"; m3.frequency.value = 3500; m3.Q.value = 0.9; m3.gain.value = 0; mid3Ref.current = m3;

    // Graphic EQ filters (10-band peaking)
    geqRefs.current = [32,64,125,250,500,1000,2000,4000,8000,16000].map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = "peaking"; b.frequency.value = f;
      b.Q.value = (i === 0 || i === 9) ? 0.9 : 1.2;
      b.gain.value = 0;
      return b;
    });

    const panNode = ctx.createStereoPanner();
    pannerRef.current = panNode;

    const conv = ctx.createConvolver();
    conv.buffer = makeSimpleReverb(ctx);
    convolverRef.current = conv;

    const convGain = ctx.createGain();
    convGain.gain.value = reverb; // initial reverb amount
    convolverGainRef.current = convGain;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 20; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25;
    compRef.current = comp;

    // Master routing: (dry + wet) -> master -> compressor -> limiter -> destination & analyser
    dry.connect(master); wet.connect(master);
    master.connect(comp);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.0; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.05;

    comp.connect(limiter);
    limiter.connect(ctx.destination);
    limiter.connect(analyser);

    const tidy = () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); try { ctx.close(); } catch {} };
    return tidy;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update static params on change
  useEffect(() => {
    lowShelfRef.current && (lowShelfRef.current.gain.value = bass);
    highShelfRef.current && (highShelfRef.current.gain.value = treble);
    pannerRef.current && (pannerRef.current.pan.value = pan);
    mid1Ref.current && (mid1Ref.current.gain.value = mid1);
    mid2Ref.current && (mid2Ref.current.gain.value = mid2);
    mid3Ref.current && (mid3Ref.current.gain.value = mid3);
  }, [bass, treble, pan, mid1, mid2, mid3]);

  // Sync GEQ band gains
  useEffect(() => {
    geqRefs.current.forEach((node, i) => { if (node) node.gain.value = geq[i] || 0; });
  }, [geq]);

  useEffect(() => {
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - mixWet;
    if (wetGainRef.current) wetGainRef.current.gain.value = mixWet;
  }, [mixWet]);

  useEffect(() => {
    if (convolverGainRef.current) convolverGainRef.current.gain.value = reverb;
  }, [reverb]);

  // Sync master volume to master gain node
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  // LIVE update speed / pitch while playing
  useEffect(() => {
    const src = sourceRef.current; if (!src) return;
    if (turntable) { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = 0; }
    else { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = pitchSemitones * 100; }
  }, [playbackRate, pitchSemitones, turntable]);

  // === File handling ===
  async function handleFile(file?: File) {
    if (!file) return;
    const ctx = audioCtxRef.current!;
    if (ctx.state === "suspended") await ctx.resume();
    const ab = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab);
    bufferRef.current = buffer;
    setDuration(buffer.duration);
    setFileName(file.name);
    setPosition(0);
    stopSource();
  }

  // === Source creation & routing ===
  function createSource(): AudioBufferSourceNode | null {
    const ctx = audioCtxRef.current!;
    const buffer = bufferRef.current; if (!buffer) return null;

    const src = ctx.createBufferSource(); src.buffer = buffer;

    if (turntable) { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = 0; }
    else { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = pitchSemitones * 100; }

    // Wet chain: src -> low -> GEQ(10) -> mid1..3 -> high -> pan -> convGain -> convolver -> wet
    const low = lowShelfRef.current!; const m1 = mid1Ref.current!; const m2 = mid2Ref.current!; const m3 = mid3Ref.current!; const high = highShelfRef.current!; const panNode = pannerRef.current!;
    const convGain = convolverGainRef.current!; const conv = convolverRef.current!; const wet = wetGainRef.current!; const dry = dryGainRef.current!;

    src.connect(low);
    let eqChain = low as AudioNode;
    for (const b of geqRefs.current) { eqChain.connect(b); eqChain = b; }
    eqChain.connect(m1); m1.connect(m2); m2.connect(m3); m3.connect(high); high.connect(panNode); panNode.connect(dry); panNode.connect(convGain); convGain.connect(conv); conv.connect(wet);

    sourceRef.current = src; return src;
  }

  // === Transport ===
  async function handlePlay(startAtPosition?: number) {
    const ctx = audioCtxRef.current!; if (ctx.state === "suspended") await ctx.resume(); if (!bufferRef.current) return;
    stopSource();
    const src = createSource(); if (!src) return;

    const offset = clamp(typeof startAtPosition === "number" ? startAtPosition : position, 0, bufferRef.current!.duration - 0.0001);
    src.start(0, offset);

    offsetAtStartRef.current = offset; startedAtRef.current = ctx.currentTime; setIsPlaying(true);

    startVisuals(); trackPosition();

    src.onended = () => { setIsPlaying(false); stopVisuals(); };
  }

  function handlePause() {
    if (!audioCtxRef.current) return; if (!sourceRef.current) { setIsPlaying(false); return; }
    const ctx = audioCtxRef.current; const rate = sourceRef.current.playbackRate.value || 1;
    const elapsed = (ctx!.currentTime - startedAtRef.current) * rate;
    const newPos = clamp(offsetAtStartRef.current + elapsed, 0, bufferRef.current!.duration);
    setPosition(newPos);

    stopSource(); setIsPlaying(false); stopVisuals();
  }

  function stopSource() {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current.onended = null; sourceRef.current = null;
    }
  }

  // Seamless seek: restart under the hood if playing
  function seekToPercent(p: number) {
    if (!bufferRef.current) return;
    const newPos = clamp(bufferRef.current.duration * p, 0, bufferRef.current.duration);
    setPosition(newPos);
    if (isPlaying) handlePlay(newPos);
  }

  // Keep UI position in sync while playing
  function trackPosition() {
    const ctx = audioCtxRef.current!;
    const step = () => {
      if (!sourceRef.current) return; // paused/stopped
      const rate = sourceRef.current.playbackRate.value || 1;
      const elapsed = (ctx.currentTime - startedAtRef.current) * rate;
      const pos = clamp(offsetAtStartRef.current + elapsed, 0, bufferRef.current!.duration);
      setPosition(pos);
      if (pos >= bufferRef.current!.duration - 0.0005) { setIsPlaying(false); stopVisuals(); return; }
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  }

  // === Canvas scope ===
  function startVisuals() {
    const canvas = canvasRef.current; const analyser = analyserRef.current; if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d"); if (!ctx2d) return;

    const draw = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssW = canvas.clientWidth || 600; const cssH = 120;
      if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) { canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr); }
      const W = canvas.width, H = canvas.height;

      // CRT background (deep green) + extra faint scanlines inside the scope
      ctx2d.fillStyle = "#0a160a"; ctx2d.fillRect(0, 0, W, H);
      ctx2d.fillStyle = "rgba(124,252,0,0.05)";
      for (let y = 0; y < H; y += 3 * dpr) ctx2d.fillRect(0, y, W, 1 * dpr);

      // Waveform
      const bufLen = analyser.fftSize; const data = new Uint8Array(bufLen);
      analyser.getByteTimeDomainData(data);

      ctx2d.lineWidth = 2 * dpr; ctx2d.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--crt-phosphor') || "#b8ff5a";
      ctx2d.beginPath(); const slice = W / bufLen;
      for (let i = 0, x = 0; i < bufLen; i++, x += slice) {
        const v = data[i] / 128.0; const y = (v * H) / 2; i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      }
      ctx2d.lineTo(W, H / 2); ctx2d.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };
    stopVisuals(); animationRef.current = requestAnimationFrame(draw);
  }

  function stopVisuals() { if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = null; }

  // Resize observer to keep canvas crisp when container resizes
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(() => { if (!isPlaying) startVisuals(); });
    obs.observe(canvasRef.current); resizeObsRef.current = obs;
    return () => { try { obs.disconnect(); } catch {} };
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); isPlaying ? handlePause() : handlePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); const np = Math.min((bufferRef.current?.duration || 0), position + 2); setPosition(np); if (isPlaying) handlePlay(np); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); const np = Math.max(0, position - 2); setPosition(np); if (isPlaying) handlePlay(np); }
      else if (e.key.toLowerCase() === "o") { e.preventDefault(); fileInputRef.current?.click(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, position]);

  // Export to WAV via OfflineAudioContext
  async function handleExportWav() {
    if (!bufferRef.current || !audioCtxRef.current) return;
    const srcBuf = bufferRef.current;

    const startPos = clamp(position, 0, srcBuf.duration);
    const remaining = Math.max(0, srcBuf.duration - startPos);

    const liveRate = turntable ? playbackRate : playbackRate * Math.pow(2, pitchSemitones / 12);

    const outSeconds = remaining / Math.max(0.0001, liveRate);
    const sampleRate = audioCtxRef.current.sampleRate;
    const offCtx = new OfflineAudioContext(2, Math.ceil(outSeconds * sampleRate), sampleRate);

    const src = offCtx.createBufferSource();
    const sliced = sliceBuffer(srcBuf, startPos, srcBuf.duration, offCtx);
    src.buffer = sliced; src.playbackRate.value = liveRate;

    const low = offCtx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = bass;
    const high = offCtx.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 3000; high.gain.value = treble;
    // Offline mini-EQ
    const m1 = offCtx.createBiquadFilter(); m1.type = "peaking"; m1.frequency.value = 350; m1.Q.value = 0.9; m1.gain.value = mid1;
    const m2 = offCtx.createBiquadFilter(); m2.type = "peaking"; m2.frequency.value = 1000; m2.Q.value = 0.9; m2.gain.value = mid2;
    const m3 = offCtx.createBiquadFilter(); m3.type = "peaking"; m3.frequency.value = 3500; m3.Q.value = 0.9; m3.gain.value = mid3;
    const panNode = offCtx.createStereoPanner(); panNode.pan.value = pan;
    const conv = offCtx.createConvolver(); conv.buffer = makeSimpleReverb(offCtx);
    const convGain = offCtx.createGain(); convGain.gain.value = reverb;

    const dry = offCtx.createGain(); dry.gain.value = 1 - mixWet;
    const wet = offCtx.createGain(); wet.gain.value = mixWet;

    const master = offCtx.createGain(); master.gain.value = masterVolume;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 20; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25;

    // Offline limiter to prevent clipping on boosted output
    const limiter = offCtx.createDynamicsCompressor();
    limiter.threshold.value = -1.0; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.05;
    // Offline GEQ
    const geqFilters = [32,64,125,250,500,1000,2000,4000,8000,16000].map((f, i) => { const b = offCtx.createBiquadFilter(); b.type = "peaking"; b.frequency.value = f; b.Q.value = (i===0||i===9)?0.9:1.2; b.gain.value = geq[i] || 0; return b; });

    src.connect(low);
    let offEq: AudioNode = low;
    for (const b of geqFilters) { offEq.connect(b); offEq = b; }
    offEq.connect(m1); m1.connect(m2); m2.connect(m3); m3.connect(high); high.connect(panNode); panNode.connect(dry); panNode.connect(convGain); convGain.connect(conv); conv.connect(wet);
    dry.connect(master); wet.connect(master); master.connect(comp); comp.connect(limiter); limiter.connect(offCtx.destination);

    src.start();
    const rendered = await offCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(rendered);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement("a");
    a.href = url; a.download = (fileName?.replace(/\.[^/.]+$/, "") || "export") + "_dew.wav";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // === UI helpers ===
  function onProgressPointer(clientX: number) {
    if (!bufferRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const p = clamp((clientX - rect.left) / rect.width, 0, 1);
    seekToPercent(p);
  }
  function onProgressClick(e: React.MouseEvent<HTMLDivElement>) { onProgressPointer(e.clientX); }
  function onProgressMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    draggingRef.current = true; onProgressPointer(e.clientX);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  }
  function onWindowMouseMove(e: MouseEvent) { if (draggingRef.current) onProgressPointer(e.clientX); }
  function onWindowMouseUp() {
    draggingRef.current = false;
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  }
  function onProgressTouchStart(e: React.TouchEvent<HTMLDivElement>) { draggingRef.current = true; onProgressPointer(e.touches[0].clientX); }
  function onProgressTouchMove(e: React.TouchEvent<HTMLDivElement>) { if (draggingRef.current) onProgressPointer(e.touches[0].clientX); }
  function onProgressTouchEnd() { draggingRef.current = false; }

  const progressPct = useMemo(() => {
    if (!duration || !isFinite(duration) || duration <= 0) return 0;
    return clamp((position / duration) * 100, 0, 100);
  }, [position, duration]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleFile(file);
  }

  function handleOpenClick() { fileInputRef.current?.click(); }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) handleFile(file); }

  const rootFont = {
    fontFamily: 'GlassTTY, PxPlus_IBM_VGA8, JetBrainsMono, ui-monospace, SFMono-Regular, Menlo, monospace'
  } as const;

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--crt-bg)', color: 'var(--crt-text)', ...rootFont }}>
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl tracking-widest uppercase" style={{ color: 'var(--crt-green)' }}>
            <span className="crt-glow">DEW EDITOR</span>
          </h1>
          <div className="text-base opacity-80 crt-flicker">Retro Green • Audio Lab</div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left side */}
          <section
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="md:col-span-2 p-4 shadow-2xl border crt-curve crt-scan crt-vignette"
            style={{ background: 'var(--crt-panel-2)', borderColor: 'var(--crt-grid)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded grid place-items-center text-xl border"
                     style={{ background: '#0b3a20', color: '#bfffbf', borderColor: '#2a5b2a' }}>DG</div>
                <div>
                  <div className="text-base truncate max-w-[52ch]">{fileName ?? "NO FILE LOADED"}</div>
                  <div className="text-sm opacity-70">{duration ? `${formatTime(position)} / ${formatTime(duration)}` : "DRAG & DROP OR OPEN (MP3/WAV/OGG)"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={isPlaying ? handlePause : () => handlePlay()} className="dew-btn dew-btn-primary" aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? "PAUSE" : "PLAY"}
                </button>
                <button onClick={handleOpenClick} className="dew-btn">OPEN</button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFileChange} />
                <button onClick={handleExportWav} className="dew-btn">EXPORT WAV</button>
              </div>
            </div>

            <div className="mb-3">
              <div className="relative crt-curve border" style={{ borderColor: '#2a5b2a', background: '#0b160c' }}>
                <canvas ref={canvasRef} className="w-full h-28 block" />
              </div>
            </div>

            <div className="flex items-center gap-3 select-none">
              <div className="text-sm opacity-75 w-28">{formatTime(position)} / {formatTime(duration)}</div>
              <div
                ref={progressRef}
                className="flex-1 h-2 rounded-full overflow-hidden cursor-pointer border relative"
                style={{ background: '#0b2513', borderColor: '#2a5b2a' }}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                onClick={onProgressClick}
                onMouseDown={onProgressMouseDown}
                onTouchStart={onProgressTouchStart}
                onTouchMove={onProgressTouchMove}
                onTouchEnd={onProgressTouchEnd}
              >
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${progressPct}%`, background:'linear-gradient(90deg, rgba(156,255,77,.9), rgba(77,255,136,.9))', boxShadow:'inset 0 0 8px rgba(124,252,0,.2)' }} />
                <div style={{ position:'absolute', top:'-3px', left:`calc(${progressPct}% - 1px)`, width:'2px', height:'16px', background:'var(--crt-green)', boxShadow:'0 0 8px rgba(124,252,0,.6)' }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm opacity-80 tracking-widest">SPEED: {playbackRate.toFixed(2)}x</label>
                <input type="range" min={0.25} max={2} step={0.01} value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="dew-range" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm opacity-80 tracking-widest">PITCH: {turntable ? "LINKED" : `${pitchSemitones} ST`}</label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={turntable} onChange={(e) => setTurntable(e.target.checked)} />
                    TURNTABLE
                  </label>
                </div>
                <input type="range" min={-18} max={18} step={1} value={pitchSemitones} disabled={turntable} onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))} className="dew-range" />
              </div>

              {/* Master volume */}
              <div className="col-span-2">
                <label className="text-sm opacity-80 tracking-widest">VOLUME: {(masterVolume * 100).toFixed(0)}%</label>
                <input type="range" min={0} max={2} step={0.01} value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} className="dew-range" />
              </div>
            </div>

            {/* Graphic EQ (10-band) */}
            <div className="mt-6 p-3 border rounded-xl" style={{ borderColor: '#2a5b2a', background: '#081708' }}>
              <div className="text-xs tracking-widest mb-3 opacity-80">GRAPHIC EQ</div>
              <div className="grid grid-cols-10 gap-6 justify-items-center">
                {(geqBands as readonly number[]).map((f, i) => (
                  <div key={f} className="flex flex-col items-center">
                    <div className="dew-vwrap">
                      <input
                        type="range"
                        min={-18} max={18}
                        step={1}
                        value={geq[i]}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setGeq(prev => { const c = prev.slice(); c[i] = v; return c; });
                        }}
                        className="dew-range dew-vrange"
                      />
                    </div>
                    <div className="text-xs mt-2 opacity-90">{f >= 1000 ? `${f/1000}k` : f}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right side: Effects */}
          <aside className="p-4 shadow-2xl border crt-curve crt-scan crt-vignette" style={{ background: 'var(--crt-panel)', borderColor: 'var(--crt-grid)' }}>
            <h2 className="text-base font-bold mb-3 tracking-widest" style={{ color: 'var(--crt-green)' }}>EFFECTS</h2>

            <div className="mb-4">
              <label className="text-sm block mb-1">BASS (dB): {bass}</label>
              <input type="range" min={-15} max={15} step={1} value={bass} onChange={(e) => setBass(parseFloat(e.target.value))} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">TREBLE (dB): {treble}</label>
              <input type="range" min={-15} max={15} step={1} value={treble} onChange={(e) => setTreble(parseFloat(e.target.value))} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">PAN: {pan.toFixed(2)}</label>
              <input type="range" min={-1} max={1} step={0.01} value={pan} onChange={(e) => setPan(parseFloat(e.target.value))} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">REVERB: {(reverb * 100).toFixed(0)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={reverb} onChange={(e) => setReverb(parseFloat(e.target.value))} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">DRY / WET: {(mixWet * 100).toFixed(0)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={mixWet} onChange={(e) => setMixWet(parseFloat(e.target.value))} className="dew-range" />
            </div>

            <footer className="mt-4 text-sm opacity-80 space-y-1">
              <div>Formats: MP3, WAV, OGG — drag & drop or OPEN.</div>
              <div>SPACE: play/pause · ←/→: seek · O: open · EXPORT WAV: render with current settings.</div>
              <div className="mt-2">For true time‑stretch (pitch without tempo change), integrate a phase‑vocoder via AudioWorklet.</div>
            </footer>
          </aside>
        </main>
      </div>
    </div>
  );
}

// === Utils ===
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }

function formatTime(t?: number) {
  if (!t || Number.isNaN(t)) return "0:00";
  const sec = Math.floor(t % 60).toString().padStart(2, "0");
  const min = Math.floor(t / 60);
  return `${min}:${sec}`;
}

function makeSimpleReverb(ctx: BaseAudioContext) {
  // 1.8s exponential-decay noise IR
  const length = Math.floor(ctx.sampleRate * 1.8);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
  }
  return ir;
}

function sliceBuffer(buf: AudioBuffer, startSec: number, endSec: number, ctx: OfflineAudioContext) {
  const start = Math.max(0, Math.min(buf.duration, startSec));
  const end = Math.max(start, Math.min(buf.duration, endSec));
  const frameStart = Math.floor(start * buf.sampleRate);
  const frameEnd = Math.floor(end * buf.sampleRate);
  const frames = frameEnd - frameStart;
  const out = ctx.createBuffer(buf.numberOfChannels, frames, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch).subarray(frameStart, frameEnd);
    out.copyToChannel(src, ch, 0);
  }
  return out;
}

function audioBufferToWavBlob(buffer: AudioBuffer) {
  // PCM16 WAV encoder
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const ab = new ArrayBuffer(length);
  const view = new DataView(ab);
  const channels: Float32Array[] = [];
  let pos = 0;

  writeStr("RIFF");
  view.setUint32((pos += 4), length - 8, true); pos += 4;
  writeStr("WAVEfmt ");
  view.setUint32((pos += 4), 16, true); pos += 4;
  view.setUint16(pos, 1, true); pos += 2;
  view.setUint16(pos, numOfChan, true); pos += 2;
  view.setUint32(pos, buffer.sampleRate, true); pos += 4;
  view.setUint32(pos, buffer.sampleRate * numOfChan * 2, true); pos += 4;
  view.setUint16(pos, numOfChan * 2, true); pos += 2;
  view.setUint16(pos, 16, true); pos += 2;
  writeStr("data");
  view.setUint32((pos += 4), length - pos - 4, true); pos += 4;

  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  const interleaved = interleave(channels);
  floatTo16BitPCM(interleaved, view, pos);

  return new Blob([view], { type: "audio/wav" });

  function writeStr(s: string) { for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i)); }
}

function interleave(chs: Float32Array[]) {
  const length = chs[0].length; const numCh = chs.length; const out = new Float32Array(length * numCh);
  for (let i = 0; i < length; i++) for (let ch = 0; ch < numCh; ch++) out[i * numCh + ch] = chs[ch][i];
  return out;
}

function floatTo16BitPCM(input: Float32Array, view: DataView, offset: number) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

// --- Tiny self-tests for utils (run in browser only) ---
if (typeof window !== 'undefined') {
  console.assert(clamp(5, 0, 10) === 5, 'clamp basic');
  console.assert(clamp(-1, 0, 10) === 0, 'clamp lower bound');
  console.assert(clamp(11, 0, 10) === 10, 'clamp upper bound');
  console.assert(formatTime(0) === '0:00', 'formatTime zero');
  console.assert(formatTime(65) === '1:05', 'formatTime 65s');
}
