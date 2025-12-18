// State
let points = [];
let lines = [];
let fills = []; // Array of { pointIds: [...], color: '...' }
let currentMode = 'add'; // 'add', 'move', 'connect', 'delete', 'fill', 'select'
let currentColor = '#3b82f6';
let linesVisible = true;
let selectedGroup = new Set(); // Set of point IDs in the current selection group
let isGroupDragging = false;
let groupDragStart = { x: 0, y: 0 };

// Zoom and pan state
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;
let selectedPoint = null;
let draggedPoint = null;
let dragOffset = { x: 0, y: 0 };
let tempLine = null;
let pointIdCounter = 0;
let pointsVisible = true;

// Undo/Redo history
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 50;

// LocalStorage key
const STORAGE_KEY = 'whiteboard_state';

// DOM Elements
const whiteboard = document.getElementById('whiteboard');
const pointsLayer = document.getElementById('pointsLayer');
const fillsLayer = document.getElementById('fillsLayer');
const linesLayer = document.getElementById('linesLayer');
const statusText = document.getElementById('statusText');
const addModeBtn = document.getElementById('addMode');
const moveModeBtn = document.getElementById('moveMode');
const connectModeBtn = document.getElementById('connectMode');
const deleteModeBtn = document.getElementById('deleteMode');
const fillModeBtn = document.getElementById('fillMode');
const selectModeBtn = document.getElementById('selectMode');
const colorPicker = document.getElementById('colorPicker');
const showLinesCheckbox = document.getElementById('showLines');

// Group operation buttons
const groupOpsContainer = document.getElementById('groupOps');
const moveGroupBtn = document.getElementById('moveGroup');
const duplicateGroupBtn = document.getElementById('duplicateGroup');
const flipHGroupBtn = document.getElementById('flipHGroup');
const flipVGroupBtn = document.getElementById('flipVGroup');
const mergePointsBtn = document.getElementById('mergePoints');
const deleteGroupBtn = document.getElementById('deleteGroup');
const clearSelectionBtn = document.getElementById('clearSelection');

// Zoom controls
const transformGroup = document.getElementById('transformGroup');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const zoomLevelDisplay = document.getElementById('zoomLevel');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearAllBtn = document.getElementById('clearAll');
const downloadSvgBtn = document.getElementById('downloadSvg');
const importSvgBtn = document.getElementById('importSvg');
const svgFileInput = document.getElementById('svgFileInput');
const showPointsCheckbox = document.getElementById('showPoints');

// Initialize
function init() {
    loadState();
    setupEventListeners();
    updateStatus();
    updateUndoButton();
}

// Event Listeners
function setupEventListeners() {
    // Mode buttons
    addModeBtn.addEventListener('click', () => setMode('add'));
    moveModeBtn.addEventListener('click', () => setMode('move'));
    connectModeBtn.addEventListener('click', () => setMode('connect'));
    deleteModeBtn.addEventListener('click', () => setMode('delete'));
    fillModeBtn.addEventListener('click', () => setMode('fill'));
    selectModeBtn.addEventListener('click', () => setMode('select'));
    colorPicker.addEventListener('input', handleColorChange);
    showLinesCheckbox.addEventListener('change', toggleLinesVisibility);
    
    // Group operation listeners
    moveGroupBtn.addEventListener('mousedown', startGroupDrag);
    duplicateGroupBtn.addEventListener('click', duplicateGroup);
    flipHGroupBtn.addEventListener('click', () => flipGroup('horizontal'));
    flipVGroupBtn.addEventListener('click', () => flipGroup('vertical'));
    mergePointsBtn.addEventListener('click', mergePoints);
    deleteGroupBtn.addEventListener('click', deleteGroup);
    clearSelectionBtn.addEventListener('click', clearSelection);
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => zoomBy(ZOOM_STEP));
    zoomOutBtn.addEventListener('click', () => zoomBy(-ZOOM_STEP));
    zoomResetBtn.addEventListener('click', resetZoom);
    whiteboard.addEventListener('wheel', handleWheel, { passive: false });
    
    // Pan with middle mouse or space+drag
    whiteboard.addEventListener('mousedown', handlePanStart);
    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup', handlePanEnd);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    clearAllBtn.addEventListener('click', clearAll);
    downloadSvgBtn.addEventListener('click', downloadSvg);
    importSvgBtn.addEventListener('click', () => svgFileInput.click());
    svgFileInput.addEventListener('change', handleSvgImport);
    showPointsCheckbox.addEventListener('change', togglePointsVisibility);

    // Whiteboard events
    whiteboard.addEventListener('click', handleWhiteboardClick);
    whiteboard.addEventListener('mousedown', handleMouseDown);
    whiteboard.addEventListener('mousemove', handleMouseMove);
    whiteboard.addEventListener('mouseup', handleMouseUp);
    whiteboard.addEventListener('mouseleave', handleMouseUp);
    whiteboard.addEventListener('contextmenu', handleRightClick);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

