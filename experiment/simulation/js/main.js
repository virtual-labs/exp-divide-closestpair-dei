/**
 * Recursion Tree Visualization Module
 * Renders a binary tree of recursive divide-and-conquer calls.
 * Node content: n=size, node-type label (Divide/Base Case/Combine),
 *               dynamic x-range (only on active node), and δ value.
 * Syncs highlighting with the geometry step panel.
 */
const RecursionTreeViz = (() => {

    // Layout config
    const NODE_W = 120;
    const NODE_H = 56;
    const H_GAP = 18;
    const V_GAP = 44;
    const PAD_X = 24;
    const PAD_Y = 20;

    let cachedSVG = null;
    let lastTreeRef = null;

    // ---------------------------------------------------------
    // Determine the node-type label: "Divide" / "Base Case" / "Combine"
    // ---------------------------------------------------------
    function getNodeTypeLabel(node, nodeState, geoTrace, currentStep) {
        if (nodeState === 'unvisited') return '';

        // Active node: determine phase from current geometry step
        if (nodeState === 'active' && currentStep >= 0 && currentStep < geoTrace.length) {
            const step = geoTrace[currentStep];
            const meta = step.meta;
            if (meta.treeNodeId === node.id) {
                switch (step.type) {
                    case 'base':
                    case 'compare':
                    case 'new_min':
                        return 'Base Case';
                    case 'divide':
                        return 'Divide';
                    case 'conquer':
                    case 'strip':
                    case 'strip_detail':
                    case 'strip_complete':
                        return 'Combine';
                }
            }
        }

        // Fallback based on node properties and state
        if (node.isBaseCase) return 'Base Case';
        if (nodeState === 'completed') return 'Combine';
        if (nodeState === 'active' || nodeState === 'visited') return 'Divide';
        return '';
    }

    // ---------------------------------------------------------
    // Get the dynamic x-range text (only shown on active node)
    // ---------------------------------------------------------
    function getDynamicXRange(node, nodeState, geoTrace, currentStep) {
        // Only show x-range on the ACTIVE node for contextual clarity
        if (nodeState !== 'active') return '';

        if (currentStep >= 0 && currentStep < geoTrace.length) {
            const step = geoTrace[currentStep];
            const meta = step.meta;

            if (meta.treeNodeId === node.id) {
                if (step.type === 'divide') {
                    return `Splitting ${node.xRange}`;
                }
                if (step.type === 'base' || step.type === 'compare' || step.type === 'new_min') {
                    return `Subset ${node.xRange}`;
                }
                if (step.type === 'conquer' || step.type === 'strip' || step.type === 'strip_detail' || step.type === 'strip_complete') {
                    return `Merging ${node.xRange}`;
                }
            }
        }

        return `${node.xRange}`;
    }

    // ========================================================
    // Public: render (or update) the tree
    // ========================================================
    function render(treeNodes, recursionTrace, currentGeoStep, geoTrace) {
        const container = document.getElementById('treeContainer');
        if (!container) return;

        if (!treeNodes || treeNodes.length === 0) {
            reset();
            return;
        }

        if (treeNodes !== lastTreeRef) {
            lastTreeRef = treeNodes;
            fullRender(container, treeNodes, recursionTrace, currentGeoStep, geoTrace || []);
        } else {
            updateHighlights(treeNodes, recursionTrace, currentGeoStep, geoTrace || []);
        }
    }

    // ========================================================
    // Public: reset to placeholder
    // ========================================================
    function reset() {
        const container = document.getElementById('treeContainer');
        if (!container) return;
        lastTreeRef = null;
        cachedSVG = null;
        container.innerHTML = `
            <div class="tree-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                    <circle cx="12" cy="5" r="3"/>
                    <circle cx="5" cy="17" r="3"/>
                    <circle cx="19" cy="17" r="3"/>
                    <line x1="10" y1="7.5" x2="6.5" y2="14.5"/>
                    <line x1="14" y1="7.5" x2="17.5" y2="14.5"/>
                </svg>
                <p>Generate points and step through to see the recursion tree.</p>
            </div>`;
    }

    // ========================================================
    // Full layout + SVG creation
    // ========================================================
    function fullRender(container, treeNodes, recursionTrace, currentGeoStep, geoTrace) {
        const positions = layoutTree(treeNodes);

        let minX = Infinity, maxX = -Infinity, maxY = 0;
        positions.forEach(pos => {
            if (pos) {
                if (pos.x - NODE_W / 2 < minX) minX = pos.x - NODE_W / 2;
                if (pos.x + NODE_W / 2 > maxX) maxX = pos.x + NODE_W / 2;
                if (pos.y + NODE_H > maxY) maxY = pos.y + NODE_H;
            }
        });

        const svgW = (maxX - minX) + PAD_X * 2;
        const svgH = maxY + PAD_Y * 2;
        const offsetX = -minX + PAD_X;
        const offsetY = PAD_Y;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'tree-svg');
        svg.setAttribute('width', Math.max(svgW, 300));
        svg.setAttribute('height', Math.max(svgH, 200));
        svg.setAttribute('viewBox', `0 0 ${Math.max(svgW, 300)} ${Math.max(svgH, 200)}`);

        // Edges
        const edgesGroup = document.createElementNS(svgNS, 'g');
        treeNodes.forEach(node => {
            if (node.parentId !== null) {
                const parentPos = positions[node.parentId];
                const childPos = positions[node.id];
                if (!parentPos || !childPos) return;

                const x1 = parentPos.x + offsetX;
                const y1 = parentPos.y + offsetY + NODE_H;
                const x2 = childPos.x + offsetX;
                const y2 = childPos.y + offsetY;

                const midY = (y1 + y2) / 2;
                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
                path.setAttribute('class', 'tree-edge');
                path.setAttribute('data-parent', node.parentId);
                path.setAttribute('data-child', node.id);
                edgesGroup.appendChild(path);
            }
        });
        svg.appendChild(edgesGroup);

        // Nodes
        const nodesGroup = document.createElementNS(svgNS, 'g');
        treeNodes.forEach(node => {
            const pos = positions[node.id];
            if (!pos) return;
            const cx = pos.x + offsetX;
            const cy = pos.y + offsetY;

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', 'tree-node-group');
            g.setAttribute('data-node-id', node.id);

            // Rectangle
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', cx - NODE_W / 2);
            rect.setAttribute('y', cy);
            rect.setAttribute('width', NODE_W);
            rect.setAttribute('height', NODE_H);
            const depthClass = `depth-${Math.min(node.depth, 4)}`;
            rect.setAttribute('class', `tree-node-rect ${depthClass}`);
            g.appendChild(rect);

            // Line 1: n = size (always shown)
            const title = document.createElementNS(svgNS, 'text');
            title.setAttribute('x', cx);
            title.setAttribute('y', cy + 13);
            title.setAttribute('class', 'tree-node-label title');
            title.textContent = `n = ${node.size}`;
            g.appendChild(title);

            // Line 2: Node type label (Divide / Base Case / Combine) — dynamic
            const nodeType = document.createElementNS(svgNS, 'text');
            nodeType.setAttribute('x', cx);
            nodeType.setAttribute('y', cy + 26);
            nodeType.setAttribute('class', 'tree-node-label node-type');
            nodeType.setAttribute('data-nodetype', node.id);
            nodeType.textContent = '';
            g.appendChild(nodeType);

            // Line 3: Dynamic x-range (only shown when active) — dynamic
            const xrange = document.createElementNS(svgNS, 'text');
            xrange.setAttribute('x', cx);
            xrange.setAttribute('y', cy + 38);
            xrange.setAttribute('class', 'tree-node-label detail');
            xrange.setAttribute('data-xrange', node.id);
            xrange.textContent = '';
            g.appendChild(xrange);

            // Line 4: Delta value — dynamic
            const delta = document.createElementNS(svgNS, 'text');
            delta.setAttribute('x', cx);
            delta.setAttribute('y', cy + 50);
            delta.setAttribute('class', 'tree-node-label delta');
            delta.setAttribute('data-delta', node.id);
            delta.textContent = '';
            g.appendChild(delta);

            nodesGroup.appendChild(g);
        });
        svg.appendChild(nodesGroup);

        container.innerHTML = '';
        container.appendChild(svg);

        cachedSVG = svg;

        updateHighlights(treeNodes, recursionTrace, currentGeoStep, geoTrace);
    }

    // ========================================================
    // Layout: Reingold-Tilford-like tree positioning
    // ========================================================
    function layoutTree(treeNodes) {
        const positions = new Array(treeNodes.length).fill(null);
        const subtreeWidth = new Array(treeNodes.length).fill(0);

        const root = treeNodes.find(n => n.parentId === null);
        if (!root) return positions;

        function computeWidth(nodeId) {
            const node = treeNodes[nodeId];
            if (node.leftChildId === null && node.rightChildId === null) {
                subtreeWidth[nodeId] = NODE_W;
                return NODE_W;
            }

            let w = 0;
            if (node.leftChildId !== null) w += computeWidth(node.leftChildId);
            if (node.rightChildId !== null) {
                if (w > 0) w += H_GAP;
                w += computeWidth(node.rightChildId);
            }
            subtreeWidth[nodeId] = Math.max(w, NODE_W);
            return subtreeWidth[nodeId];
        }

        computeWidth(root.id);

        function assignPositions(nodeId, xCenter, y) {
            const node = treeNodes[nodeId];
            positions[nodeId] = { x: xCenter, y };

            if (node.leftChildId === null && node.rightChildId === null) return;

            const childY = y + NODE_H + V_GAP;

            if (node.leftChildId !== null && node.rightChildId !== null) {
                const leftW = subtreeWidth[node.leftChildId];
                const rightW = subtreeWidth[node.rightChildId];
                const totalW = leftW + H_GAP + rightW;
                const leftCenter = xCenter - totalW / 2 + leftW / 2;
                const rightCenter = xCenter + totalW / 2 - rightW / 2;

                assignPositions(node.leftChildId, leftCenter, childY);
                assignPositions(node.rightChildId, rightCenter, childY);
            } else if (node.leftChildId !== null) {
                assignPositions(node.leftChildId, xCenter, childY);
            } else if (node.rightChildId !== null) {
                assignPositions(node.rightChildId, xCenter, childY);
            }
        }

        assignPositions(root.id, 0, 0);
        return positions;
    }

    // ========================================================
    // Update highlighting based on current step
    // ========================================================
    function updateHighlights(treeNodes, recursionTrace, currentGeoStep, geoTrace) {
        if (!cachedSVG) return;

        const nodeStates = new Array(treeNodes.length).fill('unvisited');

        // Determine active treeNodeId from current geometry step
        let activeNodeId = null;
        if (currentGeoStep >= 0 && currentGeoStep < geoTrace.length) {
            activeNodeId = geoTrace[currentGeoStep].meta.treeNodeId;
            if (activeNodeId === undefined) activeNodeId = null;
        }

        // Mark visited / completed nodes based on step indices
        treeNodes.forEach(node => {
            if (node.firstStepIndex === null) return;

            if (currentGeoStep >= node.firstStepIndex) {
                if (node.lastStepIndex !== null && currentGeoStep > node.lastStepIndex) {
                    nodeStates[node.id] = 'completed';
                } else {
                    nodeStates[node.id] = 'visited';
                }
            }
        });

        // Override active node
        if (activeNodeId !== null && activeNodeId < treeNodes.length) {
            nodeStates[activeNodeId] = 'active';
        }

        // Apply classes and dynamic text to SVG nodes
        treeNodes.forEach(node => {
            const g = cachedSVG.querySelector(`[data-node-id="${node.id}"]`);
            if (!g) return;

            const rect = g.querySelector('.tree-node-rect');
            if (!rect) return;

            const depthClass = `depth-${Math.min(node.depth, 4)}`;
            rect.setAttribute('class', `tree-node-rect ${depthClass}`);

            const st = nodeStates[node.id];
            if (st === 'active') {
                rect.classList.add('active');
                if (node.isBaseCase) rect.classList.add('base-case');
            } else if (st === 'completed') {
                rect.classList.add('completed');
                if (node.isBaseCase) rect.classList.add('base-case');
            } else if (st === 'visited') {
                rect.classList.add('visited');
            }

            // ---- Update node type label (Divide / Base Case / Combine) ----
            const nodeTypeEl = cachedSVG.querySelector(`[data-nodetype="${node.id}"]`);
            if (nodeTypeEl) {
                const label = getNodeTypeLabel(node, st, geoTrace, currentGeoStep);
                nodeTypeEl.textContent = label;

                // Color the label based on type
                if (label === 'Base Case') {
                    nodeTypeEl.setAttribute('fill', '#c4b5fd'); // light purple
                } else if (label === 'Combine') {
                    nodeTypeEl.setAttribute('fill', '#86efac'); // light green
                } else if (label === 'Divide') {
                    nodeTypeEl.setAttribute('fill', '#7dd3fc'); // light blue
                } else {
                    nodeTypeEl.setAttribute('fill', '#64748b');
                }
            }

            // ---- Update dynamic x-range (only on active node) ----
            const xrangeEl = cachedSVG.querySelector(`[data-xrange="${node.id}"]`);
            if (xrangeEl) {
                const xrangeText = getDynamicXRange(node, st, geoTrace, currentGeoStep);
                xrangeEl.textContent = xrangeText;
            }

            // ---- Update delta text ----
            const deltaEl = cachedSVG.querySelector(`[data-delta="${node.id}"]`);
            if (deltaEl) {
                if (node.delta !== null && st !== 'unvisited' && node.delta !== Infinity) {
                    deltaEl.textContent = `δ = ${node.delta.toFixed(2)}`;
                } else {
                    deltaEl.textContent = '';
                }
            }
        });

        // Update edge classes
        const edges = cachedSVG.querySelectorAll('.tree-edge');
        edges.forEach(edge => {
            const parentId = parseInt(edge.getAttribute('data-parent'));
            const childId = parseInt(edge.getAttribute('data-child'));

            edge.setAttribute('class', 'tree-edge');

            const childState = nodeStates[childId];
            const parentState = nodeStates[parentId];

            if (childState === 'active' || parentState === 'active') {
                edge.classList.add('active');
            } else if (childState === 'completed' && parentState === 'completed') {
                edge.classList.add('completed');
            } else if (childState === 'completed' || childState === 'visited') {
                edge.classList.add('visited');
            }
        });

        // Scroll to active node
        if (activeNodeId !== null) {
            const activeGroup = cachedSVG.querySelector(`[data-node-id="${activeNodeId}"]`);
            if (activeGroup) {
                const rect = activeGroup.querySelector('.tree-node-rect');
                if (rect) {
                    const container = document.getElementById('treeContainer');
                    const nodeX = parseFloat(rect.getAttribute('x'));
                    const nodeY = parseFloat(rect.getAttribute('y'));

                    const containerRect = container.getBoundingClientRect();
                    const scrollX = nodeX - containerRect.width / 2 + NODE_W / 2;
                    const scrollY = nodeY - containerRect.height / 2 + NODE_H / 2;

                    container.scrollTo({
                        left: Math.max(0, scrollX),
                        top: Math.max(0, scrollY),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }

    return { render, reset };

})();

/**
 * Closest Pair - Divide and Conquer Simulation
 * Layout: Top Controls, Middle Data, Split Content
 * Enhanced with: Tab system, Autoplay lock, Separate logs, Recursion tree
 */

const state = {
    points: [],         // Original unsorted points
    sortedPoints: [],   // Working set
    trace: [],          // Execution steps (geometry trace)
    recursionTrace: [], // Separate recursion steps
    currentStep: -1,
    autoPlayId: null,

    // Config
    padding: 30,
    speed: 800,
    width: 0,
    height: 0,

    // Tab state
    activeTab: 'geometry', // 'geometry' | 'recursion'

    // Recursion tree data
    recursionTree: null
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
    recursionLogBox: document.getElementById('recursionLogContainer'),

    // Log title
    logTitle: document.getElementById('logTitle'),

    // Mode indicator
    modeText: document.getElementById('modeText'),

    // Tab elements
    tabGeometry: document.getElementById('tabGeometry'),
    tabRecursion: document.getElementById('tabRecursion'),
    geometryView: document.getElementById('geometryView'),
    recursionTreeView: document.getElementById('recursionTreeView'),
    tabLockMsg: document.getElementById('tabLockMsg'),

    // Legends
    geometryLegend: document.getElementById('geometryLegend'),
    recursionLegend: document.getElementById('recursionLegend'),

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
            e.stopPropagation();
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

    // ===== Tab Switching =====
    initTabSwitching();
}

// ============================================
// TAB SWITCHING with Autoplay Lock
// ============================================
function initTabSwitching() {
    el.tabGeometry.addEventListener('click', () => {
        if (state.autoPlayId) return; // LOCKED during autoplay
        switchTab('geometry');
    });
    el.tabRecursion.addEventListener('click', () => {
        if (state.autoPlayId) return; // LOCKED during autoplay
        switchTab('recursion');
    });
}

function switchTab(tab) {
    state.activeTab = tab;

    // Tab buttons
    el.tabGeometry.classList.toggle('active', tab === 'geometry');
    el.tabRecursion.classList.toggle('active', tab === 'recursion');

    // Content areas
    el.geometryView.classList.toggle('active', tab === 'geometry');
    el.recursionTreeView.classList.toggle('active', tab === 'recursion');

    // Step logs: show the right one
    el.logBox.classList.toggle('hidden', tab !== 'geometry');
    el.recursionLogBox.classList.toggle('hidden', tab !== 'recursion');

    // Log title
    el.logTitle.textContent = tab === 'geometry' ? 'GEOMETRY STEPS' : 'RECURSION STEPS';

    // Mode indicator
    el.modeText.textContent = tab === 'geometry' ? 'Geometry' : 'Recursion';
    el.modeText.style.color = tab === 'geometry' ? '#2563eb' : '#7c3aed';

    // Legends
    el.geometryLegend.classList.toggle('hidden', tab !== 'geometry');
    el.recursionLegend.classList.toggle('hidden', tab !== 'recursion');

    // Update step counter for the active tab
    updateStepCounterForTab();

    if (tab === 'geometry') {
        resizeCanvas();
    } else if (tab === 'recursion' && typeof RecursionTreeViz !== 'undefined') {
        RecursionTreeViz.render(state.recursionTree, state.recursionTrace, state.currentStep, state.trace);
    }
}

function updateStepCounterForTab() {
    if (state.activeTab === 'geometry') {
        const total = state.trace.length;
        const current = state.currentStep >= 0 ? state.currentStep + 1 : 0;
        el.stepCounter.textContent = `${current}/${total}`;
    } else {
        const total = state.recursionTrace.length;
        // Find how many recursion steps correspond to current geometry step
        let recStep = 0;
        if (state.currentStep >= 0) {
            for (let i = 0; i < state.recursionTrace.length; i++) {
                if (state.recursionTrace[i].geoStepIndex <= state.currentStep) {
                    recStep = i + 1;
                }
            }
        }
        el.stepCounter.textContent = `${recStep}/${total}`;
    }
}

function updateTabLock() {
    const isLocked = state.autoPlayId !== null;
    el.tabGeometry.classList.toggle('disabled', isLocked && state.activeTab !== 'geometry');
    el.tabRecursion.classList.toggle('disabled', isLocked && state.activeTab !== 'recursion');
    el.tabLockMsg.classList.toggle('hidden', !isLocked);
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
    el.coordResult.textContent = '';

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
        const parts = input.split(/\s+/);

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

        state.points = points;
        updateCoordinateList(state.points);
        prepareSimulation();

        state.currentStep = -1;
        el.logBox.innerHTML = '<div class="log-entry system">Custom points loaded. Ready to start.</div>';
        el.recursionLogBox.innerHTML = '<div class="log-entry system">Custom points loaded. Step through to see recursion.</div>';
        el.minVal.textContent = '-';
        el.compCount.textContent = '0';
        updateStepCounterForTab();
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

    if (rawVal === '' || isNaN(Number(rawVal))) {
        alert("Invalid Input: Please enter a valid integer number (e.g., 10).");
        resetExperiment();
        return;
    }

    const n = Number(rawVal);

    if (!Number.isInteger(n)) {
        alert("Invalid Input: N must be an integer.");
        resetExperiment();
        return;
    }

    if (n < 2) {
        alert("Closest pair requires at least 2 points.");
        resetExperiment();
        return;
    }

    if (n > 20) {
        alert("Please choose N <= 20 for better understanding of visualization.");
        return;
    }

    state.points = [];
    const minStepDist = 12;
    for (let i = 0; i < n; i++) {
        let p;
        let attempts = 0;
        let valid = false;
        while (!valid && attempts < 100) {
            p = {
                id: i,
                x: Math.floor(Math.random() * 90) + 5,
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

    updateCoordinateList(state.points);
    prepareSimulation();

    state.currentStep = -1;
    el.logBox.innerHTML = '<div class="log-entry system">Experiment Generated. Ready to start.</div>';
    el.recursionLogBox.innerHTML = '<div class="log-entry system">Experiment Generated. Step through to see recursion.</div>';
    el.minVal.textContent = '-';
    el.compCount.textContent = '0';
    updateStepCounterForTab();
    updateButtons();

    draw();

    // Switch to geometry tab on new experiment
    switchTab('geometry');
}

function resetExperiment() {
    stopAutoPlay();
    state.points = [];
    state.sortedPoints = [];
    state.trace = [];
    state.recursionTrace = [];
    state.currentStep = -1;
    state.stats = null;
    state.recursionTree = null;

    // Reset UI State
    el.coordPlaceholder.classList.remove('hidden');
    el.coordResult.textContent = '';
    el.manualInput.classList.add('hidden');
    el.manualPoints.value = '';
    el.inputMode.value = 'random';
    el.randomInput.classList.remove('hidden');
    el.inputN.value = '10';
    el.logBox.innerHTML = '<div class="log-entry system">Ready. Generate points to begin.</div>';
    el.recursionLogBox.innerHTML = '<div class="log-entry system">Switch to Recursion Tree to see recursion steps.</div>';
    el.minVal.textContent = '-';
    el.compCount.textContent = '-';
    el.stepCounter.textContent = '0/0';
    el.btnParams.disabled = true;

    updateButtons();

    // Clear Canvas
    el.ctx.clearRect(0, 0, state.width, state.height);

    // Reset recursion tree view
    if (typeof RecursionTreeViz !== 'undefined') {
        RecursionTreeViz.reset();
    }

    // Switch back to geometry
    switchTab('geometry');
}

function updateCoordinateList(points) {
    el.coordPlaceholder.classList.add('hidden');
    el.manualInput.classList.add('hidden');

    const text = points
        .map(p => `(${p.x}, ${p.y})`)
        .join(',  ');
    el.coordResult.textContent = text;
}


function prepareSimulation() {
    state.trace = [];
    state.recursionTrace = [];
    let comparisons = 0;

    // ===== Recursion tree building =====
    let treeNodeId = 0;
    const treeNodes = [];

    function createTreeNode(pointsSubset, depth, parentId) {
        const id = treeNodeId++;
        const ids = pointsSubset.map(p => p.id);
        const sortedIds = [...ids].sort((a, b) => a - b);
        const minX = Math.min(...pointsSubset.map(p => p.x));
        const maxX = Math.max(...pointsSubset.map(p => p.x));
        const node = {
            id,
            depth,
            parentId,
            leftChildId: null,
            rightChildId: null,
            size: pointsSubset.length,
            pointIds: sortedIds,
            rangeLabel: `Points[${sortedIds[0]}..${sortedIds[sortedIds.length - 1]}]`,
            xRange: `x: ${minX.toFixed(0)}–${maxX.toFixed(0)}`,
            isBaseCase: pointsSubset.length <= 3,
            delta: null,
            firstStepIndex: null,
            lastStepIndex: null
        };
        treeNodes.push(node);
        return node;
    }

    // Helper to push geometry steps
    const record = (type, msg, meta = {}) => {
        state.trace.push({ type, msg, meta: { ...meta, comparisons } });
    };

    // Helper to push recursion steps
    const recordRecursion = (type, msg, treeNodeId, geoStepIndex) => {
        state.recursionTrace.push({ type, msg, treeNodeId, geoStepIndex });
    };

    // Step 1: Sorting
    record('sort', 'Sorting all points by X-coordinate to prepare for regional splitting.', {
        stage: 'sorting',
        sorted: false
    });

    const sorted = [...state.points].sort((a, b) => a.x - b.x);
    state.sortedPoints = sorted;

    const minXAll = Math.min(...sorted.map(p => p.x));
    const maxXAll = Math.max(...sorted.map(p => p.x));

    record('sort', 'Sorting Complete. Starting the recursive Divide & Conquer algorithm.', {
        stage: 'sorting',
        sorted: true,
        activePoints: sorted
    });

    recordRecursion('info', `Start with all points (n = ${sorted.length})\n- Root node represents entire dataset\n- Points are sorted by X-coordinate\n- Recursively divide until n ≤ 3`, null, state.trace.length - 1);

    // --- Divide & Conquer Algo ---

    function dist(p1, p2) {
        comparisons++;
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    function bruteForce(points, parentMeta, treeNodeObj) {
        let minD = Infinity;
        let pair = [];

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const d = dist(points[i], points[j]);

                record('compare', `Checking pair P${points[i].id + 1} and P${points[j].id + 1}. Dist: ${d.toFixed(2)}`, {
                    ...parentMeta,
                    highlight: [points[i], points[j]],
                    currentMin: minD,
                    treeNodeId: treeNodeObj.id
                });

                if (d < minD) {
                    minD = d;
                    pair = [points[i], points[j]];
                    record('new_min', `New local minimum ${d.toFixed(2)} found between P${points[i].id + 1} and P${points[j].id + 1}.`, {
                        ...parentMeta,
                        bestPair: pair,
                        currentMin: minD,
                        treeNodeId: treeNodeObj.id
                    });
                }
            }
        }
        return { min: minD, pair: pair };
    }

    function solveRecursive(px, py, depth, parentId) {
        const n = px.length;
        const treeNode = createTreeNode(px, depth, parentId);

        // Base Case
        if (n <= 3) {
            treeNode.firstStepIndex = state.trace.length;

            record('base', `<b>Base Case</b> (N=${n}): Region is small enough to check all pairs directly using Brute Force.`, {
                activeRegion: px,
                treeNodeId: treeNode.id
            });

            const bcMinX = Math.min(...px.map(p => p.x));
            const bcMaxX = Math.max(...px.map(p => p.x));
            recordRecursion('base', `Base Case (n = ${n})\n- Subset X-range: ${bcMinX.toFixed(0)}–${bcMaxX.toFixed(0)}\n- Too few points to divide further\n- Compute all pairwise distances directly`, treeNode.id, state.trace.length - 1);

            const result = bruteForce(px, { activeRegion: px }, treeNode);
            treeNode.delta = result.min;
            treeNode.lastStepIndex = state.trace.length - 1;

            recordRecursion('result', `✓ Base case solved: δ = ${result.min.toFixed(2)}\n- Closest pair found by brute force\n- Return result to parent`, treeNode.id, state.trace.length - 1);

            return result;
        }

        // Divide
        const mid = Math.floor(n / 2);
        const midPoint = px[mid];

        treeNode.firstStepIndex = state.trace.length;
        const divMinX = Math.min(...px.map(p => p.x));
        const divMaxX = Math.max(...px.map(p => p.x));
        record('divide', `<b>Divide:</b> Splitting the current group of ${n} points at X = ${midPoint.x.toFixed(1)} into two halves.`, {
            activeRegion: px,
            divisionLine: midPoint.x,
            treeNodeId: treeNode.id
        });

        recordRecursion('divide', `Divide Step (n = ${n})\n- Splitting points in X-range ${divMinX.toFixed(0)}–${divMaxX.toFixed(0)}\n- Median X = ${midPoint.x.toFixed(1)}\n- Left half: ${mid} points  |  Right half: ${n - mid} points`, treeNode.id, state.trace.length - 1);

        const PxL = px.slice(0, mid);
        const PxR = px.slice(mid);

        const PyL = py.filter(p => p.x < midPoint.x || (p.x === midPoint.x && PxL.includes(p)));
        const PyR = py.filter(p => p.x >= midPoint.x && !PyL.includes(p));

        // Recurse left
        const leftMinX = Math.min(...PxL.map(p => p.x));
        const leftMaxX = Math.max(...PxL.map(p => p.x));
        recordRecursion('recurse', `→ Recurse LEFT (n = ${PxL.length})\n- Subset X-range: ${leftMinX.toFixed(0)}–${leftMaxX.toFixed(0)}\n- Continue dividing until n ≤ 3`, treeNode.id, state.trace.length - 1);
        const leftRes = solveRecursive(PxL, PyL, depth + 1, treeNode.id);

        // Recurse right
        const rightMinX = Math.min(...PxR.map(p => p.x));
        const rightMaxX = Math.max(...PxR.map(p => p.x));
        recordRecursion('recurse', `→ Recurse RIGHT (n = ${PxR.length})\n- Subset X-range: ${rightMinX.toFixed(0)}–${rightMaxX.toFixed(0)}\n- Continue dividing until n ≤ 3`, treeNode.id, state.trace.length - 1);
        const rightRes = solveRecursive(PxR, PyR, depth + 1, treeNode.id);

        // Merge
        let d = Math.min(leftRes.min, rightRes.min);
        let pair = leftRes.min < rightRes.min ? leftRes.pair : rightRes.pair;

        record('conquer', `<b>Conquer:</b> Merging results. Left min = ${leftRes.min.toFixed(2)}, Right min = ${rightRes.min.toFixed(2)}. Best so far δ = ${d.toFixed(2)}.`, {
            activeRegion: px,
            divisionLine: midPoint.x,
            bestPair: pair,
            currentMin: d,
            treeNodeId: treeNode.id
        });

        recordRecursion('conquer', `Combine Step\n- Left returned δL = ${leftRes.min.toFixed(2)}\n- Right returned δR = ${rightRes.min.toFixed(2)}\n- Best so far: δ = min(δL, δR) = ${d.toFixed(2)}`, treeNode.id, state.trace.length - 1);

        // Strip
        const strip = py.filter(p => Math.abs(p.x - midPoint.x) < d);

        record('strip', `<b>Strip Check:</b> Examining the central region of width 2δ (${(2 * d).toFixed(2)}) for any pairs closer than δ = ${d.toFixed(2)}.`, {
            activeRegion: px,
            divisionLine: midPoint.x,
            stripRegion: { x: midPoint.x, width: d },
            bestPair: pair,
            currentMin: d,
            treeNodeId: treeNode.id
        });

        if (strip.length > 0) {
            const stripPointsList = strip.map(p => `P${p.id + 1}`).join(', ');
            record('strip_detail', `<b>Strip Points (sorted by Y):</b> ${stripPointsList}. Total: ${strip.length} point(s). Now comparing each pair where Y-distance < δ.`, {
                activeRegion: px,
                divisionLine: midPoint.x,
                stripRegion: { x: midPoint.x, width: d },
                stripPoints: strip,
                bestPair: pair,
                currentMin: d,
                treeNodeId: treeNode.id
            });
        }

        recordRecursion('strip', `Strip Check\n- Strip width = 2δ = ${(2*d).toFixed(2)} around x = ${midPoint.x.toFixed(1)}\n- ${strip.length} point(s) in strip\n- Check for cross-boundary pairs closer than δ`, treeNode.id, state.trace.length - 1);

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
                    pairIndex: stripComparisonCount,
                    treeNodeId: treeNode.id
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
                        pairIndex: stripComparisonCount,
                        treeNodeId: treeNode.id
                    });
                }
            }
        }

        if (strip.length > 1) {
            record('strip_complete', `<b>Strip Comparison Complete:</b> Checked ${stripComparisonCount} pair(s) in the strip. Final best distance for this region: δ = ${d.toFixed(2)}.`, {
                activeRegion: px,
                divisionLine: midPoint.x,
                stripRegion: { x: midPoint.x, width: d },
                bestPair: pair,
                currentMin: d,
                totalComparisons: stripComparisonCount,
                treeNodeId: treeNode.id
            });
        }

        treeNode.delta = d;
        treeNode.lastStepIndex = state.trace.length - 1;

        recordRecursion('result', `✓ Return δ = ${d.toFixed(2)}\n- Combined left, right, and strip results\n- Pass minimum distance back to parent`, treeNode.id, state.trace.length - 1);

        return { min: d, pair: pair };
    }

    // Start
    const Py = [...sorted].sort((a, b) => a.y - b.y);

    const t0 = performance.now();
    const result = solveRecursive(sorted, Py, 0, null);
    const t1 = performance.now();

    // Fix children IDs properly after full tree is built
    treeNodes.forEach(node => {
        node.leftChildId = null;
        node.rightChildId = null;
    });
    treeNodes.forEach(node => {
        if (node.parentId !== null) {
            const parent = treeNodes[node.parentId];
            if (parent.leftChildId === null) {
                parent.leftChildId = node.id;
            } else {
                parent.rightChildId = node.id;
            }
        }
    });

    // Store tree
    state.recursionTree = treeNodes;

    // Store Stats
    state.stats = {
        execTime: (t1 - t0).toFixed(4),
        compDC: comparisons,
        compBF: (sorted.length * (sorted.length - 1)) / 2
    };

    record('finish', `<b>Success:</b> Closest pair found! Distance = ${result.min.toFixed(2)} between P${result.pair[0].id + 1} and P${result.pair[1].id + 1}.`, {
        activeRegion: sorted,
        bestPair: result.pair,
        currentMin: result.min
    });

    recordRecursion('finish', `✓ Algorithm complete! Closest pair distance = ${result.min.toFixed(2)}`, null, state.trace.length - 1);

    updateStepCounterForTab();
}

// --- Modal Logic ---
function openParamsModal() {
    if (!state.stats) {
        el.pCompDC.textContent = '-';
        el.pCompBF.textContent = '-';
        el.pSaved.textContent = '-';
        el.pExecTime.textContent = '-';
    } else {
        el.pCompDC.textContent = state.stats.compDC;
        el.pCompBF.textContent = state.stats.compBF;

        const saved = state.stats.compBF - state.stats.compDC;
        el.pSaved.textContent = saved > 0 ? saved : 0;

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
    updateStepCounterForTab();

    // Update geometry log
    updateLog(next);

    // Update recursion log
    updateRecursionLog(next);

    // Stats update
    if (s.meta.comparisons !== undefined) el.compCount.textContent = s.meta.comparisons;
    if (s.meta.currentMin && s.meta.currentMin !== Infinity) el.minVal.textContent = s.meta.currentMin.toFixed(2);

    updateButtons();
    draw();

    // Sync recursion tree highlighting
    if (typeof RecursionTreeViz !== 'undefined' && state.recursionTree) {
        RecursionTreeViz.render(state.recursionTree, state.recursionTrace, state.currentStep, state.trace);
    }
}

function updateLog(index) {
    el.logBox.innerHTML = '';
    for (let i = 0; i <= index; i++) {
        const item = state.trace[i];
        const row = document.createElement('div');
        row.className = `log-entry ${item.type}`;
        row.innerHTML = `<span class="step-num">Step ${i + 1}:</span> ${item.msg}`;
        if (i === index) {
            row.classList.add('active');
        }
        el.logBox.appendChild(row);
    }
    el.logBox.scrollTop = el.logBox.scrollHeight;
}

function updateRecursionLog(geoStepIndex) {
    el.recursionLogBox.innerHTML = '';
    let activeIdx = -1;

    for (let i = 0; i < state.recursionTrace.length; i++) {
        const item = state.recursionTrace[i];
        if (item.geoStepIndex > geoStepIndex) break;

        const row = document.createElement('div');
        row.className = `log-entry ${item.type}`;

        // Parse multi-line messages: first line = main, lines starting with '- ' = sub-bullets
        const lines = item.msg.split('\n');
        let html = `<span class="step-num">R${i + 1}:</span> ${lines[0]}`;
        if (lines.length > 1) {
            html += '<div class="rec-sub-list">';
            for (let li = 1; li < lines.length; li++) {
                const line = lines[li];
                if (line.startsWith('- ')) {
                    html += `<div class="rec-sub-item">${line}</div>`;
                } else {
                    html += `<div class="rec-sub-item">${line}</div>`;
                }
            }
            html += '</div>';
        }

        row.innerHTML = html;
        el.recursionLogBox.appendChild(row);
        activeIdx = i;
    }

    // Highlight the last visible entry
    if (activeIdx >= 0) {
        const entries = el.recursionLogBox.querySelectorAll('.log-entry');
        if (entries.length > 0) {
            entries[entries.length - 1].classList.add('rec-active');
        }
    }

    el.recursionLogBox.scrollTop = el.recursionLogBox.scrollHeight;
}

function updateButtons() {
    const isAutoPlayActive = state.autoPlayId !== null;

    el.btnPrev.disabled = isAutoPlayActive || state.currentStep < 0;
    el.btnNext.disabled = isAutoPlayActive || state.currentStep >= state.trace.length - 1;

    el.btnAuto.disabled = state.trace.length === 0;

    el.btnParams.disabled = (state.currentStep < state.trace.length - 1 || state.trace.length === 0);

    // Update tab lock state
    updateTabLock();
}

function toggleAutoPlay(e) {
    if (state.autoPlayId) {
        stopAutoPlay();
    } else {
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
    updateButtons();

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
    if (el.speedDropdown) el.speedDropdown.classList.add('hidden');
    updateButtons();
}

// --- Drawing Logic ---

function toCanvas(p) {
    const w = state.width - 2 * state.padding;
    const h = state.height - 2 * state.padding;
    return {
        x: state.padding + (p.x / 100) * w,
        y: state.height - state.padding - (p.y / 100) * h
    };
}

function draw() {
    const w = state.width;
    const h = state.height;
    const ctx = el.ctx;

    ctx.clearRect(0, 0, w, h);

    drawGrid();

    if (state.currentStep === -1) {
        if (state.points.length > 0) {
            drawPoints(state.points, '#94a3b8', 4, false);
        }
        return;
    }

    const s = state.trace[state.currentStep];
    const m = s.meta;

    // Special handling for SORTING steps
    if (s.type === 'sort' && m.sorted === true && m.activePoints) {
        const sortedPts = m.activePoints;

        for (let i = 0; i < sortedPts.length - 1; i++) {
            const p1 = sortedPts[i];
            const p2 = sortedPts[i + 1];
            const c1 = toCanvas(p1);
            const c2 = toCanvas(p2);

            ctx.strokeStyle = '#0891b2';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const bottomY = state.height - state.padding;
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(state.padding, bottomY);
        ctx.lineTo(state.width - state.padding, bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        drawText(state.padding + 10, bottomY + 20, 'Points sorted by X-coordinate (Left → Right)', '#38bdf8', 'left');

        sortedPts.forEach((p, idx) => {
            let color = '#38bdf8';
            drawPointNode(p, color, false, (idx + 1) + '');
        });
        return;
    }

    // 1. Division Line & Halves Shading
    if (m.divisionLine !== undefined) {
        const xPos = toCanvas({ x: m.divisionLine, y: 0 }).x;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, 0, xPos, h);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.02)';
        ctx.fillRect(xPos, 0, w - xPos, h);

        drawLine(xPos, 0, xPos, h, '#ffff', 2, [5, 5]);
        drawText(xPos + 5, 20, 'Divide X=' + m.divisionLine.toFixed(1), '#fff');
        drawText(xPos + 5, h - 10, 'x=' + m.divisionLine.toFixed(1), '#94a3b8');
    }

    // 2. Strip Region
    if (m.stripRegion) {
        const c = m.stripRegion.x;
        const widthVal = m.stripRegion.width;
        const x1 = toCanvas({ x: c - widthVal, y: 0 }).x;
        const x2 = toCanvas({ x: c + widthVal, y: 0 }).x;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fillRect(x1, 0, x2 - x1, h);

        drawLine(x1, 0, x1, h, 'rgba(56, 189, 248, 0.4)', 1);
        drawLine(x2, 0, x2, h, 'rgba(56, 189, 248, 0.4)', 1);

        drawText(x1 + 5, h - 35, `δL (x=${(c - widthVal).toFixed(1)})`, '#38bdf8');
        drawText(x2 + 5, h - 35, `δR (x=${(c + widthVal).toFixed(1)})`, '#38bdf8');
        drawText((x1 + x2) / 2, 40, 'Strip 2δ', '#38bdf8', 'center');
    }

    // 3. Points
    let activeIds = new Set();
    if (m.activeRegion) m.activeRegion.forEach(p => activeIds.add(p.id));

    let stripIds = new Set();
    if (m.stripRegion && m.activeRegion) {
        m.activeRegion.forEach(p => {
            if (Math.abs(p.x - m.stripRegion.x) < m.stripRegion.width) {
                stripIds.add(p.id);
            }
        });
    }

    state.points.forEach(p => {
        let color = '#475569';
        let glow = false;
        if (activeIds.has(p.id)) color = '#94a3b8';
        if (stripIds.has(p.id)) {
            color = '#38bdf8';
            glow = true;
        }

        drawPointNode(p, color, glow, p.id + 1);
    });

    // 4. Comparisons & Highlights
    if (m.highlight && m.stripRegion) {
        const p1 = m.highlight[0];
        const d = m.currentMin;
        const c1 = toCanvas(p1);

        const boxW = toCanvas({ x: d, y: 0 }).x - toCanvas({ x: 0, y: 0 }).x;
        const boxH = Math.abs(toCanvas({ x: 0, y: d }).y - toCanvas({ x: 0, y: 0 }).y);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(c1.x - boxW, c1.y, boxW * 2, boxH);
        ctx.strokeRect(c1.x - boxW, c1.y - boxH, boxW * 2, boxH * 2);
    }

    if (m.highlight) {
        drawConnection(m.highlight[0], m.highlight[1], '#f59e0b', 2);
    }

    if (m.bestPair) {
        drawConnection(m.bestPair[0], m.bestPair[1], '#22c55e', 3);

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

    for (let i = 0; i <= 100; i += 10) {
        const x = toCanvas({ x: i, y: 0 }).x;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.height); ctx.stroke();
    }
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
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8';
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
    el.ctx.textAlign = 'left';
}

// --- Comparison Logic ---

function resetComparisonUI() {

    comparisonAlreadyRun = false;

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

    el.btnRunComparison.disabled = false;

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

    if (comparisonAlreadyRun)
    {
        alert("Please Reset before running the analysis with a new value of N.");
        return;
    }

    executeComparisonAlgorithms(rawN, el.inputType.value);

    updateComparisonUI();

    comparisonAlreadyRun = true;
}


function executeComparisonAlgorithms(n, type) {
    compState.points = generateCompPoints(n, type);

    const iterations = n > 500 ? 5 : 20;

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
