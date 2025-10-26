# Dew Editor Retro CRT Demo

This repository contains the **DewEditorRetroGreen_CRT** React component plus a minimal Vite + React shell so you can run it locally without any extra setup.

## Prerequisites

* Node.js 18 or newer
* npm 9+ (ships with Node 18)

## Install dependencies

```bash
npm install
```

## Start the dev server

```bash
npm run dev
```

The server starts on [http://localhost:5173](http://localhost:5173) and should open automatically. Load an audio file (MP3/WAV/OGG) by dragging it onto the player or clicking **OPEN**. Keyboard shortcuts: Space (play/pause), ←/→ (seek ±2s), Shift+←/→ (seek ±10s), `[` / `]` (pitch −/+1 semitone with turntable auto-disabled), `O` (open), number keys 1–7 (modes), `R` (toggle reverb), and `C`/`W`/`E`/`S` to toggle the Clarity/Warmth/Energy/Smoothness macro sliders.

## Build for production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Fonts

Place the required self-hosted fonts inside `public/fonts/` before running the project:

```
public/fonts/Glass_TTY_VT220.woff2
public/fonts/PxPlus_IBM_VGA8.woff2
public/fonts/JetBrainsMono-Regular.woff2
```

Without these files the component falls back to your system monospace font.