// LocalStorage
function saveState() {
    const state = {
        points,
        lines,
        fills,
        pointIdCounter,
        pointsVisible,
        linesVisible,
        currentMode,
        currentColor,
        undoStack,
        redoStack,
        zoom,
        panX,
        panY
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            points = state.points || [];
            lines = state.lines || [];
            fills = state.fills || [];
            pointIdCounter = state.pointIdCounter || 0;
            pointsVisible = state.pointsVisible !== undefined ? state.pointsVisible : true;
            linesVisible = state.linesVisible !== undefined ? state.linesVisible : true;
            currentColor = state.currentColor || '#3b82f6';
            undoStack = state.undoStack || [];
            redoStack = state.redoStack || [];
            
            // Render loaded state
            points.forEach(point => renderPoint(point));
            lines.forEach(line => renderLine(line));
            fills.forEach(fill => renderFill(fill));
            
            // Update checkboxes
            showPointsCheckbox.checked = pointsVisible;
            pointsLayer.classList.toggle('hidden', !pointsVisible);
            showLinesCheckbox.checked = linesVisible;
            linesLayer.classList.toggle('hidden', !linesVisible);
            
            // Update color picker
            colorPicker.value = currentColor;
            
            // Restore selected mode
            if (state.currentMode) {
                setMode(state.currentMode);
            }
            
            // Update undo/redo button states
            updateUndoRedoButtons();
            
            // Restore zoom/pan
            if (state.zoom !== undefined) zoom = state.zoom;
            if (state.panX !== undefined) panX = state.panX;
            if (state.panY !== undefined) panY = state.panY;
            updateTransform();
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
}

// Undo/Redo System
function pushUndo(action) {
    undoStack.push(action);
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }
    // Clear redo stack when a new action is performed
    redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    
    // Clear selection before modifying state
    if (selectedGroup.size > 0) {
        clearSelection();
    }
    
    const action = undoStack.pop();
    redoStack.push(action);
    
    switch (action.type) {
        case 'addPoint':
            // Remove the point that was added
            removePointWithoutUndo(action.point.id);
            break;
            
        case 'deletePoint':
            // Restore the point
            points.push(action.point);
            renderPoint(action.point);
            // Restore connected lines
            action.lines.forEach(line => {
                lines.push(line);
                renderLine(line);
            });
            // Restore fills
            if (action.fills) {
                action.fills.forEach(fill => {
                    fills.push({ ...fill, pointIds: [...fill.pointIds] });
                    renderFill(fill);
                });
            }
            break;
            
        case 'addLine':
            // Remove the line that was added
            removeLineWithoutUndo(action.line);
            break;
            
        case 'deleteLine':
            // Restore the line
            lines.push(action.line);
            renderLine(action.line);
            // Restore any fills that were removed
            if (action.removedFills) {
                action.removedFills.forEach(fill => {
                    fills.push({ ...fill, pointIds: [...fill.pointIds] });
                    renderFill(fill);
                });
            }
            break;
            
        case 'movePoint':
            // Swap old and new positions for redo
            const point = points.find(p => p.id === action.pointId);
            if (point) {
                action.newX = point.x;
                action.newY = point.y;
                point.x = action.oldX;
                point.y = action.oldY;
                updatePointPosition(point);
            }
            break;
            
        case 'clearAll':
            // Restore all points, lines, and fills
            action.points.forEach(point => {
                points.push(point);
                renderPoint(point);
            });
            action.lines.forEach(line => {
                lines.push(line);
                renderLine(line);
            });
            if (action.fills) {
                action.fills.forEach(fill => {
                    fills.push({ ...fill, pointIds: [...fill.pointIds] });
                    renderFill(fill);
                });
            }
            pointIdCounter = action.pointIdCounter;
            break;
            
        case 'addFill':
            // Remove the fill that was added
            const fillIdx = fills.findIndex(f => facesEqual(f.pointIds, action.fill.pointIds));
            if (fillIdx >= 0) {
                removeFillByPointIds(fills[fillIdx].pointIds);
                fills.splice(fillIdx, 1);
            }
            break;
            
        case 'updateFill':
            // Restore old color
            const fillToRevert = fills.find(f => facesEqual(f.pointIds, action.pointIds));
            if (fillToRevert) {
                fillToRevert.color = action.oldColor;
                updateFillElement(fillToRevert);
            }
            break;
            
        case 'removeFill':
            // Restore the removed fill
            fills.push({ ...action.fill, pointIds: [...action.fill.pointIds] });
            renderFill(action.fill);
            break;
            
        case 'import':
            // Restore old state before import
            pointsLayer.innerHTML = '';
            linesLayer.innerHTML = '';
            fillsLayer.innerHTML = '';
            points = action.oldPoints.map(p => ({ ...p }));
            lines = action.oldLines.map(l => ({ ...l }));
            fills = action.oldFills.map(f => ({ ...f, pointIds: [...f.pointIds] }));
            pointIdCounter = action.oldPointIdCounter;
            points.forEach(p => renderPoint(p));
            lines.forEach(l => renderLine(l));
            fills.forEach(f => renderFill(f));
            break;
            
        case 'moveGroup':
            // Restore original positions
            action.movements.forEach(m => {
                const point = points.find(p => p.id === m.pointId);
                if (point) {
                    point.x = m.oldX;
                    point.y = m.oldY;
                    updatePointPosition(point);
                }
            });
            break;
            
        case 'duplicateGroup':
            // Remove the duplicated fills first
            if (action.newFills) {
                action.newFills.forEach(f => {
                    const idx = fills.findIndex(fill => facesEqual(fill.pointIds, f.pointIds));
                    if (idx >= 0) {
                        removeFillByPointIds(fills[idx].pointIds);
                        fills.splice(idx, 1);
                    }
                });
            }
            // Remove the duplicated points (this also removes lines)
            action.newPoints.forEach(p => {
                removePointWithoutUndo(p.id);
            });
            break;
            
        case 'deleteGroup':
            // Restore deleted points, lines, and fills
            action.points.forEach(p => {
                points.push({ ...p });
                renderPoint(p);
            });
            action.lines.forEach(l => {
                lines.push({ ...l });
                renderLine(l);
            });
            action.fills.forEach(f => {
                fills.push({ ...f, pointIds: [...f.pointIds] });
                renderFill(f);
            });
            break;
            
        case 'mergePoints':
            // Restore the removed point
            points.push({ ...action.removedPoint });
            renderPoint(action.removedPoint);
            
            // Restore original lines
            lines.length = 0;
            action.originalLines.forEach(l => lines.push({ ...l }));
            linesLayer.innerHTML = '';
            lines.forEach(l => renderLine(l));
            
            // Restore original fills
            fills.length = 0;
            action.originalFills.forEach(f => fills.push({ ...f, pointIds: [...f.pointIds] }));
            fillsLayer.innerHTML = '';
            fills.forEach(f => renderFill(f));
            break;
    }
    
    saveState();
    updateStatus();
    updateUndoRedoButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    
    // Clear selection before modifying state
    if (selectedGroup.size > 0) {
        clearSelection();
    }
    
    const action = redoStack.pop();
    undoStack.push(action);
    
    switch (action.type) {
        case 'addPoint':
            // Re-add the point
            points.push(action.point);
            renderPoint(action.point);
            break;
            
        case 'deletePoint':
            // Re-delete the point, its lines, and fills
            // Note: removePointWithoutUndo already handles fills
            removePointWithoutUndo(action.point.id);
            break;
            
        case 'addLine':
            // Re-add the line
            lines.push(action.line);
            renderLine(action.line);
            break;
            
        case 'deleteLine':
            // Re-delete the line
            removeLineWithoutUndo(action.line);
            // Re-remove any fills
            if (action.removedFills) {
                action.removedFills.forEach(fill => {
                    const idx = fills.findIndex(f => facesEqual(f.pointIds, fill.pointIds));
                    if (idx >= 0) {
                        removeFillByPointIds(fills[idx].pointIds);
                        fills.splice(idx, 1);
                    }
                });
            }
            break;
            
        case 'movePoint':
            // Move to new position
            const point = points.find(p => p.id === action.pointId);
            if (point) {
                point.x = action.newX;
                point.y = action.newY;
                updatePointPosition(point);
            }
            break;
            
        case 'clearAll':
            // Re-clear everything
            points = [];
            lines = [];
            fills = [];
            pointsLayer.innerHTML = '';
            linesLayer.innerHTML = '';
            fillsLayer.innerHTML = '';
            selectedPoint = null;
            break;
            
        case 'addFill':
            // Re-add the fill
            fills.push({ ...action.fill, pointIds: [...action.fill.pointIds] });
            renderFill(action.fill);
            break;
            
        case 'updateFill':
            // Re-apply new color
            const fillToUpdate = fills.find(f => facesEqual(f.pointIds, action.pointIds));
            if (fillToUpdate) {
                fillToUpdate.color = action.newColor;
                updateFillElement(fillToUpdate);
            }
            break;
            
        case 'removeFill':
            // Re-remove the fill
            const fillToRemove = fills.findIndex(f => facesEqual(f.pointIds, action.fill.pointIds));
            if (fillToRemove >= 0) {
                removeFillByPointIds(fills[fillToRemove].pointIds);
                fills.splice(fillToRemove, 1);
            }
            break;
            
        case 'import':
            // Re-apply imported state
            pointsLayer.innerHTML = '';
            linesLayer.innerHTML = '';
            fillsLayer.innerHTML = '';
            points = action.newPoints.map(p => ({ ...p }));
            lines = action.newLines.map(l => ({ ...l }));
            fills = action.newFills.map(f => ({ ...f, pointIds: [...f.pointIds] }));
            pointIdCounter = action.newPointIdCounter;
            points.forEach(p => renderPoint(p));
            lines.forEach(l => renderLine(l));
            fills.forEach(f => renderFill(f));
            break;
            
        case 'moveGroup':
            // Re-apply new positions
            action.movements.forEach(m => {
                const point = points.find(p => p.id === m.pointId);
                if (point) {
                    point.x = m.newX;
                    point.y = m.newY;
                    updatePointPosition(point);
                }
            });
            break;
            
        case 'duplicateGroup':
            // Re-add the duplicated points and lines
            action.newPoints.forEach(p => {
                points.push({ ...p });
                renderPoint(p);
            });
            action.newLines.forEach(l => {
                lines.push({ ...l });
                renderLine(l);
            });
            if (action.newFills) {
                action.newFills.forEach(f => {
                    fills.push({ ...f, pointIds: [...f.pointIds] });
                    renderFill(f);
                });
            }
            break;
            
        case 'deleteGroup':
            // Re-delete the points
            action.points.forEach(p => {
                removePointWithoutUndo(p.id);
            });
            break;
            
        case 'mergePoints':
            // Re-apply the merge by removing the point and updating lines/fills
            // Remove the point
            const removeIdx = points.findIndex(p => p.id === action.removeId);
            if (removeIdx >= 0) {
                points.splice(removeIdx, 1);
            }
            const removeEl = getPointElement(action.removeId);
            if (removeEl) removeEl.remove();
            
            // Remove the removed lines
            action.removedLines.forEach(rl => {
                const idx = lines.findIndex(l => l.from === rl.from && l.to === rl.to);
                if (idx >= 0) lines.splice(idx, 1);
            });
            
            // Update modified lines
            action.modifiedLines.forEach(ml => {
                const line = lines.find(l => 
                    l.from === ml.oldFrom && l.to === ml.oldTo
                );
                if (line) {
                    line.from = line.from === action.removeId ? action.keepId : line.from;
                    line.to = line.to === action.removeId ? action.keepId : line.to;
                }
            });
            
            // Re-render lines
            linesLayer.innerHTML = '';
            lines.forEach(l => renderLine(l));
            
            // Remove the removed fills
            action.removedFills.forEach(rf => {
                const idx = fills.findIndex(f => facesEqual(f.pointIds, rf.pointIds));
                if (idx >= 0) fills.splice(idx, 1);
            });
            
            // Update modified fills
            action.modifiedFills.forEach(mf => {
                const fill = fills.find(f => facesEqual(f.pointIds, mf.oldPointIds));
                if (fill) {
                    fill.pointIds = fill.pointIds.map(id => id === action.removeId ? action.keepId : id);
                    fill.pointIds = [...new Set(fill.pointIds)];
                }
            });
            
            // Re-render fills
            fillsLayer.innerHTML = '';
            fills.forEach(f => renderFill(f));
            break;
    }
    
    saveState();
    updateStatus();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

// Mode Management
function setMode(mode) {
    currentMode = mode;
    
    // Update button states
    addModeBtn.classList.toggle('active', mode === 'add');
    moveModeBtn.classList.toggle('active', mode === 'move');
    connectModeBtn.classList.toggle('active', mode === 'connect');
    deleteModeBtn.classList.toggle('active', mode === 'delete');
    fillModeBtn.classList.toggle('active', mode === 'fill');
    selectModeBtn.classList.toggle('active', mode === 'select');

    // Update cursor
    whiteboard.classList.remove('move-mode', 'connect-mode', 'delete-mode', 'fill-mode', 'select-mode');
    if (mode === 'move') whiteboard.classList.add('move-mode');
    if (mode === 'connect') whiteboard.classList.add('connect-mode');
    if (mode === 'delete') whiteboard.classList.add('delete-mode');
    if (mode === 'fill') whiteboard.classList.add('fill-mode');
    if (mode === 'select') whiteboard.classList.add('select-mode');
    
    // Clear selection when leaving select mode
    if (mode !== 'select' && selectedGroup.size > 0) {
        clearSelection();
    }

    // Clear selection when changing modes
    if (selectedPoint) {
        deselectPoint();
    }

    updateStatus();
}

// Point Management
function createPoint(x, y) {
    const id = ++pointIdCounter;
    const point = { id, x, y };
    points.push(point);
    renderPoint(point);
    
    pushUndo({ type: 'addPoint', point: { ...point } });
    saveState();
    updateStatus();
    return point;
}

function renderPoint(point) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('point');
    group.dataset.id = point.id;
    group.setAttribute('transform', `translate(${point.x}, ${point.y})`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '8');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');

    group.appendChild(circle);
    pointsLayer.appendChild(group);
}

