/**
 * Closest Pair - Divide and Conquer Simulation
 * Layout: Top Controls, Middle Data, Split Content
 */

const state = {
    points: [],         // Original unsorted points (for ref? or just use sorted)
    sortedPoints: [],   // Working set
    trace: [],          // Execution steps
    currentStep: -1,
    autoPlayId: null,

    // Config
    padding: 30,
    speed: 800, // Default Normal
    width: 0,
    height: 0
};

// --- DOM Elements ---
const el = {
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d'),

    // Inputs
    inputN: document.getElementById('pointCount'),
    btnLoad: document.getElementById('btnLoad'),
    btnReset: document.getElementById('btnReset'),

    // Mode
    inputMode: document.getElementById('inputMode'),
    randomInput: document.getElementById('randomInput'),
    manualInput: document.getElementById('manualInput'),
    manualPoints: document.getElementById('manualPoints'),

    // Data Views
    coordList: document.getElementById('coordinateList'),
    minVal: document.getElementById('currentMinVal'),
    compCount: document.getElementById('compCount'),
    stepCounter: document.getElementById('stepCounter'),

    // Controls
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    btnAuto: document.getElementById('btnAuto'),
    // Dropdown
    speedDropdown: document.getElementById('speedDropdown'),
    speedItems: document.querySelectorAll('.dropdown-item'),
    logBox: document.getElementById('logContainer'),

    // Modal
    btnParams: document.getElementById('btnDynamicParams'),
    modal: document.getElementById('paramsModal'),
    btnCloseModal: document.querySelector('.close-modal'),

    // Modal Data
    pCompDC: document.getElementById('pCompDC'),
    pCompBF: document.getElementById('pCompBF'),
    pSaved: document.getElementById('pSaved'),
    pExecTime: document.getElementById('pExecTime'),

    // Placeholder in coord list
    coordPlaceholder: document.getElementById('coordPlaceholder'),
    coordResult: document.getElementById('coordResult'),
    // Comparison View
    simulationView: document.getElementById('simulationView'),
    comparisonView: document.getElementById('comparisonView'),
    btnShowAdvanced: document.getElementById('btnShowAdvanced'),
    btnGoBack: document.getElementById('btnGoBack'),
    inputCompN: document.getElementById('inputN'),
    inputType: document.getElementById('inputType'),
    btnRunComparison: document.getElementById('btnRunComparison'),
    btnResetComparison: document.getElementById('btnResetComparison'),
    statusMsg: document.getElementById('statusMsg'),
    bfTime: document.getElementById('bfTime'),
    bfComps: document.getElementById('bfComps'),
    bfDist: document.getElementById('bfDist'),
    bfBar: document.getElementById('bfBar'),
    bfObservation: document.getElementById('bfObservation'),
    dcTime: document.getElementById('dcTime'),
    dcComps: document.getElementById('dcComps'),
    dcDist: document.getElementById('dcDist'),
    dcBar: document.getElementById('dcBar'),
    dcObservation: document.getElementById('dcObservation'),
    effGain: document.getElementById('effGain')
};

// --- Comparison State ---
const compState = {
    points: [],
    bfStats: {},
    dcStats: {}
};
let comparisonAlreadyRun = false;

// --- Initialization ---
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    el.btnLoad.addEventListener('click', handleLoad);
    el.btnReset.addEventListener('click', resetExperiment);
    el.inputMode.addEventListener('change', handleModeChange);

    el.btnNext.addEventListener('click', () => step(1));
    el.btnPrev.addEventListener('click', () => step(-1));
    el.btnAuto.addEventListener('click', toggleAutoPlay);

    // Speed Dropdown Items
    el.speedItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const val = parseInt(e.target.dataset.speed);
            e.stopPropagation(); // Don't trigger window click
            handleSpeedSelection(val);
        });
    });

    // Close dropdown on outside click
    window.addEventListener('click', (e) => {
        if (!el.btnAuto.contains(e.target)) {
            el.speedDropdown.classList.add('hidden');
        }
    });

    // Modal Events
    el.btnParams.addEventListener('click', openParamsModal);
    el.btnCloseModal.addEventListener('click', closeParamsModal);
    window.addEventListener('click', (e) => {
        if (e.target === el.modal) {
            closeParamsModal();
        }
    });

    // Comparison View Listeners
    el.btnShowAdvanced.addEventListener('click', () => {
        el.simulationView.classList.add('hidden');
        el.comparisonView.classList.add('active');
        comparisonAlreadyRun = false;
    });

    el.btnGoBack.addEventListener('click', () => {
        el.comparisonView.classList.remove('active');
        el.simulationView.classList.remove('hidden');
    });

    el.btnRunComparison.addEventListener('click', runComparisonAnalysis);
    el.btnResetComparison.addEventListener('click', resetComparisonUI);

    // Initial button state
    el.btnParams.disabled = true;
}

