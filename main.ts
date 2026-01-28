import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cube } from './js/Cube.js';
import { SelectionManager } from './js/SelectionManager.js';
import { UIManager } from './js/UIManager.js';
import { Cutter } from './js/Cutter.js';
import { PresetManager } from './js/presets/PresetManager.js';
import { NetManager } from './js/net/NetManager.js';
import { AnimationPlayer } from './js/animation/AnimationPlayer.js';
import { GeometryResolver } from './js/geometry/GeometryResolver.js';
import { buildUserPresetState } from './js/presets/userPresetState.js';
import { NoopStorageAdapter, IndexedDbStorageAdapter } from './js/storage/storageAdapter.js';
import { CutService } from './js/cutter/CutService.js';
import { initReactApp } from './js/ui/reactApp.js';
import { ObjectModelManager, type EngineEvent } from './js/model/objectModelManager.js';
import type { CutFacePolygon, DisplayState, LearningProblem, UserPresetState } from './js/types.js';
import type { ObjectNetState, NetPlan } from './js/model/objectModel.js';
import { normalizeSnapPointId, parseSnapPointId, type SnapPointID } from './js/geometry/snapPointId.js';
import { createLabel, createMarker } from './js/utils.js';

const isDebugEnabled = () => {
    const flag = (globalThis as any).__DEBUG__ === true || (globalThis as any).DEBUG === true;
    if (flag) return true;
    try {
        return localStorage.getItem('DEBUG') === 'true' || sessionStorage.getItem('DEBUG') === 'true';
    } catch {
        return false;
    }
};

class App {
    isCutExecuted: boolean;
    currentNetPlan: NetPlan | null;
    snappedPointInfo: {
        point: THREE.Vector3;
        object: THREE.Object3D;
        snapId?: string;
        isMidpoint?: boolean;
    } | null;
    cameraTargetPosition: THREE.Vector3 | null;
    isCameraAnimating: boolean;
    currentLabelMap: Record<string, string> | null;
    userPresets: UserPresetState[];
    editingUserPresetId: string | null;
    userPresetStorage: NoopStorageAdapter | IndexedDbStorageAdapter;
    useReactPresets: boolean;
    useReactUserPresets: boolean;
    learningLines: THREE.Line[];
    learningAnimationToken: { cancelled: boolean } | null;
    learningPlane: THREE.Mesh | null;
    learningHintLines: THREE.Line[];
    learningCutSegments: Array<{ startId: string; endId: string }>;
    learningSteps: Array<{
        instruction: string;
        reason?: string;
        action?: {
            type: 'mark' | 'hintSegment' | 'drawSegment' | 'cut' | 'message';
            snapId?: string;
            startId?: string;
            endId?: string;
            kind?: 'edge' | 'diagonal';
            index?: number;
        };
    }>;
    learningStepIndex: number;
    learningStepRunning: boolean;

    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    mainLight: THREE.DirectionalLight;
    debugFaceLogDone: boolean;
    debugNetLogDone: boolean;
    debugInitLogDone: boolean;
    debugEnabledLast: boolean;
    raycaster: THREE.Raycaster;
    midPointHighlightMaterial: THREE.MeshBasicMaterial;
    highlightMarker: THREE.Mesh;

    ui: UIManager;
    cube: Cube;
    resolver: GeometryResolver;
    cutter: Cutter;
    netManager: NetManager;
    cutService: CutService;
    selection: SelectionManager;
    presetManager: PresetManager;
    objectModelManager: ObjectModelManager;
    currentMode: string;
    panelOpen: boolean;
    netUnfoldGroup: THREE.Group | null;
    netUnfoldState: 'closed' | 'opening' | 'open' | 'closing' | 'prescale' | 'postscale';
    netUnfoldDuration: number;
    netUnfoldFaceDuration: number;
    netUnfoldStagger: number;
    defaultCameraPosition: THREE.Vector3;
    defaultCameraTarget: THREE.Vector3;
    defaultCameraZoom: number;
    netBoundsPadding: number;
    netUnfoldFaces: Array<{
        pivot: THREE.Group;
        mesh: THREE.Mesh;
        startQuat: THREE.Quaternion;
        endQuat: THREE.Quaternion;
        delayIndex: number;
        faceId?: string;
    }>;
    netUnfoldTargetCenter: THREE.Vector3 | null;
    netUnfoldPositionTarget: THREE.Vector3 | null;
    netUnfoldPreScaleDelay: number;
    netUnfoldPostScaleDelay: number;
    netUnfoldScaleReadyAt: number | null;
    netAnimationPlayer: AnimationPlayer;
    netAnimationDirection: 'open' | 'close';
    netFaceProgress: Map<string, number>;
    netCameraStarts: Map<string, { position: THREE.Vector3; target: THREE.Vector3 }>;
    netCameraEnds: Map<string, { position: THREE.Vector3; target: THREE.Vector3 }>;
    useAnimationSpecNet: boolean;
    netZoomStart: number;
    netZoomEnd: number;
    netAnimationStartAt: number;
    netAnimationDurationMs: number;
    netAnimationZoomActive: boolean;
    netUpStart: THREE.Vector3;
    netUpEnd: THREE.Vector3;
    netUpTemp: THREE.Vector3;
    netSelectionActive: boolean;
    netHoverFaceId: string | null;
    netRootFaceId: string | null;
    netSelectedFaceId: string | null;
    netCameraCenter: THREE.Vector3;
    netCameraNormal: THREE.Vector3;
    netCameraBasisU: THREE.Vector3;
    netCameraBasisV: THREE.Vector3;
    netCameraObliqueDir: THREE.Vector3;
    netCameraTopPosition: THREE.Vector3;
    netCameraObliquePosition: THREE.Vector3;
    netCameraObliqueUp: THREE.Vector3;
    netCameraTopUp: THREE.Vector3;
    netPreCameraTimeout: ReturnType<typeof setTimeout> | null;
    netCameraFrontDir: THREE.Vector3;
    netCameraRightDir: THREE.Vector3;
    netPreCameraActive: boolean;
    netPreCameraStartAt: number;
    netPreCameraDurationMs: number;
    netPreCameraStartPos: THREE.Vector3;
    netPreCameraStartTarget: THREE.Vector3;
    netPreCameraStartUp: THREE.Vector3;
    netPreCameraEndPos: THREE.Vector3;
    netPreCameraEndTarget: THREE.Vector3;
    netPreCameraEndUp: THREE.Vector3;
    netPreCameraTempUp: THREE.Vector3;
    netPreCameraOnComplete: (() => void) | null;
    netPreCameraStartZoom: number;
    netPreCameraEndZoom: number;
    netAfterFoldAction: (() => void) | null;
    layoutPanelOffset: number;
    layoutTargetPanelOffset: number;
    layoutTransitionStart: number;
    layoutTransitionFrom: number;
    layoutTransitionTo: number;
    layoutTransitionDuration: number;
    layoutTransitionActive: boolean;

    constructor() {
        // --- State Properties ---
        this.isCutExecuted = false;
        this.currentNetPlan = null;
        this.snappedPointInfo = null;
        this.cameraTargetPosition = null;
        this.isCameraAnimating = false;
        this.currentLabelMap = null;
        this.userPresets = [];
        this.editingUserPresetId = null;
        this.userPresetStorage = this.createUserPresetStorage();
        this.useReactPresets = false;
        this.useReactUserPresets = false;
        this.currentMode = 'free';
        this.panelOpen = false;
        this.netUnfoldGroup = null;
        this.netUnfoldState = 'closed';
        this.netUnfoldDuration = 900;
        this.netUnfoldFaceDuration = 900;
        this.netUnfoldStagger = 800;
        const baseCameraPosition = new THREE.Vector3(10, 8, 10);
        const baseDistance = baseCameraPosition.length();
        const yawRight = THREE.MathUtils.degToRad(15);
        const pitchUp = THREE.MathUtils.degToRad(10);
        const baseDir = new THREE.Vector3(
            Math.tan(yawRight),
            Math.tan(pitchUp),
            1
        ).normalize();
        this.defaultCameraPosition = baseDir.multiplyScalar(baseDistance);
        this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);
        this.defaultCameraZoom = 1;
        this.netBoundsPadding = 0.75;
        this.netUnfoldFaces = [];
        this.netUnfoldTargetCenter = null;
        this.netUnfoldPositionTarget = null;
        this.netUnfoldPreScaleDelay = 320;
        this.netUnfoldPostScaleDelay = 220;
        this.netUnfoldScaleReadyAt = null;
        this.netFaceProgress = new Map();
        this.netCameraStarts = new Map();
        this.netCameraEnds = new Map();
        this.netAnimationDirection = 'open';
        this.netAnimationPlayer = new AnimationPlayer({
            dispatch: this.dispatchNetAnimation.bind(this)
        });
        this.useAnimationSpecNet = true;
        this.netZoomStart = this.defaultCameraZoom;
        this.netZoomEnd = this.defaultCameraZoom;
        this.netAnimationStartAt = 0;
        this.netAnimationDurationMs = 0;
        this.netAnimationZoomActive = false;
        this.netUpStart = new THREE.Vector3(0, 1, 0);
        this.netUpEnd = new THREE.Vector3(0, 0, -1);
        this.netUpTemp = new THREE.Vector3(0, 1, 0);
        this.netSelectionActive = false;
        this.netHoverFaceId = null;
        this.netRootFaceId = null;
        this.netSelectedFaceId = null;
        this.netCameraCenter = new THREE.Vector3();
        this.netCameraNormal = new THREE.Vector3();
        this.netCameraBasisU = new THREE.Vector3();
        this.netCameraBasisV = new THREE.Vector3();
        this.netCameraObliqueDir = new THREE.Vector3();
        this.netCameraTopPosition = new THREE.Vector3();
        this.netCameraObliquePosition = new THREE.Vector3();
        this.netCameraObliqueUp = new THREE.Vector3(0, 1, 0);
        this.netCameraTopUp = new THREE.Vector3(0, 1, 0);
        this.netPreCameraTimeout = null;
        this.netCameraFrontDir = new THREE.Vector3();
        this.netCameraRightDir = new THREE.Vector3();
        this.netPreCameraActive = false;
        this.netPreCameraStartAt = 0;
        this.netPreCameraDurationMs = 0;
        this.netPreCameraStartPos = new THREE.Vector3();
        this.netPreCameraStartTarget = new THREE.Vector3();
        this.netPreCameraStartUp = new THREE.Vector3(0, 1, 0);
        this.netPreCameraEndPos = new THREE.Vector3();
        this.netPreCameraEndTarget = new THREE.Vector3();
        this.netPreCameraEndUp = new THREE.Vector3(0, 1, 0);
        this.netPreCameraTempUp = new THREE.Vector3();
        this.netPreCameraOnComplete = null;
        this.netPreCameraStartZoom = 1;
        this.netPreCameraEndZoom = 1;
        this.netAfterFoldAction = null;
        this.layoutPanelOffset = 0;
        this.layoutTargetPanelOffset = 0;
        this.layoutTransitionStart = 0;
        this.layoutTransitionFrom = 0;
        this.layoutTransitionTo = 0;
        this.layoutTransitionDuration = 240;
        this.layoutTransitionActive = false;
        this.debugFaceLogDone = false;
        this.debugNetLogDone = false;
        this.debugInitLogDone = false;
        this.debugEnabledLast = isDebugEnabled();
        this.learningLines = [];
        this.learningAnimationToken = null;
        this.learningPlane = null;
        this.learningHintLines = [];
        this.learningCutSegments = [];
        this.learningSteps = [];
        this.learningStepIndex = 0;
        this.learningStepRunning = false;

        // --- Core Three.js Components ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f8f8);

