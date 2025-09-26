import React, { useEffect, useMemo, useRef, useState } from "react";

const BASE_MASTER_GAIN = 0.9;
const BASE_COMP_THRESHOLD = -6;
const BASE_COMP_RATIO = 3;

const MODES: Record<string, ModeSettings> = {
  Normal: {
    bass: 0,
    treble: 0,
    reverb: 0.25,
    mixWet: 0.35,
    pan: 0,
    macros: { clarity: 0.2, warmth: 0.15, energy: 0.1, smoothness: 0.1 }
  },
  Clear: {
    bass: -2,
    treble: 3,
    reverb: 0.12,
    mixWet: 0.15,
    pan: 0,
    macros: { clarity: 0.85, warmth: 0.1, energy: 0.05, smoothness: 0 }
  },
  Echo: {
    bass: 1,
    treble: 1,
    reverb: 0.45,
    mixWet: 0.45,
    pan: 0,
    macros: { clarity: 0.35, warmth: 0.25, energy: 0.1, smoothness: 0.25 }
  },
  Hype: {
    bass: 5,
    treble: 1,
    reverb: 0.22,
    mixWet: 0.2,
    pan: 0,
    macros: { clarity: 0.35, warmth: 0.25, energy: 0.7, smoothness: 0.1 }
  },
  Warm: {
    bass: 3,
    treble: -2,
    reverb: 0.18,
    mixWet: 0.18,
    pan: 0,
    macros: { clarity: 0.25, warmth: 0.8, energy: 0.15, smoothness: 0.35 }
  },
  Night: {
    bass: 1.5,
    treble: -3,
    reverb: 0.16,
    mixWet: 0.12,
    pan: 0,
    macros: { clarity: 0.15, warmth: 0.35, energy: 0, smoothness: 0.5 }
  },
  "Vocal Focus": {
    bass: -1,
    treble: 2,
    reverb: 0.18,
    mixWet: 0.18,
    pan: 0,
    macros: { clarity: 0.9, warmth: 0.15, energy: 0.05, smoothness: 0.15 }
  }
};

type ModeSettings = {
  bass?: number;
  treble?: number;
  reverb?: number;
  mixWet?: number;
  pan?: number;
  macros?: Partial<Record<MacroName, number>>;
};

type MacroName = "clarity" | "warmth" | "energy" | "smoothness";

const MODE_ORDER = ["Normal", "Clear", "Echo", "Hype", "Warm", "Night", "Vocal Focus"];