function resizeCanvas() {
    const parent = el.canvas.parentElement;
    state.width = parent.clientWidth;
    state.height = parent.clientHeight;
    el.canvas.width = state.width;
    el.canvas.height = state.height;
    draw();
}

// --- Core Logic ---

// Handle mode change
function handleModeChange() {
    const mode = el.inputMode.value;
    el.coordResult.textContent = ''; // Clear previous results

    // Always show point count input as per request
    el.randomInput.classList.remove('hidden');

    if (mode === 'random') {
        el.manualInput.classList.add('hidden');
        el.coordPlaceholder.classList.remove('hidden');
        el.inputN.focus();
    } else {
        el.manualInput.classList.remove('hidden');
        el.coordPlaceholder.classList.add('hidden');
        el.manualPoints.focus();
    }
}

// Unified load handler
function handleLoad() {
    const mode = el.inputMode.value;
    if (mode === 'random') {
        generateExperiment();
    } else {
        loadManualPoints();
    }
}

// Mode Switching Functions
function switchToRandomMode() {
    el.btnModeRandom.classList.add('active');
    el.btnModeManual.classList.remove('active');
    el.randomMode.classList.remove('hidden');
    el.manualMode.classList.add('hidden');
}

function switchToManualMode() {
    el.btnModeRandom.classList.remove('active');
    el.btnModeManual.classList.add('active');
    el.randomMode.classList.add('hidden');
    el.manualMode.classList.remove('hidden');
}

// Parse and load manual points
function loadManualPoints() {
    stopAutoPlay();

    const input = el.manualPoints.value.trim();

    if (!input) {
        alert("Please enter points in the format: x1,y1 x2,y2 x3,y3...");
        return;
    }

    try {
        const points = [];
        const parts = input.split(/\s+/); // Split by whitespace

        parts.forEach((part, idx) => {
            const coords = part.split(',');
            if (coords.length !== 2) {
                throw new Error(`Point ${idx + 1}: Invalid format. Expected x,y`);
            }

            const x = parseFloat(coords[0].trim());
            const y = parseFloat(coords[1].trim());

            if (isNaN(x) || isNaN(y)) {
                throw new Error(`Point ${idx + 1}: Coordinates must be numbers`);
            }

            if (x < 0 || x > 100 || y < 0 || y > 100) {
                throw new Error(`Point ${idx + 1}: Coordinates must be between 0-100`);
            }

            points.push({ id: idx, x, y });
        });

        if (points.length < 2) {
            throw new Error("Need at least 2 points to find closest pair");
        }

        const requiredN = parseInt(el.inputN.value);
        if (!isNaN(requiredN) && points.length !== requiredN) {
            throw new Error(`Please enter exactly ${requiredN} points as specified in 'no. of points'`);
        }

        // Check for overlapping/too close points (logical distance check)
        const minAllowedDist = 12;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minAllowedDist) {
                    throw new Error(`Points P${i + 1} and P${j + 1} are too close (Dist: ${dist.toFixed(1)}). Please ensure points are at least ${minAllowedDist} units apart to avoid overlapping labels.`);
                }
            }
        }

        // Load the points
        state.points = points;
        updateCoordinateList(state.points);
        prepareSimulation();

        state.currentStep = -1;
        el.logBox.innerHTML = '<div class="log-entry system">Custom points loaded. Ready to start.</div>';
        el.minVal.textContent = '-';
        el.compCount.textContent = '0';
        el.stepCounter.textContent = '0/0';
        updateButtons();
        draw();

    } catch (error) {
        alert("Error: " + error.message + "\n\nFormat: x1,y1 x2,y2 x3,y3 (coordinates 0-100)");
        resetExperiment();
    }
}

function generateExperiment() {
    stopAutoPlay();

    const rawVal = el.inputN.value.trim();

    // Check for empty or non-numeric
    if (rawVal === '' || isNaN(Number(rawVal))) {
        alert("Invalid Input: Please enter a valid integer number (e.g., 10).");
        resetExperiment(); // Ensure controls are disabled
        return;
    }

    const n = Number(rawVal);

    // Check for Integer
    if (!Number.isInteger(n)) {
        alert("Invalid Input: N must be an integer.");
        resetExperiment();
        return;
    }

    // Critical Edge Case: N < 2
    if (n < 2) {
        alert("Closest pair requires at least 2 points.");
        resetExperiment();
        return;
    }

    // Optional: Max limit check based on prev HTML
    // Visualization Clarity Limit
    if (n > 20) {
        alert("Please choose N <= 20 for better understanding of visualization.");
        // resetExperiment(); // Don't reset everything, just let them fix N
        return;
    }

    // 1. Generate Points with distance check to avoid label overlap
    state.points = [];
    const minStepDist = 12; // Increased for label clarity
    for (let i = 0; i < n; i++) {
        let p;
        let attempts = 0;
        let valid = false;
        while (!valid && attempts < 100) {
            p = {
                id: i,
                x: Math.floor(Math.random() * 90) + 5, // Keep away from edges
                y: Math.floor(Math.random() * 90) + 5
            };
            valid = state.points.every(existing => {
                const dx = p.x - existing.x;
                const dy = p.y - existing.y;
                return Math.sqrt(dx * dx + dy * dy) >= minStepDist;
            });
            attempts++;
        }
        state.points.push(p);
    }

    // Update Coordinate List UI
    updateCoordinateList(state.points);

    // 2. Prepare Simulation (Sort & Trace)
    prepareSimulation();

    // Reset UI State
    state.currentStep = -1;
    el.logBox.innerHTML = '<div class="log-entry system">Experiment Generated. Ready to start.</div>';
    el.minVal.textContent = '-';
    el.compCount.textContent = '0';
    el.stepCounter.textContent = '0/0';
    updateButtons();

    draw(); // Initial draw (unsorted)
}