        const size = 8;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, 100);
        this.camera.position.copy(this.defaultCameraPosition);
        this.camera.lookAt(0, 0, 0);
        this.camera.zoom = this.defaultCameraZoom;
        this.camera.updateProjectionMatrix();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        document.body.appendChild(this.renderer.domElement);

        /** @type {any} */
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.raycaster = new THREE.Raycaster();

        // --- Lights and Helpers ---
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        this.mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.mainLight.position.set(6, 8, 6);
        this.mainLight.target.position.set(0, 0, 0);
        this.scene.add(this.mainLight);
        this.scene.add(this.mainLight.target);

        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.7 });
        this.midPointHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
        this.highlightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), highlightMaterial);
        this.highlightMarker.visible = false;
        this.scene.add(this.highlightMarker);

        // --- Managers ---
        const hasReactSidePanel = !!document.getElementById('react-side-panel-root');
        this.ui = new UIManager({ legacyControls: !hasReactSidePanel });
        this.cube = new Cube(this.scene, size);
        this.cube.setFaceOutlineVisible(true);
        this.resolver = new GeometryResolver({ size: this.cube.getSize(), indexMap: this.cube.getIndexMap() });
        this.cutter = new Cutter(this.scene);
        this.cutter.setDebug(this.debugEnabledLast);
        this.netManager = new NetManager();
        this.netManager.setResolver(this.resolver);
        this.netManager.enable2dView = false;
        this.selection = new SelectionManager(this.scene, this.cube, this.ui, this.resolver);
        this.presetManager = new PresetManager(this.selection, this.cube, this.cutter, this.resolver);
        this.objectModelManager = new ObjectModelManager({
            cube: this.cube,
            resolver: this.resolver,
            ui: this.ui,
            selection: this.selection
        });
        this.cutService = new CutService({
            cutter: this.cutter,
            objectModelManager: this.objectModelManager,
            selection: this.selection,
            resolver: this.resolver,
            ui: this.ui
        });
        this.cube.setResolver(this.resolver); // NEW
        this.cutter.setEdgeHighlightColorResolver((edgeId: string) => this.objectModelManager.getEdgeHighlightColor(edgeId));
    }

    init() {
        const hasReactSidePanel = !!document.getElementById('react-side-panel-root');
        this.useReactPresets = hasReactSidePanel || !!document.getElementById('react-topbar-root');
        this.useReactUserPresets = hasReactSidePanel || !!document.getElementById('react-user-presets-root');
        globalThis.__engine = {
            getDisplayState: () => this.ui.getDisplayState(),
            setDisplayState: (display) => this.applyDisplayState(display),
            getPresets: () => this.presetManager.getPresets(),
            applyPreset: (name) => this.handlePresetChange(name),
            setMode: (mode) => this.handleModeChange(mode),
            setSettingsCategory: (category) => this.handleSettingsCategoryChange(category),
            flipCut: () => this.handleFlipCutClick(),
            toggleNet: () => this.handleToggleNetClick(),
            resetScene: () => this.handleResetClick(),
            applyLearningProblem: (problem) => this.previewLearningProblem(problem),
            previewLearningProblem: (problem) => this.previewLearningProblem(problem),
            startLearningSolution: (problem) => this.startLearningSolution(problem),
            advanceLearningStep: () => this.advanceLearningStep(),
            listUserPresets: () => this.userPresets.slice(),
            isUserPresetStorageEnabled: () => this.userPresetStorage.isEnabled(),
            saveUserPreset: (form) => this.handleSaveUserPreset(form),
            cancelUserPresetEdit: () => this.handleCancelUserPresetEdit(),
            applyUserPreset: (id) => this.handleUserPresetApply(id),
            editUserPreset: (id) => this.handleUserPresetEdit(id),
            deleteUserPreset: (id) => this.handleUserPresetDelete(id),
            configureVertexLabels: (labels: string[]) => this.configureVertexLabelsFromReact(labels),
            configureCube: (lx: number, ly: number, lz: number) => this.configureCubeFromDimensions(lx, ly, lz),
            getCubeSize: () => this.cube.getSize(),
            getVertexLabelMap: () => this.currentLabelMap, // Add this line
            setPanelOpen: (open: boolean) => this.handlePanelOpenChange(open),
            getNetVisible: () => this.objectModelManager.getNetVisible(),
            getAnimationSpecEnabled: () => this.useAnimationSpecNet,
            setAnimationSpecEnabled: (enabled: boolean) => this.setAnimationSpecEnabled(enabled)
        };
        initReactApp();

        this.objectModelManager.subscribe((event) => this.handleEngineEvent(event));
        this.objectModelManager.build();

        if (!this.useReactPresets) {
            this.ui.populatePresets(this.presetManager.getPresets());
        }
        if (!this.useReactUserPresets) {
            this.ui.setUserPresetStorageEnabled(this.userPresetStorage.isEnabled());
        }
        this.loadUserPresets();
        this.bindEventListeners();
        this.setInitialState();
        this.handleResize();
        this.animate();
    }

    handleEngineEvent(event: EngineEvent) {
        switch (event.type) {
            case "SSOT_UPDATED": {
                const model = this.objectModelManager.getModel();
                const display = this.objectModelManager.getDisplayState();
                
                this.cube.syncWithModel(model);
                
                this.objectModelManager.applyDisplayToView(display);
                this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
                this.cutter.setTransparency(display.cubeTransparent);
                this.selection.toggleVertexLabels(display.showVertexLabels);
                
                // Sync global/React state
                break;
            }
            case "CUT_RESULT_UPDATED": {
                this.cutter.refreshEdgeHighlightColors();
                this.cutter.updateCutPointMarkers(this.objectModelManager.resolveCutIntersectionPositions());
                const solid = this.objectModelManager.getModel()?.ssot;
                this.netManager.update(this.objectModelManager.getCutSegments(), solid, this.resolver);
                this.selection.updateSplitLabels(this.objectModelManager.getCutIntersections());
                break;
            }
            case "NET_DERIVED_UPDATED": {
                this.applyNetStateFromModel();
                break;
            }
            case "ERROR": {
                console.error("Engine Error:", event.message);
                this.ui.showMessage(event.message, "warning");
                break;
            }
        }
    }

    setInitialState() {
        const display = this.ui.getDisplayState();
        this.objectModelManager.setDisplay(display);
        this.objectModelManager.applyDisplayToView(display);
        this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
        const modelDisplay = this.objectModelManager.getDisplayState();
        this.cutter.setTransparency(modelDisplay.cubeTransparent);
    }

    createUserPresetStorage() {
        const adapter = new IndexedDbStorageAdapter();
        if (!adapter.isEnabled()) return new NoopStorageAdapter();
        return adapter;
    }

    async loadUserPresets() {
        try {
            const items = await this.userPresetStorage.list();
            this.userPresets = items.sort((a, b) => {
                const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
                const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
                return tb - ta;
            });
            if (!this.useReactUserPresets) {
                this.ui.setUserPresetList(this.userPresets);
            }
            if (typeof globalThis.__refreshUserPresets === 'function') {
                globalThis.__refreshUserPresets();
            }
        } catch (e) {
            console.warn('Failed to load user presets.', e);
            this.userPresets = [];
            if (!this.useReactUserPresets) {
                this.ui.setUserPresetList(this.userPresets);
            }
            if (typeof globalThis.__refreshUserPresets === 'function') {
                globalThis.__refreshUserPresets();
            }
        }
    }
    
    bindEventListeners() {
        // Browser Events
        window.addEventListener('click', this.handleClick.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        this.controls.addEventListener('start', () => { this.isCameraAnimating = false; });

        // UI Manager Events (legacy fallback only)
        if (!this.useReactPresets) {
            this.ui.onPresetChange(this.handlePresetChange.bind(this));
            this.ui.onConfigureClick(this.handleConfigureClick.bind(this));
        }
        this.ui.onVertexLabelChange((checked) => this.applyDisplayState({ showVertexLabels: checked }));
        this.ui.onFaceLabelChange((checked) => this.applyDisplayState({ showFaceLabels: checked }));
        this.ui.onEdgeLabelModeChange((mode) => this.applyDisplayState({ edgeLabelMode: mode }));
        this.ui.onCutSurfaceChange((checked) => this.applyDisplayState({ showCutSurface: checked }));
        this.ui.onPyramidChange((checked) => this.applyDisplayState({ showPyramid: checked }));
        this.ui.onTransparencyChange((checked) => this.applyDisplayState({ cubeTransparent: checked }));
        // this.ui.onConfigureVertexLabelsClick(this.handleConfigureVertexLabelsClick.bind(this)); // REMOVE
        if (!this.useReactUserPresets) {
            this.ui.onSaveUserPresetClick(this.handleSaveUserPreset.bind(this));
            this.ui.onCancelUserPresetEdit(this.handleCancelUserPresetEdit.bind(this));
            this.ui.onUserPresetApply(this.handleUserPresetApply.bind(this));
            this.ui.onUserPresetDelete(this.handleUserPresetDelete.bind(this));
            this.ui.onUserPresetEdit(this.handleUserPresetEdit.bind(this));
        }
    }

    // --- Core Logic Methods ---
    executeCut() {
        const success = this.cutService.executeCut();
        this.isCutExecuted = !!success;
    }

    finalizeResetScene() {
        this.cancelLearningAnimation();
        this.clearLearningLines();
        this.clearLearningPlane();
        this.clearLearningHints();
        this.netSelectionActive = false;
        this.netRootFaceId = null;
        this.clearNetFaceHighlights();
        this.netPreCameraActive = false;
        this.netPreCameraOnComplete = null;
        if (this.netPreCameraTimeout) {
            clearTimeout(this.netPreCameraTimeout);
            this.netPreCameraTimeout = null;
        }
        this.cube.setFaceOutlineVisible(false);
        if (this.netAnimationPlayer.isPlaying()) {
            this.netAnimationPlayer.stop();
            this.resetNetAnimationCaches();
        }
        if (this.currentNetPlan) {
            this.netFaceProgress.clear();
            this.cube.applyNetPlan(this.currentNetPlan, 0, this.netFaceProgress);
        }
        if (this.objectModelManager.getNetState().state !== 'closed') {
            this.clearNetUnfoldGroup();
            this.cube.setVisible(true);
        }
        this.objectModelManager.setNetVisible(false);
        this.netManager.hide();
        if (typeof globalThis.__setNetVisible === 'function') {
            globalThis.__setNetVisible(false);
        }
        this.selection.reset();
        this.cutter.resetInversion();
        this.cutter.reset();
        this.objectModelManager.clearCutIntersections();
        this.objectModelManager.syncFromCube();
        const solid = this.objectModelManager.getModel()?.ssot;
        this.netManager.update([], solid, this.resolver);
        this.isCutExecuted = false;
        this.snappedPointInfo = null;
        this.highlightMarker.visible = false;
        this.ui.setExplanation('');
        this.startNetPreCameraMove({
            endPos: this.defaultCameraPosition.clone(),
            endTarget: this.defaultCameraTarget.clone(),
            endUp: new THREE.Vector3(0, 1, 0),
            endZoom: this.defaultCameraZoom,
            onComplete: () => {}
        });
    }

    resetScene() {
        if (this.objectModelManager.getNetVisible() || this.netAnimationPlayer.isPlaying()) {
            if (!this.currentNetPlan) {
                this.finalizeResetScene();
                return;
            }
            this.netAfterFoldAction = () => this.finalizeResetScene();
            this.startNetFold();
            return;
        }
        this.finalizeResetScene();
    }

    clearLearningLines() {
        this.learningLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            if (line.material instanceof THREE.Material) {
                line.material.dispose();
            } else if (Array.isArray(line.material)) {
                line.material.forEach(mat => mat.dispose());
            }
        });
        this.learningLines = [];
    }

    cancelLearningAnimation() {
        if (this.learningAnimationToken) {
            this.learningAnimationToken.cancelled = true;
            this.learningAnimationToken = null;
        }
        this.learningStepRunning = false;
    }

    clearLearningPlane() {
        if (!this.learningPlane) return;
        this.scene.remove(this.learningPlane);
        this.learningPlane.geometry.dispose();
        if (this.learningPlane.material instanceof THREE.Material) {
            this.learningPlane.material.dispose();
        } else if (Array.isArray(this.learningPlane.material)) {
            this.learningPlane.material.forEach(mat => mat.dispose());
        }
        this.learningPlane = null;
    }

    clearLearningHints() {
        this.learningHintLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            if (line.material instanceof THREE.Material) {
                line.material.dispose();
            } else if (Array.isArray(line.material)) {
                line.material.forEach(mat => mat.dispose());
            }
        });
        this.learningHintLines = [];
    }

    addLearningHintSegment(segment: { startId: string; endId: string; kind?: 'edge' | 'diagonal' }) {
        const start = this.resolver.resolveSnapPoint(segment.startId);
        const end = this.resolver.resolveSnapPoint(segment.endId);
        if (!start || !end) return;
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const color = segment.kind === 'edge' ? 0x1aa27a : 0x2f7fe5;
        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(geometry, material);
        line.userData = { type: 'learning-hint', kind: segment.kind || 'diagonal' };
        this.scene.add(line);
        this.learningHintLines.push(line);
    }

    addLearningMarker(snapId: string) {
        if (!snapId) return;
        if (this.selection.getSelectedSnapIds().includes(snapId)) return;
        this.selection.addPointFromSnapId(snapId);
    }

    formatSnapInstruction(snapId: string) {
        const parsed = parseSnapPointId(snapId);
        if (!parsed) return '図に印をつけよう。';
        if (parsed.type === 'vertex') {
            const index = Number(parsed.vertexIndex);
            const label = this.cube.getDisplayLabelByIndex(index) || parsed.vertexIndex;
            return `頂点${label}に印をつけよう。`;
        }
        if (parsed.type === 'edge') {
            const edgeIndex = parsed.edgeIndex || '';
            const i1 = Number(edgeIndex[0]);
            const i2 = Number(edgeIndex[1]);
            const label1 = this.cube.getDisplayLabelByIndex(i1) || edgeIndex[0];
            const label2 = this.cube.getDisplayLabelByIndex(i2) || edgeIndex[1];
            const ratio = parsed.ratio;
            if (ratio && ratio.numerator * 2 === ratio.denominator) {
                return `辺${label1}${label2}の中点に印をつけよう。`;
            }
            if (ratio) {
                const left = ratio.numerator;
                const right = ratio.denominator - ratio.numerator;
                return `辺${label1}${label2}を${left}:${right}に分ける点に印をつけよう。`;
            }
            return `辺${label1}${label2}上の点に印をつけよう。`;
        }
        return '図に印をつけよう。';
    }

    setLearningPlane(plane: LearningProblem['highlightPlane']) {
        this.clearLearningPlane();
        if (!plane) return;
        const { lx, ly, lz } = this.cube.edgeLengths;
        let geometry = null;
        if (plane === 'front' || plane === 'back') {
            geometry = new THREE.PlaneGeometry(lx, ly);
        } else if (plane === 'top' || plane === 'bottom') {
            geometry = new THREE.PlaneGeometry(lx, lz);
        } else {
            geometry = new THREE.PlaneGeometry(lz, ly);
        }
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd966,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        if (plane === 'front') {
            mesh.position.set(0, 0, lz / 2);
        } else if (plane === 'back') {
            mesh.position.set(0, 0, -lz / 2);
        } else if (plane === 'top') {
            mesh.rotation.x = Math.PI / 2;
            mesh.position.set(0, ly / 2, 0);
        } else if (plane === 'bottom') {
            mesh.rotation.x = Math.PI / 2;
            mesh.position.set(0, -ly / 2, 0);
        } else if (plane === 'right') {
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(lx / 2, 0, 0);
        } else if (plane === 'left') {
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(-lx / 2, 0, 0);
        }
        this.scene.add(mesh);
        this.learningPlane = mesh;
    }

    getUserPresetState(meta = {}) {
        return buildUserPresetState({
            cube: this.cube,
            selection: this.selection,
            cutter: this.cutter,
            ui: this.ui,
            labelMap: this.currentLabelMap,
            meta
        });
    }

    applyDisplayState(display: Partial<DisplayState> = {}) {
        const current = this.objectModelManager.getDisplayState();
        const next = { ...current, ...display };
        this.ui.applyDisplayState(next);
        this.objectModelManager.setDisplay(next);
        this.objectModelManager.applyDisplayToView(next);
        this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
        
        if (this.objectModelManager.getNetState().state !== 'closed') {
            this.cube.setVisible(false);
            this.cutter.setVisible(false);
        }
    }

    applyUserPresetState(state: UserPresetState) {
        if (!state) return;
        this.resetScene();

        const size = state.cube && state.cube.size;
        if (size && typeof size.lx === 'number' && typeof size.ly === 'number' && typeof size.lz === 'number') {
            this.cube.createCube([size.lx, size.ly, size.lz]);
            this.resolver.setSize(this.cube.getSize());
            this.objectModelManager.syncFromCube();
        }

        const labelMap = state.cube ? state.cube.labelMap : null;
        this.currentLabelMap = labelMap || null;
        this.cube.setVertexLabelMap(this.currentLabelMap);
        this.resolver.setLabelMap(this.currentLabelMap);
        this.objectModelManager.syncFromCube();

        this.applyDisplayState(state.display || {});
        if (typeof (globalThis as any).__setDisplayState === 'function') {
            (globalThis as any).__setDisplayState(this.ui.getDisplayState());
        }

        const snapIds = state.cut && Array.isArray(state.cut.snapPoints) ? state.cut.snapPoints : [];
        this.selection.reset();
        snapIds.forEach((snapId: string) => this.selection.addPointFromSnapId(snapId));

        const inverted = state.cut ? !!state.cut.inverted : false;
        this.cutter.setCutInverted(inverted, false);

        if (snapIds.length >= 3) {
            const solid = this.objectModelManager.getModel()?.ssot || null;
            const success = this.cutService.executeCut({ snapIds, structure: solid || null });
            this.isCutExecuted = !!success;
            if (state.cut && state.cut.result) {
                const structure = this.cube.getStructure ? this.cube.getStructure() : solid;
                this.cutService.applyCutResultMeta(state.cut.result, snapIds, structure);
            }
        }
    }

    // --- Event Handlers ---
    handleClick(e: MouseEvent) {
        if (this.netSelectionActive) {
            this.handleNetSelectionClick(e);
            return;
        }
        if (this.isCutExecuted) return;
        if (this.currentMode !== 'free') return;
        if (!this.snappedPointInfo) return;
        if (this.selection.isObjectSelected(this.snappedPointInfo.object)) return;

        if (this.selection.selected.length === 2) {
            const p0 = this.selection.getSelectedPoint(0);
            const p1 = this.selection.getSelectedPoint(1);
            const p2 = this.snappedPointInfo.point;
            if (p0 && p1 && p2) {
                const v1 = new THREE.Vector3().subVectors(p1, p0);
                const v2 = new THREE.Vector3().subVectors(p2, p0);
                if (v1.cross(v2).lengthSq() < 1e-6) {
                    this.ui.showMessage("3つの点が同一直線上になるため、選択できません。", "warning");
                    return;
                }
            }
        }
        if (this.selection.selected.length >= 3) return;

        this.selection.addPoint(this.snappedPointInfo);
        const display = this.objectModelManager.getDisplayState();
        this.selection.toggleVertexLabels(display.showVertexLabels);

        if (this.selection.selected.length === 3) this.executeCut();
    }

    handleMouseMove(e: MouseEvent) {
        if (this.netSelectionActive) {
            this.handleNetSelectionMove(e);
            return;
        }
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        this.selection.clearPreview();

        const cutMarkers = (this.cutter.vertexMarkers || [])
            .filter(m => m.visible && m.userData && m.userData.type === 'cutPoint');
        if (cutMarkers.length) {
            const cutHits = this.raycaster.intersectObjects(cutMarkers);
            if (cutHits.length > 0) {
                const marker = cutHits[0].object;
                const edgeId = marker.userData ? marker.userData.edgeId : null;
                if (edgeId) {
                    this.selection.previewSplitAtCutPoint(edgeId, marker.position);
                }
                this.highlightMarker.visible = false;
                this.snappedPointInfo = null;
                document.body.style.cursor = 'pointer';
                return;
            }
        }

        if (this.isCutExecuted || this.currentMode !== 'free') {
            this.highlightMarker.visible = false;
            this.snappedPointInfo = null;
            document.body.style.cursor = 'auto';
            return;
        }

        const intersects = this.raycaster.intersectObjects([...this.cube.vertexMeshes, ...this.cube.edgeMeshes]);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const object = intersection.object;
            const userData = object.userData;

            if (this.selection.isObjectSelected(object)) {
                this.highlightMarker.visible = false;
                this.snappedPointInfo = null;
                document.body.style.cursor = 'auto';
                return;
            }

            let snappedPoint: THREE.Vector3;
            let isMidpoint = false;
            let edgeLength = null;
            let snappedLength = null;

            if (userData.type === 'vertex') {
                const pos = userData.vertexId ? this.resolver.resolveVertex(userData.vertexId) : null;
                if (!pos) {
                    this.highlightMarker.visible = false;
                    this.snappedPointInfo = null;
                    document.body.style.cursor = 'auto';
                    return;
                }
                snappedPoint = pos;
                if (this.highlightMarker.material instanceof THREE.MeshBasicMaterial) {
                    this.highlightMarker.material.color.set(0x808080);
                }
            } else {
                if (!userData.edgeId) {
                    this.highlightMarker.visible = false;
                    this.snappedPointInfo = null;
                    document.body.style.cursor = 'auto';
                    return;
                }
                const resolved = this.resolver.resolveEdge(userData.edgeId);
                if (!resolved) {
                    this.highlightMarker.visible = false;
                    this.snappedPointInfo = null;
                    document.body.style.cursor = 'auto';
                    return;
                }
                const edgeStart = resolved.start;
                const edgeEnd = resolved.end;
                const edgeDir = new THREE.Vector3().subVectors(edgeEnd, edgeStart);
                edgeLength = edgeDir.length();
                edgeDir.normalize();
                const intersectVec = new THREE.Vector3().subVectors(intersection.point, edgeStart);
                let projectedLength = intersectVec.dot(edgeDir);
                snappedLength = Math.round(projectedLength);
                snappedLength = Math.max(0, Math.min(edgeLength, snappedLength));
                snappedPoint = edgeStart.clone().add(edgeDir.multiplyScalar(snappedLength));
                isMidpoint = Math.abs(snappedLength - edgeLength / 2) < 0.1;
                
                if (this.highlightMarker.material instanceof THREE.MeshBasicMaterial) {
                    this.highlightMarker.material.color.set(isMidpoint ? 0x00ff00 : 0x808080);
                }
                this.selection.previewSplit(userData.edgeId || userData.index, snappedPoint);
            }
            this.highlightMarker.position.copy(snappedPoint);
            this.highlightMarker.visible = true;
            let snapId: string | null = null;
            if (userData.type === 'vertex') {
                snapId = userData.vertexId || null;
            } else if (userData.type === 'edge' && edgeLength !== null && snappedLength !== null) {
                if (userData.edgeId) {
                    const denominator = Math.round(edgeLength);
                    const numerator = Math.round(snappedLength);
                    snapId = this.cube.getSnapPointIdForEdgeId(userData.edgeId, numerator, denominator);
                }
            }
            if (!snapId) {
                this.highlightMarker.visible = false;
                this.snappedPointInfo = null;
                document.body.style.cursor = 'auto';
                return;
            }
            this.snappedPointInfo = { point: snappedPoint, object: object, isMidpoint: isMidpoint, snapId };
            document.body.style.cursor = 'pointer';
        } else {
            this.highlightMarker.visible = false;
            this.snappedPointInfo = null;
            document.body.style.cursor = 'auto';
        }
    }

    handleResize() {
        this.updateLayout(this.layoutPanelOffset);
    }

    updateLayout(panelOffsetOverride?: number) {
        const sidebarWidth = 64;
        const panelWidth = 320;
        const panelOffset = panelOffsetOverride ?? (this.panelOpen ? panelWidth : 0);
        const availableWidth = Math.max(200, window.innerWidth - sidebarWidth - panelOffset);
        const messageHeight = Math.round(window.innerHeight * 0.2);
        const availableHeight = Math.max(200, window.innerHeight - messageHeight);
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--sidebar-width', `${sidebarWidth}px`);
        rootStyle.setProperty('--panel-offset', `${panelOffset}px`);
        rootStyle.setProperty('--message-area-height', `${messageHeight}px`);
        this.cube.resize(this.camera, availableWidth, availableHeight);
        this.resolver.setSize(this.cube.getSize());
        this.renderer.setSize(availableWidth, availableHeight);
        const canvas = this.renderer.domElement;
        canvas.style.position = 'fixed';
        canvas.style.top = `${messageHeight}px`;
        canvas.style.left = `${sidebarWidth + panelOffset}px`;
        this.updateNetUnfoldScale();
    }

    logNetUnfoldInvalid(context: string, detail: Record<string, unknown>) {
        console.error(`[net] ${context}`, detail);
    }

    updateNetUnfoldScale() {
        if (!this.netUnfoldGroup) return;
        const originalScale = this.netUnfoldGroup.scale.clone();
        const originalQuats = this.netUnfoldFaces.map(face => face.pivot.quaternion.clone());
        this.netUnfoldFaces.forEach(face => face.pivot.quaternion.copy(face.endQuat));
        this.netUnfoldGroup.scale.setScalar(1);
        this.netUnfoldGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.netUnfoldGroup);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) || size.x <= 0 || size.y <= 0) {
            this.logNetUnfoldInvalid('invalid net bounds', {
                size: { x: size.x, y: size.y, z: size.z },
                faceCount: this.netUnfoldFaces.length,
                groupChildren: this.netUnfoldGroup.children.length
            });
            this.netUnfoldFaces.forEach((face, idx) => face.pivot.quaternion.copy(originalQuats[idx]));
            this.netUnfoldGroup.scale.copy(originalScale);
            this.netUnfoldGroup.updateMatrixWorld(true);
            return;
        }
        this.netUnfoldFaces.forEach((face, idx) => face.pivot.quaternion.copy(originalQuats[idx]));
        this.netUnfoldGroup.scale.copy(originalScale);
        this.netUnfoldGroup.updateMatrixWorld(true);
        const viewWidth = this.camera.right - this.camera.left;
        const viewHeight = this.camera.top - this.camera.bottom;
        if (size.x <= 0 || size.y <= 0) return;
        const scale = Math.min(viewWidth / size.x, viewHeight / size.y) * 0.85;
        const scaleTarget = Math.min(1, scale);
        if (!Number.isFinite(scaleTarget)) {
            this.logNetUnfoldInvalid('invalid net scale target', {
                scaleTarget,
                scale,
                viewWidth,
                viewHeight,
                size: { x: size.x, y: size.y, z: size.z }
            });
            return;
        }
        this.netUnfoldTargetCenter = center.clone();
        this.netUnfoldPositionTarget = new THREE.Vector3(-center.x, -center.y, 0);
        this.setNetAnimationState({
            scaleTarget
        });
    }

    handlePanelOpenChange(open: boolean) {
        this.panelOpen = !!open;
        this.layoutTransitionFrom = this.layoutPanelOffset;
        this.layoutTransitionTo = this.panelOpen ? 320 : 0;
        this.layoutTransitionStart = performance.now();
        this.layoutTransitionActive = true;
    }
    
    handleModeChange(mode: string) {
        this.currentMode = mode;
        if (typeof (globalThis as any).__setReactMode === 'function') {
            (globalThis as any).__setReactMode(mode);
        }
        if (mode !== 'settings') {
            this.resetScene();
        }
        if (!this.useReactPresets) {
            this.ui.showSettingsPanels(false);
            this.ui.showLearningPanels(false);
        }

        if (mode === 'settings') {
            if (!this.useReactPresets) {
                this.ui.showSettingsPanels(true);
                this.ui.showSettingsPanel('display');
            }
        } else if (mode === 'learning') {
            if (!this.useReactPresets) {
                this.ui.showLearningPanels(true);
            }
        }
    }

    handlePresetCategoryChange(category: string) {
        if (category && !this.useReactPresets) this.ui.filterPresetButtons(category);
    }
    
    handleSettingsCategoryChange(category: string) {
        if (!this.useReactPresets) {
            this.ui.showSettingsPanel(category);
        }
    }

    handlePresetChange(name: string) {
        this.resetScene();
        this.presetManager.applyPreset(name);
        this.executeCut();
        const normal = this.cutter.getCutPlaneNormal();
        if (normal) {
            const distance = this.cube.size * 1.5;
            const offset = new THREE.Vector3(0.5, 0.5, 0.5).normalize();
            this.cameraTargetPosition = normal.clone().multiplyScalar(distance).add(offset.multiplyScalar(distance * 0.3));
            this.isCameraAnimating = true;
        }
        const display = this.objectModelManager.getDisplayState();
        this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
        this.cutter.setTransparency(display.cubeTransparent);
        this.selection.toggleVertexLabels(display.showVertexLabels);
    }

    previewLearningProblem(problem: LearningProblem | SnapPointID[]) {
        const snapIds = Array.isArray(problem)
            ? problem
            : (problem && Array.isArray(problem.snapIds) ? problem.snapIds : []);
        if (!Array.isArray(snapIds) || snapIds.length < 3) return;
        this.resetScene();
    }

    startLearningSolution(problem: LearningProblem | SnapPointID[]) {
        const snapIds = Array.isArray(problem)
            ? problem
            : (problem && Array.isArray(problem.snapIds) ? problem.snapIds : []);
        if (!Array.isArray(snapIds) || snapIds.length < 3) return { totalSteps: 0 };
        this.cancelLearningAnimation();
        this.resetScene();
        const highlightPlane = problem && !Array.isArray(problem) ? (problem as LearningProblem).highlightPlane : null;
        if (highlightPlane) {
            this.setLearningPlane(highlightPlane);
        }
        const success = this.cutter.cut(this.cube, snapIds, this.resolver, {
            previewOnly: true,
            suppressOutline: true,
            suppressMarkers: true
        });
        if (!success) {
            this.ui.showMessage('解答解説の準備に失敗しました。', 'warning');
            return { totalSteps: 0 };
        }
        const segments = this.cutter.getCutSegments();
        if (!segments.length) {
            this.ui.showMessage('切断線を生成できませんでした。', 'warning');
            return { totalSteps: 0 };
        }
        this.learningCutSegments = segments.map(segment => ({
            startId: segment.startId,
            endId: segment.endId
        }));

        const baseIntro = [{
            instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
            reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
            action: { type: 'message' as const }
        }];

        let steps: Array<{
            instruction: string;
            reason?: string;
            action?: {
                type: 'mark' | 'hintSegment' | 'drawSegment' | 'cut' | 'message';
                snapId?: string;
                startId?: string;
                endId?: string;
                kind?: 'edge' | 'diagonal';
                index?: number;
            };
        }> = [];

        if (!Array.isArray(problem) && Array.isArray((problem as LearningProblem)?.learningSteps)) {
            steps = [...((problem as LearningProblem).learningSteps!)];
        } else {
            const givenSnapIds = !Array.isArray(problem) && Array.isArray((problem as LearningProblem)?.givenSnapIds)
                ? (problem as LearningProblem).givenSnapIds!
                : snapIds;
            const markSteps = givenSnapIds.map(snapId => ({
                instruction: `まずは問題文から分かる条件を図に書き込もう。${this.formatSnapInstruction(snapId)}`,
                reason: '問題文に書いてある条件は、最初に必ず書き込むよ。',
                action: { type: 'mark' as const, snapId }
            }));
            const hintSteps = !Array.isArray(problem) && Array.isArray((problem as LearningProblem)?.highlightSegments)
                ? (problem as LearningProblem).highlightSegments!.map(segment => ({
                    instruction: segment.kind === 'diagonal'
                        ? '対角線を引こう。'
                        : '辺をなぞって確かめよう。',
                    reason: '問題文にある線は切断面に必ず含まれるよ。',
                    action: {
                        type: 'hintSegment' as const,
                        startId: segment.startId,
                        endId: segment.endId,
                        kind: segment.kind
                    }
                }))
                : [];
            steps = [...baseIntro, ...markSteps, ...hintSteps];
        }

        const segmentInstructions = !Array.isArray(problem) && Array.isArray((problem as LearningProblem)?.segmentInstructions)
            ? (problem as LearningProblem).segmentInstructions!
            : [
                '同じ面にある点をまっすぐ結んでみよう。',
                'となりの面でも線をつないでいこう。',
                '次の面でも同じように線を引こう。',
                '線が別の面へ移動したら、その面でも結ぼう。',
                '最後の面まで線をつなげよう。',
                'もう一度、同じ面の点を結んでいこう。'
            ];
        const segmentReasons = !Array.isArray(problem) && Array.isArray((problem as LearningProblem)?.segmentReasons)
            ? (problem as LearningProblem).segmentReasons!
            : [
                '同じ面にある点は直線で結んでいいんだ。',
                '切断線は面と面の境目を通って移動するよ。',
                '面が変わっても線の向きはつながっているよ。',
                '同じルールで次の面に線を引けばOKだよ。',
                '線をつないでいくと形が閉じるよ。',
                '最後まで線をつないで切断面を完成させよう。'
            ];
        const drawSteps = this.learningCutSegments.map((_, index) => ({
            instruction: segmentInstructions[Math.min(index, segmentInstructions.length - 1)] || '同じ面の点を結んでいこう。',
            reason: segmentReasons[Math.min(index, segmentReasons.length - 1)] || '同じ面にある点は直線で結んでいいんだ。',
            action: { type: 'drawSegment' as const, index }
        }));

        steps = [...steps, ...drawSteps, { instruction: '最後に切断を実行するよ。', action: { type: 'cut' as const } }];
        this.learningSteps = steps;
        this.learningStepIndex = 0;
        this.learningStepRunning = false;
        return { totalSteps: steps.length };
    }

    async advanceLearningStep() {
        if (this.learningStepRunning) return { done: false };
        const step = this.learningSteps[this.learningStepIndex];
        if (!step) return { done: true };
        this.learningStepRunning = true;
        this.ui.setExplanation(step.instruction);
        const action = step.action;
        if (!action || action.type === 'message') {
            // 説明のみ
        } else if (action.type === 'mark' && action.snapId) {
            this.addLearningMarker(action.snapId);
        } else if (action.type === 'hintSegment' && action.startId && action.endId) {
            this.addLearningHintSegment({
                startId: action.startId,
                endId: action.endId,
                kind: action.kind
            });
        } else if (action.type === 'drawSegment') {
            const token = { cancelled: false };
            this.learningAnimationToken = token;
            const segment = typeof action.index === 'number' ? this.learningCutSegments[action.index] : null;
            if (segment) {
                await this.animateLearningSegment(segment, token);
            }
            if (token.cancelled) {
                this.learningStepRunning = false;
                return { done: false, instruction: step.instruction, reason: step.reason };
            }
        } else if (action.type === 'cut') {
            this.clearLearningLines();
            this.clearLearningPlane();
            this.clearLearningHints();
            this.executeCut();
        }
        this.learningStepIndex += 1;
        this.learningStepRunning = false;
        const done = this.learningStepIndex >= this.learningSteps.length;
        return {
            done,
            stepIndex: this.learningStepIndex,
            totalSteps: this.learningSteps.length,
            instruction: step.instruction,
            reason: step.reason
        };
    }

    animateLearningSegment(segment: { startId: string; endId: string }, token: { cancelled: boolean }) {
        return new Promise((resolve) => {
            const start = this.resolver.resolveSnapPoint(segment.startId);
            const end = this.resolver.resolveSnapPoint(segment.endId);
            if (!start || !end) {
                resolve(null);
                return;
            }
            const positions = new Float32Array([
                start.x, start.y, start.z,
                start.x, start.y, start.z
            ]);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.learningLines.push(line);

            const duration = 5000;
            const startTime = performance.now();
            const step = (now: number) => {
                if (token.cancelled) {
                    resolve(null);
                    return;
                }
                const t = Math.min((now - startTime) / duration, 1);
                const current = new THREE.Vector3().lerpVectors(start, end, t);
                positions[3] = current.x;
                positions[4] = current.y;
                positions[5] = current.z;
                geometry.attributes.position.needsUpdate = true;
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve(null);
                }
            };
            requestAnimationFrame(step);
        });
    }

    handleResetClick() {
        this.handleModeChange('free');
        if (!this.useReactPresets) {
            this.ui.resetToFreeSelectMode();
        }
    }


    handleConfigureClick() {
        const lxStr = prompt("辺ABの長さ(cm)", "10");
        const lyStr = prompt("辺ADの長さ(cm)", "10");
        const lzStr = prompt("辺AEの長さ(cm)", "10");
        if (lxStr !== null && lyStr !== null && lzStr !== null) {
            const lx = parseFloat(lxStr);
            const ly = parseFloat(lyStr);
            const lz = parseFloat(lzStr);
            if (!isNaN(lx) && !isNaN(ly) && !isNaN(lz)) {
                this.resetScene();
                if (!this.useReactPresets) {
                    this.ui.resetToFreeSelectMode();
                }
                this.cube.createCube([lx, ly, lz]);
                this.resolver.setSize(this.cube.getSize());
                this.objectModelManager.syncFromCube();
                if (this.currentLabelMap) {
                    this.cube.setVertexLabelMap(this.currentLabelMap);
                    this.resolver.setLabelMap(this.currentLabelMap);
                }
                const display = this.objectModelManager.getDisplayState();
                this.objectModelManager.applyDisplayToView(display);
                this.cutter.setTransparency(display.cubeTransparent);
            }
        }
    }

    configureCubeFromDimensions(lx: number, ly: number, lz: number) {
        this.resetScene();
        if (!this.useReactPresets) {
            this.ui.resetToFreeSelectMode();
        }
        this.cube.createCube([lx, ly, lz]);
        this.resolver.setSize(this.cube.getSize());
        this.objectModelManager.syncFromCube();
        if (this.currentLabelMap) {
            this.cube.setVertexLabelMap(this.currentLabelMap);
            this.resolver.setLabelMap(this.currentLabelMap);
        }
        const display = this.objectModelManager.getDisplayState();
        this.objectModelManager.applyDisplayToView(display);
        this.cutter.setTransparency(display.cubeTransparent);
    }

    configureVertexLabelsFromReact(labels: string[]) {
        if (labels.length !== 8) {
            this.ui.showMessage("頂点ラベルは8個必要です。", "warning");
            return;
        }
        const unique = new Set(labels);
        if (unique.size !== labels.length) {
            this.ui.showMessage("頂点ラベルは重複できません。", "warning");
            return;
        }
        const labelMap: Record<string, string> = {};
        labels.forEach((label, index) => {
            labelMap[`V:${index}`] = label;
        });
        this.currentLabelMap = labelMap;
        this.cube.setVertexLabelMap(labelMap);
        this.resolver.setLabelMap(labelMap);
        this.objectModelManager.syncFromCube();
        const display = this.objectModelManager.getDisplayState();
        this.objectModelManager.applyDisplayToView(display);
        this.cutter.setTransparency(display.cubeTransparent);
    }

    handleCancelUserPresetEdit() {
        this.editingUserPresetId = null;
        if (!this.useReactUserPresets) {
            this.ui.setUserPresetForm({ name: '', category: '', description: '' });
            this.ui.setUserPresetEditMode(false);
        }
    }

    async handleSaveUserPreset(formOverride: any = null) {
        if (!this.userPresetStorage.isEnabled()) {
            this.ui.showMessage('保存機能は利用できません。', 'warning');
            return;
        }
        const form = formOverride || this.ui.getUserPresetForm();
        if (!form.name) {
            this.ui.showMessage('プリセット名を入力してください。', 'warning');
            return;
        }
        const now = () => new Date().toISOString();
        const existing = this.userPresets.find(p => p.id === this.editingUserPresetId);
        const meta = {
            id: existing ? existing.id : undefined,
            createdAt: existing ? existing.createdAt : undefined,
            updatedAt: now(),
            name: form.name,
            category: form.category || undefined,
            description: form.description || undefined
        };
        const state = this.getUserPresetState(meta);
        if (!state) return;
        await this.userPresetStorage.save(state);
        await this.loadUserPresets();
        if (!this.useReactUserPresets) {
            this.ui.setUserPresetEditMode(false);
            this.ui.setUserPresetForm({ name: '', category: '', description: '' });
        }
        this.editingUserPresetId = null;
        this.ui.showMessage(existing ? 'ユーザープリセットを更新しました。' : 'ユーザープリセットを保存しました。', 'success');
    }

    handleUserPresetApply(id: string) {
        const state = this.userPresets.find(p => p.id === id);
        if (!state) return;
        this.applyUserPresetState(state);
        this.ui.showMessage('ユーザープリセットを適用しました。', 'success');
    }

    handleUserPresetEdit(id: string) {
        const state = this.userPresets.find(p => p.id === id);
        if (!state) return;
        this.editingUserPresetId = state.id;
        if (!this.useReactUserPresets) {
            this.ui.setUserPresetForm({
                name: state.name || '',
                category: state.category || '',
                description: state.description || ''
            });
            this.ui.setUserPresetEditMode(true);
        }
    }

    async handleUserPresetDelete(id: string) {
        const target = this.userPresets.find(p => p.id === id);
        if (!target) return;
        const ok = confirm(`「${target.name}」を削除しますか？`);
        if (!ok) return;
        await this.userPresetStorage.remove(id);
        await this.loadUserPresets();
        if (this.editingUserPresetId === id) {
            this.editingUserPresetId = null;
            if (!this.useReactUserPresets) {
                this.ui.setUserPresetForm({ name: '', category: '', description: '' });
                this.ui.setUserPresetEditMode(false);
            }
        }
        this.ui.showMessage('ユーザープリセットを削除しました。', 'success');
    }

    // Removed legacy netUnfoldGroup methods: updateNetOverlayDisplay, updateNetLabelDisplay, updateNetLabelScale

    resetNetAnimationCaches() {
        this.netFaceProgress.clear();
        this.netCameraStarts.clear();
        this.netCameraEnds.clear();
        this.netAnimationStartAt = 0;
        this.netAnimationDurationMs = 0;
        this.netAnimationZoomActive = false;
        this.netZoomStart = this.defaultCameraZoom;
        this.netZoomEnd = this.defaultCameraZoom;
    }

    setAnimationSpecEnabled(enabled: boolean) {
        this.useAnimationSpecNet = enabled;
        if (!enabled && this.netAnimationPlayer.isPlaying()) {
            this.netAnimationPlayer.stop();
            this.resetNetAnimationCaches();
        }
    }

    dispatchNetAnimation(
        stepId: string,
        action: string,
        targets: any,
        params: any,
        progress: number,
        easedProgress: number,
        _elapsedSeconds: number,
        _durationSeconds: number
    ) {
        if (!this.currentNetPlan) return;
        switch (action) {
            case 'rotateFace': {
                const faceId = params && typeof params.faceId === 'string'
                    ? params.faceId
                    : (targets && targets.type === 'netFaces' && Array.isArray(targets.ids) ? targets.ids[0] : null);
                if (!faceId) return;
                const effective = this.netAnimationDirection === 'open' ? easedProgress : 1 - easedProgress;
                this.netFaceProgress.set(faceId, effective);
                this.cube.applyNetPlan(this.currentNetPlan, 0, this.netFaceProgress);
                return;
            }
            case 'moveCamera': {
                if (!params || !params.position || !params.lookAt) return;
                let start = this.netCameraStarts.get(stepId);
                if (!start) {
                    start = {
                        position: this.camera.position.clone(),
                        target: this.controls.target.clone()
                    };
                    this.netCameraStarts.set(stepId, start);
                }
                let end = this.netCameraEnds.get(stepId);
                if (!end) {
                    end = {
                        position: new THREE.Vector3(params.position.x, params.position.y, params.position.z),
                        target: new THREE.Vector3(params.lookAt.x, params.lookAt.y, params.lookAt.z)
                    };
                    this.netCameraEnds.set(stepId, end);
                }
                const t = Math.max(0, Math.min(1, progress));
                this.camera.position.lerpVectors(start.position, end.position, t);
                this.controls.target.lerpVectors(start.target, end.target, t);
                this.netUpTemp.copy(this.netUpStart).lerp(this.netUpEnd, t).normalize();
                this.camera.up.copy(this.netUpTemp);
                this.camera.lookAt(this.controls.target);
                return;
            }
            case 'setVisibility': {
                if (params && typeof params.visible === 'boolean') {
                    this.objectModelManager.setNetVisible(params.visible);
                }
                return;
            }
            default:
                return;
        }
    }

    buildNetAnimationSpec(direction: 'open' | 'close') {
        if (!this.currentNetPlan) return null;
        const cameraPosition = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
        const cameraTarget = { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z };
        const faceCount = Math.max(0, this.currentNetPlan.faceOrder.length - 1);
        const faceDurationSec = this.netUnfoldFaceDuration / 1000;
        const staggerSec = this.netUnfoldStagger / 1000;
        const totalDurationSec = faceCount <= 1
            ? faceDurationSec
            : faceDurationSec + (faceCount - 1) * staggerSec;
        const cameraDelaySec = 0;
        const cameraDurationSec = 0.01;
        return this.netManager.buildUnfoldAnimationSpec(this.currentNetPlan, {
            startAtSec: 0,
            faceDurationSec,
            staggerSec,
            cameraStartAtSec: cameraDelaySec,
            cameraDurationSec,
            cameraPosition,
            cameraTarget
        });
    }

    applyNetStateFromModel() {
        const state = this.objectModelManager.getNetState();
        if (!state) return;
        this.netUnfoldState = state.state;
        this.netUnfoldDuration = state.duration;
        this.netUnfoldFaceDuration = state.faceDuration;
        this.netUnfoldStagger = state.stagger;
        this.netUnfoldPreScaleDelay = state.preScaleDelay;
        this.netUnfoldPostScaleDelay = state.postScaleDelay;
    }

    setNetAnimationState(partial: {
        state?: ObjectNetState['state'];
        progress?: number;
        duration?: number;
        faceDuration?: number;
        stagger?: number;
        scale?: number;
        scaleTarget?: number;
        startAt?: number;
        preScaleDelay?: number;
        postScaleDelay?: number;
        camera?: {
            startPos: THREE.Vector3 | null;
            startTarget: THREE.Vector3 | null;
            endPos: THREE.Vector3 | null;
            endTarget: THREE.Vector3 | null;
        };
    }) {
        const current = this.objectModelManager.getNetState();
        this.objectModelManager.syncNetState({
            animation: {
                ...current,
                ...partial
            }
        });
    }

    clearNetUnfoldGroup() {
        // No-op or cleanup if needed, but netUnfoldGroup is removed
        this.setNetAnimationState({
            state: 'closed',
            progress: 0,
            camera: {
                startPos: null,
                startTarget: null,
                endPos: null,
                endTarget: null
            }
        });
        this.netUnfoldTargetCenter = null;
        this.netUnfoldPositionTarget = null;
        this.camera.zoom = this.defaultCameraZoom;
        this.camera.updateProjectionMatrix();
    }

    getNetAnimationTotalDurationSec() {
        if (!this.currentNetPlan) return 0;
        const faceCount = Math.max(0, this.currentNetPlan.faceOrder.length - 1);
        const faceDurationSec = this.netUnfoldFaceDuration / 1000;
        const staggerSec = this.netUnfoldStagger / 1000;
        if (faceCount <= 1) return faceDurationSec;
        return faceDurationSec + (faceCount - 1) * staggerSec;
    }

    prepareNetAnimationZoom(direction: 'open' | 'close', enableZoom = true) {
        if (!this.currentNetPlan) return;
        const currentUp = this.camera.up.clone();
        this.netUpStart.copy(currentUp);
        this.netUpEnd.copy(currentUp);
        if (!enableZoom) {
            this.netZoomStart = this.camera.zoom;
            this.netZoomEnd = this.camera.zoom;
            this.netAnimationDurationMs = 0;
            this.netAnimationZoomActive = false;
            return;
        }
        const openProgress = new Map<string, number>();
        this.currentNetPlan.faceOrder.forEach((faceId) => {
            if (faceId === this.currentNetPlan!.rootFaceId) return;
            openProgress.set(faceId, 1);
        });
        const closedBounds = this.computeNetBoundsForProgress(undefined, 0);
        const openBounds = this.computeNetBoundsForProgress(openProgress, 0);
        const currentPosition = this.camera.position.clone();
        const currentTarget = this.controls.target.clone();
        const startBounds = openBounds;
        const endBounds = direction === 'open' ? openBounds : closedBounds;
        const startCam = { position: currentPosition, target: currentTarget, up: currentUp };
        const endCam = { position: currentPosition, target: currentTarget, up: currentUp };
        const startZoom = startBounds
            ? this.computeZoomForBounds(startBounds, startCam.position, startCam.target, startCam.up)
            : this.defaultCameraZoom;
        const endZoom = endBounds
            ? this.computeZoomForBounds(endBounds, endCam.position, endCam.target, endCam.up)
            : this.defaultCameraZoom;
        this.netZoomStart = startZoom;
        this.netZoomEnd = endZoom;
        this.camera.zoom = this.netZoomStart;
        this.camera.updateProjectionMatrix();
        this.netUpStart.copy(currentUp);
        this.netUpEnd.copy(currentUp);
        this.netAnimationStartAt = performance.now();
        this.netAnimationDurationMs = this.getNetAnimationTotalDurationSec() * 1000;
        this.netAnimationZoomActive = this.netAnimationDurationMs > 0;
    }

    startNetUnfold() {
        if (!this.useAnimationSpecNet) {
            this.startNetUnfoldLegacy();
            return;
        }
        if (this.netAnimationPlayer.isPlaying()) return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        
        this.cube.setVisible(true); 
        this.cutter.setVisible(false);
        this.highlightMarker.visible = false;
        this.snappedPointInfo = null;
        this.clearNetSelectionHighlight();
        this.resetNetAnimationCaches();
        this.netAnimationDirection = 'open';
        this.prepareNetAnimationZoom('open', false);
        const spec = this.buildNetAnimationSpec('open');
        if (!spec) return;
        this.netAnimationPlayer.play(spec);
    }

    startNetFold() {
        if (!this.useAnimationSpecNet) {
            this.startNetFoldLegacy();
            return;
        }
        if (this.netAnimationPlayer.isPlaying()) return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        if (!this.currentNetPlan) return;
        this.resetNetAnimationCaches();
        this.netAnimationDirection = 'close';
        this.currentNetPlan.faceOrder.forEach((faceId) => {
            if (faceId === this.currentNetPlan!.rootFaceId) return;
            this.netFaceProgress.set(faceId, 1);
        });
        this.prepareNetAnimationZoom('close', false);
        const spec = this.buildNetAnimationSpec('close');
        if (!spec) return;
        this.netAnimationPlayer.play(spec, () => {
            this.objectModelManager.setNetVisible(false);
            this.netManager.hide();
            this.clearNetSelectionHighlight();
            this.cube.setFaceOutlineVisible(false);
            const after = this.netAfterFoldAction;
            this.netAfterFoldAction = null;
            if (after) {
                after();
                return;
            }
            const endPos = this.camera.position.clone();
            const endTarget = this.controls.target.clone();
            const endUp = this.camera.up.clone();
            this.startNetPreCameraMove({
                endPos,
                endTarget,
                endUp,
                endZoom: this.defaultCameraZoom,
                onComplete: () => {
                    this.startNetPreCameraMove({
                        endPos: this.defaultCameraPosition.clone(),
                        endTarget: this.defaultCameraTarget.clone(),
                        endUp: new THREE.Vector3(0, 1, 0),
                        endZoom: this.camera.zoom,
                        onComplete: () => {}
                    });
                }
            });
        });
    }

    startNetUnfoldLegacy() {
        const netState = this.objectModelManager.getNetState();
        if (netState.state === 'opening' || netState.state === 'open' || netState.state === 'prescale') return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;

        const startAt = performance.now();
        this.cube.setVisible(true);
        this.cutter.setVisible(false);
        this.highlightMarker.visible = false;
        this.snappedPointInfo = null;
        const pose = this.getNetCameraPose();
        const endPos = pose ? pose.topPosition.clone() : new THREE.Vector3(0, this.cube.size * 3, 0);
        const endTarget = pose ? pose.center.clone() : new THREE.Vector3(0, 0, 0);
        const camera = {
            startPos: this.camera.position.clone(),
            startTarget: this.controls.target.clone(),
            endPos,
            endTarget
        };
        this.netUnfoldScaleReadyAt = null;

        const nextState = this.objectModelManager.getNetState();
        const faceDuration = nextState.faceDuration || this.netUnfoldFaceDuration;
        const stagger = nextState.stagger || this.netUnfoldStagger;
        const faceCount = this.currentNetPlan ? Math.max(0, this.currentNetPlan.faceOrder.length - 1) : 0;
        const totalDuration = faceCount <= 1
            ? faceDuration
            : faceDuration + (faceCount - 1) * stagger;
        const duration = Math.max(nextState.duration || this.netUnfoldDuration, totalDuration);
        this.setNetAnimationState({
            state: 'prescale',
            progress: 0,
            duration,
            faceDuration,
            stagger,
            scale: 1,
            scaleTarget: nextState.scaleTarget,
            preScaleDelay: nextState.preScaleDelay,
            postScaleDelay: nextState.postScaleDelay,
            startAt,
            camera
        });
    }

    startNetFoldLegacy() {
        const netState = this.objectModelManager.getNetState();
        if (netState.state === 'closed' || netState.state === 'closing' || netState.state === 'prescale') return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        const duration = netState.duration || this.netUnfoldDuration;
        const startAt = performance.now() - (1 - netState.progress) * duration;
        const camera = {
            startPos: this.camera.position.clone(),
            startTarget: this.controls.target.clone(),
            endPos: this.defaultCameraPosition.clone(),
            endTarget: this.defaultCameraTarget.clone()
        };
        this.netUnfoldScaleReadyAt = null;
        this.setNetAnimationState({
            state: 'closing',
            progress: netState.progress,
            duration,
            faceDuration: netState.faceDuration || this.netUnfoldFaceDuration,
            stagger: netState.stagger || this.netUnfoldStagger,
            scale: netState.scale,
            scaleTarget: netState.scaleTarget,
            preScaleDelay: netState.preScaleDelay,
            postScaleDelay: netState.postScaleDelay,
            startAt,
            camera
        });
    }

    updateNetUnfoldAnimation() {
        if (this.useAnimationSpecNet) return;
        const netState = this.objectModelManager.getNetState();
        if (netState.state === 'closed' || netState.state === 'open' || netState.state === 'prescale' || netState.state === 'postscale') return;
        if (netState.duration <= 0 || netState.faceDuration <= 0) return;
        const elapsed = performance.now() - netState.startAt;
        if (elapsed < 0 && netState.state === 'opening') {
            return;
        }
        const duration = netState.duration;
        const faceDuration = netState.faceDuration;
        const progress = Math.min(1, elapsed / duration);
        const netProgress = netState.state === 'opening' ? progress : 1 - progress;

        // NEW: Apply structural unfolding to the dynamic renderer
        if (this.currentNetPlan) {
            this.cube.applyNetPlan(this.currentNetPlan, netProgress);
        }

        if (netState.camera && netState.camera.startPos && netState.camera.endPos && netState.camera.startTarget && netState.camera.endTarget) {
            const cameraT = progress;
            const cameraEased = cameraT < 0.5
                ? 2 * cameraT * cameraT
                : 1 - Math.pow(-2 * cameraT + 2, 2) / 2;
            this.camera.position.lerpVectors(netState.camera.startPos!, netState.camera.endPos!, cameraEased);
            this.controls.target.lerpVectors(netState.camera.startTarget!, netState.camera.endTarget!, cameraEased);
            if (netState.state === 'opening') {
                this.camera.up.set(0, 0, -1);
            } else {
                this.camera.up.set(0, 1, 0);
            }
            this.camera.lookAt(this.controls.target);
        }

        let nextState: ObjectNetState['state'] = netState.state;
        if (progress >= 1) {
            if (netState.state === 'opening') {
                nextState = 'open';
            } else {
                nextState = 'postscale';
                this.setNetAnimationState({ startAt: performance.now() + netState.postScaleDelay });
            }
        }
        this.setNetAnimationState({
            state: nextState,
            progress: netProgress,
            duration,
            faceDuration,
            scale: netState.scale,
            scaleTarget: nextState === 'postscale' ? 1 : netState.scaleTarget,
            preScaleDelay: netState.preScaleDelay,
            postScaleDelay: netState.postScaleDelay
        });
    }

    updateNetCameraZoom() {
        if (!this.objectModelManager.getNetVisible()) return;
        if (!this.netAnimationZoomActive || this.netAnimationDurationMs <= 0) return;
        const elapsed = performance.now() - this.netAnimationStartAt;
        const t = Math.max(0, Math.min(1, elapsed / this.netAnimationDurationMs));
        const eased = t < 0.5
            ? 2 * t * t
            : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const zoom = this.netZoomStart + (this.netZoomEnd - this.netZoomStart) * eased;
        this.camera.zoom = zoom;
        this.camera.updateProjectionMatrix();
        if (t >= 1) {
            this.netAnimationZoomActive = false;
        }
    }

    computeNetBounds() {
        const meshes = Array.from(this.cube.faceMeshes.values());
        let initialized = false;
        const bounds = new THREE.Box3();
        meshes.forEach((mesh) => {
            if (!mesh.visible) return;
            const meshBounds = new THREE.Box3().setFromObject(mesh);
            if (!initialized) {
                bounds.copy(meshBounds);
                initialized = true;
                return;
            }
            bounds.union(meshBounds);
        });
        return initialized ? bounds : null;
    }

    computeNetBoundsForProgress(faceProgress?: Map<string, number>, fallbackProgress = 0) {
        if (!this.currentNetPlan) return null;
        const snapshots: Array<{ mesh: THREE.Mesh; position: THREE.Vector3; quaternion: THREE.Quaternion }> = [];
        this.cube.faceMeshes.forEach((mesh) => {
            snapshots.push({
                mesh,
                position: mesh.position.clone(),
                quaternion: mesh.quaternion.clone()
            });
        });
        this.cube.applyNetPlan(this.currentNetPlan, fallbackProgress, faceProgress);
        const bounds = this.computeNetBounds();
        snapshots.forEach(({ mesh, position, quaternion }) => {
            mesh.position.copy(position);
            mesh.quaternion.copy(quaternion);
        });
        return bounds;
    }

    computeZoomForBounds(
        bounds: THREE.Box3,
        cameraPosition: THREE.Vector3,
        cameraTarget: THREE.Vector3,
        cameraUp: THREE.Vector3
    ) {
        const originalPosition = this.camera.position.clone();
        const originalTarget = this.controls.target.clone();
        const originalUp = this.camera.up.clone();
        const originalZoom = this.camera.zoom;
        this.camera.position.copy(cameraPosition);
        this.controls.target.copy(cameraTarget);
        this.camera.up.copy(cameraUp);
        this.camera.lookAt(this.controls.target);
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();
        const corners = [
            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
            new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
            new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
            new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
            new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
        ];
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const viewMatrix = this.camera.matrixWorldInverse;
        corners.forEach((corner) => {
            corner.applyMatrix4(viewMatrix);
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const viewWidth = this.camera.right - this.camera.left;
        const viewHeight = this.camera.top - this.camera.bottom;
        const padding = this.netBoundsPadding;
        let targetZoom = this.defaultCameraZoom;
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
            targetZoom = Math.min(viewWidth / width, viewHeight / height) * padding;
            targetZoom = Math.max(0.3, Math.min(2.5, targetZoom));
        }
        this.camera.position.copy(originalPosition);
        this.controls.target.copy(originalTarget);
        this.camera.up.copy(originalUp);
        this.camera.zoom = originalZoom;
        this.camera.lookAt(this.controls.target);
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();
        return targetZoom;
    }

    handleFlipCutClick() {
        const snapIds = this.cutter.getLastSnapIds();
        if (!snapIds || snapIds.length < 3) return;
        this.cutter.setCutInverted(!this.cutter.isCutInverted(), false);
        this.objectModelManager.syncFromCube();
        const solid = this.objectModelManager.getModel()?.ssot;
        this.cutService.executeCut({ snapIds, structure: solid });
    }

    getSolidCenter() {
        const model = this.objectModelManager.getModel();
        if (!model) return new THREE.Vector3();
        const vertices = Object.keys(model.ssot.vertices);
        if (vertices.length === 0) return new THREE.Vector3();
        const center = new THREE.Vector3();
        let count = 0;
        vertices.forEach((vertexId) => {
            const pos = this.resolver.resolveVertex(vertexId);
            if (!pos) return;
            center.add(pos);
            count += 1;
        });
        if (count === 0) return new THREE.Vector3();
        return center.divideScalar(count);
    }

    getFaceNormalOutward(faceId: string) {
        const face = this.resolver.resolveFace(faceId);
        const center = this.resolver.resolveFaceCenter(faceId);
        if (!face) return null;
        let normal = face.normal.clone().normalize();
        if (center) {
            const outward = center.clone().sub(this.getSolidCenter());
            if (normal.dot(outward) < 0) {
                normal.negate();
            }
        }
        return normal;
    }

    updateNetCameraFrameFromView(center: THREE.Vector3, normal: THREE.Vector3, cameraPos?: THREE.Vector3) {
        const origin = cameraPos ? cameraPos : this.camera.position;
        const viewDir = origin.clone().sub(center);
        const projected = viewDir.clone().sub(normal.clone().multiplyScalar(viewDir.dot(normal)));
        let front = projected;
        if (front.lengthSq() < 1e-4) {
            front = this.netCameraBasisU.clone();
        }
        front.normalize();
        const right = new THREE.Vector3().crossVectors(front, normal).normalize();
        const orthoFront = new THREE.Vector3().crossVectors(normal, right).normalize();
        this.netCameraFrontDir.copy(orthoFront);
        this.netCameraRightDir.copy(right);
    }

    getReferenceFaceFrame() {
        const refFace = this.resolver.resolveFace('F:0-3-2-1');
        if (!refFace) return null;
        return {
            normal: refFace.normal.clone().normalize(),
            basisU: refFace.basisU.clone().normalize(),
        };
    }

    getReferenceNetFrame() {
        const bottomNormal = this.getFaceNormalOutward('F:0-3-2-1');
        const frontNormal = this.getFaceNormalOutward('F:0-4-5-1');
        if (!bottomNormal || !frontNormal) return null;
        const frontProj = frontNormal.clone().sub(bottomNormal.clone().multiplyScalar(frontNormal.dot(bottomNormal)));
        const basisU = frontProj.lengthSq() > 1e-6
            ? frontProj.normalize()
            : new THREE.Vector3(1, 0, 0);
        return {
            normal: bottomNormal,
            basisU
        };
    }

    pickFrontFaceId(rootFaceId: string) {
        const model = this.objectModelManager.getModel();
        if (!model) return null;
        const adjacency = model.derived.topologyIndex?.faceAdjacency;
        const candidates = adjacency?.[rootFaceId]
            ? [...adjacency[rootFaceId]]
            : Object.keys(model.ssot.faces).filter((id) => id !== rootFaceId);
        if (candidates.length === 0) return null;
        const cameraDir = this.camera.position.clone().sub(this.controls.target).normalize();
        let bestId: string | null = null;
        let bestScore = -Infinity;
        candidates.forEach((faceId) => {
            const normal = this.getFaceNormalOutward(faceId);
            if (!normal) return;
            const score = normal.dot(cameraDir);
            if (score > bestScore) {
                bestScore = score;
                bestId = faceId;
            }
        });
        return bestId;
    }

    computeFaceAlignmentRotation({
        sourceNormal,
        sourceBasisU,
        targetNormal,
        targetBasisU
    }: {
        sourceNormal: THREE.Vector3;
        sourceBasisU: THREE.Vector3;
        targetNormal: THREE.Vector3;
        targetBasisU: THREE.Vector3;
    }) {
        const n1 = sourceNormal.clone().normalize();
        const n2 = targetNormal.clone().normalize();
        const q1 = new THREE.Quaternion().setFromUnitVectors(n1, n2);
        const u1 = sourceBasisU.clone().applyQuaternion(q1);
        const u1proj = u1.clone().sub(n2.clone().multiplyScalar(u1.dot(n2))).normalize();
        const u2proj = targetBasisU.clone().sub(n2.clone().multiplyScalar(targetBasisU.dot(n2))).normalize();
        let angle = 0;
        if (u1proj.lengthSq() > 1e-6 && u2proj.lengthSq() > 1e-6) {
            const cross = new THREE.Vector3().crossVectors(u1proj, u2proj);
            const sin = n2.dot(cross);
            const cos = u1proj.dot(u2proj);
            angle = Math.atan2(sin, cos);
        }
        const q2 = new THREE.Quaternion().setFromAxisAngle(n2, angle);
        return q2.multiply(q1);
    }

    getNetCameraPose() {
        if (!this.currentNetPlan) return null;
        const rootFaceId = this.currentNetPlan.rootFaceId;
        const faceInfo = this.resolver.resolveFace(rootFaceId);
        const center = this.resolver.resolveFaceCenter(rootFaceId);
        if (!faceInfo || !center) return null;
        this.netCameraCenter.copy(center);
        this.netCameraNormal.copy(faceInfo.normal).normalize();
        this.netCameraBasisU.copy(faceInfo.basisU).normalize();
        this.netCameraBasisV.copy(faceInfo.basisV).normalize();

        const solidCenter = this.getSolidCenter();
        const outward = this.netCameraCenter.clone().sub(solidCenter);
        if (this.netCameraNormal.dot(outward) < 0) {
            this.netCameraNormal.negate();
        }

        let basisU = this.netCameraBasisU.clone();
        if (Math.abs(this.netCameraNormal.dot(basisU)) > 0.98) {
            basisU = this.netCameraBasisV.clone();
        }
        let basisV = new THREE.Vector3().crossVectors(this.netCameraNormal, basisU).normalize();
        basisU = new THREE.Vector3().crossVectors(basisV, this.netCameraNormal).normalize();
        this.netCameraBasisU.copy(basisU);
        this.netCameraBasisV.copy(basisV);

        if (this.netCameraFrontDir.lengthSq() < 1e-4 || this.netCameraRightDir.lengthSq() < 1e-4) {
            this.netCameraFrontDir.copy(this.netCameraBasisV);
            this.netCameraRightDir.copy(this.netCameraBasisU);
        }

        const distance = this.cube.size * 3;
        this.netCameraObliquePosition
            .copy(this.netCameraCenter)
            .addScaledVector(this.netCameraRightDir, distance * 0.35)
            .addScaledVector(this.netCameraFrontDir, distance * 0.45)
            .addScaledVector(this.netCameraNormal, distance * 0.9);
        this.netCameraTopPosition
            .copy(this.netCameraCenter)
            .addScaledVector(this.netCameraNormal, distance);
        this.netCameraObliqueUp.copy(this.netCameraNormal);
        this.netCameraTopUp.copy(this.netCameraFrontDir);
        return {
            center: this.netCameraCenter,
            topPosition: this.netCameraTopPosition,
            obliquePosition: this.netCameraObliquePosition,
            obliqueUp: this.netCameraObliqueUp,
            topUp: this.netCameraTopUp
        };
    }

    positionCameraForNetOblique() {
        const pose = this.getNetCameraPose();
        if (!pose) return;
        this.camera.position.copy(pose.obliquePosition);
        this.controls.target.copy(pose.center);
        this.camera.up.copy(pose.obliqueUp);
        this.camera.lookAt(this.controls.target);
        this.camera.updateProjectionMatrix();
    }

    setNetFaceHighlight(faceId: string, kind: 'hover' | 'selected' | 'none') {
        const mesh = this.cube.faceMeshes.get(faceId);
        if (!mesh) return;
        const material = mesh.material;
        if (!(material instanceof THREE.MeshBasicMaterial)) return;
        if (kind === 'none') {
            this.cube.resetFaceColor(faceId);
            return;
        }
        material.color.setHex(0xffcc55);
    }

    clearNetHoverHighlight() {
        if (!this.netHoverFaceId) return;
        if (this.netHoverFaceId !== this.netSelectedFaceId) {
            this.setNetFaceHighlight(this.netHoverFaceId, 'none');
        }
        this.netHoverFaceId = null;
    }

    clearNetSelectionHighlight() {
        if (!this.netSelectedFaceId) return;
        this.setNetFaceHighlight(this.netSelectedFaceId, 'none');
        this.netSelectedFaceId = null;
    }

    clearNetFaceHighlights() {
        this.clearNetHoverHighlight();
        this.clearNetSelectionHighlight();
    }

    startNetBaseSelection() {
        this.netSelectionActive = true;
        this.netRootFaceId = null;
        this.clearNetFaceHighlights();
        this.cube.setFaceOutlineVisible(true);
        this.highlightMarker.visible = false;
        this.snappedPointInfo = null;
        document.body.style.cursor = 'pointer';
        this.ui.showMessage("底面を選択してください。", "info");
    }

    startNetPreCameraMove({
        endPos,
        endTarget,
        endUp,
        endZoom,
        onComplete
    }: {
        endPos: THREE.Vector3;
        endTarget: THREE.Vector3;
        endUp: THREE.Vector3;
        endZoom?: number;
        onComplete: () => void;
    }) {
        this.netPreCameraActive = true;
        this.netPreCameraStartAt = performance.now();
        this.netPreCameraDurationMs = 650;
        this.netPreCameraStartPos.copy(this.camera.position);
        this.netPreCameraStartTarget.copy(this.controls.target);
        this.netPreCameraStartUp.copy(this.camera.up);
        this.netPreCameraStartZoom = this.camera.zoom;
        this.netPreCameraEndPos.copy(endPos);
        this.netPreCameraEndTarget.copy(endTarget);
        this.netPreCameraEndUp.copy(endUp);
        this.netPreCameraEndZoom = typeof endZoom === 'number' ? endZoom : this.camera.zoom;
        this.netPreCameraOnComplete = onComplete;
    }

    cancelNetBaseSelection() {
        this.netSelectionActive = false;
        this.netRootFaceId = null;
        this.clearNetFaceHighlights();
        if (!this.objectModelManager.getNetVisible()) {
            this.cube.setFaceOutlineVisible(false);
        }
        this.ui.showMessage("底面選択をキャンセルしました。", "info");
        document.body.style.cursor = 'auto';
    }

    pickNetFaceIdFromEvent(e: MouseEvent): string | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        const faces = Array.from(this.cube.faceMeshes.values());
        const intersects = this.raycaster.intersectObjects(faces);
        if (intersects.length === 0) return null;
        const candidates = intersects.filter(entry => !(entry.object.userData && entry.object.userData.isCutFace));
        if (candidates.length === 0) return null;
        const cameraDir = this.camera.position.clone().sub(this.controls.target).normalize();
        let bestFront = candidates[0];
        let bestAny = candidates[0];
        let bestFrontDistance = Number.POSITIVE_INFINITY;
        let bestAnyDistance = bestAny.distance;
        candidates.forEach((entry) => {
            if (entry.distance < bestAnyDistance) {
                bestAnyDistance = entry.distance;
                bestAny = entry;
            }
            const faceId = entry.object.userData ? entry.object.userData.faceId : null;
            if (!faceId) return;
            const normal = this.getFaceNormalOutward(faceId);
            if (!normal) return;
            if (normal.dot(cameraDir) <= 0) return;
            if (entry.distance < bestFrontDistance) {
                bestFrontDistance = entry.distance;
                bestFront = entry;
            }
        });
        const target = bestFrontDistance < Number.POSITIVE_INFINITY ? bestFront.object : bestAny.object;
        const faceId = target.userData ? target.userData.faceId : null;
        return typeof faceId === 'string' ? faceId : null;
    }

    handleNetSelectionMove(e: MouseEvent) {
        const faceId = this.pickNetFaceIdFromEvent(e);
        if (faceId === this.netHoverFaceId) return;
        this.clearNetHoverHighlight();
        this.netHoverFaceId = faceId;
        if (this.netHoverFaceId && this.netHoverFaceId !== this.netSelectedFaceId) {
            this.setNetFaceHighlight(this.netHoverFaceId, 'hover');
        }
        document.body.style.cursor = faceId ? 'pointer' : 'auto';
    }

    openNetWithRoot(rootFaceId: string) {
        this.netSelectionActive = false;
        this.netRootFaceId = rootFaceId;
        this.debugNetLogDone = false;
        this.clearNetHoverHighlight();
        this.netSelectedFaceId = rootFaceId;
        this.setNetFaceHighlight(rootFaceId, 'selected');
        this.cube.setFaceOutlineVisible(true);
        this.objectModelManager.setNetVisible(true);
        if (typeof (globalThis as any).__setNetVisible === 'function') {
            (globalThis as any).__setNetVisible(true);
        }
        const model = this.objectModelManager.getModel();
        if (model) {
            const cutFaceIds = Object.entries(model.presentation.faces || {})
                .filter(([, pres]) => pres && pres.isCutFace)
                .map(([faceId]) => faceId);
            this.currentNetPlan = this.netManager.generateNetPlan(model.ssot, {
                rootFaceId,
                topologyIndex: model.derived.topologyIndex,
                faceAdjacency: model.derived.cut?.faceAdjacency,
                vertexSnapMap: model.derived.cut?.vertexSnapMap,
                excludeFaceIds: cutFaceIds
            });
        }
        const faceInfo = this.resolver.resolveFace(rootFaceId);
        const faceCenter = this.resolver.resolveFaceCenter(rootFaceId);
        const solidCenter = this.getSolidCenter();
        let targetCameraPos = this.defaultCameraPosition.clone();
        let targetCameraUp = new THREE.Vector3(0, 1, 0);
        if (faceInfo && faceCenter) {
            const ref = this.getReferenceNetFrame();
            const frontFaceId = this.pickFrontFaceId(rootFaceId);
            const frontNormal = frontFaceId ? this.getFaceNormalOutward(frontFaceId) : null;
            let sourceNormal = faceInfo.normal.clone().normalize();
            const outward = faceCenter.clone().sub(solidCenter);
            if (sourceNormal.dot(outward) < 0) {
                sourceNormal.negate();
            }
            let sourceBasisU = faceInfo.basisU.clone().normalize();
            if (frontNormal && ref) {
                const projected = frontNormal.clone().sub(sourceNormal.clone().multiplyScalar(frontNormal.dot(sourceNormal)));
                if (projected.lengthSq() > 1e-6) {
                    sourceBasisU = projected.normalize();
                }
            }
            if (ref) {
                const rotation = this.computeFaceAlignmentRotation({
                    sourceNormal,
                    sourceBasisU,
                    targetNormal: ref.normal,
                    targetBasisU: ref.basisU
                });
                const inverse = rotation.clone().invert();
                const offset = this.defaultCameraPosition.clone().sub(solidCenter).applyQuaternion(inverse);
                targetCameraPos = solidCenter.clone().add(offset);
                targetCameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(inverse);
                this.updateNetCameraFrameFromView(faceCenter, sourceNormal, targetCameraPos);
            }
        }
        this.netManager.show();
        const pose = this.getNetCameraPose();
        if (!pose) {
            this.positionCameraForNetOblique();
            this.startNetUnfold();
            return;
        }
        const openProgress = new Map<string, number>();
        if (this.currentNetPlan) {
            this.currentNetPlan.faceOrder.forEach((faceId) => {
                if (faceId === this.currentNetPlan!.rootFaceId) return;
                openProgress.set(faceId, 1);
            });
        }
        const openBounds = this.computeNetBoundsForProgress(openProgress, 0);
        const targetZoom = openBounds
            ? this.computeZoomForBounds(openBounds, targetCameraPos, pose.center.clone(), targetCameraUp)
            : this.camera.zoom;
        const targetPos = targetCameraPos.clone();
        const targetCenter = pose.center.clone();
        const targetUp = targetCameraUp.clone();
        const currentZoom = this.camera.zoom;
        this.startNetPreCameraMove({
            endPos: targetPos.clone(),
            endTarget: targetCenter.clone(),
            endUp: targetUp.clone(),
            endZoom: currentZoom,
            onComplete: () => {
                this.startNetPreCameraMove({
                    endPos: targetPos.clone(),
                    endTarget: targetCenter.clone(),
                    endUp: targetUp.clone(),
                    endZoom: targetZoom,
                    onComplete: () => {
                        if (this.netPreCameraTimeout) {
                            clearTimeout(this.netPreCameraTimeout);
                        }
                        this.netPreCameraTimeout = setTimeout(() => {
                            this.startNetUnfold();
                            const solid = this.objectModelManager.getModel()?.ssot;
                            if (solid) {
                                this.netManager.update(this.objectModelManager.getCutSegments(), solid, this.resolver);
                            }
                            this.ui.showMessage("底面を確定しました。展開します。", "info");
                        }, 1500);
                    }
                });
            }
        });
    }

    handleNetSelectionClick(e: MouseEvent) {
        if (this.netAnimationPlayer.isPlaying() || this.netPreCameraActive) return;
        const faceId = this.pickNetFaceIdFromEvent(e);
        if (!faceId) return;
        this.openNetWithRoot(faceId);
    }

    handleToggleNetClick() {
        const wasVisible = this.objectModelManager.getNetVisible();
        if (this.netAnimationPlayer.isPlaying()) return;
        if (!wasVisible) {
            if (this.netSelectionActive) {
                this.cancelNetBaseSelection();
                return;
            }
            this.startNetBaseSelection();
            return;
        }
        if (!this.useAnimationSpecNet) {
            this.objectModelManager.setNetVisible(false);
            if (typeof (globalThis as any).__setNetVisible === 'function') {
                (globalThis as any).__setNetVisible(false);
            }
            this.netManager.hide();
            this.startNetFoldLegacy();
        } else {
            if (typeof (globalThis as any).__setNetVisible === 'function') {
                (globalThis as any).__setNetVisible(false);
            }
            this.startNetFoldWithPreCamera();
        }
        this.netRootFaceId = null;
    }

    startNetFoldWithPreCamera() {
        if (this.netAnimationPlayer.isPlaying() || this.netPreCameraActive) return;
        const rootFaceId = this.netRootFaceId || this.netSelectedFaceId;
        if (!rootFaceId) {
            this.startNetFold();
            return;
        }
        this.debugNetLogDone = false;
        const faceInfo = this.resolver.resolveFace(rootFaceId);
        const faceCenter = this.resolver.resolveFaceCenter(rootFaceId);
        const solidCenter = this.getSolidCenter();
        let targetCameraPos = this.defaultCameraPosition.clone();
        let targetCameraUp = new THREE.Vector3(0, 1, 0);
        if (faceInfo && faceCenter) {
            const ref = this.getReferenceNetFrame();
            const frontFaceId = this.pickFrontFaceId(rootFaceId);
            const frontNormal = frontFaceId ? this.getFaceNormalOutward(frontFaceId) : null;
            let sourceNormal = faceInfo.normal.clone().normalize();
            const outward = faceCenter.clone().sub(solidCenter);
            if (sourceNormal.dot(outward) < 0) {
                sourceNormal.negate();
            }
            let sourceBasisU = faceInfo.basisU.clone().normalize();
            if (frontNormal && ref) {
                const projected = frontNormal.clone().sub(sourceNormal.clone().multiplyScalar(frontNormal.dot(sourceNormal)));
                if (projected.lengthSq() > 1e-6) {
                    sourceBasisU = projected.normalize();
                }
            }
            if (ref) {
                const rotation = this.computeFaceAlignmentRotation({
                    sourceNormal,
                    sourceBasisU,
                    targetNormal: ref.normal,
                    targetBasisU: ref.basisU
                });
                const inverse = rotation.clone().invert();
                const offset = this.defaultCameraPosition.clone().sub(solidCenter).applyQuaternion(inverse);
                targetCameraPos = solidCenter.clone().add(offset);
                targetCameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(inverse);
                this.updateNetCameraFrameFromView(faceCenter, sourceNormal, targetCameraPos);
            }
        }
        const pose = this.getNetCameraPose();
        if (!pose) {
            this.startNetFold();
            return;
        }
        this.startNetPreCameraMove({
            endPos: targetCameraPos.clone(),
            endTarget: pose.center.clone(),
            endUp: targetCameraUp.clone(),
            endZoom: this.camera.zoom,
            onComplete: () => {
                this.startNetFold();
            }
        });
    }

    // --- Animation Loop ---
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.mainLight.position.copy(this.camera.position);
        this.mainLight.target.position.copy(this.controls.target);
        this.mainLight.target.updateMatrixWorld();
        const debugEnabled = isDebugEnabled();
        if (debugEnabled !== this.debugEnabledLast) {
            this.debugEnabledLast = debugEnabled;
            this.cutter.setDebug(debugEnabled);
            if (debugEnabled) {
                this.debugInitLogDone = false;
                this.debugFaceLogDone = false;
                this.debugNetLogDone = false;
            }
        }
        if (debugEnabled && !this.debugInitLogDone) {
            console.info('[init]', JSON.stringify({
                camera: this.camera.position.toArray(),
                target: this.controls.target.toArray(),
                up: this.camera.up.toArray(),
                light: this.mainLight.position.toArray()
            }));
            this.debugInitLogDone = true;
        }
        if (debugEnabled && !this.debugFaceLogDone) {
            const model = this.objectModelManager.getModel();
            if (model) {
                const faceIds = ['F:2-3-7-6', 'F:0-3-7-4', 'F:0-1-2-3'];
                faceIds.forEach((faceId) => {
                    const normal = this.getFaceNormalOutward(faceId);
                    const center = this.resolver.resolveFaceCenter(faceId);
                    if (!normal || !center) return;
                    const toLight = this.mainLight.position.clone().sub(center).normalize();
                    const dot = normal.dot(toLight);
                    console.info('[debug] face', JSON.stringify({
                        faceId,
                        normal: normal.toArray(),
                        center: center.toArray(),
                        dotLight: Number(dot.toFixed(3))
                    }));
                });
                this.debugFaceLogDone = true;
            }
        }
        if (this.cube.faceOutlineVisible) {
            const cameraDir = this.camera.position.clone().sub(this.controls.target).normalize();
            this.cube.faceOutlines.forEach((outline, faceId) => {
                const normal = this.getFaceNormalOutward(faceId);
                if (!normal) return;
                const isFront = normal.dot(cameraDir) > 0;
                outline.visible = this.cube.faceOutlineVisible && isFront;
                const hidden = this.cube.faceHiddenOutlines.get(faceId);
                if (hidden) {
                    hidden.visible = this.cube.faceOutlineVisible && !isFront;
                }
            });
        }
        if (debugEnabled && !this.debugNetLogDone && this.netRootFaceId) {
            const mesh = this.cube.faceMeshes.get(this.netRootFaceId);
            if (mesh) {
                console.info('[debug] netRoot', JSON.stringify({
                    faceId: this.netRootFaceId,
                    position: mesh.position.toArray(),
                    quaternion: [mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w]
                }));
                this.debugNetLogDone = true;
            }
        }
        if (this.layoutTransitionActive) {
            const elapsed = performance.now() - this.layoutTransitionStart;
            const t = Math.min(1, elapsed / this.layoutTransitionDuration);
            const eased = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.layoutPanelOffset = this.layoutTransitionFrom + (this.layoutTransitionTo - this.layoutTransitionFrom) * eased;
            this.updateLayout(this.layoutPanelOffset);
            if (t >= 1) {
                this.layoutPanelOffset = this.layoutTransitionTo;
                this.layoutTransitionActive = false;
                this.updateLayout(this.layoutPanelOffset);
            }
        }
        
        let netState = this.objectModelManager.getNetState();
        if (netState.state !== 'closed') {
            if (!Number.isFinite(netState.scaleTarget) || !Number.isFinite(netState.scale)) {
                this.logNetUnfoldInvalid('invalid net animation state', {
                    state: netState.state,
                    scale: netState.scale,
                    scaleTarget: netState.scaleTarget
                });
                return;
            }
            const scaleReady = netState.state !== 'postscale' || (performance.now() - netState.startAt) >= 0;
            let nextScale = netState.scale;
            if (Math.abs(netState.scaleTarget - netState.scale) > 0.001) {
                if (scaleReady) {
                    const speed = netState.state === 'prescale' ? 0.08 : 0.15;
                    nextScale = netState.scale + (netState.scaleTarget - netState.scale) * speed;
                }
            } else {
                nextScale = netState.scaleTarget;
            }
            
            // Note: netUnfoldGroup scale was handled here. In new pipeline, we might want to scale the whole Cube?
            // For now, let's keep the logic if we decide to scale the cube during net view.
            
            if (netState.state === 'prescale') {
                if (Math.abs(netState.scaleTarget - nextScale) <= 0.001) {
                    if (!this.netUnfoldScaleReadyAt) {
                        this.netUnfoldScaleReadyAt = performance.now();
                    }
                    if (performance.now() - this.netUnfoldScaleReadyAt >= netState.preScaleDelay) {
                        this.netUnfoldScaleReadyAt = null;
                        const startAt = performance.now();
                        this.setNetAnimationState({ state: 'opening', progress: 0, startAt });
                        netState = { ...netState, state: 'opening', progress: 0, startAt };
                    }
                } else {
                    this.netUnfoldScaleReadyAt = null;
                }
            }
            if (netState.state === 'postscale' && scaleReady && Math.abs(netState.scaleTarget - nextScale) <= 0.001) {
                this.clearNetUnfoldGroup();
                this.cube.setVisible(true);
                this.cutter.setVisible(true);
                this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
                const display = this.objectModelManager.getDisplayState();
                this.cutter.setTransparency(display.cubeTransparent);
                this.controls.update();
            }
            if (netState.state !== 'closed') {
                this.setNetAnimationState({
                    state: netState.state,
                    progress: netState.progress,
                    duration: netState.duration,
                    faceDuration: netState.faceDuration,
                    scale: nextScale,
                    scaleTarget: netState.scaleTarget,
                    preScaleDelay: netState.preScaleDelay,
                    postScaleDelay: netState.postScaleDelay
                });
            }
        }
        this.updateNetUnfoldAnimation();
        this.updateNetCameraZoom();
        if (this.netPreCameraActive) {
            const elapsed = performance.now() - this.netPreCameraStartAt;
            const t = Math.max(0, Math.min(1, elapsed / this.netPreCameraDurationMs));
            this.camera.position.lerpVectors(this.netPreCameraStartPos, this.netPreCameraEndPos, t);
            this.controls.target.lerpVectors(this.netPreCameraStartTarget, this.netPreCameraEndTarget, t);
            this.netPreCameraTempUp.copy(this.netPreCameraStartUp)
                .lerp(this.netPreCameraEndUp, t)
                .normalize();
            this.camera.up.copy(this.netPreCameraTempUp);
            this.camera.zoom = this.netPreCameraStartZoom + (this.netPreCameraEndZoom - this.netPreCameraStartZoom) * t;
            this.camera.lookAt(this.controls.target);
            this.camera.updateProjectionMatrix();
            if (t >= 1) {
                this.netPreCameraActive = false;
                const onComplete = this.netPreCameraOnComplete;
                this.netPreCameraOnComplete = null;
                if (onComplete) onComplete();
            }
        }
        if (this.isCameraAnimating && this.cameraTargetPosition) {
            this.camera.position.lerp(this.cameraTargetPosition, 0.05);
            if (this.camera.position.distanceTo(this.cameraTargetPosition) < 0.1) {
                this.isCameraAnimating = false;
                this.camera.position.copy(this.cameraTargetPosition);
            }
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// --- Application Start ---
const app = new App();
app.init();