function getPointElement(id) {
    return pointsLayer.querySelector(`[data-id="${id}"]`);
}

function updatePointPosition(point) {
    const element = getPointElement(point.id);
    if (element) {
        element.setAttribute('transform', `translate(${point.x}, ${point.y})`);
    }
    // Update connected lines
    updateLinesForPoint(point.id);
    // Update fills containing this point
    updateFillsForPoint(point.id);
}

function selectPoint(point) {
    if (selectedPoint) {
        deselectPoint();
    }
    selectedPoint = point;
    const element = getPointElement(point.id);
    if (element) {
        element.classList.add('selected');
    }
}

function deselectPoint() {
    if (selectedPoint) {
        const element = getPointElement(selectedPoint.id);
        if (element) {
            element.classList.remove('selected');
        }
        selectedPoint = null;
        removeTempLine();
    }
}

// Line Management
function createLine(point1Id, point2Id) {
    // Check if line already exists
    const exists = lines.some(
        line => (line.from === point1Id && line.to === point2Id) ||
                (line.from === point2Id && line.to === point1Id)
    );
    if (exists) return null;

    const line = { from: point1Id, to: point2Id };
    lines.push(line);
    renderLine(line);
    
    pushUndo({ type: 'addLine', line: { ...line } });
    saveState();
    return line;
}

function renderLine(line) {
    const point1 = points.find(p => p.id === line.from);
    const point2 = points.find(p => p.id === line.to);
    if (!point1 || !point2) return;

    const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineElement.classList.add('connection-line');
    lineElement.dataset.from = line.from;
    lineElement.dataset.to = line.to;
    lineElement.setAttribute('x1', point1.x);
    lineElement.setAttribute('y1', point1.y);
    lineElement.setAttribute('x2', point2.x);
    lineElement.setAttribute('y2', point2.y);

    linesLayer.appendChild(lineElement);
}

function updateLinesForPoint(pointId) {
    const lineElements = linesLayer.querySelectorAll('.connection-line');
    lineElements.forEach(lineEl => {
        const fromId = parseInt(lineEl.dataset.from);
        const toId = parseInt(lineEl.dataset.to);
        
        if (fromId === pointId || toId === pointId) {
            const point1 = points.find(p => p.id === fromId);
            const point2 = points.find(p => p.id === toId);
            if (point1 && point2) {
                lineEl.setAttribute('x1', point1.x);
                lineEl.setAttribute('y1', point1.y);
                lineEl.setAttribute('x2', point2.x);
                lineEl.setAttribute('y2', point2.y);
            }
        }
    });
}