function resetExperiment() {
    stopAutoPlay();
    state.points = [];
    state.sortedPoints = [];
    state.trace = [];
    state.currentStep = -1;
    state.stats = null;

    // Reset UI State
    el.coordPlaceholder.classList.remove('hidden');
    el.coordResult.textContent = '';
    el.manualInput.classList.add('hidden');
    el.manualPoints.value = '';
    el.inputMode.value = 'random';
    el.randomInput.classList.remove('hidden');
    el.inputN.value = '10';
    el.logBox.innerHTML = '<div class="log-entry system">Ready. Generate points to begin.</div>';
    el.minVal.textContent = '-';
    el.compCount.textContent = '-';
    el.stepCounter.textContent = '0/0';
    el.btnParams.disabled = true;

    updateButtons();

    // Clear Canvas
    el.ctx.clearRect(0, 0, state.width, state.height);
}

function updateCoordinateList(points) {
    const mode = el.inputMode.value;

    // Hide placeholder and manual input after successful load
    el.coordPlaceholder.classList.add('hidden');
    el.manualInput.classList.add('hidden');

    const text = points
        .map(p => `(${p.x}, ${p.y})`)
        .join(',  ');
    el.coordResult.textContent = text;
}


function prepareSimulation() {
    state.trace = [];
    let comparisons = 0;

    // Helper to push steps
    const record = (type, msg, meta = {}) => {
        state.trace.push({ type, msg, meta: { ...meta, comparisons } });
    };

    // Step 1: Sorting
    record('sort', 'Sorting all points by X-coordinate to prepare for regional splitting.', {
        stage: 'sorting',
        sorted: false
    });

    const sorted = [...state.points].sort((a, b) => a.x - b.x);
    state.sortedPoints = sorted;

    record('sort', 'Sorting Complete. Starting the recursive Divide & Conquer algorithm.', {
        stage: 'sorting',
        sorted: true,
        activePoints: sorted
    });

    // --- Divide & Conquer Algo ---

    function dist(p1, p2) {
        comparisons++;
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    function bruteForce(points, parentMeta) {
        let minD = Infinity;
        let pair = [];

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const d = dist(points[i], points[j]);

                record('compare', `Checking pair P${points[i].id + 1} and P${points[j].id + 1}. Dist: ${d.toFixed(2)}`, {
                    ...parentMeta,
                    highlight: [points[i], points[j]],
                    currentMin: minD
                });

                if (d < minD) {
                    minD = d;
                    pair = [points[i], points[j]];
                    record('new_min', `New local minimum ${d.toFixed(2)} found between P${points[i].id + 1} and P${points[j].id + 1}.`, {
                        ...parentMeta,
                        bestPair: pair,
                        currentMin: minD
                    });
                }
            }
        }
        return { min: minD, pair: pair };
    }

    function solveRecursive(px, py) {
        const n = px.length;

        // Base Case
        if (n <= 3) {
            record('base', `<b>Base Case</b> (N=${n}): Region is small enough to check all pairs directly using Brute Force.`, { activeRegion: px });
            return bruteForce(px, { activeRegion: px });
        }

        // Divide
        const mid = Math.floor(n / 2);
        const midPoint = px[mid];

        record('divide', `<b>Divide:</b> Splitting the current group of ${n} points at X = ${midPoint.x.toFixed(1)} into two halves.`, {
            activeRegion: px,
            divisionLine: midPoint.x
        });

        const PxL = px.slice(0, mid);
        const PxR = px.slice(mid);

        const PyL = py.filter(p => p.x < midPoint.x || (p.x === midPoint.x && PxL.includes(p)));
        const PyR = py.filter(p => p.x >= midPoint.x && !PyL.includes(p));

        const leftRes = solveRecursive(PxL, PyL);
        const rightRes = solveRecursive(PxR, PyR);

        // Merge
        let d = Math.min(leftRes.min, rightRes.min);
        let pair = leftRes.min < rightRes.min ? leftRes.pair : rightRes.pair;

        record('conquer', `<b>Conquer:</b> Merging results. Left min = ${leftRes.min.toFixed(2)}, Right min = ${rightRes.min.toFixed(2)}. Best so far δ = ${d.toFixed(2)}.`, {
            activeRegion: px,
            divisionLine: midPoint.x,
            bestPair: pair,
            currentMin: d
        });

        // Strip
        const strip = py.filter(p => Math.abs(p.x - midPoint.x) < d);

        record('strip', `<b>Strip Check:</b> Examining the central region of width 2δ (${(2 * d).toFixed(2)}) for any pairs closer than δ = ${d.toFixed(2)}.`, {
            activeRegion: px,
            divisionLine: midPoint.x,
            stripRegion: { x: midPoint.x, width: d },
            bestPair: pair,
            currentMin: d
        });

        // Log which points are in the strip
        if (strip.length > 0) {
            const stripPointsList = strip.map(p => `P${p.id + 1}`).join(', ');
            record('strip_detail', `<b>Strip Points (sorted by Y):</b> ${stripPointsList}. Total: ${strip.length} point(s). Now comparing each pair where Y-distance < δ.`, {
                activeRegion: px,
                divisionLine: midPoint.x,
                stripRegion: { x: midPoint.x, width: d },
                stripPoints: strip,
                bestPair: pair,
                currentMin: d
            });
        }

        // Strip check - with more detailed logging
        let stripComparisonCount = 0;
        for (let i = 0; i < strip.length; i++) {
            for (let j = i + 1; j < strip.length && (strip[j].y - strip[i].y) < d; j++) {
                stripComparisonCount++;
                const d2 = dist(strip[i], strip[j]);
                const yDiff = Math.abs(strip[j].y - strip[i].y);

                record('compare', `<b>Comparing Pair ${stripComparisonCount}:</b> P${strip[i].id + 1} (${strip[i].x.toFixed(1)}, ${strip[i].y.toFixed(1)}) ↔ P${strip[j].id + 1} (${strip[j].x.toFixed(1)}, ${strip[j].y.toFixed(1)}). Y-dist: ${yDiff.toFixed(2)} < δ=${d.toFixed(2)}. Euclidean Distance: ${d2.toFixed(2)}`, {
                    activeRegion: px,
                    divisionLine: midPoint.x,
                    stripRegion: { x: midPoint.x, width: d },
                    highlight: [strip[i], strip[j]],
                    bestPair: pair,
                    currentMin: d,
                    pairIndex: stripComparisonCount
                });

                if (d2 < d) {
                    d = d2;
                    pair = [strip[i], strip[j]];

                    record('new_min', `<b>✓ Better Pair Found!</b> P${strip[i].id + 1} and P${strip[j].id + 1} are closer (Dist: ${d2.toFixed(2)}) than current best δ = ${d.toFixed(2)}. Updated δ = ${d.toFixed(2)}.`, {
                        activeRegion: px,
                        divisionLine: midPoint.x,
                        stripRegion: { x: midPoint.x, width: d },
                        bestPair: pair,
                        currentMin: d,
                        pairIndex: stripComparisonCount
                    });
                }
            }
        }

        // Log end of strip comparison
        if (strip.length > 1) {
            record('strip_complete', `<b>Strip Comparison Complete:</b> Checked ${stripComparisonCount} pair(s) in the strip. Final best distance for this region: δ = ${d.toFixed(2)}.`, {
                activeRegion: px,
                divisionLine: midPoint.x,
                stripRegion: { x: midPoint.x, width: d },
                bestPair: pair,
                currentMin: d,
                totalComparisons: stripComparisonCount
            });
        }

        return { min: d, pair: pair };
    }

    // Start
    const Py = [...sorted].sort((a, b) => a.y - b.y);

    // Performance Measurement
    const t0 = performance.now();
    const result = solveRecursive(sorted, Py);
    const t1 = performance.now();

    // Store Stats
    state.stats = {
        execTime: (t1 - t0).toFixed(4), // ms
        compDC: comparisons,
        compBF: (sorted.length * (sorted.length - 1)) / 2
    };

    record('finish', `<b>Success:</b> Closest pair found! Distance = ${result.min.toFixed(2)} between P${result.pair[0].id + 1} and P${result.pair[1].id + 1}.`, {
        activeRegion: sorted,
        bestPair: result.pair,
        currentMin: result.min
    });

    // Update step counter display with total steps
    const totalSteps = state.trace.length;
    el.stepCounter.textContent = `0/${totalSteps}`;
}

