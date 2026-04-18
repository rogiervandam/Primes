# Sieve Visualizer

A cross-platform visual tool for inspecting the bitstorage changes in PrimeC/solution_5's Sieve of Eratosthenes.

## Overview

The visualizer loads `.sievetrace` binary files produced by the sieve algorithm (when compiled with `-DCOMPILE_TRACE`) and renders the bitstorage as a canvas where each pixel represents a bit. You can step through the algorithm's operations and see exactly which bits changed at each step.

## Features

- **Bit-level visualization**: Each bit rendered as a pixel, grouped into bytes (8 bits), uint64 (64 bits), and cache lines (512 bits)
- **Step-through navigation**: Move forward/backward through algorithm steps with keyboard, buttons, or slider
- **Annotations**: Each step shows what operation was performed (extend, stripe, mark multiples of prime N, etc.)
- **Zoom & pan**: Mouse wheel to zoom, drag to pan. Keyboard +/- and 0 to reset
- **Color coding**:
  - Light gray: bit is 0 (prime candidate)
  - Dark gray: bit is 1 (composite number)
  - Red: bit just changed in the current step
- **Export**: Export current view as PNG, all steps as PNG sequence, or use ffmpeg for video creation

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

## Setup

```bash
cd visualizer
npm install
```

## Usage

### 1. Generate a trace file

First, compile the sieve with tracing enabled:

```bash
# From the PrimeC/solution_5 directory
# Using GCC:
gcc -O2 -DCOMPILE_TRACE -DCOMPILE_VERBOSE_LEVEL=2 \
    -o sieve_extend_trace src/sieve_extend.c -lm

# Using Clang:
clang -O2 -DCOMPILE_TRACE -DCOMPILE_VERBOSE_LEVEL=2 \
    -o sieve_extend_trace src/sieve_extend.c -lm
```

Then run with the `--trace` flag:

```bash
./sieve_extend_trace --trace output.sievetrace --max 1000000
```

This produces `output.sievetrace` containing a recording of all bitstorage changes.

**Note**: Tracing adds overhead (snapshotting + file I/O per step). The benchmark results with `--trace` are not representative of normal performance. For accurate benchmarks, compile without `-DCOMPILE_TRACE`.

### 2. Launch the visualizer

```bash
cd visualizer
npm start
```

Or open a specific trace file directly:

```bash
npm start -- /path/to/output.sievetrace
```

### 3. Navigate

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Next step | → (Right arrow) | Click step in list |
| Previous step | ← (Left arrow) | |
| First step | Home | |
| Last step | End | |
| Play/Pause | Space | Play button |
| Zoom in | + or = | Scroll wheel up |
| Zoom out | - | Scroll wheel down |
| Reset zoom | 0 | Reset button |
| Pan | | Click and drag |

### 4. Export

- **File → Export Current View as PNG** (Ctrl+E): Save the current canvas view
- **File → Export All Steps as PNG Sequence** (Ctrl+Shift+E): Export every step as a numbered PNG
- **Create video from PNG sequence**:
  ```bash
  ffmpeg -framerate 10 -i step_%05d.png -vf "scale=1024:-1:flags=neighbor" sieve.mp4
  ```
  Or as GIF:
  ```bash
  ffmpeg -framerate 10 -i step_%05d.png -vf "scale=512:-1:flags=neighbor" sieve.gif
  ```

## Trace File Format

The `.sievetrace` binary format is documented in [`src/trace/sieve_trace_format.h`](../src/trace/sieve_trace_format.h).

Summary:
- 32-byte header: magic "SVT1", version, sieve_size, bit_count, step_count
- Per step: step_id, annotation (length-prefixed UTF-8), changed bit indices (uint32 array)

## Building Distributable Packages

```bash
# macOS
npm run dist -- --mac

# Windows
npm run dist -- --win

# Linux
npm run dist -- --linux
```

Requires [electron-builder](https://www.electron.build/) (included as dev dependency).

## Architecture

```
visualizer/
├── main.js                  Electron main process (file I/O, menus, dialogs)
├── preload.js               IPC bridge (contextBridge)
├── package.json             Dependencies & build config
├── renderer/
│   ├── index.html           Main page layout
│   ├── styles.css           Dark theme styling
│   ├── app.js               Application logic (state, navigation, export)
│   ├── trace-parser.js      Binary .sievetrace parser
│   └── canvas-renderer.js   Canvas-based bit rendering with zoom/pan
└── README.md                This file
```