function removeLineWithoutUndo(line) {
    const index = lines.findIndex(l => 
        (l.from === line.from && l.to === line.to) ||
        (l.from === line.to && l.to === line.from)
    );
    if (index > -1) {
        lines.splice(index, 1);
    }
    const lineElement = linesLayer.querySelector(
        `[data-from="${line.from}"][data-to="${line.to}"], [data-from="${line.to}"][data-to="${line.from}"]`
    );
    if (lineElement) {
        lineElement.remove();
    }
}

function removeLine(line) {
    // Collect fills that will be removed
    const affectedFills = fills.filter(fill => {
        for (let i = 0; i < fill.pointIds.length; i++) {
            const p1 = fill.pointIds[i];
            const p2 = fill.pointIds[(i + 1) % fill.pointIds.length];
            if ((line.from === p1 && line.to === p2) || (line.from === p2 && line.to === p1)) {
                return true;
            }
        }
        return false;
    });
    
    pushUndo({ 
        type: 'deleteLine', 
        line: { ...line },
        removedFills: affectedFills.map(f => ({ ...f, pointIds: [...f.pointIds] }))
    });
    
    removeLineWithoutUndo(line);
    removeFillsForLine(line);
    saveState();
    updateStatus();
}

// Temp Line (while connecting)
function createTempLine(fromPoint, toX, toY) {
    if (!tempLine) {
        tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempLine.classList.add('temp-line');
        linesLayer.appendChild(tempLine);
    }
    tempLine.setAttribute('x1', fromPoint.x);
    tempLine.setAttribute('y1', fromPoint.y);
    tempLine.setAttribute('x2', toX);
    tempLine.setAttribute('y2', toY);
}

function removeTempLine() {
    if (tempLine) {
        tempLine.remove();
        tempLine = null;
    }
}

// Toggle Points Visibility
function togglePointsVisibility() {
    pointsVisible = showPointsCheckbox.checked;
    pointsLayer.classList.toggle('hidden', !pointsVisible);
    saveState();
}

// Toggle Lines Visibility
function toggleLinesVisibility() {
    linesVisible = showLinesCheckbox.checked;
    linesLayer.classList.toggle('hidden', !linesVisible);
    saveState();
}

// Color Picker
function handleColorChange(e) {
    currentColor = e.target.value;
    saveState();
}

// ============ Polygon Fill System ============

// Find all bounded faces (polygons) formed by lines
function findAllFaces() {
    if (points.length < 3 || lines.length < 3) return [];
    
    // Build adjacency list with angles
    const adj = new Map();
    points.forEach(p => adj.set(p.id, []));
    
    lines.forEach(line => {
        const p1 = points.find(p => p.id === line.from);
        const p2 = points.find(p => p.id === line.to);
        if (!p1 || !p2) return;
        
        const angle1to2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angle2to1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        
        adj.get(p1.id).push({ to: p2.id, angle: angle1to2 });
        adj.get(p2.id).push({ to: p1.id, angle: angle2to1 });
    });
    
    // Sort neighbors by angle (counter-clockwise) for each vertex
    adj.forEach(neighbors => {
        neighbors.sort((a, b) => a.angle - b.angle);
    });
    
    // Find all faces by traversing edges
    const visitedEdges = new Set();
    const faces = [];
    
    lines.forEach(line => {
        // Try both directions of each edge
        [[line.from, line.to], [line.to, line.from]].forEach(([startFrom, startTo]) => {
            const startKey = `${startFrom}-${startTo}`;
            if (visitedEdges.has(startKey)) return;
            
            const face = [];
            let current = startFrom;
            let next = startTo;
            let iterations = 0;
            const maxIterations = points.length + 1;
            
            while (iterations < maxIterations) {
                iterations++;
                const key = `${current}-${next}`;
                if (visitedEdges.has(key)) break;
                visitedEdges.add(key);
                face.push(current);
                
                // Find next edge: after entering 'next' from 'current',
                // take the next edge in CW order (to trace CCW faces)
                const neighbors = adj.get(next);
                if (!neighbors || neighbors.length === 0) break;
                
                // Find index of edge coming from current
                let idx = neighbors.findIndex(n => n.to === current);
                if (idx === -1) break;
                
                // Next edge in CW order = previous in CCW-sorted array
                idx = (idx - 1 + neighbors.length) % neighbors.length;
                
                const prev = current;
                current = next;
                next = neighbors[idx].to;
                
                if (current === startFrom && next === startTo) break;
            }
            
            if (face.length >= 3) {
                faces.push(face);
            }
        });
    });
    
    // Calculate signed area to filter out outer face
    const facesWithArea = faces.map(face => {
        let area = 0;
        for (let i = 0; i < face.length; i++) {
            const p1 = points.find(p => p.id === face[i]);
            const p2 = points.find(p => p.id === face[(i + 1) % face.length]);
            if (p1 && p2) {
                area += (p1.x * p2.y - p2.x * p1.y);
            }
        }
        return { face, area: area / 2 };
    });
    
    // Keep only faces with positive area (interior faces, CCW winding)
    return facesWithArea
        .filter(f => f.area > 0)
        .map(f => f.face);
}

