# Sieve Visualizer (new2)

A React-based application for visualizing the bitstorage changes in PrimeC solution_5's Sieve of Eratosthenes trace output. Runs as a **web app** in any browser and as a **native desktop app** on Windows and macOS (via Electron), sharing the same visualization codebase.

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
- **Plain text logs**: Also parses human-readable `.log`/`.txt` traces, including
  `Setting bits with step <n> in range <start>-<stop>` and `Setting bit <i>`

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

## Prerequisites

The visualizer requires **Node.js** (v18+) and **npm**. Install them if you haven't already:

### Windows

1. Download the installer from https://nodejs.org/ (LTS recommended).
2. Run the `.msi` installer and follow the prompts — npm is included automatically.
3. Verify in PowerShell:

   ```powershell
   node --version
   npm --version
   ```

Alternatively, install via **winget**:

```powershell
winget install OpenJS.NodeJS.LTS
```

### macOS

Install via **Homebrew** (recommended):

```bash
brew install node
```

Or download the `.pkg` installer from https://nodejs.org/.

Verify:

```bash
node --version
npm --version
```

## Development

```bash
cd web-visualizer
npm install
npm run dev
```

If you hit optional dependency issues (for example missing Rollup native packages when switching between Windows and WSL), run:

```bash
npm run clean:reinstall
```

Or run clean reinstall + production build in one step:

```bash
npm run clean:rebuild
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

## Desktop App (Electron)

The same visualization runs as a native desktop app using Electron. It wraps the built Vite
output and provides native menus, file-open dialogs, and platform-appropriate window chrome.

### Quick start

```bash
cd web-visualizer
npm install
npm run electron:dev    # builds + launches the desktop app
```

### Run with an existing build

```bash
npm run build           # build the React app once
npm run electron        # launch Electron from the existing dist/
```

You can also pass a trace file directly:

```bash
npx electron . /path/to/trace.sievetrace
```

### Package for distribution

```bash
npm run dist:win        # Windows installer (NSIS + portable)
npm run dist:mac        # macOS DMG (x64 + arm64)
npm run dist:all        # both platforms
```

Packaged output goes to `release/`.

### Platform integration

| Platform    | Details                                                      |
| ----------- | ------------------------------------------------------------ |
| **macOS**   | Hidden-inset title bar, standard app menu, DMG + ZIP targets |
| **Windows** | NSIS installer + portable exe, desktop shortcut              |

The Electron wrapper automatically:

- Opens the most recent `.sievetrace` from `../log/` on launch
- Provides a **File → Open Trace…** dialog pointing at the log directory
- Runs a local HTTP server so the React app's `/api/logs` endpoints work unchanged

## Keyboard Shortcuts

| Key            | Action               |
| -------------- | -------------------- |
| `←` / `→`      | Previous / Next step |
| `Home` / `End` | First / Last step    |
| `Space`        | Play / Pause         |
| `+` / `=`      | Zoom in              |
| `-`            | Zoom out             |
| `0`            | Reset zoom & pan     |

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

## Plain Log Support (Minimal Integration)

Besides structured `STEP ...` trace files, the parser also accepts free-form text logs.
This enables minimal instrumentation in `sieve_classic8` by adding only two log lines:

```c
log5("Setting bits with step %d in range %d-%d", step, start, sieve_bit);
log5("Setting bit %d", i);
```

The visualizer auto-detects these lines and derives changed bits automatically.
If analysis start/end messages are present (for example from `startAnalysis...` /
`endAnalysis...` logging), they are used to build nested step hierarchy levels.

## Architecture

```
web-visualizer/
├── src/                          # Shared visualization codebase
│   ├── main.jsx                  # Entry point
│   ├── App.jsx                   # File upload / welcome screen
│   ├── Visualizer.jsx            # Main visualization UI
│   ├── StepPanel.jsx             # Step list with search/filter/resize
│   ├── SieveRenderer.js          # Canvas rendering engine
│   ├── traceParser.js            # JSON trace file parser
│   └── styles.css                # All styles
├── electron/                     # Native desktop wrapper
│   ├── main.mjs                  # Electron main process
│   └── icons/                    # Platform icons (svg, ico, icns)
├── Dockerfile                    # Multi-stage build → nginx
├── index.html
├── vite.config.js
└── package.json                  # Web + Electron scripts & config
```