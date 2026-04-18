# Sieve Web Visualizer

A React-based web application for visualizing the bitstorage changes in PrimeC solution_5's Sieve of Eratosthenes trace output.

![Sieve Visualizer](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Docker](https://img.shields.io/badge/Docker-ready-blue)

## Features

- **Canvas rendering**: Bits displayed as pixels, grouped by byte (8), uint64 (64), and cache line (512 bits/row)
- **Zoom & pan**: Scroll to zoom, drag to pan. Keyboard shortcuts: `+`/`-` to zoom, `0` to reset
- **Step navigation**: Click steps in the side panel, use slider, or arrow keys
- **Play/pause**: Animate through steps automatically with configurable speed
- **Rich metadata**: v3 traces show operation type, prime number, block range, and factor step per step
- **Search & filter**: Search steps by text, filter by operation type (markFactors, extend, continuePattern, etc.)
- **Resizable panels**: Drag the panel border to resize the step list
- **Hover info**: Mouse over bits to see bit index, number value, byte/cache-line position, and state
- **Export**: Download the current view as PNG
- **Responsive**: Adapts to mobile screens; step panel hides on very small screens
- **Drag & drop**: Drop a `.sievetrace` file onto the page to load it

## Generating a Trace File

From the `PrimeC/solution_5` directory:

```bash
./sieve trace extend 100
```

This compiles with `-DCOMPILE_TRACE`, runs one sieve pass after the benchmark, and writes a `.sievetrace` JSON file to `log/`.

Other variants work too:

```bash
./sieve trace base 1000
./sieve trace wheel 1000
./sieve trace wheelstorage 1000
```

## Development

```bash
cd web-visualizer
npm install
npm run dev
```

Open http://localhost:5173 and drag a `.sievetrace` file onto the page.

## Production Build

```bash
npm run build
npx vite preview
```

The built files are in `dist/` — serve them with any static file server.

## Docker

```bash
cd web-visualizer
docker build -t sieve-visualizer .
docker run -p 8080:80 sieve-visualizer
```

Open http://localhost:8080.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next step |
| `Home` / `End` | First / Last step |
| `Space` | Play / Pause |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom & pan |

## Trace Format (v3)

Each step in the JSON trace contains:

```json
{
  "step": 0,
  "annotation": "stripe: prime 3 (idx 1), block [0-512] step 3",
  "operation": "markFactors",
  "prime": 3,
  "block_start": 0,
  "block_stop": 512,
  "factor_step": 3,
  "changed_bits": [4, 7, 10, 13, ...]
}
```

- `operation`: The algorithmic operation (markFactors, extend, continuePattern, etc.)
- `prime`: The prime number being processed (or null)
- `block_start`/`block_stop`: The sieve block range being processed
- `factor_step`: The step size used in marking composites
- `changed_bits`: Bit indices that changed in this step (XOR diff from previous state)

Version 2 traces (without metadata fields) are also supported.

## Architecture

```
web-visualizer/
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # File upload / welcome screen
│   ├── Visualizer.jsx    # Main visualization UI
│   ├── StepPanel.jsx     # Step list with search/filter/resize
│   ├── SieveRenderer.js  # Canvas rendering engine
│   ├── traceParser.js    # JSON trace file parser
│   └── styles.css        # All styles
├── Dockerfile            # Multi-stage build → nginx
├── index.html
├── vite.config.js
└── package.json
```