// Check if a point is inside a polygon
function pointInPolygon(x, y, polygonPointIds) {
    const polygon = polygonPointIds.map(id => points.find(p => p.id === id)).filter(p => p);
    if (polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Find which face contains the clicked point
function findFaceAtPoint(x, y) {
    const faces = findAllFaces();
    for (const face of faces) {
        if (pointInPolygon(x, y, face)) {
            return face;
        }
    }
    return null;
}

// Check if two faces are the same (same points, possibly different order)
function facesEqual(face1, face2) {
    if (face1.length !== face2.length) return false;
    const set1 = new Set(face1);
    const set2 = new Set(face2);
    if (set1.size !== set2.size) return false;
    for (const id of set1) {
        if (!set2.has(id)) return false;
    }
    return true;
}

// Remove a fill at the given location
function unfillRegion(x, y) {
    const face = findFaceAtPoint(x, y);
    if (!face) return; // No bounded region at this point
    
    // Find existing fill for this face
    const existingIndex = fills.findIndex(f => facesEqual(f.pointIds, face));
    if (existingIndex < 0) return; // No fill to remove
    
    const removedFill = fills[existingIndex];
    pushUndo({ 
        type: 'removeFill', 
        fill: { ...removedFill, pointIds: [...removedFill.pointIds] }
    });
    
    removeFillByPointIds(removedFill.pointIds);
    fills.splice(existingIndex, 1);
    saveState();
}

// Create or update a fill for a face
function fillRegion(x, y) {
    const face = findFaceAtPoint(x, y);
    if (!face) return; // Clicked in unbounded area
    
    // Check if this face already has a fill
    const existingIndex = fills.findIndex(f => facesEqual(f.pointIds, face));
    
    if (existingIndex >= 0) {
        // Update existing fill
        const oldColor = fills[existingIndex].color;
        fills[existingIndex].color = currentColor;
        updateFillElement(fills[existingIndex]);
        pushUndo({ 
            type: 'updateFill', 
            pointIds: [...face], 
            oldColor, 
            newColor: currentColor 
        });
    } else {
        // Create new fill
        const fill = { pointIds: [...face], color: currentColor };
        fills.push(fill);
        renderFill(fill);
        pushUndo({ type: 'addFill', fill: { ...fill, pointIds: [...fill.pointIds] } });
    }
    
    saveState();
}

// Render a fill polygon
function renderFill(fill) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.classList.add('fill-region');
    polygon.dataset.pointIds = fill.pointIds.join(',');
    
    const pointsAttr = fill.pointIds
        .map(id => points.find(p => p.id === id))
        .filter(p => p)
        .map(p => `${p.x},${p.y}`)
        .join(' ');
    
    polygon.setAttribute('points', pointsAttr);
    polygon.style.fill = fill.color;
    
    fillsLayer.appendChild(polygon);
}

// Update fill element position (when points move)
function updateFillElement(fill) {
    const element = fillsLayer.querySelector(`[data-point-ids="${fill.pointIds.join(',')}"]`);
    if (element) {
        const pointsAttr = fill.pointIds
            .map(id => points.find(p => p.id === id))
            .filter(p => p)
            .map(p => `${p.x},${p.y}`)
            .join(' ');
        element.setAttribute('points', pointsAttr);
        element.style.fill = fill.color;
    }
}

// Update all fills when points move
function updateFillsForPoint(pointId) {
    fills.forEach(fill => {
        if (fill.pointIds.includes(pointId)) {
            updateFillElement(fill);
        }
    });
}

// Remove a fill
function removeFillByPointIds(pointIds) {
    const element = fillsLayer.querySelector(`[data-point-ids="${pointIds.join(',')}"]`);
    if (element) element.remove();
}

// Remove fills that contain a deleted point
function removeFillsForPoint(pointId) {
    const toRemove = fills.filter(f => f.pointIds.includes(pointId));
    toRemove.forEach(fill => {
        removeFillByPointIds(fill.pointIds);
    });
    fills = fills.filter(f => !f.pointIds.includes(pointId));
}

// Remove fills that use a deleted line
function removeFillsForLine(line) {
    // A fill is invalid if any two consecutive points in it are no longer connected
    const toRemove = fills.filter(fill => {
        for (let i = 0; i < fill.pointIds.length; i++) {
            const p1 = fill.pointIds[i];
            const p2 = fill.pointIds[(i + 1) % fill.pointIds.length];
            // Check if edge p1-p2 exists
            const edgeExists = lines.some(l => 
                (l.from === p1 && l.to === p2) || (l.from === p2 && l.to === p1)
            );
            if (!edgeExists) return true; // Fill is invalid
        }
        return false;
    });
    
    toRemove.forEach(fill => {
        removeFillByPointIds(fill.pointIds);
    });
    fills = fills.filter(f => !toRemove.includes(f));
}

// Event Handlers
function handleWhiteboardClick(e) {
    const pointElement = e.target.closest('.point');
    const lineElement = e.target.closest('.connection-line');
    const coords = getMouseCoords(e);
    
    // Handle fill mode - can click anywhere including on points/lines
    if (currentMode === 'fill') {
        fillRegion(coords.x, coords.y);
        return;
    }
    
    // Handle line click in delete mode
    if (currentMode === 'delete' && lineElement) {
        const fromId = parseInt(lineElement.dataset.from);
        const toId = parseInt(lineElement.dataset.to);
        const line = lines.find(l => 
            (l.from === fromId && l.to === toId) ||
            (l.from === toId && l.to === fromId)
        );
        if (line) {
            removeLine(line);
        }
        return;
    }
    
    // Ignore other clicks on points (handled by mousedown)
    if (pointElement) return;

    if (currentMode === 'add') {
        createPoint(coords.x, coords.y);
    } else if (currentMode === 'connect' && selectedPoint) {
        deselectPoint();
    }
}

function handleMouseDown(e) {
    const pointElement = e.target.closest('.point');
    if (!pointElement) return;

    const pointId = parseInt(pointElement.dataset.id);
    const point = points.find(p => p.id === pointId);
    if (!point) return;

    if (currentMode === 'move') {
        e.preventDefault();
        draggedPoint = point;
        draggedPoint.startX = point.x;
        draggedPoint.startY = point.y;
        const coords = getMouseCoords(e);
        dragOffset = {
            x: coords.x - point.x,
            y: coords.y - point.y
        };
        pointElement.classList.add('dragging');
    } else if (currentMode === 'connect') {
        e.preventDefault();
        if (selectedPoint && selectedPoint.id !== point.id) {
            // Create line between selected and clicked point
            createLine(selectedPoint.id, point.id);
            // Select the new point to allow chaining connections
            deselectPoint();
            selectPoint(point);
        } else if (!selectedPoint) {
            selectPoint(point);
        }
        // If clicking the same point, do nothing (keep it selected)
    } else if (currentMode === 'delete') {
        e.preventDefault();
        deletePoint(point);
    } else if (currentMode === 'select') {
        e.preventDefault();
        togglePointInGroup(point.id);
    }
}

function handleMouseMove(e) {
    const coords = getMouseCoords(e);

    if (currentMode === 'move' && draggedPoint) {
        draggedPoint.x = coords.x - dragOffset.x;
        draggedPoint.y = coords.y - dragOffset.y;
        updatePointPosition(draggedPoint);
    } else if (currentMode === 'connect' && selectedPoint) {
        createTempLine(selectedPoint, coords.x, coords.y);
    }
}

function handleRightClick(e) {
    e.preventDefault();
    
    if (currentMode === 'fill') {
        // Remove fill at click location
        const coords = getMouseCoords(e);
        unfillRegion(coords.x, coords.y);
    } else {
        deselectPoint();
    }
}

function handleMouseUp() {
    if (draggedPoint) {
        const element = getPointElement(draggedPoint.id);
        if (element) {
            element.classList.remove('dragging');
        }
        
        // Only save undo if position actually changed
        if (draggedPoint.startX !== draggedPoint.x || draggedPoint.startY !== draggedPoint.y) {
            pushUndo({
                type: 'movePoint',
                pointId: draggedPoint.id,
                oldX: draggedPoint.startX,
                oldY: draggedPoint.startY
            });
            saveState();
        }
        
        delete draggedPoint.startX;
        delete draggedPoint.startY;
        draggedPoint = null;
    }
}

function handleKeyDown(e) {
    // Keyboard shortcuts
    if (e.target.tagName === 'INPUT') return;

    // Undo with Ctrl+Z or Cmd+Z, Redo with Ctrl+Shift+Z or Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            redo();
        } else {
            undo();
        }
        return;
    }
    // Also support Ctrl+Y for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
    }

    switch (e.key.toLowerCase()) {
        case 'a':
            setMode('add');
            break;
        case 'm':
            setMode('move');
            break;
        case 'c':
            setMode('connect');
            break;
        case 'd':
            setMode('delete');
            break;
        case 'f':
            setMode('fill');
            break;
        case 's':
            setMode('select');
            break;
        case 'p':
            showPointsCheckbox.checked = !showPointsCheckbox.checked;
            togglePointsVisibility();
            break;
        case 'l':
            showLinesCheckbox.checked = !showLinesCheckbox.checked;
            toggleLinesVisibility();
            break;
        case '=':
        case '+':
            zoomBy(ZOOM_STEP);
            break;
        case '-':
            zoomBy(-ZOOM_STEP);
            break;
        case '0':
            resetZoom();
            break;
        case 'escape':
            if (currentMode === 'select' && selectedGroup.size > 0) {
                clearSelection();
                updateStatus();
            } else {
                deselectPoint();
            }
            break;
        case 'delete':
        case 'backspace':
            if (selectedPoint) {
                deletePoint(selectedPoint);
            }
            break;
    }
}