export default function DewEditorRetroGreen_CRT() {
  useEffect(() => {
    const id = "dew-crt-fonts";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        /* === Self-hosted fonts (drop files in /public/fonts) === */
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

        :root {
          --crt-bg: #061107;
          --crt-panel: #071508;
          --crt-panel-2: #081708;
          --crt-grid: #1d3e1d;
          --crt-green: #c9ff6b;
          --crt-phosphor: #b8ff5a;
          --crt-text: #e8ffe8;
          --crt-accent: #7cff00;
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

        .dew-range { -webkit-appearance: none; width: 100%; height: 6px; background: #0b2513; border-radius: 9999px; border: 1px solid #2a5b2a; }
        .dew-range:focus { outline: none; }
        .dew-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--crt-green); border: 1px solid #2a5b2a; box-shadow: 0 0 10px var(--crt-accent); margin-top: -6px; }
        .dew-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--crt-green); border: 1px solid #2a5b2a; box-shadow: 0 0 10px var(--crt-accent); }
        .dew-range::-webkit-slider-runnable-track { height: 6px; background: linear-gradient(90deg, #9CFF4D, #4DFF88); box-shadow: inset 0 0 8px rgba(124,252,0,.2); }
        .dew-range::-moz-range-track { height: 6px; background: linear-gradient(90deg, #9CFF4D, #4DFF88); box-shadow: inset 0 0 8px rgba(124,252,0,.2); }

        .dew-btn { background: #0a2c17; color: var(--crt-text); border: 1px solid #2a5b2a; padding: .5rem 1rem; border-radius: .7rem; text-transform: uppercase; letter-spacing: .08em; }
        .dew-btn:hover { background: #154a29; box-shadow: 0 0 14px rgba(124,252,0,.12); }
        .dew-btn-primary { background: #134723; }
        .dew-btn-primary:hover { background: #1b6f2b; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const compMeterRef = useRef<number | null>(null);

  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const convolverGainRef = useRef<GainNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const midPeakRef = useRef<BiquadFilterNode | null>(null);
  const compRef = useRef<DynamicsCompressorNode | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [turntable, setTurntable] = useState(true);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [pan, setPan] = useState(0);
  const [reverb, setReverb] = useState(0.3);
  const [mixWet, setMixWet] = useState(0.4);
  const [mode, setMode] = useState<string | null>(null);

  const [clarity, setClarity] = useState(0.2);
  const [warmth, setWarmth] = useState(0.15);
  const [energy, setEnergy] = useState(0.1);
  const [smoothness, setSmoothness] = useState(0.1);

  const [gainReduction, setGainReduction] = useState(0);

  const startedAtRef = useRef(0);
  const offsetAtStartRef = useRef(0);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dryGainRef.current = dry;
    wetGainRef.current = wet;

    const master = ctx.createGain();
    master.gain.value = BASE_MASTER_GAIN;
    masterGainRef.current = master;

    const low = ctx.createBiquadFilter();
    low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = 0; lowShelfRef.current = low;

    const high = ctx.createBiquadFilter();
    high.type = "highshelf"; high.frequency.value = 3200; high.gain.value = 0; highShelfRef.current = high;

    const mid = ctx.createBiquadFilter();
    mid.type = "peaking"; mid.frequency.value = 3000; mid.Q.value = 1.1; mid.gain.value = 0; midPeakRef.current = mid;

    const panNode = ctx.createStereoPanner();
    pannerRef.current = panNode;

    const conv = ctx.createConvolver();
    conv.buffer = makeSimpleReverb(ctx);
    convolverRef.current = conv;

    const convGain = ctx.createGain();
    convGain.gain.value = reverb;
    convolverGainRef.current = convGain;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = BASE_COMP_THRESHOLD;
    comp.knee.value = 20;
    comp.ratio.value = BASE_COMP_RATIO;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    compRef.current = comp;

    dry.connect(master);
    wet.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    comp.connect(analyser);

    const tidy = () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (compMeterRef.current) cancelAnimationFrame(compMeterRef.current);
      try { ctx.close(); } catch {}
    };
    return tidy;
  }, []);

  useEffect(() => {
    const update = () => {
      if (compRef.current) {
        const reduction = compRef.current.reduction;
        setGainReduction((prev) => (Math.abs(prev - reduction) > 0.25 ? reduction : prev));
      }
      compMeterRef.current = requestAnimationFrame(update);
    };
    compMeterRef.current = requestAnimationFrame(update);
    return () => {
      if (compMeterRef.current) cancelAnimationFrame(compMeterRef.current);
    };
  }, []);

  const totalLowShelf = useMemo(() => {
    return computeLowShelfGain(bass, clarity, warmth, energy);
  }, [bass, clarity, warmth, energy]);

  const totalHighShelf = useMemo(() => {
    return computeHighShelfGain(treble, clarity, warmth, smoothness);
  }, [treble, clarity, warmth, smoothness]);

  const midBoost = useMemo(() => {
    return computeMidPeakGain(clarity);
  }, [clarity]);

  const compThreshold = useMemo(() => {
    return BASE_COMP_THRESHOLD + mapRange(energy, 0, 1, 0, -3);
  }, [energy]);

  const compRatio = useMemo(() => {
    return BASE_COMP_RATIO + mapRange(smoothness, 0, 1, 0, 0.8);
  }, [smoothness]);

  const masterGain = useMemo(() => {
    return BASE_MASTER_GAIN - mapRange(energy, 0, 1, 0, 0.05);
  }, [energy]);

  useEffect(() => {
    if (lowShelfRef.current) lowShelfRef.current.gain.value = totalLowShelf;
    if (highShelfRef.current) highShelfRef.current.gain.value = totalHighShelf;
    if (midPeakRef.current) midPeakRef.current.gain.value = midBoost;
  }, [totalLowShelf, totalHighShelf, midBoost]);

  useEffect(() => {
    if (pannerRef.current) pannerRef.current.pan.value = pan;
  }, [pan]);

  useEffect(() => {
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - mixWet;
    if (wetGainRef.current) wetGainRef.current.gain.value = mixWet;
  }, [mixWet]);

  useEffect(() => {
    if (convolverGainRef.current) convolverGainRef.current.gain.value = reverb;
  }, [reverb]);

  useEffect(() => {
    if (compRef.current) {
      compRef.current.threshold.value = compThreshold;
      compRef.current.ratio.value = compRatio;
    }
    if (masterGainRef.current) masterGainRef.current.gain.value = masterGain;
  }, [compThreshold, compRatio, masterGain]);

  useEffect(() => {
    const src = sourceRef.current; if (!src) return;
    if (turntable) { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = 0; }
    else { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = pitchSemitones * 100; }
  }, [playbackRate, pitchSemitones, turntable]);

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

  function createSource(): AudioBufferSourceNode | null {
    const ctx = audioCtxRef.current!;
    const buffer = bufferRef.current; if (!buffer) return null;

    const src = ctx.createBufferSource(); src.buffer = buffer;

    if (turntable) { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = 0; }
    else { src.playbackRate.value = clamp(playbackRate, 0.25, 2); src.detune.value = pitchSemitones * 100; }

    const low = lowShelfRef.current!; const high = highShelfRef.current!; const mid = midPeakRef.current!;
    const panNode = pannerRef.current!;
    const convGain = convolverGainRef.current!; const conv = convolverRef.current!;
    const wet = wetGainRef.current!; const dry = dryGainRef.current!;

    src.connect(dry);
    src.connect(low); low.connect(high); high.connect(mid); mid.connect(panNode); panNode.connect(convGain); convGain.connect(conv); conv.connect(wet);

    sourceRef.current = src; return src;
  }

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

  function seekToPercent(p: number) {
    if (!bufferRef.current) return;
    const newPos = clamp(bufferRef.current.duration * p, 0, bufferRef.current.duration);
    setPosition(newPos);
    if (isPlaying) handlePlay(newPos);
  }

  function trackPosition() {
    const ctx = audioCtxRef.current!;
    const step = () => {
      if (!sourceRef.current) return;
      const rate = sourceRef.current.playbackRate.value || 1;
      const elapsed = (ctx.currentTime - startedAtRef.current) * rate;
      const pos = clamp(offsetAtStartRef.current + elapsed, 0, bufferRef.current!.duration);
      setPosition(pos);
      if (pos >= bufferRef.current!.duration - 0.0005) { setIsPlaying(false); stopVisuals(); return; }
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  }

  function startVisuals() {
    const canvas = canvasRef.current; const analyser = analyserRef.current; if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d"); if (!ctx2d) return;

    const draw = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssW = canvas.clientWidth || 600; const cssH = 120;
      if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) { canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr); }
      const W = canvas.width, H = canvas.height;

      ctx2d.fillStyle = "#0a160a"; ctx2d.fillRect(0, 0, W, H);
      ctx2d.fillStyle = "rgba(124,252,0,0.05)";
      for (let y = 0; y < H; y += 3 * dpr) ctx2d.fillRect(0, y, W, 1 * dpr);

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

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(() => { if (!isPlaying) startVisuals(); });
    obs.observe(canvasRef.current); resizeObsRef.current = obs;
    return () => { try { obs.disconnect(); } catch {} };
  }, [isPlaying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); isPlaying ? handlePause() : handlePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); const np = Math.min((bufferRef.current?.duration || 0), position + 2); setPosition(np); if (isPlaying) handlePlay(np); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); const np = Math.max(0, position - 2); setPosition(np); if (isPlaying) handlePlay(np); }
      else if (e.key.toLowerCase() === "o") { e.preventDefault(); fileInputRef.current?.click(); }
      else if (e.key >= "1" && e.key <= "7") {
        const index = Number(e.key) - 1;
        const modeName = MODE_ORDER[index];
        if (modeName) applyMode(modeName);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, position]);

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

    const low = offCtx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = totalLowShelf;
    const high = offCtx.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 3200; high.gain.value = totalHighShelf;
    const mid = offCtx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 3000; mid.Q.value = 1.1; mid.gain.value = midBoost;
    const panNode = offCtx.createStereoPanner(); panNode.pan.value = pan;
    const conv = offCtx.createConvolver(); conv.buffer = makeSimpleReverb(offCtx);
    const convGain = offCtx.createGain(); convGain.gain.value = reverb;

    const dry = offCtx.createGain(); dry.gain.value = 1 - mixWet;
    const wet = offCtx.createGain(); wet.gain.value = mixWet;

    const master = offCtx.createGain(); master.gain.value = masterGain;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = compThreshold; comp.knee.value = 20; comp.ratio.value = compRatio; comp.attack.value = 0.003; comp.release.value = 0.25;

    src.connect(dry);
    src.connect(low); low.connect(high); high.connect(mid); mid.connect(panNode); panNode.connect(convGain); convGain.connect(conv); conv.connect(wet);
    dry.connect(master); wet.connect(master); master.connect(comp); comp.connect(offCtx.destination);

    src.start();
    const rendered = await offCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(rendered);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement("a");
    a.href = url; a.download = (fileName?.replace(/\.[^/.]+$/, "") || "export") + "_dew.wav";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function onProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!bufferRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    seekToPercent(p);
  }

  const progressPct = useMemo(() => {
    if (!duration || !isFinite(duration) || duration <= 0) return 0;
    return clamp((position / duration) * 100, 0, 100);
  }, [position, duration]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleFile(file);
  }

  function handleOpenClick() { fileInputRef.current?.click(); }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) handleFile(file); }

  function applyMode(modeName: string) {
    const settings = MODES[modeName];
    if (!settings) return;
    if (typeof settings.bass === "number") setBass(settings.bass);
    if (typeof settings.treble === "number") setTreble(settings.treble);
    if (typeof settings.reverb === "number") setReverb(settings.reverb);
    if (typeof settings.mixWet === "number") setMixWet(settings.mixWet);
    if (typeof settings.pan === "number") setPan(settings.pan);
    if (settings.macros) {
      if (typeof settings.macros.clarity === "number") setClarity(settings.macros.clarity);
      if (typeof settings.macros.warmth === "number") setWarmth(settings.macros.warmth);
      if (typeof settings.macros.energy === "number") setEnergy(settings.macros.energy);
      if (typeof settings.macros.smoothness === "number") setSmoothness(settings.macros.smoothness);
    }
    setMode(modeName);
  }

  function resetMode() { setMode(null); }

  const rootFont = {
    fontFamily: 'GlassTTY, PxPlus_IBM_VGA8, JetBrainsMono, ui-monospace, SFMono-Regular, Menlo, monospace'
  } as const;

  const ledActive = gainReduction < -1;

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--crt-bg)', color: 'var(--crt-text)', ...rootFont }}>
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl tracking-widest uppercase" style={{ color: 'var(--crt-green)' }}>
            <span className="crt-glow">DEW EDITOR</span>
          </h1>
          <div className="flex items-center gap-3 text-base opacity-80">
            <div className="text-sm uppercase tracking-[0.3em] crt-flicker">Retro Green • Audio Lab</div>
            <div className="w-3 h-3 rounded-full border" style={{ borderColor: ledActive ? '#9cff4d' : '#335533', background: ledActive ? '#9cff4d' : '#162916', boxShadow: ledActive ? '0 0 8px rgba(156,255,77,0.8)' : 'none' }} aria-label="Limiter activity" />
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="flex-1 h-2 rounded-full overflow-hidden cursor-pointer border" style={{ background: '#0b2513', borderColor: '#2a5b2a' }} onClick={onProgressClick}>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct} style={{ width: `${progressPct}%` }} className="h-full"/>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm opacity-80 tracking-widest">SPEED: {playbackRate.toFixed(2)}x</label>
                <input type="range" min={0.25} max={2} step={0.01} value={playbackRate} onChange={(e) => { resetMode(); setPlaybackRate(parseFloat(e.target.value)); }} className="dew-range" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm opacity-80 tracking-widest">PITCH: {turntable ? "LINKED" : `${pitchSemitones} ST`}</label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={turntable} onChange={(e) => { resetMode(); setTurntable(e.target.checked); }} />
                    TURNTABLE
                  </label>
                </div>
                <input type="range" min={-12} max={12} step={1} value={pitchSemitones} disabled={turntable} onChange={(e) => { resetMode(); setPitchSemitones(parseInt(e.target.value, 10)); }} className="dew-range" />
              </div>
            </div>
          </section>

          <aside className="p-4 shadow-2xl border crt-curve crt-scan crt-vignette" style={{ background: 'var(--crt-panel)', borderColor: 'var(--crt-grid)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold tracking-widest" style={{ color: 'var(--crt-green)' }}>EFFECTS</h2>
              <div className="text-xs uppercase tracking-[0.3em] opacity-70">Limiter {Math.round(Math.abs(gainReduction))}dB</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {MODE_ORDER.map((modeName) => (
                <button
                  key={modeName}
                  onClick={() => applyMode(modeName)}
                  className="dew-btn text-xs"
                  style={{
                    background: mode === modeName ? '#1b6f2b' : '#0a2c17',
                    borderColor: mode === modeName ? '#4dff88' : '#2a5b2a',
                    boxShadow: mode === modeName ? '0 0 12px rgba(124,252,0,0.25)' : 'none'
                  }}
                >
                  {modeName}
                </button>
              ))}
            </div>

            <section className="space-y-4 mb-6">
              <MacroSlider label="Clarity" value={clarity} onChange={(v) => { resetMode(); setClarity(v); }} />
              <MacroSlider label="Warmth" value={warmth} onChange={(v) => { resetMode(); setWarmth(v); }} />
              <MacroSlider label="Energy" value={energy} onChange={(v) => { resetMode(); setEnergy(v); }} />
              <MacroSlider label="Smoothness" value={smoothness} onChange={(v) => { resetMode(); setSmoothness(v); }} />
            </section>

            <div className="mb-4">
              <label className="text-sm block mb-1">BASS (dB): {bass.toFixed(1)}</label>
              <input type="range" min={-15} max={15} step={0.5} value={bass} onChange={(e) => { resetMode(); setBass(parseFloat(e.target.value)); }} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">TREBLE (dB): {treble.toFixed(1)}</label>
              <input type="range" min={-15} max={15} step={0.5} value={treble} onChange={(e) => { resetMode(); setTreble(parseFloat(e.target.value)); }} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">PAN: {pan.toFixed(2)}</label>
              <input type="range" min={-1} max={1} step={0.01} value={pan} onChange={(e) => { resetMode(); setPan(parseFloat(e.target.value)); }} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">REVERB: {(reverb * 100).toFixed(0)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={reverb} onChange={(e) => { resetMode(); setReverb(parseFloat(e.target.value)); }} className="dew-range" />
            </div>

            <div className="mb-4">
              <label className="text-sm block mb-1">DRY / WET: {(mixWet * 100).toFixed(0)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={mixWet} onChange={(e) => { resetMode(); setMixWet(parseFloat(e.target.value)); }} className="dew-range" />
            </div>

            <footer className="mt-4 text-sm opacity-80 space-y-1">
              <div>Formats: MP3, WAV, OGG — drag & drop or OPEN.</div>
              <div>SPACE: play/pause · ←/→: seek · O: open · 1-7: modes · EXPORT WAV: render current chain.</div>
              <div className="mt-2">For true time-stretch (pitch without tempo change), integrate a phase-vocoder via AudioWorklet.</div>
            </footer>
          </aside>
        </main>
      </div>
    </div>
  );
}

function MacroSlider({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label.toUpperCase()}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="dew-range" />
    </div>
  );
}

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const ratio = (value - inMin) / (inMax - inMin || 1);
  return outMin + (outMax - outMin) * clamp(ratio, 0, 1);
}

function computeLowShelfGain(bass: number, clarity: number, warmth: number, energy: number) {
  return bass
    + mapRange(clarity, 0, 1, 0, -2)
    + mapRange(warmth, 0, 1, 0, 4)
    + mapRange(energy, 0, 1, 0, 3);
}

function computeHighShelfGain(treble: number, clarity: number, warmth: number, smoothness: number) {
  return treble
    + mapRange(clarity, 0, 1, 0, 5)
    + mapRange(warmth, 0, 1, 0, -2)
    + mapRange(smoothness, 0, 1, 0, -2);
}

function computeMidPeakGain(clarity: number) {
  return mapRange(clarity, 0, 1, 0, 2.5);
}

function formatTime(t?: number) {
  if (!t || Number.isNaN(t)) return "0:00";
  const sec = Math.floor(t % 60).toString().padStart(2, "0");
  const min = Math.floor(t / 60);
  return `${min}:${sec}`;
}

function makeSimpleReverb(ctx: BaseAudioContext) {
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