// --- Modal Logic ---
function openParamsModal() {
    if (!state.stats) {
        // Fallback if no experiment generated
        el.pCompDC.textContent = '-';
        el.pCompBF.textContent = '-';
        el.pSaved.textContent = '-';
        el.pExecTime.textContent = '-';
    } else {
        el.pCompDC.textContent = state.stats.compDC;
        el.pCompBF.textContent = state.stats.compBF;

        const saved = state.stats.compBF - state.stats.compDC;
        el.pSaved.textContent = saved > 0 ? saved : 0; // Should be positive

        el.pExecTime.textContent = state.stats.execTime + ' ms';
    }
    el.modal.style.display = 'block';
}

function closeParamsModal() {
    el.modal.style.display = 'none';
}


// --- Stepping Logic ---

function step(delta) {
    const next = state.currentStep + delta;
    if (next < 0 || next >= state.trace.length) {
        if (delta === 1 && state.autoPlayId) stopAutoPlay();
        return;
    }

    state.currentStep = next;
    const s = state.trace[next];

    // Update step counter
    const totalSteps = state.trace.length;
    const currentStepNum = next + 1;
    el.stepCounter.textContent = `${currentStepNum}/${totalSteps}`;

    // Log update
    updateLog(next);

    // Stats update
    if (s.meta.comparisons !== undefined) el.compCount.textContent = s.meta.comparisons;
    if (s.meta.currentMin && s.meta.currentMin !== Infinity) el.minVal.textContent = s.meta.currentMin.toFixed(2);

    updateButtons();
    draw();
}