// Delete point and its connections (without undo push)
function removePointWithoutUndo(pointId) {
    // Remove fills containing this point
    removeFillsForPoint(pointId);
    
    // Remove connected lines
    const linesToRemove = lines.filter(line => line.from === pointId || line.to === pointId);
    linesToRemove.forEach(line => {
        const lineElement = linesLayer.querySelector(
            `[data-from="${line.from}"][data-to="${line.to}"]`
        );
        if (lineElement) lineElement.remove();
    });
    lines = lines.filter(line => line.from !== pointId && line.to !== pointId);

    // Remove point
    const index = points.findIndex(p => p.id === pointId);
    if (index > -1) {
        points.splice(index, 1);
    }
    const element = getPointElement(pointId);
    if (element) element.remove();
}

// Delete point and its connections
function deletePoint(point) {
    // Collect connected lines for undo
    const connectedLines = lines.filter(line => line.from === point.id || line.to === point.id);
    
    // Collect fills that will be removed
    const removedFills = fills
        .filter(f => f.pointIds.includes(point.id))
        .map(f => ({ ...f, pointIds: [...f.pointIds] }));
    
    pushUndo({
        type: 'deletePoint',
        point: { ...point },
        lines: connectedLines.map(l => ({ ...l })),
        fills: removedFills
    });
    
    removePointWithoutUndo(point.id);
    
    if (selectedPoint && selectedPoint.id === point.id) {
        selectedPoint = null;
    }
    
    saveState();
    updateStatus();
}

// Clear All
function clearAll() {
    if (points.length === 0 && lines.length === 0) return;
    
    if (confirm('Clear all points, lines, and fills?')) {
        pushUndo({
            type: 'clearAll',
            points: points.map(p => ({ ...p })),
            lines: lines.map(l => ({ ...l })),
            fills: fills.map(f => ({ ...f, pointIds: [...f.pointIds] })),
            pointIdCounter
        });
        
        points = [];
        lines = [];
        fills = [];
        pointsLayer.innerHTML = '';
        linesLayer.innerHTML = '';
        fillsLayer.innerHTML = '';
        selectedPoint = null;
        draggedPoint = null;
        removeTempLine();
        
        saveState();
        updateStatus();
    }
}

// Download SVG
function downloadSvg() {
    // Build a clean SVG from scratch with untransformed coordinates
    const rect = whiteboard.getBoundingClientRect();
    
    // Calculate bounds of all content
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    
    // Add some padding
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = Math.max(maxX - minX, 100);
    const height = Math.max(maxY - minY, 100);
    
    // Create SVG element
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" style="background: white;">
<style>
    .point circle { fill: #3b82f6; stroke: white; stroke-width: 2; }
    .connection-line { stroke: #64748b; stroke-width: 2; stroke-linecap: round; }
</style>
<defs>
    <filter id="pointShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
    </filter>
</defs>
`;
    
    // Add fills layer
    svg += '<g id="fillsLayer">';
    fills.forEach(fill => {
        const pointsAttr = fill.pointIds
            .map(id => points.find(p => p.id === id))
            .filter(p => p)
            .map(p => `${p.x},${p.y}`)
            .join(' ');
        if (pointsAttr) {
            svg += `<polygon class="fill-region" data-point-ids="${fill.pointIds.join(',')}" points="${pointsAttr}" style="fill: ${fill.color};"/>`;
        }
    });
    svg += '</g>\n';
    
    // Add lines layer
    svg += '<g id="linesLayer"';
    if (!linesVisible) svg += ' style="display:none"';
    svg += '>';
    lines.forEach(line => {
        const p1 = points.find(p => p.id === line.from);
        const p2 = points.find(p => p.id === line.to);
        if (p1 && p2) {
            svg += `<line class="connection-line" data-from="${line.from}" data-to="${line.to}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/>`;
        }
    });
    svg += '</g>\n';
    
    // Add points layer
    svg += '<g id="pointsLayer"';
    if (!pointsVisible) svg += ' style="display:none"';
    svg += '>';
    points.forEach(point => {
        svg += `<g class="point" data-id="${point.id}" transform="translate(${point.x}, ${point.y})"><circle r="8" cx="0" cy="0"/></g>`;
    });
    svg += '</g>\n';
    
    svg += '</svg>';
    
    // Create blob and download
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'whiteboard.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// ============ Group Selection System ============

function togglePointInGroup(pointId) {
    if (selectedGroup.has(pointId)) {
        selectedGroup.delete(pointId);
        const element = getPointElement(pointId);
        if (element) element.classList.remove('in-group');
    } else {
        selectedGroup.add(pointId);
        const element = getPointElement(pointId);
        if (element) element.classList.add('in-group');
    }
    updateGroupOpsVisibility();
    updateGroupHighlights();
    updateStatus();
}

function clearSelection() {
    selectedGroup.forEach(pointId => {
        const element = getPointElement(pointId);
        if (element) element.classList.remove('in-group');
    });
    selectedGroup.clear();
    updateGroupOpsVisibility();
    updateGroupHighlights();
    updateStatus();
}

function updateGroupHighlights() {
    // Update line highlights - highlight if both endpoints are in group
    const lineElements = linesLayer.querySelectorAll('.connection-line');
    lineElements.forEach(lineEl => {
        const fromId = parseInt(lineEl.dataset.from);
        const toId = parseInt(lineEl.dataset.to);
        const inGroup = selectedGroup.has(fromId) && selectedGroup.has(toId);
        lineEl.classList.toggle('in-group', inGroup);
    });
    
    // Update fill highlights - highlight if all points are in group
    const fillElements = fillsLayer.querySelectorAll('.fill-region');
    fillElements.forEach(fillEl => {
        const pointIdsStr = fillEl.dataset.pointIds;
        if (!pointIdsStr) return;
        const pointIds = pointIdsStr.split(',').map(id => parseInt(id));
        const inGroup = pointIds.length > 0 && pointIds.every(id => selectedGroup.has(id));
        fillEl.classList.toggle('in-group', inGroup);
    });
}

function updateGroupOpsVisibility() {
    groupOpsContainer.classList.toggle('has-selection', selectedGroup.size > 0);
    // Merge button only enabled when exactly 2 points selected
    mergePointsBtn.disabled = selectedGroup.size !== 2;
}

function getGroupBounds() {
    if (selectedGroup.size === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        if (point) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
    });
    
    return {
        minX, minY, maxX, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY
    };
}

function startGroupDrag(e) {
    if (selectedGroup.size === 0) return;
    e.preventDefault();
    
    isGroupDragging = true;
    const coords = getMouseCoords(e);
    groupDragStart = {
        x: coords.x,
        y: coords.y,
        positions: new Map()
    };
    
    // Store original positions
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        if (point) {
            groupDragStart.positions.set(pointId, { x: point.x, y: point.y });
        }
    });
    
    // Add global listeners for drag
    document.addEventListener('mousemove', handleGroupDrag);
    document.addEventListener('mouseup', endGroupDrag);
}

function handleGroupDrag(e) {
    if (!isGroupDragging) return;
    
    const coords = getMouseCoords(e);
    const dx = coords.x - groupDragStart.x;
    const dy = coords.y - groupDragStart.y;
    
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        const original = groupDragStart.positions.get(pointId);
        if (point && original) {
            point.x = original.x + dx;
            point.y = original.y + dy;
            updatePointPosition(point);
        }
    });
}

