/**
 * Main application logic for the Sieve Visualizer.
 * Connects the trace parser, canvas renderer, and UI controls.
 */

(function () {
    'use strict';

    // ---- State ----
    let trace = null;            // Parsed trace data
    let currentStep = 0;         // Current step index
    let bitState = null;         // Uint8Array of current bit states
    let playing = false;
    let playTimer = null;
    let playSpeed = 100;         // ms per step

    // ---- DOM elements ----
    const canvas        = document.getElementById('sieve-canvas');
    const container     = document.getElementById('canvas-container');
    const stepList      = document.getElementById('step-list');
    const stepSlider    = document.getElementById('step-slider');
    const stepCounter   = document.getElementById('step-counter');
    const zoomLevel     = document.getElementById('zoom-level');
    const fileInfo      = document.getElementById('file-info');
    const sieveInfo     = document.getElementById('sieve-info');
    const hoverInfo     = document.getElementById('hover-info');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const detailStepId  = document.getElementById('detail-step-id');
    const detailAnno    = document.getElementById('detail-annotation');
    const detailChanges = document.getElementById('detail-changes');

    // ---- Renderer ----
    const renderer = new SieveRenderer(canvas);

    // ---- Resize handling ----
    function handleResize() {
        const rect = container.getBoundingClientRect();
        renderer.resize(rect.width, rect.height);
        renderer.render();
    }
    window.addEventListener('resize', handleResize);

    // ---- Load trace ----
    function loadTrace(buffer, filePath) {
        try {
            trace = TraceParser.parse(buffer);
        } catch (err) {
            alert('Failed to parse trace file: ' + err.message);
            return;
        }

        welcomeOverlay.classList.add('hidden');

        const h = trace.header;
        fileInfo.textContent = filePath ? filePath.split(/[\\/]/).pop() : 'trace';
        sieveInfo.textContent = `Sieve: ${h.sieveSize.toLocaleString()} | Bits: ${h.bitCount.toLocaleString()} | Steps: ${h.stepCount}`;

        // Initialize renderer
        renderer.init(h.bitCount, h.sieveSize);
        bitState = new Uint8Array(h.bitCount);

        // Build step list
        buildStepList();

        // Setup slider
        stepSlider.max = Math.max(0, trace.steps.length - 1);
        stepSlider.value = 0;

        // Go to step 0
        goToStep(0);
        handleResize();
    }

    // ---- Step list ----
    function buildStepList() {
        stepList.innerHTML = '';
        for (let i = 0; i < trace.steps.length; i++) {
            const step = trace.steps[i];
            const el = document.createElement('div');
            el.className = 'step-item';
            el.dataset.index = i;

            const num = document.createElement('span');
            num.className = 'step-num';
            num.textContent = i;

            const changes = document.createElement('span');
            changes.className = 'step-changes';
            changes.textContent = step.numChanged > 0 ? `+${step.numChanged}` : '';

            const text = document.createTextNode(
                step.annotation.length > 40
                    ? step.annotation.substring(0, 40) + '…'
                    : step.annotation
            );

            el.appendChild(num);
            el.appendChild(changes);
            el.appendChild(text);

            el.addEventListener('click', () => goToStep(i));
            stepList.appendChild(el);
        }
    }

    // ---- Navigate steps ----
    function goToStep(targetStep) {
        if (!trace || trace.steps.length === 0) return;
        targetStep = Math.max(0, Math.min(targetStep, trace.steps.length - 1));

        if (targetStep < currentStep) {
            // Rebuild from scratch
            bitState.fill(0);
            for (let i = 0; i <= targetStep; i++) {
                const s = trace.steps[i];
                for (let j = 0; j < s.changedBits.length; j++) {
                    const idx = s.changedBits[j];
                    if (idx < bitState.length) bitState[idx] = 1;
                }
            }
        } else {
            // Apply forward
            for (let i = currentStep + 1; i <= targetStep; i++) {
                const s = trace.steps[i];
                for (let j = 0; j < s.changedBits.length; j++) {
                    const idx = s.changedBits[j];
                    if (idx < bitState.length) bitState[idx] = 1;
                }
            }
        }

        currentStep = targetStep;

        // Build changed set for this step
        const changedSet = new Set();
        const step = trace.steps[currentStep];
        for (let j = 0; j < step.changedBits.length; j++) {
            changedSet.add(step.changedBits[j]);
        }

        renderer.setState(bitState, changedSet);
        renderer.render();

        updateUI();
    }

    function stepNext() { goToStep(currentStep + 1); }
    function stepPrev() { goToStep(currentStep - 1); }
    function stepFirst() { goToStep(0); }
    function stepLast() { if (trace) goToStep(trace.steps.length - 1); }

    function togglePlay() {
        playing = !playing;
        document.getElementById('btn-play').textContent = playing ? '⏸' : '▶';
        if (playing) {
            playTimer = setInterval(() => {
                if (currentStep >= trace.steps.length - 1) {
                    togglePlay();
                    return;
                }
                stepNext();
            }, playSpeed);
        } else {
            clearInterval(playTimer);
            playTimer = null;
        }
    }

    // ---- Update UI ----
    function updateUI() {
        if (!trace) return;
        const step = trace.steps[currentStep];

        // Slider
        stepSlider.value = currentStep;
        stepCounter.textContent = `${currentStep} / ${trace.steps.length - 1}`;

        // Step list highlighting
        const items = stepList.querySelectorAll('.step-item');
        items.forEach((el) => {
            el.classList.toggle('active', parseInt(el.dataset.index) === currentStep);
        });

        // Scroll active step into view
        const activeItem = stepList.querySelector('.step-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        // Detail panel
        detailStepId.textContent = `Step ${currentStep}`;
        detailAnno.textContent = step.annotation || '(no annotation)';

        let changesHtml = `<div class="change-count">${step.numChanged} bits changed</div>`;
        if (step.numChanged > 0 && step.numChanged <= 200) {
            const indices = Array.from(step.changedBits).slice(0, 200);
            changesHtml += `<div class="bit-list">Bit indices: ${indices.join(', ')}</div>`;
        } else if (step.numChanged > 200) {
            const indices = Array.from(step.changedBits).slice(0, 100);
            changesHtml += `<div class="bit-list">First 100: ${indices.join(', ')}…</div>`;
        }
        detailChanges.innerHTML = changesHtml;

        // Zoom display
        zoomLevel.textContent = `${renderer.zoom.toFixed(1)}x`;
    }

    // ---- Zoom ----
    function zoomIn()    { renderer.zoom = Math.min(64, renderer.zoom * 1.5); updateUI(); renderer.render(); }
    function zoomOut()   { renderer.zoom = Math.max(0.1, renderer.zoom / 1.5); updateUI(); renderer.render(); }
    function zoomReset() { renderer.zoom = 1; renderer.panX = 0; renderer.panY = 0; updateUI(); renderer.render(); }

    // ---- Mouse interaction (pan & zoom) ----
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let panStartX = 0, panStartY = 0;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panStartX = renderer.panX;
        panStartY = renderer.panY;
        container.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            renderer.panX = panStartX + (e.clientX - dragStartX);
            renderer.panY = panStartY + (e.clientY - dragStartY);
            renderer.render();
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.classList.remove('dragging');
    });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldZoom = renderer.zoom;
        if (e.deltaY < 0) {
            renderer.zoom = Math.min(64, renderer.zoom * 1.2);
        } else {
            renderer.zoom = Math.max(0.1, renderer.zoom / 1.2);
        }

        // Zoom towards mouse cursor
        const scale = renderer.zoom / oldZoom;
        renderer.panX = mouseX - scale * (mouseX - renderer.panX);
        renderer.panY = mouseY - scale * (mouseY - renderer.panY);

        updateUI();
        renderer.render();
    }, { passive: false });

    // Hover info
    container.addEventListener('mousemove', (e) => {
        if (isDragging || !trace) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const bitIdx = renderer.canvasToBitIndex(x, y);
        if (bitIdx >= 0) {
            hoverInfo.textContent = renderer.getBitInfo(bitIdx);
            hoverInfo.style.display = 'block';
        } else {
            hoverInfo.style.display = 'none';
        }
    });

    container.addEventListener('mouseleave', () => {
        hoverInfo.style.display = 'none';
    });

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.key) {
            case 'ArrowLeft':  e.preventDefault(); stepPrev(); break;
            case 'ArrowRight': e.preventDefault(); stepNext(); break;
            case 'Home':       e.preventDefault(); stepFirst(); break;
            case 'End':        e.preventDefault(); stepLast(); break;
            case ' ':          e.preventDefault(); togglePlay(); break;
            case '+':
            case '=':          e.preventDefault(); zoomIn(); break;
            case '-':          e.preventDefault(); zoomOut(); break;
            case '0':          e.preventDefault(); zoomReset(); break;
        }
    });

    // ---- Button events ----
    document.getElementById('btn-first').addEventListener('click', stepFirst);
    document.getElementById('btn-prev').addEventListener('click', stepPrev);
    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-next').addEventListener('click', stepNext);
    document.getElementById('btn-last').addEventListener('click', stepLast);
    document.getElementById('btn-zoom-in').addEventListener('click', zoomIn);
    document.getElementById('btn-zoom-out').addEventListener('click', zoomOut);
    document.getElementById('btn-zoom-reset').addEventListener('click', zoomReset);

    stepSlider.addEventListener('input', (e) => {
        goToStep(parseInt(e.target.value));
    });

    // ---- Export ----
    async function exportPng() {
        if (!trace) return;
        const dataUrl = renderer.toDataURL();
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const defaultName = `sieve_step_${currentStep}.png`;
        const savePath = await window.electronAPI.saveFile(defaultName);
        if (savePath) {
            await window.electronAPI.writeFile(savePath, base64);
        }
    }

    async function exportSequence(outputDir) {
        if (!trace) return;
        const savedStep = currentStep;
        for (let i = 0; i < trace.steps.length; i++) {
            goToStep(i);
            const dataUrl = renderer.toDataURL();
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            const fileName = `step_${String(i).padStart(5, '0')}.png`;
            const filePath = outputDir + '/' + fileName;
            await window.electronAPI.writeFile(filePath, base64);
        }
        goToStep(savedStep);
        alert(`Exported ${trace.steps.length} frames to ${outputDir}`);
    }

    async function exportGif(outputPath) {
        if (!trace) return;
        // Simple GIF export: collect frames and create GIF
        // gif.js is included as a dependency but needs a web worker
        // For now, fall back to PNG sequence with an explanatory message
        alert(
            'GIF export: For best results, export as PNG sequence (Ctrl+Shift+E) ' +
            'and use ffmpeg to create a video:\n\n' +
            'ffmpeg -framerate 10 -i step_%05d.png -vf "scale=1024:-1:flags=neighbor" output.mp4'
        );
    }

    // ---- Electron IPC ----
    window.electronAPI.onTraceLoaded(loadTrace);
    window.electronAPI.onExportPng(exportPng);
    window.electronAPI.onExportSequence(exportSequence);
    window.electronAPI.onExportGif(exportGif);
    window.electronAPI.onZoomIn(zoomIn);
    window.electronAPI.onZoomOut(zoomOut);
    window.electronAPI.onZoomReset(zoomReset);
    window.electronAPI.onStepPrev(stepPrev);
    window.electronAPI.onStepNext(stepNext);
    window.electronAPI.onStepFirst(stepFirst);
    window.electronAPI.onStepLast(stepLast);

})();