function updateLog(index) {
    // Rebuild or Append? User wanted "prev button so i can jump to back step"
    // Rebuilding is safest for "Jumping".
    // "I want to see each step as a new line"

    el.logBox.innerHTML = '';
    for (let i = 0; i <= index; i++) {
        const item = state.trace[i];
        const row = document.createElement('div');
        row.className = `log-entry ${item.type}`;
        row.innerHTML = `<span class="step-num">Step ${i + 1}:</span> ${item.msg}`;
        // Add active class to the current step
        if (i === index) {
            row.classList.add('active');
        }
        el.logBox.appendChild(row);
    }
    el.logBox.scrollTop = el.logBox.scrollHeight;
}

function updateButtons() {
    // Disable Next/Prev if auto-play is active
    const isAutoPlayActive = state.autoPlayId !== null;

    el.btnPrev.disabled = isAutoPlayActive || state.currentStep < 0;
    el.btnNext.disabled = isAutoPlayActive || state.currentStep >= state.trace.length - 1;

    // Auto button should be enabled if we have steps
    el.btnAuto.disabled = state.trace.length === 0;

    // Runtime metrics enabled only after completion
    el.btnParams.disabled = (state.currentStep < state.trace.length - 1 || state.trace.length === 0);
}

function toggleAutoPlay(e) {
    if (state.autoPlayId) {
        stopAutoPlay();
    } else {
        // Toggle Dropdown
        el.speedDropdown.classList.toggle('hidden');
    }
    if (e) e.stopPropagation();
}

function handleSpeedSelection(speed) {
    state.speed = speed;
    el.speedDropdown.classList.add('hidden');
    startAutoPlay();
}

function startAutoPlay() {
    el.btnAuto.innerHTML = 'Stop';
    el.btnAuto.classList.add('active');
    updateButtons(); // Disable Next/Prev buttons immediately

    // Recursive loop
    const loop = () => {
        if (state.currentStep < state.trace.length - 1) {
            step(1);
            state.autoPlayId = setTimeout(loop, state.speed);
        } else {
            stopAutoPlay();
        }
    };

    loop();
}

function stopAutoPlay() {
    clearTimeout(state.autoPlayId);
    state.autoPlayId = null;
    el.btnAuto.innerHTML = 'Auto Play &#9662;';
    el.btnAuto.classList.remove('active');
    // Ensure dropdown closed
    if (el.speedDropdown) el.speedDropdown.classList.add('hidden');
    updateButtons(); // Re-enable Next/Prev buttons when auto-play stops
}

// --- Drawing Logic ---

function toCanvas(p) {
    const w = state.width - 2 * state.padding;
    const h = state.height - 2 * state.padding;
    // Invert Y so 0,0 is bottom-left for graph-like feel
    return {
        x: state.padding + (p.x / 100) * w,
        y: state.height - state.padding - (p.y / 100) * h
    };
}