function endGroupDrag(e) {
    if (!isGroupDragging) return;
    
    document.removeEventListener('mousemove', handleGroupDrag);
    document.removeEventListener('mouseup', endGroupDrag);
    
    // Calculate if anything moved
    let hasMoved = false;
    const movements = [];
    
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        const original = groupDragStart.positions.get(pointId);
        if (point && original && (point.x !== original.x || point.y !== original.y)) {
            hasMoved = true;
            movements.push({
                pointId,
                oldX: original.x,
                oldY: original.y,
                newX: point.x,
                newY: point.y
            });
        }
    });
    
    if (hasMoved) {
        pushUndo({ type: 'moveGroup', movements });
        saveState();
    }
    
    isGroupDragging = false;
}

function duplicateGroup() {
    if (selectedGroup.size === 0) return;
    
    const offset = 20; // Offset for duplicated points
    const idMap = new Map(); // Map old IDs to new IDs
    const newPoints = [];
    const newLines = [];
    const newFills = [];
    
    // Duplicate points
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        if (point) {
            const newId = ++pointIdCounter;
            idMap.set(pointId, newId);
            const newPoint = { id: newId, x: point.x + offset, y: point.y + offset };
            newPoints.push(newPoint);
            points.push(newPoint);
            renderPoint(newPoint);
        }
    });
    
    // Duplicate lines between selected points
    lines.forEach(line => {
        if (selectedGroup.has(line.from) && selectedGroup.has(line.to)) {
            const newLine = { from: idMap.get(line.from), to: idMap.get(line.to) };
            newLines.push(newLine);
            lines.push(newLine);
            renderLine(newLine);
        }
    });
    
    // Duplicate fills where all points are in selection
    fills.forEach(fill => {
        if (fill.pointIds.every(id => selectedGroup.has(id))) {
            const newFill = {
                pointIds: fill.pointIds.map(id => idMap.get(id)),
                color: fill.color
            };
            newFills.push(newFill);
            fills.push(newFill);
            renderFill(newFill);
        }
    });
    
    // Push undo
    pushUndo({
        type: 'duplicateGroup',
        newPoints: newPoints.map(p => ({ ...p })),
        newLines: newLines.map(l => ({ ...l })),
        newFills: newFills.map(f => ({ ...f, pointIds: [...f.pointIds] }))
    });
    
    // Select the new points instead
    clearSelection();
    newPoints.forEach(p => togglePointInGroup(p.id));
    
    saveState();
    updateStatus();
}

function flipGroup(direction) {
    if (selectedGroup.size === 0) return;
    
    const bounds = getGroupBounds();
    if (!bounds) return;
    
    const movements = [];
    
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        if (point) {
            const oldX = point.x;
            const oldY = point.y;
            
            if (direction === 'horizontal') {
                point.x = bounds.centerX - (point.x - bounds.centerX);
            } else {
                point.y = bounds.centerY - (point.y - bounds.centerY);
            }
            
            movements.push({
                pointId,
                oldX,
                oldY,
                newX: point.x,
                newY: point.y
            });
            
            updatePointPosition(point);
        }
    });
    
    pushUndo({ type: 'moveGroup', movements });
    saveState();
}

function mergePoints() {
    if (selectedGroup.size !== 2) return;
    
    const [keepId, removeId] = [...selectedGroup];
    const keepPoint = points.find(p => p.id === keepId);
    const removePoint = points.find(p => p.id === removeId);
    
    if (!keepPoint || !removePoint) return;
    
    // Collect data for undo
    const undoData = {
        type: 'mergePoints',
        keepId,
        removeId,
        removedPoint: { ...removePoint },
        originalLines: lines.map(l => ({ ...l })),
        originalFills: fills.map(f => ({ ...f, pointIds: [...f.pointIds] })),
        modifiedLines: [],
        modifiedFills: [],
        removedLines: [],
        removedFills: []
    };
    
    // Update lines: redirect connections from removeId to keepId
    const linesToRemove = [];
    lines.forEach((line, index) => {
        const hadRemoveId = line.from === removeId || line.to === removeId;
        if (!hadRemoveId) return;
        
        // Check if this would create a self-loop or duplicate
        let newFrom = line.from === removeId ? keepId : line.from;
        let newTo = line.to === removeId ? keepId : line.to;
        
        // Self-loop: remove the line
        if (newFrom === newTo) {
            linesToRemove.push(index);
            undoData.removedLines.push({ ...line, originalIndex: index });
            return;
        }
        
        // Check for duplicate (a line already exists between these points)
        const duplicate = lines.some((l, i) => 
            i !== index && 
            ((l.from === newFrom && l.to === newTo) || (l.from === newTo && l.to === newFrom))
        );
        
        if (duplicate) {
            linesToRemove.push(index);
            undoData.removedLines.push({ ...line, originalIndex: index });
            return;
        }
        
        // Update the line
        undoData.modifiedLines.push({ index, oldFrom: line.from, oldTo: line.to });
        line.from = newFrom;
        line.to = newTo;
    });
    
    // Remove lines (in reverse order to maintain indices)
    linesToRemove.sort((a, b) => b - a).forEach(index => {
        const lineEl = linesLayer.querySelector(
            `[data-from="${lines[index].from}"][data-to="${lines[index].to}"]`
        );
        if (lineEl) lineEl.remove();
        lines.splice(index, 1);
    });
    
    // Update remaining line elements
    linesLayer.innerHTML = '';
    lines.forEach(line => renderLine(line));
    
    // Update fills: replace removeId with keepId in pointIds
    const fillsToRemove = [];
    fills.forEach((fill, index) => {
        const hasRemoveId = fill.pointIds.includes(removeId);
        if (!hasRemoveId) return;
        
        const newPointIds = fill.pointIds.map(id => id === removeId ? keepId : id);
        
        // Check for duplicates in the new pointIds (would make invalid polygon)
        const uniqueIds = [...new Set(newPointIds)];
        if (uniqueIds.length < 3) {
            // Invalid polygon, remove it
            fillsToRemove.push(index);
            undoData.removedFills.push({ ...fill, pointIds: [...fill.pointIds], originalIndex: index });
            return;
        }
        
        undoData.modifiedFills.push({ index, oldPointIds: [...fill.pointIds] });
        fill.pointIds = uniqueIds;
    });
    
    // Remove invalid fills
    fillsToRemove.sort((a, b) => b - a).forEach(index => {
        removeFillByPointIds(fills[index].pointIds);
        fills.splice(index, 1);
    });
    
    // Re-render fills
    fillsLayer.innerHTML = '';
    fills.forEach(fill => renderFill(fill));
    
    // Remove the second point
    const removeIndex = points.findIndex(p => p.id === removeId);
    if (removeIndex >= 0) {
        points.splice(removeIndex, 1);
    }
    const removeElement = getPointElement(removeId);
    if (removeElement) removeElement.remove();
    
    // Push undo
    pushUndo(undoData);
    
    // Clear selection
    clearSelection();
    
    // Select the kept point
    togglePointInGroup(keepId);
    
    saveState();
    updateStatus();
}

