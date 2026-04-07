// === STATE ===
// 전역 상태 변수 — 모든 다른 JS 파일에서 공유

let schema = { models: [], enums: [] };
let snapshot = null;
let zoom = 1, panX = 0, panY = 0;

let isDraggingCanvas = false, dragStartX, dragStartY;
let draggingCard = null, dragOffsetX, dragOffsetY;

let ctxTarget = null, editingField = null, selectedExcelModel = null;
let changeLog = [], cardinalityMap = {}, modelPositions = {};
let cardSizes = {};
let historyStack = [], historyIndex = -1;
let showEnumLines = true;
let annotations = [];
let draggingAnnotation = null;
let uiModelConfig = {}; // { [modelName]: { viewMode: '1to1' | 'excel' | 'card' } }