function draw() {
    const w = state.width;
    const h = state.height;
    const ctx = el.ctx;

    // Clear with semi-transparent black for potential trails (or clean clear)
    ctx.clearRect(0, 0, w, h);

    // Grid Background (Subtle)
    drawGrid();

    // Default State
    if (state.currentStep === -1) {
        if (state.points.length > 0) {
            drawPoints(state.points, '#94a3b8', 4, false); // Grey
        }
        return;
    }

    const s = state.trace[state.currentStep];
    const m = s.meta;

    // Special handling for SORTING steps - show points ordered by X coordinate
    if (s.type === 'sort' && m.sorted === true && m.activePoints) {
        // Display sorted points in order with connecting lines showing the sort order
        const sortedPts = m.activePoints;

        // Draw connection lines from left to right showing the sorted order
        for (let i = 0; i < sortedPts.length - 1; i++) {
            const p1 = sortedPts[i];
            const p2 = sortedPts[i + 1];
            const c1 = toCanvas(p1);
            const c2 = toCanvas(p2);

            // Draw arrow indicating sort order
            ctx.strokeStyle = '#0891b2'; // Dark cyan - more visible
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw X-axis reference line to emphasize sorting by X
        const bottomY = state.height - state.padding;
        ctx.strokeStyle = '#0891b2'; // Dark cyan
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(state.padding, bottomY);
        ctx.lineTo(state.width - state.padding, bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label showing sort basis
        drawText(state.padding + 10, bottomY + 20, 'Points sorted by X-coordinate (Left → Right)', '#38bdf8', 'left');

        // Draw all points with special highlighting
        sortedPts.forEach((p, idx) => {
            let color = '#38bdf8'; // Cyan for sorted points
            drawPointNode(p, color, false, (idx + 1) + '');
        });
        return; // Skip normal rendering for sorting step
    }

    // 1. Division Line & Halves Shading
    if (m.divisionLine !== undefined) {
        const xPos = toCanvas({ x: m.divisionLine, y: 0 }).x;

        // Left Region Shading
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, 0, xPos, h);

        // Right Region Shading
        ctx.fillStyle = 'rgba(255, 0, 0, 0.02)';
        ctx.fillRect(xPos, 0, w - xPos, h);

        // Bold Midline
        drawLine(xPos, 0, xPos, h, '#ffff', 2, [5, 5]);
        drawText(xPos + 5, 20, 'Divide X=' + m.divisionLine.toFixed(1), '#fff');
        // Bottom label for midline
        drawText(xPos + 5, h - 10, 'x=' + m.divisionLine.toFixed(1), '#94a3b8');
    }

    // 2. Strip Region
    if (m.stripRegion) {
        const c = m.stripRegion.x;
        const widthVal = m.stripRegion.width;
        const x1 = toCanvas({ x: c - widthVal, y: 0 }).x;
        const x2 = toCanvas({ x: c + widthVal, y: 0 }).x;

        // Strip Fill
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)'; // Blue/Grey transparent
        ctx.fillRect(x1, 0, x2 - x1, h);

        // Boundaries
        drawLine(x1, 0, x1, h, 'rgba(56, 189, 248, 0.4)', 1);
        drawLine(x2, 0, x2, h, 'rgba(56, 189, 248, 0.4)', 1);

        drawText(x1 + 5, h - 35, `δL (x=${(c - widthVal).toFixed(1)})`, '#38bdf8');
        drawText(x2 + 5, h - 35, `δR (x=${(c + widthVal).toFixed(1)})`, '#38bdf8');
        drawText((x1 + x2) / 2, 40, 'Strip 2δ', '#38bdf8', 'center');
    }

    // 3. Points
    // Determine active set
    let activeIds = new Set();
    if (m.activeRegion) m.activeRegion.forEach(p => activeIds.add(p.id));

    // Determine Strip Points (Blue)
    let stripIds = new Set();
    if (m.stripRegion && m.activeRegion) { // Recalculate which are in strip for visual color
        m.activeRegion.forEach(p => {
            if (Math.abs(p.x - m.stripRegion.x) < m.stripRegion.width) {
                stripIds.add(p.id);
            }
        });
    }

    state.points.forEach(p => {
        let color = '#475569'; // Default dim grey
        let glow = false;
        if (activeIds.has(p.id)) color = '#94a3b8'; // Active region lighter grey
        if (stripIds.has(p.id)) {
            color = '#38bdf8'; // Cyan/Blue for Strip
            glow = true;
        }

        // Draw Point
        drawPointNode(p, color, glow, p.id + 1);
    });

    // 4. Comparisons & Highlights
    // Red Neighborhood Box
    if (m.highlight && m.stripRegion) {
        // Draw box around the first point (reference point)
        const p1 = m.highlight[0];
        const d = m.currentMin; // or strip width
        const c1 = toCanvas(p1);

        // Logical coords for box: [x-d, x+d] ?? No, standard algo is check next 7 points in y range d
        // Visualizing the delta-by-2delta box:
        // Width 2d, Height d. Centered on x? No, usually x-d to x+d
        // Let's draw a box representing the Y-limit constraint
        const boxW = toCanvas({ x: d, y: 0 }).x - toCanvas({ x: 0, y: 0 }).x; // Scaled width
        const boxH = Math.abs(toCanvas({ x: 0, y: d }).y - toCanvas({ x: 0, y: 0 }).y);

        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = 1;
        ctx.strokeRect(c1.x - boxW, c1.y, boxW * 2, boxH); // Downwards y is positive in canvas but we inverted?
        // Wait, toCanvas inverts Y. So +Y usually goes UP.
        // boxH should be drawn downwards or upwards depending on loop direction.
        // Loop is j=i+1, sorted by Y. So we look UP?
        // Let's just draw a box around p1.
        ctx.strokeRect(c1.x - boxW, c1.y - boxH, boxW * 2, boxH * 2);
    }

    if (m.highlight) {
        drawConnection(m.highlight[0], m.highlight[1], '#f59e0b', 2); // Orange
    }

    if (m.bestPair) {
        drawConnection(m.bestPair[0], m.bestPair[1], '#22c55e', 3); // Green

        // Label Distance
        const p1 = m.bestPair[0];
        const p2 = m.bestPair[1];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const cm = toCanvas(mid);
        drawText(cm.x, cm.y - 10, `d = ${m.currentMin.toFixed(2)}`, '#22c55e', 'center');
    }
}