function deleteGroup() {
    if (selectedGroup.size === 0) return;
    
    const deletedPoints = [];
    const deletedLines = [];
    const deletedFills = [];
    
    // Collect all data for undo
    selectedGroup.forEach(pointId => {
        const point = points.find(p => p.id === pointId);
        if (point) {
            deletedPoints.push({ ...point });
        }
    });
    
    // Find lines connected to selected points
    lines.forEach(line => {
        if (selectedGroup.has(line.from) || selectedGroup.has(line.to)) {
            deletedLines.push({ ...line });
        }
    });
    
    // Find fills containing selected points
    fills.forEach(fill => {
        if (fill.pointIds.some(id => selectedGroup.has(id))) {
            deletedFills.push({ ...fill, pointIds: [...fill.pointIds] });
        }
    });
    
    pushUndo({
        type: 'deleteGroup',
        points: deletedPoints,
        lines: deletedLines,
        fills: deletedFills
    });
    
    // Remove points (this will also remove connected lines and fills)
    const pointIdsToDelete = [...selectedGroup];
    pointIdsToDelete.forEach(pointId => {
        removePointWithoutUndo(pointId);
    });
    
    selectedGroup.clear();
    updateGroupOpsVisibility();
    saveState();
    updateStatus();
}

// Import SVG
function handleSvgImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            importSvgContent(event.target.result);
        } catch (err) {
            console.error('Failed to import SVG:', err);
            alert('Failed to import SVG. Make sure it was exported from this app.');
        }
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be imported again
    e.target.value = '';
}

function importSvgContent(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid SVG file');
    }
    
    const svg = doc.querySelector('svg');
    if (!svg) {
        throw new Error('No SVG element found');
    }
    
    // Extract points
    const importedPoints = [];
    const pointElements = svg.querySelectorAll('.point');
    let maxPointId = 0;
    
    pointElements.forEach(pointEl => {
        const id = parseInt(pointEl.dataset.id);
        if (isNaN(id)) return;
        
        maxPointId = Math.max(maxPointId, id);
        
        // Parse transform="translate(x, y)"
        const transform = pointEl.getAttribute('transform');
        const match = transform && transform.match(/translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
        if (!match) return;
        
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        importedPoints.push({ id, x, y });
    });
    
    // Extract lines
    const importedLines = [];
    const lineElements = svg.querySelectorAll('.connection-line');
    
    lineElements.forEach(lineEl => {
        const from = parseInt(lineEl.dataset.from);
        const to = parseInt(lineEl.dataset.to);
        if (isNaN(from) || isNaN(to)) return;
        
        importedLines.push({ from, to });
    });
    
    // Extract fills
    const importedFills = [];
    const fillElements = svg.querySelectorAll('.fill-region');
    
    fillElements.forEach(fillEl => {
        const pointIdsStr = fillEl.dataset.pointIds;
        if (!pointIdsStr) return;
        
        const pointIds = pointIdsStr.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (pointIds.length < 3) return;
        
        // Get color from style
        const style = fillEl.getAttribute('style') || '';
        const colorMatch = style.match(/fill:\s*([^;]+)/);
        const color = colorMatch ? colorMatch[1].trim() : '#3b82f6';
        
        importedFills.push({ pointIds, color });
    });
    
    // Validate we got something
    if (importedPoints.length === 0) {
        throw new Error('No points found in SVG');
    }
    
    // Clear current state and apply imported data
    const hadContent = points.length > 0 || lines.length > 0 || fills.length > 0;
    
    if (hadContent) {
        // Save current state for undo
        pushUndo({
            type: 'import',
            oldPoints: points.map(p => ({ ...p })),
            oldLines: lines.map(l => ({ ...l })),
            oldFills: fills.map(f => ({ ...f, pointIds: [...f.pointIds] })),
            oldPointIdCounter: pointIdCounter,
            newPoints: importedPoints.map(p => ({ ...p })),
            newLines: importedLines.map(l => ({ ...l })),
            newFills: importedFills.map(f => ({ ...f, pointIds: [...f.pointIds] })),
            newPointIdCounter: maxPointId
        });
    }
    
    // Clear current rendering
    pointsLayer.innerHTML = '';
    linesLayer.innerHTML = '';
    fillsLayer.innerHTML = '';
    
    // Apply imported state
    points = importedPoints;
    lines = importedLines;
    fills = importedFills;
    pointIdCounter = maxPointId;
    
    // Render
    points.forEach(point => renderPoint(point));
    lines.forEach(line => renderLine(line));
    fills.forEach(fill => renderFill(fill));
    
    // Clear selection
    selectedPoint = null;
    draggedPoint = null;
    
    saveState();
    updateStatus();
}

// ============ Zoom and Pan ============

function updateTransform() {
    transformGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
    zoomLevelDisplay.textContent = `${Math.round(zoom * 100)}%`;
}

function zoomBy(delta, centerX, centerY) {
    const oldZoom = zoom;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    
    if (centerX !== undefined && centerY !== undefined) {
        // Zoom towards the specified point
        const zoomRatio = zoom / oldZoom;
        panX = centerX - (centerX - panX) * zoomRatio;
        panY = centerY - (centerY - panY) * zoomRatio;
    }
    
    updateTransform();
}

function zoomTo(newZoom, centerX, centerY) {
    const oldZoom = zoom;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    
    if (centerX !== undefined && centerY !== undefined) {
        const zoomRatio = zoom / oldZoom;
        panX = centerX - (centerX - panX) * zoomRatio;
        panY = centerY - (centerY - panY) * zoomRatio;
    }
    
    updateTransform();
}

function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
}

function handleWheel(e) {
    e.preventDefault();
    
    const rect = whiteboard.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Zoom towards mouse position
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomBy(delta, mouseX, mouseY);
}

function handlePanStart(e) {
    // Middle mouse button (button 1) or space key held
    if (e.button === 1) {
        e.preventDefault();
        isPanning = true;
        panStart = { x: e.clientX - panX, y: e.clientY - panY };
        whiteboard.style.cursor = 'grabbing';
    }
}

function handlePanMove(e) {
    if (!isPanning) return;
    
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    updateTransform();
}

function handlePanEnd(e) {
    if (isPanning) {
        isPanning = false;
        whiteboard.style.cursor = '';
    }
}

// Utilities
function getMouseCoords(e) {
    const rect = whiteboard.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Transform screen coordinates to world coordinates
    return {
        x: (screenX - panX) / zoom,
        y: (screenY - panY) / zoom
    };
}

function updateStatus() {
    let text = '';
    switch (currentMode) {
        case 'add':
            text = 'Click to add a point';
            break;
        case 'move':
            text = 'Drag points to move them';
            break;
        case 'connect':
            text = selectedPoint 
                ? 'Click another point to connect (chains automatically), or click elsewhere to cancel'
                : 'Click a point to start connecting';
            break;
        case 'delete':
            text = 'Click a point or line to delete it';
            break;
        case 'fill':
            text = 'Click inside a bounded region to fill it';
            break;
        case 'select':
            text = selectedGroup.size > 0
                ? `${selectedGroup.size} point${selectedGroup.size !== 1 ? 's' : ''} selected - use group tools or click points to add/remove`
                : 'Click points to add them to selection';
            break;
    }
    
    const stats = `${points.length} point${points.length !== 1 ? 's' : ''}, ${lines.length} line${lines.length !== 1 ? 's' : ''}`;
    statusText.textContent = `${text} • ${stats}`;
}

// Start the app
init();
