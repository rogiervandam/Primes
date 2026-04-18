/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Renders bits as pixels, grouped into bytes (8), uint64 (64), and cache lines (512 bits = 64 bytes).
 * Supports zoom/pan and highlights changed bits per step.
 */

class SieveRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Sieve data
        this.bitCount = 0;
        this.sieveSize = 0;
        this.bitState = null;        // Uint8Array: current state of each bit (0 or 1)
        this.changedBits = null;     // Set: bits changed in current step

        // Layout
        this.bitsPerRow = 512;       // 1 cache line = 64 bytes = 512 bits
        this.pixelSize = 2;          // Pixels per bit at zoom=1
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        // Colors
        this.COLOR_BIT_ZERO     = [232, 232, 232, 255];  // Light gray: prime candidate
        this.COLOR_BIT_ONE      = [85,  85,  85,  255];  // Dark gray: composite
        this.COLOR_BIT_CHANGED  = [255, 68,  68,  255];  // Red: just changed
        this.COLOR_BACKGROUND   = [26,  26,  26,  255];  // Canvas background
        this.COLOR_BYTE_BORDER  = [50,  50,  50,  255];  // Thin border between bytes
        this.COLOR_U64_BORDER   = [70,  70,  70,  255];  // Medium border between uint64
        this.COLOR_CACHE_BORDER = [100, 100, 100, 255];  // Thick border for cache lines

        // Offscreen rendering buffer
        this.offscreen = null;
        this.offscreenCtx = null;
        this.dirty = true;
    }

    /**
     * Initialize with sieve dimensions.
     */
    init(bitCount, sieveSize) {
        this.bitCount = bitCount;
        this.sieveSize = sieveSize;
        this.bitState = new Uint8Array(bitCount);
        this.changedBits = new Set();
        this.dirty = true;
    }

    /**
     * Set the bit state and changed bits for the current step.
     */
    setState(bitState, changedBits) {
        this.bitState = bitState;
        this.changedBits = changedBits;
        this.dirty = true;
    }

    /**
     * Resize the canvas to fit its container.
     */
    resize(width, height) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.dirty = true;
    }

    /**
     * Render the sieve visualization.
     */
    render() {
        if (!this.bitState || this.bitCount === 0) return;

        const ctx = this.ctx;
        const cw = this.canvas.width / (window.devicePixelRatio || 1);
        const ch = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear
        ctx.fillStyle = `rgb(${this.COLOR_BACKGROUND.join(',')})`;
        ctx.fillRect(0, 0, cw, ch);

        const px = this.pixelSize * this.zoom;
        const rows = Math.ceil(this.bitCount / this.bitsPerRow);

        // Grouping borders add space
        const byteGap = this.zoom >= 2 ? 1 : 0;
        const u64Gap = this.zoom >= 1 ? 1 : 0;
        const cacheGap = this.zoom >= 0.5 ? 2 : 0;

        // Calculate bytes per row (for gap computation)
        const bytesPerRow = this.bitsPerRow / 8;
        const u64sPerRow = this.bitsPerRow / 64;

        // Effective row width (bits + gaps)
        const rowWidthPx = this.bitsPerRow * px
            + (bytesPerRow - 1) * byteGap
            + (u64sPerRow - 1) * u64Gap
            + cacheGap; // one cache line per row, so 0 internal cache gaps

        // Row height
        const rowHeight = px + cacheGap;

        // Determine visible range
        const startRow = Math.max(0, Math.floor(-this.panY / rowHeight));
        const endRow = Math.min(rows, Math.ceil((ch - this.panY) / rowHeight) + 1);

        // Render visible rows
        for (let row = startRow; row < endRow; row++) {
            const bitStart = row * this.bitsPerRow;
            const bitEnd = Math.min(bitStart + this.bitsPerRow, this.bitCount);
            const rowY = this.panY + row * rowHeight;

            if (rowY + px < 0 || rowY > ch) continue;

            let drawX = this.panX;

            for (let bitIdx = bitStart; bitIdx < bitEnd; bitIdx++) {
                const localBit = bitIdx - bitStart;

                // Add gaps for grouping boundaries
                if (localBit > 0) {
                    if (localBit % 8 === 0) drawX += byteGap;
                    if (localBit % 64 === 0) drawX += u64Gap;
                }

                // Skip if outside visible area
                if (drawX + px < 0 || drawX > cw) {
                    drawX += px;
                    continue;
                }

                // Determine color
                let color;
                if (this.changedBits.has(bitIdx)) {
                    color = this.COLOR_BIT_CHANGED;
                } else if (this.bitState[bitIdx]) {
                    color = this.COLOR_BIT_ONE;
                } else {
                    color = this.COLOR_BIT_ZERO;
                }

                ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                ctx.fillRect(Math.round(drawX), Math.round(rowY), Math.max(1, Math.round(px)), Math.max(1, Math.round(px)));

                drawX += px;
            }

            // Draw group borders if zoomed in enough
            if (this.zoom >= 4) {
                this.drawGroupBorders(ctx, bitStart, bitEnd, rowY, px, byteGap, u64Gap);
            }
        }

        // Draw cache-line row separators
        if (cacheGap > 0) {
            ctx.fillStyle = `rgb(${this.COLOR_CACHE_BORDER.join(',')})`;
            for (let row = startRow; row <= endRow && row <= rows; row++) {
                const y = this.panY + row * rowHeight - cacheGap / 2;
                if (y >= 0 && y <= ch) {
                    ctx.fillRect(0, Math.round(y), cw, Math.max(1, cacheGap));
                }
            }
        }

        this.dirty = false;
    }

    /**
     * Draw byte and uint64 group borders within a row.
     */
    drawGroupBorders(ctx, bitStart, bitEnd, rowY, px, byteGap, u64Gap) {
        const count = bitEnd - bitStart;
        let drawX = this.panX;

        for (let i = 0; i < count; i++) {
            if (i > 0 && i % 8 === 0) {
                // Byte border
                ctx.fillStyle = `rgb(${this.COLOR_BYTE_BORDER.join(',')})`;
                ctx.fillRect(Math.round(drawX - byteGap), Math.round(rowY), byteGap, Math.round(px));
                drawX += byteGap;
            }
            if (i > 0 && i % 64 === 0) {
                // uint64 border
                ctx.fillStyle = `rgb(${this.COLOR_U64_BORDER.join(',')})`;
                ctx.fillRect(Math.round(drawX - u64Gap - byteGap), Math.round(rowY - 1), u64Gap + byteGap, Math.round(px + 2));
                drawX += u64Gap;
            }
            drawX += px;
        }
    }

    /**
     * Convert canvas coordinates to bit index.
     * Returns -1 if outside the sieve.
     */
    canvasToBitIndex(canvasX, canvasY) {
        const px = this.pixelSize * this.zoom;
        const cacheGap = this.zoom >= 0.5 ? 2 : 0;
        const rowHeight = px + cacheGap;

        const row = Math.floor((canvasY - this.panY) / rowHeight);
        if (row < 0) return -1;

        // Approximate bit within row (ignoring gaps for simplicity at low zoom)
        const rowX = canvasX - this.panX;
        if (rowX < 0) return -1;

        const approxBit = Math.floor(rowX / px);
        if (approxBit < 0 || approxBit >= this.bitsPerRow) return -1;

        const bitIdx = row * this.bitsPerRow + approxBit;
        if (bitIdx < 0 || bitIdx >= this.bitCount) return -1;

        return bitIdx;
    }

    /**
     * Get info string for a bit index.
     */
    getBitInfo(bitIdx) {
        if (bitIdx < 0 || bitIdx >= this.bitCount) return '';

        const number = bitIdx * 2 + 1; // half-storage: bit i = number 2i+1
        const byteIdx = Math.floor(bitIdx / 8);
        const u64Idx = Math.floor(bitIdx / 64);
        const cacheLineIdx = Math.floor(bitIdx / 512);
        const state = this.bitState[bitIdx] ? 'composite' : 'prime candidate';
        const changed = this.changedBits.has(bitIdx) ? ' [CHANGED]' : '';

        return `Bit ${bitIdx} → Number ${number} | Byte ${byteIdx} | uint64 ${u64Idx} | Cache line ${cacheLineIdx} | ${state}${changed}`;
    }

    /**
     * Render to an offscreen canvas and return as data URL (for export).
     */
    toDataURL() {
        // Save and restore after
        const savedZoom = this.zoom;
        const savedPanX = this.panX;
        const savedPanY = this.panY;

        this.render();

        const dataUrl = this.canvas.toDataURL('image/png');

        this.zoom = savedZoom;
        this.panX = savedPanX;
        this.panY = savedPanY;

        return dataUrl;
    }
}

if (typeof window !== 'undefined') {
    window.SieveRenderer = SieveRenderer;
}