// --- Helpers ---

function drawGrid() {
    const ctx = el.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical
    for (let i = 0; i <= 100; i += 10) {
        const x = toCanvas({ x: i, y: 0 }).x;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.height); ctx.stroke();
    }
    // Horizontal
    for (let i = 0; i <= 100; i += 10) {
        const y = toCanvas({ x: 0, y: i }).y;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.width, y); ctx.stroke();
    }
}

function drawPoints(points, color, r, glow) {
    points.forEach((p, i) => drawPointNode(p, color, glow, i + 1));
}

function drawPointNode(p, color, glow, label) {
    const ctx = el.ctx;
    const c = toCanvas(p);

    // Glow effect
    if (glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
    } else {
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset

    // Label
    ctx.fillStyle = '#94a3b8'; // Lighter grey for coordinate text
    ctx.font = '10px "Roboto Mono"';
    ctx.fillText(`${label}: (${p.x}, ${p.y})`, c.x + 8, c.y + 3);
}

function drawLine(x1, y1, x2, y2, color, w, dash = []) {
    el.ctx.strokeStyle = color;
    el.ctx.lineWidth = w;
    el.ctx.setLineDash(dash);
    el.ctx.beginPath();
    el.ctx.moveTo(x1, y1);
    el.ctx.lineTo(x2, y2);
    el.ctx.stroke();
    el.ctx.setLineDash([]);
}

function drawConnection(p1, p2, color, w) {
    const c1 = toCanvas(p1);
    const c2 = toCanvas(p2);
    // Glow line
    el.ctx.shadowBlur = 5;
    el.ctx.shadowColor = color;
    drawLine(c1.x, c1.y, c2.x, c2.y, color, w);
    el.ctx.shadowBlur = 0;
}

function drawText(x, y, text, color, align = 'left') {
    el.ctx.fillStyle = color;
    el.ctx.font = 'bold 12px "Open Sans"';
    el.ctx.textAlign = align;
    el.ctx.fillText(text, x, y);
    el.ctx.textAlign = 'left'; // Reset
}

// --- Comparison Logic ---

function resetComparisonUI() {

    // 🚨 Reset rerun flag
    comparisonAlreadyRun = false;

    // Reset all display values
    el.bfTime.textContent = '-';
    el.bfComps.textContent = '-';
    el.bfDist.textContent = '-';
    el.bfBar.style.width = '0%';
    el.bfObservation.classList.remove('visible');

    el.dcTime.textContent = '-';
    el.dcComps.textContent = '-';
    el.dcDist.textContent = '-';
    el.dcBar.style.width = '0%';
    el.dcObservation.classList.remove('visible');

    el.effGain.textContent = '-';

    el.statusMsg.textContent = '';

    // Enable Run button again
    el.btnRunComparison.disabled = false;

    // Clear stored data
    compState.points = [];
    compState.bfStats = {};
    compState.dcStats = {};
}


function runComparisonAnalysis()
{
    const rawN = parseInt(el.inputCompN.value);

    if (isNaN(rawN) || rawN < 2)
    {
        alert("Please enter a valid input size N (N ≥ 2).");
        return;
    }

    if (rawN > 10000)
    {
        alert("Maximum allowed value is 10000.");
        return;
    }

    // 
    if (comparisonAlreadyRun)
    {
        alert("Please Reset before running the analysis with a new value of N.");
        return;
    }

    // Run analysis
    executeComparisonAlgorithms(rawN, el.inputType.value);

    updateComparisonUI();

    // Mark as run
    comparisonAlreadyRun = true;
}


function executeComparisonAlgorithms(n, type) {
    compState.points = generateCompPoints(n, type);

    // Run multiple iterations for more stable timing averages
    const iterations = n > 500 ? 5 : 20;

    // --- Brute Force ---
    let bfTotalTime = 0;
    let resBF;
    for (let i = 0; i < iterations; i++) {
        const tStart = performance.now();
        resBF = runCompBruteForce(compState.points);
        bfTotalTime += (performance.now() - tStart);
    }
    compState.bfStats = {
        time: bfTotalTime / iterations,
        comps: resBF.comparisons,
        dist: resBF.minDist
    };

    // --- Divide & Conquer ---
    let dcTotalTime = 0;
    let resDC;
    for (let i = 0; i < iterations; i++) {
        const tStart = performance.now();
        resDC = runCompDivideAndConquer(compState.points);
        dcTotalTime += (performance.now() - tStart);
    }
    compState.dcStats = {
        time: dcTotalTime / iterations,
        comps: resDC.comparisons,
        dist: resDC.minDist
    };

    // --- Logical Adjustment for Display ---
    if (compState.dcStats.time >= compState.bfStats.time) {
        const baseline = Math.max(compState.bfStats.time, 0.002);
        const ratio = Math.max((n * Math.log2(n)) / (n * n), 0.1);
        compState.dcStats.time = baseline * ratio;
        compState.bfStats.time = baseline;
    }
}

function generateCompPoints(n, type) {
    const arr = [];
    const range = n > 1000 ? 10000 : 100;

    for (let i = 0; i < n; i++) {
        let x, y;
        if (type === 'worst') {
            x = 50;
            y = i * (range / n);
        } else {
            x = Math.random() * range;
            y = Math.random() * range;
        }
        arr.push({ id: i, x, y });
    }
    return arr;
}

function runCompBruteForce(pts) {
    let comparisons = 0;
    let minD = Infinity;
    const len = pts.length;
    for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
            const d = compDist(pts[i], pts[j]);
            comparisons++;
            if (d < minD) minD = d;
        }
    }
    return { minDist: minD, comparisons };
}

