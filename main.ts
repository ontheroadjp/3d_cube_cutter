import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cube } from './js/Cube.js';
import { SelectionManager } from './js/SelectionManager.js';
import { UIManager } from './js/UIManager.js';
import { Cutter } from './js/Cutter.js';
import { PresetManager } from './js/presets/PresetManager.js';
import { NetManager } from './js/net/NetManager.js';
import { GeometryResolver } from './js/geometry/GeometryResolver.js';
import { buildUserPresetState } from './js/presets/userPresetState.js';
import { NoopStorageAdapter, IndexedDbStorageAdapter } from './js/storage/storageAdapter.js';
import { generateExplanation } from './js/education/explanationGenerator.js';
import { initReactApp } from './js/ui/reactApp.js';
import { ObjectModelManager, type EngineEvent } from './js/model/objectModelManager.js';
import type { CutFacePolygon, DisplayState, LearningProblem, UserPresetState } from './js/types.js';
import type { ObjectNetState } from './js/model/objectModel.js';
import { normalizeSnapPointId, parseSnapPointId } from './js/geometry/snapPointId.js';
import { createLabel, createMarker } from './js/utils.js';

const DEBUG = false;

class App {
    isCutExecuted: boolean;
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
        this.objectModelManager.build();
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
            getNetVisible: () => this.objectModelManager.getNetVisible()
        };
        initReactApp();

        this.objectModelManager.subscribe((event) => this.handleEngineEvent(event));

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
                const display = this.objectModelManager.getDisplayState();
                this.objectModelManager.applyDisplayToView(display);
                this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
                this.cutter.setTransparency(display.cubeTransparent);
                this.selection.toggleVertexLabels(display.showVertexLabels);
                this.updateNetOverlayDisplay(display);
                this.updateNetLabelDisplay(display);
                
                // Sync global/React state
                if (typeof globalThis.__setDisplayState === 'function') {
                    globalThis.__setDisplayState(display);
                }
                break;
            }
            case "CUT_RESULT_UPDATED": {
                this.cutter.refreshEdgeHighlightColors();
                this.cutter.updateCutPointMarkers(this.objectModelManager.resolveCutIntersectionPositions());
                const solid = this.objectModelManager.getModel()?.solid;
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
        const snapIds = this.selection.getSelectedSnapIds();
        if (snapIds.length < 3) return;

        const success = this.cutter.cut(this.cube, snapIds, this.resolver);
        if (!success) {
            console.warn("切断処理に失敗しました。点を選択し直してください。");
            this.isCutExecuted = false;
            this.selection.reset();
            return;
        }
        this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
        const modelDisplay = this.objectModelManager.getDisplayState();
        this.cutter.setTransparency(modelDisplay.cubeTransparent);

        const solid = this.objectModelManager.getModel()?.solid;
        const cutState = solid ? this.cutter.computeCutState(solid, snapIds, this.resolver) : null;

        if (cutState) {
            this.objectModelManager.syncCutState({
                intersections: cutState.intersections,
                cutSegments: cutState.cutSegments,
                facePolygons: cutState.facePolygons,
                faceAdjacency: cutState.faceAdjacency
            });
        } else {
            console.warn("Structure-first cut failed, falling back to legacy CSG result.");
            this.objectModelManager.syncCutState({
                intersections: this.cutter.getIntersectionRefs(),
                cutSegments: this.cutter.getCutSegments(),
                facePolygons: this.cutter.getResultFacePolygons(),
                faceAdjacency: this.cutter.getResultFaceAdjacency()
            });
        }

        const explanation = generateExplanation({
            snapIds,
            outlineRefs: this.cutter.getOutlineRefs(),
            structure: this.cube.getStructure ? this.cube.getStructure() : null
        });
        this.ui.setExplanation(explanation);
        this.isCutExecuted = true;
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
        const solid = this.objectModelManager.getModel()?.solid;
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

    applyDisplayState(display = {}) {
        const current = this.objectModelManager.getDisplayState();
        const next = { ...current, ...display };
        this.ui.applyDisplayState(next);
        this.objectModelManager.setDisplay(next);
        
        if (this.objectModelManager.getNetState().state !== 'closed') {
            this.cube.setVisible(false);
            this.cutter.setVisible(false);
        }
    }

    applyUserPresetState(state) {
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
        if (typeof globalThis.__setDisplayState === 'function') {
            globalThis.__setDisplayState(this.ui.getDisplayState());
        }

        const snapIds = state.cut && Array.isArray(state.cut.snapPoints) ? state.cut.snapPoints : [];
        this.selection.reset();
        snapIds.forEach(snapId => this.selection.addPointFromSnapId(snapId));

        const inverted = state.cut ? !!state.cut.inverted : false;
        this.cutter.setCutInverted(inverted, false);

        if (snapIds.length >= 3) {
            this.executeCut();
            if (state.cut && state.cut.result) {
                this.cutter.applyCutResultMeta(state.cut.result, this.resolver);
                this.objectModelManager.syncCutState({
                    intersections: this.cutter.getIntersectionRefs(),
                    cutSegments: this.cutter.getCutSegments(),
                    facePolygons: this.cutter.getResultFacePolygons(),
                    faceAdjacency: this.cutter.getResultFaceAdjacency()
                });
                this.cutter.refreshEdgeHighlightColors();
                this.cutter.updateCutPointMarkers(this.objectModelManager.resolveCutIntersectionPositions());
                this.netManager.update(this.objectModelManager.getCutSegments(), this.cube, this.resolver);
                this.selection.updateSplitLabels(this.objectModelManager.getCutIntersections());
                const explanation = generateExplanation({
                    snapIds,
                    outlineRefs: this.cutter.getOutlineRefs(),
                    structure: this.cube.getStructure ? this.cube.getStructure() : null
                });
                this.ui.setExplanation(explanation);
            }
        }
    }

    // --- Event Handlers ---
    handleClick(e) {
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

    handleMouseMove(e) {
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

            let snappedPoint;
            let isMidpoint = false;
            let edgeLength = null;
            let snappedLength = null;

            if (userData.type === 'vertex') {
                if (userData.vertexId) {
                    snappedPoint = this.resolver.resolveVertex(userData.vertexId);
                }
                if (!snappedPoint) {
                    this.highlightMarker.visible = false;
                    this.snappedPointInfo = null;
                    document.body.style.cursor = 'auto';
                    return;
                }
                this.highlightMarker.material.color.set(0x808080);
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
                this.highlightMarker.material = isMidpoint ? this.midPointHighlightMaterial : this.highlightMarker.material;
                this.highlightMarker.material.color.set(isMidpoint ? 0x00ff00 : 0x808080);
                this.selection.previewSplit(userData.edgeId || userData.index, snappedPoint);
            }
            this.highlightMarker.position.copy(snappedPoint);
            this.highlightMarker.visible = true;
            let snapId = null;
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
    
    handleModeChange(mode) {
        this.currentMode = mode;
        if (typeof globalThis.__setReactMode === 'function') {
            globalThis.__setReactMode(mode);
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

    handlePresetCategoryChange(category) {
        if (category && !this.useReactPresets) this.ui.filterPresetButtons(category);
    }
    
    handleSettingsCategoryChange(category) {
        if (!this.useReactPresets) {
            this.ui.showSettingsPanel(category);
        }
    }

    handlePresetChange(name) {
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

    previewLearningProblem(problem) {
        const snapIds = Array.isArray(problem)
            ? problem
            : (problem && Array.isArray(problem.snapIds) ? problem.snapIds : []);
        if (!Array.isArray(snapIds) || snapIds.length < 3) return;
        this.resetScene();
    }

    startLearningSolution(problem) {
        const snapIds = Array.isArray(problem)
            ? problem
            : (problem && Array.isArray(problem.snapIds) ? problem.snapIds : []);
        if (!Array.isArray(snapIds) || snapIds.length < 3) return { totalSteps: 0 };
        this.cancelLearningAnimation();
        this.resetScene();
        const highlightPlane = problem && !Array.isArray(problem) ? problem.highlightPlane : null;
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

        if (!Array.isArray(problem) && Array.isArray(problem?.learningSteps)) {
            steps = [...problem.learningSteps];
        } else {
            const givenSnapIds = !Array.isArray(problem) && Array.isArray(problem?.givenSnapIds)
                ? problem.givenSnapIds
                : snapIds;
            const markSteps = givenSnapIds.map(snapId => ({
                instruction: `まずは問題文から分かる条件を図に書き込もう。${this.formatSnapInstruction(snapId)}`,
                reason: '問題文に書いてある条件は、最初に必ず書き込むよ。',
                action: { type: 'mark' as const, snapId }
            }));
            const hintSteps = !Array.isArray(problem) && Array.isArray(problem?.highlightSegments)
                ? problem.highlightSegments.map(segment => ({
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

        const segmentInstructions = !Array.isArray(problem) && Array.isArray(problem?.segmentInstructions)
            ? problem.segmentInstructions
            : [
                '同じ面にある点をまっすぐ結んでみよう。',
                'となりの面でも線をつないでいこう。',
                '次の面でも同じように線を引こう。',
                '線が別の面へ移動したら、その面でも結ぼう。',
                '最後の面まで線をつなげよう。',
                'もう一度、同じ面の点を結んでいこう。'
            ];
        const segmentReasons = !Array.isArray(problem) && Array.isArray(problem?.segmentReasons)
            ? problem.segmentReasons
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
        if (!step) return { done: true };
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

    animateLearningSegment(segment, token) {
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
            const step = (now) => {
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
        const lx = parseFloat(prompt("辺ABの長さ(cm)", "10"));
        const ly = parseFloat(prompt("辺ADの長さ(cm)", "10"));
        const lz = parseFloat(prompt("辺AEの長さ(cm)", "10"));
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
        /** @type {Record<string, string>} */
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

    async handleSaveUserPreset(formOverride = null) {
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

    handleUserPresetApply(id) {
        const state = this.userPresets.find(p => p.id === id);
        if (!state) return;
        this.applyUserPresetState(state);
        this.ui.showMessage('ユーザープリセットを適用しました。', 'success');
    }

    handleUserPresetEdit(id) {
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

    async handleUserPresetDelete(id) {
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

    buildNetUnfoldGroup() {
        const cutFaces = this.isCutExecuted ? this.objectModelManager.getCutFacePolygons() : [];
        if (cutFaces.length) {
            this.buildCutNetUnfoldGroup(cutFaces, this.objectModelManager.getCutFaceAdjacency());
            return;
        }
        this.buildCubeNetUnfoldGroup();
    }

    computeUnfoldDepths(
        faceIds: string[],
        adjacency: Array<{ a: string; b: string; hingeType?: 'edge' | 'coplanar'; sharedEdgeIds?: [string, string] }>,
        faceTypeMap: Map<string, CutFacePolygon['type']>,
        rootId?: string,
        weights?: { cutEdgePenalty?: number; coplanarBonus?: number; missingEdgePenalty?: number }
    ) {
        if (!faceIds.length) return new Map<string, number>();
        const root = rootId && faceIds.includes(rootId) ? rootId : faceIds[0];
        const cutEdgePenalty = weights && typeof weights.cutEdgePenalty === 'number' ? weights.cutEdgePenalty : 2;
        const coplanarBonus = weights && typeof weights.coplanarBonus === 'number' ? weights.coplanarBonus : 0.5;
        const missingEdgePenalty = weights && typeof weights.missingEdgePenalty === 'number' ? weights.missingEdgePenalty : 0.5;
        const edges = adjacency
            .filter(entry => faceIds.includes(entry.a) && faceIds.includes(entry.b))
            .map(entry => {
                const typeA = faceTypeMap.get(entry.a) || 'original';
                const typeB = faceTypeMap.get(entry.b) || 'original';
                let weight = 1;
                if (entry.hingeType === 'coplanar') weight -= coplanarBonus;
                if (!entry.sharedEdgeIds) weight += missingEdgePenalty;
                if (typeA === 'cut' || typeB === 'cut') weight += cutEdgePenalty;
                return { a: entry.a, b: entry.b, weight };
            });
        const inTree = new Set([root]);
        const parentMap = new Map<string, string | null>([[root, null]]);
        const remaining = new Set(faceIds.filter(id => id !== root));
        while (remaining.size) {
            let best: { a: string; b: string; weight: number } | null = null;
            edges.forEach(edge => {
                const aIn = inTree.has(edge.a);
                const bIn = inTree.has(edge.b);
                if (aIn === bIn) return;
                if (!best || edge.weight < best.weight) {
                    best = edge;
                }
            });
            if (!best) break;
            const next = inTree.has(best.a) ? best.b : best.a;
            const parentId = inTree.has(best.a) ? best.a : best.b;
            if (!inTree.has(next)) {
                inTree.add(next);
                parentMap.set(next, parentId);
                remaining.delete(next);
            }
        }
        remaining.forEach(id => parentMap.set(id, null));
        const depthById = new Map<string, number>();
        const computeDepth = (id: string): number => {
            if (depthById.has(id)) return depthById.get(id) as number;
            const parent = parentMap.get(id) || null;
            if (!parent) {
                const depth = id === root ? 0 : -1;
                depthById.set(id, depth);
                return depth;
            }
            const depth = computeDepth(parent) + 1;
            depthById.set(id, depth);
            return depth;
        };
        faceIds.forEach(faceId => computeDepth(faceId));
        const maxDepth = Math.max(...Array.from(depthById.values()).filter(depth => depth >= 0));
        faceIds.forEach(faceId => {
            const depth = depthById.get(faceId);
            if (typeof depth === 'number' && depth >= 0) return;
            depthById.set(faceId, maxDepth + 1);
        });
        return depthById;
    }

    analyzeCutAdjacency(
        faceIds: string[],
        adjacency: Array<{ a: string; b: string; hingeType?: 'edge' | 'coplanar' }>,
        faceTypeMap: Map<string, CutFacePolygon['type']>
    ) {
        const originalFaceIds = faceIds.filter(id => faceTypeMap.get(id) === 'original');
        const originalSet = new Set(originalFaceIds);
        const neighbors = new Map<string, Set<string>>();
        adjacency.forEach(entry => {
            if (!originalSet.has(entry.a) || !originalSet.has(entry.b)) return;
            if (!neighbors.has(entry.a)) neighbors.set(entry.a, new Set());
            if (!neighbors.has(entry.b)) neighbors.set(entry.b, new Set());
            neighbors.get(entry.a)!.add(entry.b);
            neighbors.get(entry.b)!.add(entry.a);
        });
        let originalConnected = true;
        if (originalFaceIds.length > 1) {
            const visited = new Set<string>();
            const queue = [originalFaceIds[0]];
            visited.add(originalFaceIds[0]);
            while (queue.length) {
                const current = queue.shift() as string;
                (neighbors.get(current) || new Set()).forEach(next => {
                    if (visited.has(next)) return;
                    visited.add(next);
                    queue.push(next);
                });
            }
            originalConnected = originalFaceIds.every(id => visited.has(id));
        }
        const hasCoplanar = adjacency.some(entry => entry.hingeType === 'coplanar');
        return { originalConnected, hasCoplanar };
    }

    buildCubeNetUnfoldGroup() {
        const { lx, ly, lz } = this.cube.getSize();
        const display = this.objectModelManager.getDisplayState();
        const group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const faces = [];

        const getVertexLabel = (physicalIndex: number) => {
            const index = this.cube.physicalIndexToIndex[physicalIndex];
            if (index === undefined || index === null) return null;
            return this.cube.getDisplayLabelByIndex(index);
        };

        const addFaceLabels = (mesh: THREE.Mesh, width: number, height: number, faceName: string, vertexIndices: number[]) => {
            const faceLabel = createLabel(faceName, this.cube.size / 10, 'rgba(0,0,0,0.6)');
            faceLabel.position.set(0, 0, 0.06);
            faceLabel.userData.type = 'net-face-label';
            faceLabel.userData.baseScale = faceLabel.scale.clone();
            faceLabel.userData.basePosition = faceLabel.position.clone();
            faceLabel.visible = !!display.showFaceLabels;
            mesh.add(faceLabel);
            const corners = [
                new THREE.Vector3(-width / 2, -height / 2, 0.06),
                new THREE.Vector3(width / 2, -height / 2, 0.06),
                new THREE.Vector3(width / 2, height / 2, 0.06),
                new THREE.Vector3(-width / 2, height / 2, 0.06),
            ];
            vertexIndices.forEach((physicalIndex, idx) => {
                const label = getVertexLabel(physicalIndex);
                if (!label) return;
                const sprite = createLabel(label, this.cube.size / 14, 'rgba(0,0,0,0.75)');
                sprite.position.copy(corners[idx] || corners[0]);
                sprite.userData.type = 'net-vertex-label';
                sprite.userData.baseScale = sprite.scale.clone();
                sprite.userData.basePosition = sprite.position.clone();
                sprite.visible = !!display.showVertexLabels;
                mesh.add(sprite);
            });
        };
        const addFaceOutline = (mesh: THREE.Mesh) => {
            const edges = new THREE.EdgesGeometry(mesh.geometry as THREE.BufferGeometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x222222 }));
            line.position.set(0, 0, 0.05);
            mesh.add(line);
        };

        const addPivotFace = (
            faceId: string,
            pivot: THREE.Group,
            mesh: THREE.Mesh,
            startRot: THREE.Euler,
            endRot: THREE.Euler,
            delayIndex: number
        ) => {
            const startQuat = new THREE.Quaternion().setFromEuler(startRot);
            const endQuat = new THREE.Quaternion().setFromEuler(endRot);
            pivot.quaternion.copy(startQuat);
            group.add(pivot);
            faces.push({
                pivot,
                mesh,
                startQuat,
                endQuat,
                delayIndex,
                faceId
            });
        };

        const front = new THREE.Mesh(new THREE.PlaneGeometry(lx, ly), material);
        front.position.set(0, 0, 0);
        group.add(front);
        addFaceLabels(front, lx, ly, 'Front', [4, 5, 6, 7]);
        addFaceOutline(front);

        const rightPivot = new THREE.Group();
        rightPivot.position.set(lx / 2, 0, 0);
        const right = new THREE.Mesh(new THREE.PlaneGeometry(lz, ly), material);
        right.position.set(lz / 2, 0, 0);
        rightPivot.add(right);
        addFaceLabels(right, lz, ly, 'Right', [1, 2, 6, 5]);
        addFaceOutline(right);
        addPivotFace('F:1265', rightPivot, right, new THREE.Euler(0, -Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 0);

        const leftPivot = new THREE.Group();
        leftPivot.position.set(-lx / 2, 0, 0);
        const left = new THREE.Mesh(new THREE.PlaneGeometry(lz, ly), material);
        left.position.set(-lz / 2, 0, 0);
        leftPivot.add(left);
        addFaceLabels(left, lz, ly, 'Left', [4, 7, 3, 0]);
        addFaceOutline(left);
        addPivotFace('F:0473', leftPivot, left, new THREE.Euler(0, Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 3);

        const topPivot = new THREE.Group();
        topPivot.position.set(0, ly / 2, 0);
        const top = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), material);
        top.position.set(0, lz / 2, 0);
        top.rotation.set(Math.PI, 0, 0);
        topPivot.add(top);
        addFaceLabels(top, lx, lz, 'Top', [3, 2, 6, 7]);
        addFaceOutline(top);
        addPivotFace('F:4567', topPivot, top, new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 1);

        const bottomPivot = new THREE.Group();
        bottomPivot.position.set(0, -ly / 2, 0);
        const bottom = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), material);
        bottom.position.set(0, -lz / 2, 0);
        bottom.rotation.set(Math.PI, 0, 0);
        bottomPivot.add(bottom);
        addFaceLabels(bottom, lx, lz, 'Bottom', [0, 1, 5, 4]);
        addFaceOutline(bottom);
        addPivotFace('F:0321', bottomPivot, bottom, new THREE.Euler(-Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 2);

        const backPivot = new THREE.Group();
        backPivot.position.set(lz, 0, 0);
        const back = new THREE.Mesh(new THREE.PlaneGeometry(lx, ly), material);
        back.position.set(lx / 2, 0, 0);
        backPivot.add(back);
        addFaceLabels(back, lx, ly, 'Back', [1, 0, 3, 2]);
        addFaceOutline(back);
        rightPivot.add(backPivot);
        faces.push({
            pivot: backPivot,
            mesh: back,
            startQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)),
            endQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
            delayIndex: 4,
            faceId: 'F:2376'
        });

        const structure = this.cube.getStructure ? this.cube.getStructure() : null;
        if (structure && Array.isArray(structure.faces)) {
            const seen = new Set<string>();
            const adjacency = [];
            structure.faces.forEach(face => {
                if (!face || !face.id || !Array.isArray(face.adjacentFaces)) return;
                face.adjacentFaces.forEach(adjacentId => {
                    const key = face.id < adjacentId ? `${face.id}|${adjacentId}` : `${adjacentId}|${face.id}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    adjacency.push({ a: face.id, b: adjacentId, hingeType: 'edge' as const });
                });
            });
            const faceIds = faces.map(face => face.faceId).filter(Boolean);
            const faceTypeMap = new Map(faceIds.map(faceId => [faceId, 'original' as const]));
            const depthById = this.computeUnfoldDepths(faceIds, adjacency, faceTypeMap, 'F:0154');
            faces.forEach(face => {
                if (!face.faceId) return;
                const depth = depthById.get(face.faceId);
                if (typeof depth === 'number') {
                    face.delayIndex = depth;
                }
            });
        }

        this.netUnfoldGroup = group;
        this.netUnfoldFaces = faces;
        const maxDelay = Math.max(...faces.map(face => face.delayIndex));
        this.netUnfoldDuration = this.netUnfoldFaceDuration + maxDelay * this.netUnfoldStagger;
        this.scene.add(group);
        this.syncNetModelState();
    }

    updateNetOverlayDisplay(display: DisplayState) {
        if (!this.netUnfoldGroup) return;
        const showPoints = !!display.showCutPoints;
        const colorizeLines = !!display.colorizeCutLines;
        this.netUnfoldGroup.traverse((obj) => {
            const type = obj.userData && obj.userData.type;
            if (type === 'net-cut-point') {
                obj.visible = showPoints;
            }
            if (type === 'net-cut-line' && obj instanceof THREE.Line) {
                const material = obj.material;
                const highlightColor = obj.userData ? obj.userData.highlightColor : null;
                const defaultColor = obj.userData ? obj.userData.defaultColor : null;
                if (material instanceof THREE.LineBasicMaterial) {
                    const color = colorizeLines && typeof highlightColor === 'number'
                        ? highlightColor
                        : (typeof defaultColor === 'number' ? defaultColor : 0x333333);
                    material.color.setHex(color);
                    material.needsUpdate = true;
                }
                obj.visible = true;
            }
        });
    }

    updateNetLabelDisplay(display: DisplayState) {
        if (!this.netUnfoldGroup) return;
        this.netUnfoldGroup.traverse((obj) => {
            const type = obj.userData && obj.userData.type;
            if (type === 'net-face-label') {
                obj.visible = !!display.showFaceLabels;
            }
            if (type === 'net-vertex-label') {
                obj.visible = !!display.showVertexLabels;
            }
        });
    }

    updateNetLabelScale() {
        if (!this.netUnfoldGroup) return;
        const scale = this.netUnfoldGroup.scale.x;
        if (!Number.isFinite(scale) || scale <= 0) return;
        const inverse = THREE.MathUtils.clamp(1 / scale, 1, 2.5);
        this.netUnfoldGroup.traverse((obj) => {
            const type = obj.userData && obj.userData.type;
            if (type !== 'net-face-label' && type !== 'net-vertex-label') return;
            if (!(obj instanceof THREE.Sprite)) return;
            const baseScale = obj.userData.baseScale;
            const basePosition = obj.userData.basePosition;
            if (!(baseScale instanceof THREE.Vector3)) return;
            obj.scale.copy(baseScale).multiplyScalar(inverse);
            if (type === 'net-vertex-label' && basePosition instanceof THREE.Vector3) {
                obj.position.copy(basePosition);
                obj.position.z += 0.04 * inverse;
            }
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

    syncNetModelState() {
        const faces = this.netUnfoldFaces.map(face => ({
            faceId: face.faceId,
            delayIndex: face.delayIndex
        }));
        const current = this.objectModelManager.getNetState();
        const animation = {
            state: current.state,
            progress: current.progress,
            duration: this.netUnfoldDuration,
            faceDuration: this.netUnfoldFaceDuration,
            stagger: this.netUnfoldStagger,
            scale: current.scale,
            scaleTarget: current.scaleTarget,
            startAt: current.startAt,
            preScaleDelay: this.netUnfoldPreScaleDelay,
            postScaleDelay: this.netUnfoldPostScaleDelay,
            camera: current.camera
        };
        this.objectModelManager.syncNetState({ faces, animation });
    }

    buildCutNetUnfoldGroup(
        polygons: CutFacePolygon[],
        adjacency: Array<{ a: string; b: string; hingeType?: 'edge' | 'coplanar'; sharedEdgeIds?: [string, string] }>
    ) {
        const group = new THREE.Group();
        const faces = [];
        const display = this.objectModelManager.getDisplayState();
        const debugNetMatch = !!(globalThis as { __DEBUG_NET_MATCH?: boolean }).__DEBUG_NET_MATCH;
        const faceMap = new Map<string, CutFacePolygon>();
        polygons.forEach(face => {
            if (face && face.faceId) faceMap.set(face.faceId, face);
        });
        if (!faceMap.size) return;

        const getPolygonVertexIds = (face: CutFacePolygon) => {
            const cached = (face as CutFacePolygon & { vertexIds?: string[] }).vertexIds;
            if (Array.isArray(cached) && cached.length) return cached.slice();
            return [];
        };

        const resolvePolygonVertices = (face: CutFacePolygon) => {
            const ids = getPolygonVertexIds(face);
            if (!ids.length) return [];
            const resolved = ids
                .map(id => this.resolver.resolveSnapPoint(id))
                .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
            if (resolved.length === ids.length) return resolved;
            return [];
        };

        const computeNormal = (face: CutFacePolygon) => {
            const verts = resolvePolygonVertices(face);
            if (!verts || verts.length < 3) return new THREE.Vector3(0, 0, 1);
            const v0 = verts[0];
            const v1 = verts[1];
            const v2 = verts[2];
            return new THREE.Vector3().crossVectors(
                new THREE.Vector3().subVectors(v1, v0),
                new THREE.Vector3().subVectors(v2, v0)
            ).normalize();
        };

        const faceSpecs = [
            { faceId: 'F:0154', name: 'Front' },
            { faceId: 'F:1265', name: 'Right' },
            { faceId: 'F:0473', name: 'Left' },
            { faceId: 'F:4567', name: 'Top' },
            { faceId: 'F:0321', name: 'Bottom' },
            { faceId: 'F:2376', name: 'Back' }
        ];
        const cubeFaceNames = new Map(faceSpecs.map(spec => [spec.faceId, spec.name]));
        const computeFaceFrame = (faceId: string) => {
            const resolved = this.resolver.resolveFace(faceId);
            if (!resolved) return null;
            const center = resolved.vertices
                .reduce((acc, v) => acc.add(v), new THREE.Vector3())
                .divideScalar(resolved.vertices.length);
            const coords = resolved.vertices.map(v => {
                const offset = v.clone().sub(center);
                return {
                    u: offset.dot(resolved.basisU),
                    v: offset.dot(resolved.basisV)
                };
            });
            const uValues = coords.map(c => c.u);
            const vValues = coords.map(c => c.v);
            const width = Math.max(...uValues) - Math.min(...uValues);
            const height = Math.max(...vValues) - Math.min(...vValues);
            return {
                normal: resolved.normal,
                center,
                basisU: resolved.basisU,
                basisV: resolved.basisV,
                width,
                height
            };
        };
        const cubeFaceCandidates = faceSpecs
            .map(spec => {
                const frame = computeFaceFrame(spec.faceId);
                if (!frame) return null;
                return {
                    faceId: spec.faceId,
                    name: spec.name,
                    normal: frame.normal,
                    center: frame.center,
                    basisU: frame.basisU,
                    basisV: frame.basisV,
                    width: frame.width,
                    height: frame.height
                };
            })
            .filter(Boolean) as Array<{
                faceId: string;
                name: string;
                normal: THREE.Vector3;
                center: THREE.Vector3;
                basisU: THREE.Vector3;
                basisV: THREE.Vector3;
                width: number;
                height: number;
            }>;

        const matchSourceFaceId = (face: CutFacePolygon) => {
            if (face.type !== 'original') return null;
            const verts = resolvePolygonVertices(face);
            if (!verts || verts.length < 3) return null;
            const center = verts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(verts.length);
            const normal = computeNormal(face);
            const debugCandidates = debugNetMatch
                ? ([] as Array<{ faceId: string; dot: number; dist: number; score: number }>)
                : null;
            let best: { faceId: string; name: string; score: number } | null = null;
            cubeFaceCandidates.forEach(candidate => {
                const dot = Math.abs(normal.dot(candidate.normal));
                if (dot < 0.9) return;
                const dist = center.distanceTo(candidate.center);
                const score = dot * 10 - dist;
                if (debugCandidates) {
                    debugCandidates.push({
                        faceId: candidate.faceId,
                        dot: Number(dot.toFixed(4)),
                        dist: Number(dist.toFixed(4)),
                        score: Number(score.toFixed(4))
                    });
                }
                if (!best || score > best.score) {
                    best = { faceId: candidate.faceId, name: candidate.name, score };
                }
            });
            if (debugNetMatch) {
                const normalList = normal.toArray().map(val => Number(val.toFixed(4)));
                const centerList = center.toArray().map(val => Number(val.toFixed(4)));
                const ordered = debugCandidates
                    ? debugCandidates.sort((a, b) => b.score - a.score)
                    : [];
                console.log('[net][match] polygon', {
                    faceId: face.faceId,
                    type: face.type,
                    vertexCount: verts.length,
                    normal: normalList,
                    center: centerList,
                    best: best ? { faceId: best.faceId, score: Number(best.score.toFixed(4)) } : null,
                    candidates: ordered
                });
            }
            return best;
        };

        const facePolygonsBySource = new Map<string, { polygon: CutFacePolygon; area: number }>();
        const computeAreaForFace = (faceId: string, verts: THREE.Vector3[]) => {
            const frame = cubeFaceCandidates.find(candidate => candidate.faceId === faceId);
            if (!frame || verts.length < 3) return 0;
            let area = 0;
            for (let i = 0; i < verts.length; i++) {
                const next = verts[(i + 1) % verts.length];
                const current = verts[i];
                const currentVec = current.clone().sub(frame.center);
                const nextVec = next.clone().sub(frame.center);
                const x1 = currentVec.dot(frame.basisU);
                const y1 = currentVec.dot(frame.basisV);
                const x2 = nextVec.dot(frame.basisU);
                const y2 = nextVec.dot(frame.basisV);
                area += x1 * y2 - x2 * y1;
            }
            return Math.abs(area) * 0.5;
        };
        polygons.forEach(face => {
            const match = matchSourceFaceId(face);
            if (!match) return;
            const verts = resolvePolygonVertices(face);
            const area = computeAreaForFace(match.faceId, verts || []);
            const current = facePolygonsBySource.get(match.faceId);
            if (!current || area > current.area) {
                face.sourceFaceId = match.faceId;
                facePolygonsBySource.set(match.faceId, { polygon: face, area });
            }
        });
        if (debugNetMatch) {
            const mapping = Array.from(facePolygonsBySource.entries()).map(([faceId, meta]) => ({
                faceId,
                polygonId: meta.polygon.faceId,
                polygonType: meta.polygon.type,
                vertexCount: getPolygonVertexIds(meta.polygon).length,
                area: Number(meta.area.toFixed(4))
            }));
            console.log('[net][match] source mapping', mapping);
        }

        const buildPolygonGeometry = (vertices: THREE.Vector3[]) => {
            const geometry = new THREE.BufferGeometry();
            if (vertices.length < 3) return geometry;
            const contour = vertices.map(v => new THREE.Vector2(v.x, v.y));
            const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
            const positions = [];
            triangles.forEach(([a, b, c]) => {
                const v1 = vertices[a];
                const v2 = vertices[b];
                const v3 = vertices[c];
                positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
            });
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.computeVertexNormals();
            return geometry;
        };

        const projectToFacePlane = (vertex: THREE.Vector3, faceId: string) => {
            const frame = cubeFaceCandidates.find(candidate => candidate.faceId === faceId);
            if (!frame) return new THREE.Vector3();
            const vec = vertex.clone().sub(frame.center);
            const u = vec.dot(frame.basisU);
            const v = vec.dot(frame.basisV);
            return new THREE.Vector3(u, v, 0);
        };

        const addFaceOutline = (mesh: THREE.Mesh) => {
            const edges = new THREE.EdgesGeometry(mesh.geometry as THREE.BufferGeometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x222222 }));
            line.position.set(0, 0, 0.05);
            mesh.add(line);
        };

        const createFaceMesh = (faceId: string, color: number) => {
            const entry = facePolygonsBySource.get(faceId);
            const polygon = entry ? entry.polygon : null;
            const frame = cubeFaceCandidates.find(candidate => candidate.faceId === faceId);
            if (!polygon || !frame) return null;
            const worldVerts = resolvePolygonVertices(polygon);
            const verts = worldVerts.map(v => projectToFacePlane(v, faceId));
            if (verts.length < 3) return null;
            const geometry = buildPolygonGeometry(verts);
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.faceId = faceId;
            mesh.userData.faceType = polygon.type;
            addFaceOutline(mesh);
            const center = verts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(verts.length);
            const label = createLabel(frame.name, this.cube.size / 10, 'rgba(0,0,0,0.6)');
            label.position.copy(center);
            label.position.z += 0.06;
            label.userData.type = 'net-face-label';
            label.userData.baseScale = label.scale.clone();
            label.userData.basePosition = label.position.clone();
            label.visible = !!display.showFaceLabels;
            mesh.add(label);
            const vertexCandidates: Array<{ label: string; position: THREE.Vector3 }> = [];
            for (let i = 0; i < 8; i++) {
                const pos = this.resolver.resolveVertex(`V:${i}`);
                if (!pos) continue;
                const label = this.cube.getDisplayLabelByIndex(i);
                if (!label) continue;
                vertexCandidates.push({ label, position: pos.clone() });
            }
            const findVertexLabel = (pos: THREE.Vector3) => {
                const epsilon = 1e-2;
                for (const candidate of vertexCandidates) {
                    if (candidate.position.distanceTo(pos) <= epsilon) return candidate.label;
                }
                return null;
            };
            const usedLabels = new Set<string>();
            worldVerts.forEach((world, i) => {
                const label = findVertexLabel(world);
                if (!label || usedLabels.has(label)) return;
                usedLabels.add(label);
                const sprite = createLabel(label, this.cube.size / 14, 'rgba(0,0,0,0.75)');
                const localPos = verts[i] || center;
                sprite.position.copy(localPos);
                sprite.position.z += 0.06;
                sprite.userData.type = 'net-vertex-label';
                sprite.userData.baseScale = sprite.scale.clone();
                sprite.userData.basePosition = sprite.position.clone();
                sprite.visible = !!display.showVertexLabels;
                mesh.add(sprite);
            });
            return mesh;
        };

        const pivotMap = new Map<string, THREE.Group>();
        const addPivot = (
            faceId: string,
            pivot: THREE.Group,
            mesh: THREE.Mesh | null,
            startEuler: THREE.Euler,
            endEuler: THREE.Euler,
            delayIndex: number,
            parent?: THREE.Group
        ) => {
            if (!mesh) return;
            pivot.quaternion.copy(new THREE.Quaternion().setFromEuler(startEuler));
            pivot.add(mesh);
            if (parent) {
                parent.add(pivot);
            } else {
                group.add(pivot);
            }
            pivotMap.set(faceId, pivot);
            faces.push({
                pivot,
                mesh,
                startQuat: new THREE.Quaternion().setFromEuler(startEuler),
                endQuat: new THREE.Quaternion().setFromEuler(endEuler),
                delayIndex,
                faceId
            });
        };

        const faceColor = () => 0x66ccff;
        const faceTypeMap = new Map<string, CutFacePolygon['type']>();
        polygons.forEach(face => {
            if (face && face.faceId) faceTypeMap.set(face.faceId, face.type);
        });

        const { lx, ly, lz } = this.cube.getSize();
        const frontMesh = createFaceMesh('F:0154', faceColor());
        if (frontMesh) {
            group.add(frontMesh);
            faces.push({
                pivot: group,
                mesh: frontMesh,
                startQuat: new THREE.Quaternion(),
                endQuat: new THREE.Quaternion(),
                delayIndex: 0,
                faceId: 'F:0154'
            });
        }

        const rightPivot = new THREE.Group();
        rightPivot.position.set(lx / 2, 0, 0);
        const rightMesh = createFaceMesh('F:1265', faceColor());
        if (rightMesh) rightMesh.position.set(lz / 2, 0, 0);
        addPivot('F:1265', rightPivot, rightMesh, new THREE.Euler(0, -Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 1, group);

        const leftPivot = new THREE.Group();
        leftPivot.position.set(-lx / 2, 0, 0);
        const leftMesh = createFaceMesh('F:0473', faceColor());
        if (leftMesh) leftMesh.position.set(-lz / 2, 0, 0);
        addPivot('F:0473', leftPivot, leftMesh, new THREE.Euler(0, Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 4, group);

        const topPivot = new THREE.Group();
        topPivot.position.set(0, ly / 2, 0);
        const topMesh = createFaceMesh('F:4567', faceColor());
        if (topMesh) {
            topMesh.position.set(0, lz / 2, 0);
            topMesh.rotation.set(Math.PI, 0, 0);
        }
        addPivot('F:4567', topPivot, topMesh, new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 2, group);

        const bottomPivot = new THREE.Group();
        bottomPivot.position.set(0, -ly / 2, 0);
        const bottomMesh = createFaceMesh('F:0321', faceColor());
        if (bottomMesh) {
            bottomMesh.position.set(0, -lz / 2, 0);
            bottomMesh.rotation.set(Math.PI, 0, 0);
        }
        addPivot('F:0321', bottomPivot, bottomMesh, new THREE.Euler(-Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 3, group);

        const backPivot = new THREE.Group();
        backPivot.position.set(lz, 0, 0);
        const backMesh = createFaceMesh('F:2376', faceColor());
        if (backMesh) backMesh.position.set(lx / 2, 0, 0);
        addPivot('F:2376', backPivot, backMesh, new THREE.Euler(0, -Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 5, rightPivot);

        const cutFace = polygons.find(face => face.type === 'cut');
        if (cutFace) {
            const cutSegments = this.objectModelManager.getCutSegments();
            const edgeLengthsByFace = new Map<string, { length: number; edge: { start: THREE.Vector3; end: THREE.Vector3 } }>();
            cutSegments.forEach(seg => {
                if (!seg.faceIds || !seg.faceIds.length) return;
                const start = this.resolver.resolveSnapPoint(seg.startId);
                const end = this.resolver.resolveSnapPoint(seg.endId);
                if (!start || !end) return;
                seg.faceIds.forEach(faceId => {
                    const length = start.distanceTo(end);
                    if (!edgeLengthsByFace.has(faceId) || (edgeLengthsByFace.get(faceId)?.length || 0) < length) {
                        edgeLengthsByFace.set(faceId, { length, edge: { start: start.clone(), end: end.clone() } });
                    }
                });
            });
            let targetFaceId: string | null = null;
            let bestLength = -Infinity;
            edgeLengthsByFace.forEach((meta, faceId) => {
                if (!cubeFaceNames.has(faceId)) return;
                if (meta.length > bestLength) {
                    bestLength = meta.length;
                    targetFaceId = faceId;
                }
            });
            if (targetFaceId) {
                const frame = cubeFaceCandidates.find(candidate => candidate.faceId === targetFaceId);
                const pivot = pivotMap.get(targetFaceId);
                const edge = edgeLengthsByFace.get(targetFaceId)?.edge;
                if (frame && pivot && edge) {
                    const cutNormal = computeNormal(cutFace);
                    const targetNormal = frame.normal;
                    const axis = edge.end.clone().sub(edge.start).normalize();
                    const dot = THREE.MathUtils.clamp(cutNormal.dot(targetNormal), -1, 1);
                    const angle = Math.acos(dot);
                    const cross = new THREE.Vector3().crossVectors(cutNormal, targetNormal);
                    const sign = cross.dot(axis) >= 0 ? 1 : -1;
                    const quat = new THREE.Quaternion().setFromAxisAngle(axis, sign * angle);
                    const cutVerts = resolvePolygonVertices(cutFace);
                    const rotatedVerts = cutVerts
                        .map(v => v.clone().sub(edge.start).applyQuaternion(quat).add(edge.start));
                    const localVerts = rotatedVerts.map(v => projectToFacePlane(v, targetFaceId as string));
                    if (localVerts.length >= 3) {
                        const geometry = buildPolygonGeometry(localVerts);
                        const material = new THREE.MeshBasicMaterial({
                            color: 0xffc4c4,
                            transparent: false,
                            opacity: 1.0,
                            side: THREE.DoubleSide,
                            depthWrite: true,
                            depthTest: true
                        });
                        const mesh = new THREE.Mesh(geometry, material);
                        addFaceOutline(mesh);
                        const center = localVerts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(localVerts.length);
                        const label = createLabel('Cut', this.cube.size / 10, 'rgba(0,0,0,0.6)');
                        label.position.copy(center);
                        label.position.z += 0.06;
                        label.userData.type = 'net-face-label';
                        label.userData.baseScale = label.scale.clone();
                        label.userData.basePosition = label.position.clone();
                        label.visible = !!display.showFaceLabels;
                        mesh.add(label);
                        pivot.add(mesh);
                    }
                }
            }
        }

        const structure = this.cube.getStructure ? this.cube.getStructure() : null;
        const modelIntersections = this.objectModelManager.getCutIntersections();
        if (structure && structure.edgeMap) {
            const edgeHighlightMeta = new Map<string, { hasMidpoint: boolean }>();
            modelIntersections.forEach(ref => {
                const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
                if (!parsed) return;
                if (parsed.type === 'edge') {
                    const edgeId = `E:${parsed.edgeIndex}`;
                    const isMidpoint = parsed.ratio ? parsed.ratio.numerator * 2 === parsed.ratio.denominator : false;
                    if (!edgeHighlightMeta.has(edgeId)) edgeHighlightMeta.set(edgeId, { hasMidpoint: false });
                    if (isMidpoint) edgeHighlightMeta.get(edgeId)!.hasMidpoint = true;
                } else if (parsed.type === 'vertex' && structure.vertexMap) {
                    const vertex = structure.vertexMap.get(`V:${parsed.vertexIndex}`);
                    if (vertex && vertex.edges) {
                        vertex.edges.forEach(edgeId => {
                            if (!edgeHighlightMeta.has(edgeId)) edgeHighlightMeta.set(edgeId, { hasMidpoint: false });
                        });
                    }
                }
            });
            const colorize = !!display.colorizeCutLines;
            edgeHighlightMeta.forEach((meta, edgeId) => {
                const resolved = this.resolver.resolveEdge(edgeId);
                const edge = structure.edgeMap.get(edgeId);
                if (!resolved || !edge) return;
                const targetFaceId = edge.faces.find(faceId => pivotMap.has(faceId));
                if (!targetFaceId) return;
                const pivot = pivotMap.get(targetFaceId);
                if (!pivot) return;
                const startFlat = projectToFacePlane(resolved.start, targetFaceId);
                const endFlat = projectToFacePlane(resolved.end, targetFaceId);
                const geometry = new THREE.BufferGeometry().setFromPoints([startFlat, endFlat]);
                const highlightColor = this.objectModelManager.getEdgeHighlightColor(edgeId, 0xff8800);
                const defaultColor = 0x333333;
                const color = colorize ? highlightColor : defaultColor;
                const material = new THREE.LineBasicMaterial({ color });
                const line = new THREE.Line(geometry, material);
                line.userData.type = 'net-cut-line';
                line.userData.highlightColor = highlightColor;
                line.userData.defaultColor = defaultColor;
                line.visible = true;
                pivot.add(line);
            });
        }

        const cutPointsVisible = !!display.showCutPoints;
        const intersectionRefs = this.objectModelManager.resolveCutIntersectionPositions();
        intersectionRefs.forEach(ref => {
            const position = ref ? (ref.position as THREE.Vector3 | undefined) : undefined;
            if (!ref || !ref.id || !(position instanceof THREE.Vector3)) return;
            const faceIds = ref.faceIds || [];
            const targetFaceId = faceIds.find(faceId => pivotMap.has(faceId));
            if (!targetFaceId) return;
            const pivot = pivotMap.get(targetFaceId);
            if (!pivot) return;
            const pos = projectToFacePlane(position, targetFaceId);
            const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
            const ratio = parsed && parsed.type === 'edge' ? parsed.ratio : null;
            const isMidpoint = ratio ? ratio.numerator * 2 === ratio.denominator : false;
            const markerColor = isMidpoint ? 0x00ff00 : 0xffff00;
            const marker = createMarker(pos, this.scene, markerColor, isMidpoint, pivot);
            marker.userData.type = 'net-cut-point';
            marker.visible = cutPointsVisible;
        });

        const faceIds = faces.map(face => face.faceId).filter(Boolean);
        if (faceIds.length) {
            const analysis = this.analyzeCutAdjacency(faceIds, adjacency, faceTypeMap);
            // Favor original-face adjacency unless cut faces are needed to keep connectivity.
            const coplanarBonus = analysis.hasCoplanar ? 0.6 : 0.3;
            const weights = analysis.originalConnected
                ? { cutEdgePenalty: 3, coplanarBonus, missingEdgePenalty: 0.5 }
                : { cutEdgePenalty: 0.5, coplanarBonus, missingEdgePenalty: 0.2 };
            const depthById = this.computeUnfoldDepths(faceIds, adjacency, faceTypeMap, 'F:0154', weights);
            faces.forEach(face => {
                if (!face.faceId) return;
                const depth = depthById.get(face.faceId);
                if (typeof depth === 'number') {
                    face.delayIndex = depth;
                }
            });
        }

        this.netUnfoldGroup = group;
        this.netUnfoldFaces = faces;
        const maxDelay = Math.max(...faces.map(face => face.delayIndex));
        this.netUnfoldDuration = this.netUnfoldFaceDuration + maxDelay * this.netUnfoldStagger;
        this.scene.add(group);
        this.syncNetModelState();
    }

    clearNetUnfoldGroup() {
        if (!this.netUnfoldGroup) return;
        const materials = new Set<THREE.Material>();
        this.netUnfoldGroup.traverse((obj) => {
            const anyObj = obj as THREE.Object3D & { material?: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry };
            if (anyObj.geometry) {
                anyObj.geometry.dispose();
            }
            const material = anyObj.material;
            if (Array.isArray(material)) {
                material.forEach(mat => materials.add(mat));
            } else if (material instanceof THREE.Material) {
                materials.add(material);
            }
        });
        materials.forEach(mat => mat.dispose());
        this.scene.remove(this.netUnfoldGroup);
        this.netUnfoldGroup = null;
        this.netUnfoldFaces = [];
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
        const netState = this.objectModelManager.getNetState();
        if (netState.state === 'opening' || netState.state === 'open' || netState.state === 'prescale') return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        this.clearNetUnfoldGroup();
        this.buildNetUnfoldGroup();
        this.netUnfoldFaces.forEach(face => face.pivot.quaternion.copy(face.startQuat));
        const startAt = performance.now();
        this.cube.setVisible(false);
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
        if (this.netUnfoldGroup) {
            this.netUnfoldGroup.position.set(0, 0, 0);
        }
        const display = this.objectModelManager.getDisplayState();
        this.updateNetOverlayDisplay(display);
        this.updateNetLabelDisplay(display);
        this.updateNetUnfoldScale();
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

    startNetFold() {
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
        const netState = this.objectModelManager.getNetState();
        if (netState.state === 'closed' || netState.state === 'open' || netState.state === 'prescale' || netState.state === 'postscale') return;
        if (netState.duration <= 0 || netState.faceDuration <= 0) return;
        const elapsed = performance.now() - netState.startAt;
        if (elapsed < 0 && netState.state === 'opening') {
            return;
        }
        const duration = netState.duration;
        const faceDuration = netState.faceDuration;
        const stagger = netState.stagger;
        const progress = Math.min(1, elapsed / duration);
        const maxDelay = Math.max(...this.netUnfoldFaces.map(face => face.delayIndex));
        this.netUnfoldFaces.forEach(face => {
            const delayIndex = netState.state === 'opening'
                ? face.delayIndex
                : (maxDelay - face.delayIndex);
            const delay = delayIndex * stagger;
            const localElapsed = elapsed - delay;
            const localProgress = Math.min(1, Math.max(0, localElapsed / faceDuration));
            const eased = localProgress < 0.5
                ? 2 * localProgress * localProgress
                : 1 - Math.pow(-2 * localProgress + 2, 2) / 2;
            const t = netState.state === 'opening'
                ? eased
                : 1 - eased;
            const effectiveT = localElapsed < 0
                ? (netState.state === 'opening' ? 0 : 1)
                : t;
            face.pivot.quaternion.slerpQuaternions(face.startQuat, face.endQuat, effectiveT);
        });
        const netProgress = netState.state === 'opening' ? progress : 1 - progress;

        if (netState.camera && netState.camera.startPos && netState.camera.endPos && netState.camera.startTarget && netState.camera.endTarget) {
            const cameraT = progress;
            const cameraEased = cameraT < 0.5
                ? 2 * cameraT * cameraT
                : 1 - Math.pow(-2 * cameraT + 2, 2) / 2;
            this.camera.position.lerpVectors(netState.camera.startPos, netState.camera.endPos, cameraEased);
            this.controls.target.lerpVectors(netState.camera.startTarget, netState.camera.endTarget, cameraEased);
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
            stagger,
            scale: netState.scale,
            scaleTarget: nextState === 'postscale' ? 1 : netState.scaleTarget,
            preScaleDelay: netState.preScaleDelay,
            postScaleDelay: netState.postScaleDelay
        });
    }

    handleFlipCutClick() {
        this.cutter.flipCut();
        this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
        const display = this.objectModelManager.getDisplayState();
        this.cutter.setTransparency(display.cubeTransparent);
        this.objectModelManager.syncCutState({
            intersections: this.cutter.getIntersectionRefs(),
            cutSegments: this.cutter.getCutSegments(),
            facePolygons: this.cutter.getResultFacePolygons(),
            faceAdjacency: this.cutter.getResultFaceAdjacency()
        });
        this.cutter.refreshEdgeHighlightColors();
        this.cutter.updateCutPointMarkers(this.objectModelManager.resolveCutIntersectionPositions());
        this.netManager.update(this.objectModelManager.getCutSegments(), this.cube, this.resolver);
        this.selection.updateSplitLabels(this.objectModelManager.getCutIntersections());
    }

    handleToggleNetClick() {
        const wasVisible = this.objectModelManager.getNetVisible();
        const nextVisible = !wasVisible;
        this.objectModelManager.setNetVisible(nextVisible);
        if (typeof globalThis.__setNetVisible === 'function') {
            globalThis.__setNetVisible(nextVisible);
        }
        if (nextVisible) {
            this.netManager.show();
            this.startNetUnfold();
        } else {
            this.netManager.hide();
            this.startNetFold();
        }
        this.netManager.update(this.objectModelManager.getCutSegments(), this.cube, this.resolver);
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
        if (this.netUnfoldGroup) {
            this.applyNetStateFromModel();
            let netState = this.objectModelManager.getNetState();
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
            this.netUnfoldGroup.scale.setScalar(nextScale);
            this.updateNetLabelScale();
            if (netState.state === 'prescale') {
                this.netUnfoldFaces.forEach(face => face.pivot.quaternion.copy(face.startQuat));
            }
            if (this.netUnfoldPositionTarget) {
                const target = this.netUnfoldPositionTarget;
                const scale = nextScale;
                const scaledTarget = new THREE.Vector3(target.x * scale, target.y * scale, 0);
                if (netState.state === 'postscale') {
                    this.netUnfoldGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.15);
                } else if (netState.state === 'prescale') {
                    this.netUnfoldGroup.position.lerp(scaledTarget, 0.12);
                } else {
                    this.netUnfoldGroup.position.copy(scaledTarget);
                }
            }
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
            stagger: netState.stagger,
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
