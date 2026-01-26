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

const DEBUG = false;

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
        this.netUnfoldDuration = 800;
        this.netUnfoldFaceDuration = 700;
        this.netUnfoldStagger = 700;
        this.defaultCameraPosition = new THREE.Vector3(10, 5, 3);
        this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);
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
        this.layoutPanelOffset = 0;
        this.layoutTargetPanelOffset = 0;
        this.layoutTransitionStart = 0;
        this.layoutTransitionFrom = 0;
        this.layoutTransitionTo = 0;
        this.layoutTransitionDuration = 240;
        this.layoutTransitionActive = false;
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

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        document.body.appendChild(this.renderer.domElement);

        /** @type {any} */
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.raycaster = new THREE.Raycaster();

        // --- Lights and Helpers ---
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const light = new THREE.DirectionalLight(0xffffff, 0.6);
        light.position.set(5, 5, 5);
        this.scene.add(light);

        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.7 });
        this.midPointHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
        this.highlightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), highlightMaterial);
        this.highlightMarker.visible = false;
        this.scene.add(this.highlightMarker);

        // --- Managers ---
        const hasReactSidePanel = !!document.getElementById('react-side-panel-root');
        this.ui = new UIManager({ legacyControls: !hasReactSidePanel });
        this.cube = new Cube(this.scene, size);
        this.resolver = new GeometryResolver({ size: this.cube.getSize(), indexMap: this.cube.getIndexMap() });
        this.cutter = new Cutter(this.scene);
        this.cutter.setDebug(DEBUG);
        this.netManager = new NetManager();
        this.netManager.setResolver(this.resolver);
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

    resetScene() {
        this.cancelLearningAnimation();
        this.clearLearningLines();
        this.clearLearningPlane();
        this.clearLearningHints();
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
        const solid = this.objectModelManager.getModel()?.ssot;
        this.netManager.update([], solid, this.resolver);
        this.isCutExecuted = false;
        this.snappedPointInfo = null;
        this.highlightMarker.visible = false;
        this.ui.setExplanation('');
        this.isCameraAnimating = true;
        this.cameraTargetPosition = this.defaultCameraPosition.clone();
        this.controls.target.copy(this.defaultCameraTarget);
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
        if (this.isCutExecuted || this.currentMode !== 'free') {
            this.highlightMarker.visible = false;
            this.snappedPointInfo = null;
            document.body.style.cursor = 'auto';
            return;
        }
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([...this.cube.vertexMeshes, ...this.cube.edgeMeshes]);
        this.selection.clearPreview();

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
        const availableHeight = window.innerHeight;
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--sidebar-width', `${sidebarWidth}px`);
        rootStyle.setProperty('--panel-offset', `${panelOffset}px`);
        this.cube.resize(this.camera, availableWidth, availableHeight);
        this.resolver.setSize(this.cube.getSize());
        this.renderer.setSize(availableWidth, availableHeight);
        const canvas = this.renderer.domElement;
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
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
                this.camera.position.lerpVectors(start.position, end.position, easedProgress);
                this.controls.target.lerpVectors(start.target, end.target, easedProgress);
                this.camera.up.set(0, 1, 0);
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
        const cameraPosition = direction === 'open'
            ? { x: 0, y: 0, z: this.cube.size * 3 }
            : { x: this.defaultCameraPosition.x, y: this.defaultCameraPosition.y, z: this.defaultCameraPosition.z };
        const cameraTarget = direction === 'open'
            ? { x: 0, y: 0, z: 0 }
            : { x: this.defaultCameraTarget.x, y: this.defaultCameraTarget.y, z: this.defaultCameraTarget.z };
        return this.netManager.buildUnfoldAnimationSpec(this.currentNetPlan, {
            startAtSec: 0,
            faceDurationSec: this.netUnfoldFaceDuration / 1000,
            staggerSec: this.netUnfoldStagger / 1000,
            cameraDurationSec: this.netUnfoldDuration / 1000,
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
        this.resetNetAnimationCaches();
        this.netAnimationDirection = 'open';
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
        const spec = this.buildNetAnimationSpec('close');
        if (!spec) return;
        this.netAnimationPlayer.play(spec, () => {
            this.objectModelManager.setNetVisible(false);
            this.netManager.hide();
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
        const camera = {
            startPos: this.camera.position.clone(),
            startTarget: this.controls.target.clone(),
            endPos: new THREE.Vector3(0, 0, this.cube.size * 3),
            endTarget: new THREE.Vector3(0, 0, 0)
        };
        this.netUnfoldScaleReadyAt = null;

        const nextState = this.objectModelManager.getNetState();
        const duration = nextState.duration || this.netUnfoldDuration;
        const faceDuration = nextState.faceDuration || this.netUnfoldFaceDuration;
        const stagger = nextState.stagger || this.netUnfoldStagger;
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
            this.camera.up.set(0, 1, 0);
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

    handleFlipCutClick() {
        this.cutter.flipCut();
        const solid = this.objectModelManager.getModel()?.ssot || null;
        this.cutService.syncFromCutterResult(solid);
    }

    handleToggleNetClick() {
        const wasVisible = this.objectModelManager.getNetVisible();
        if (!this.useAnimationSpecNet) {
            const nextVisible = !wasVisible;
            this.objectModelManager.setNetVisible(nextVisible);
            if (typeof (globalThis as any).__setNetVisible === 'function') {
                (globalThis as any).__setNetVisible(nextVisible);
            }
            if (nextVisible) {
                const model = this.objectModelManager.getModel();
                if (model) {
                    this.currentNetPlan = this.netManager.generateNetPlan(model.ssot);
                }
                this.netManager.show();
                this.startNetUnfoldLegacy();
            } else {
                this.netManager.hide();
                this.startNetFoldLegacy();
            }
            const model = this.objectModelManager.getModel();
            if (model) {
                this.netManager.update(this.objectModelManager.getCutSegments(), model.ssot, this.resolver);
            }
            return;
        }

        if (this.netAnimationPlayer.isPlaying()) return;
        if (!wasVisible) {
            this.objectModelManager.setNetVisible(true);
            if (typeof (globalThis as any).__setNetVisible === 'function') {
                (globalThis as any).__setNetVisible(true);
            }
            const model = this.objectModelManager.getModel();
            if (model) {
                this.currentNetPlan = this.netManager.generateNetPlan(model.ssot);
            }
            this.netManager.show();
            this.startNetUnfold();
        } else {
            if (typeof (globalThis as any).__setNetVisible === 'function') {
                (globalThis as any).__setNetVisible(false);
            }
            this.startNetFold();
        }
        const model = this.objectModelManager.getModel();
        if (model) {
            this.netManager.update(this.objectModelManager.getCutSegments(), model.ssot, this.resolver);
        }
    }

    // --- Animation Loop ---
    animate() {
        requestAnimationFrame(this.animate.bind(this));
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