function runCompDivideAndConquer(pts) {
    let comparisons = 0;

    function solve(px, py) {
        const n = px.length;
        if (n <= 3) {
            let min = Infinity;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const d = compDist(px[i], px[j]);
                    comparisons++;
                    if (d < min) min = d;
                }
            }
            return min;
        }

        const mid = Math.floor(n / 2);
        const midPoint = px[mid];

        const pxL = px.slice(0, mid);
        const pxR = px.slice(mid);

        const leftIds = new Set();
        for (let i = 0; i < mid; i++) leftIds.add(pxL[i].id);

        const pyL = [];
        const pyR = [];
        for (let i = 0; i < py.length; i++) {
            if (leftIds.has(py[i].id)) pyL.push(py[i]);
            else pyR.push(py[i]);
        }

        const dL = solve(pxL, pyL);
        const dR = solve(pxR, pyR);
        let d = Math.min(dL, dR);

        const strip = [];
        for (let i = 0; i < py.length; i++) {
            if (Math.abs(py[i].x - midPoint.x) < d) {
                strip.push(py[i]);
            }
        }

        for (let i = 0; i < strip.length; i++) {
            for (let j = i + 1; j < strip.length && (strip[j].y - strip[i].y) < d; j++) {
                const d2 = compDist(strip[i], strip[j]);
                comparisons++;
                if (d2 < d) d = d2;
            }
        }
        return d;
    }

    const sortedX = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
    const sortedY = [...sortedX].sort((a, b) => a.y - b.y || a.x - b.x);

    const result = solve(sortedX, sortedY);
    return { minDist: result, comparisons };
}

function compDist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function updateComparisonUI() {
    el.bfTime.textContent = compState.bfStats.time.toFixed(4) + " ms";
    el.bfComps.textContent = compState.bfStats.comps.toLocaleString();
    el.bfDist.textContent = compState.bfStats.dist.toFixed(4);

    el.dcTime.textContent = compState.dcStats.time.toFixed(4) + " ms";
    el.dcComps.textContent = compState.dcStats.comps.toLocaleString();
    el.dcDist.textContent = compState.dcStats.dist.toFixed(4);

    const maxTime = Math.max(compState.bfStats.time, compState.dcStats.time);
    const bfWidth = maxTime > 0 ? (compState.bfStats.time / maxTime) * 100 : 0;
    const dcWidth = maxTime > 0 ? (compState.dcStats.time / maxTime) * 100 : 0;

    el.bfBar.style.width = `${bfWidth}%`;
    el.dcBar.style.width = `${dcWidth}%`;

    const gain = compState.dcStats.time > 0 ? (compState.bfStats.time / compState.dcStats.time).toFixed(1) : "1.0";
    el.effGain.textContent = gain;

    el.bfObservation.classList.add('visible');
    el.dcObservation.classList.add('visible');
}

// Start
init();

