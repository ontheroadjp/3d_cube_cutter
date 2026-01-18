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
import type { DisplayState, LearningProblem, UserPresetState } from './js/types.js';
import { parseSnapPointId } from './js/geometry/snapPointId.js';
import { createLabel } from './js/utils.js';

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
    learningCutSegments: Array<{ start: THREE.Vector3; end: THREE.Vector3 }>;
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
    currentMode: string;
    panelOpen: boolean;
    netUnfoldGroup: THREE.Group | null;
    netUnfoldState: 'closed' | 'opening' | 'open' | 'closing' | 'prescale' | 'postscale';
    netUnfoldStart: number;
    netUnfoldDuration: number;
    netUnfoldProgress: number;
    netUnfoldFaceDuration: number;
    netUnfoldStagger: number;
    netCameraStartPos: THREE.Vector3 | null;
    netCameraStartTarget: THREE.Vector3 | null;
    netCameraEndPos: THREE.Vector3 | null;
    netCameraEndTarget: THREE.Vector3 | null;
    defaultCameraPosition: THREE.Vector3;
    defaultCameraTarget: THREE.Vector3;
    netUnfoldFaces: Array<{
        pivot: THREE.Group;
        mesh: THREE.Mesh;
        startRot: THREE.Euler;
        endRot: THREE.Euler;
        delayIndex: number;
    }>;
    netUnfoldScale: number;
    netUnfoldScaleTarget: number;
    netUnfoldTargetCenter: THREE.Vector3 | null;
    netUnfoldPreScaleDelay: number;
    netUnfoldPostScaleDelay: number;
    netUnfoldScaleReadyAt: number | null;
    netUnfoldPositionTarget: THREE.Vector3 | null;
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
        this.netUnfoldStart = 0;
        this.netUnfoldDuration = 800;
        this.netUnfoldProgress = 0;
        this.netUnfoldFaceDuration = 700;
        this.netUnfoldStagger = 700;
        this.netCameraStartPos = null;
        this.netCameraStartTarget = null;
        this.netCameraEndPos = null;
        this.netCameraEndTarget = null;
        this.defaultCameraPosition = new THREE.Vector3(10, 5, 3);
        this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);
        this.netUnfoldFaces = [];
        this.netUnfoldScale = 1;
        this.netUnfoldScaleTarget = 1;
        this.netUnfoldTargetCenter = null;
        this.netUnfoldPreScaleDelay = 320;
        this.netUnfoldPostScaleDelay = 220;
        this.netUnfoldScaleReadyAt = null;
        this.netUnfoldPositionTarget = null;
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
        this.ui = new UIManager();
        this.cube = new Cube(this.scene, size);
        this.resolver = new GeometryResolver({ size: this.cube.getSize(), indexMap: this.cube.getIndexMap() });
        this.cutter = new Cutter(this.scene);
        this.cutter.setDebug(DEBUG);
        this.netManager = new NetManager();
        this.netManager.setResolver(this.resolver);
        this.selection = new SelectionManager(this.scene, this.cube, this.ui, this.resolver);
        this.presetManager = new PresetManager(this.selection, this.cube, this.cutter, this.resolver);
    }

    init() {
        this.useReactPresets = !!document.getElementById('react-topbar-root');
        this.useReactUserPresets = !!document.getElementById('react-user-presets-root');
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
        };
        initReactApp();
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

    setInitialState() {
        this.cube.toggleTransparency(this.ui.isTransparencyChecked());
        this.cutter.setTransparency(this.ui.isTransparencyChecked());
        this.cube.toggleVertexLabels(this.ui.isVertexLabelsChecked());
        this.selection.toggleVertexLabels(this.ui.isVertexLabelsChecked());
        this.cube.toggleFaceLabels(this.ui.isFaceLabelsChecked());
        const initialEdgeMode = this.ui.getEdgeLabelMode();
        this.cube.setEdgeLabelMode(initialEdgeMode);
        this.selection.setEdgeLabelMode(initialEdgeMode);
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
        this.ui.onPresetChange(this.handlePresetChange.bind(this));
        this.ui.onConfigureClick(this.handleConfigureClick.bind(this));
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
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver);
        this.selection.updateSplitLabels(this.cutter.getIntersectionRefs());
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
        if (this.netUnfoldState !== 'closed') {
            this.clearNetUnfoldGroup();
            this.cube.setVisible(true);
        }
        this.selection.reset();
        this.cutter.resetInversion();
        this.cutter.reset();
        this.netManager.update([], this.cube, this.resolver);
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
        const current = this.ui.getDisplayState();
        const next = { ...current, ...display };
        this.ui.applyDisplayState(next);
        this.cube.toggleVertexLabels(next.showVertexLabels);
        this.selection.toggleVertexLabels(next.showVertexLabels);
        this.cube.toggleFaceLabels(next.showFaceLabels);
        this.cube.setEdgeLabelMode(next.edgeLabelMode);
        this.selection.setEdgeLabelMode(next.edgeLabelMode);
        this.cutter.toggleSurface(next.showCutSurface);
        this.cutter.togglePyramid(next.showPyramid);
        this.cube.toggleTransparency(next.cubeTransparent);
        this.cutter.setTransparency(next.cubeTransparent);
        if (typeof globalThis.__setDisplayState === 'function') {
            globalThis.__setDisplayState(next);
        }
    }

    applyUserPresetState(state) {
        if (!state) return;
        this.resetScene();

        const size = state.cube && state.cube.size;
        if (size && typeof size.lx === 'number' && typeof size.ly === 'number' && typeof size.lz === 'number') {
            this.cube.createCube([size.lx, size.ly, size.lz]);
            this.resolver.setSize(this.cube.getSize());
        }

        const labelMap = state.cube ? state.cube.labelMap : null;
        this.currentLabelMap = labelMap || null;
        this.cube.setVertexLabelMap(this.currentLabelMap);
        this.resolver.setLabelMap(this.currentLabelMap);

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
                this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver);
                this.selection.updateSplitLabels(this.cutter.getIntersectionRefs());
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
            const p0 = this.selection.selected[0].point;
            const p1 = this.selection.selected[1].point;
            const p2 = this.snappedPointInfo.point;
            const v1 = new THREE.Vector3().subVectors(p1, p0);
            const v2 = new THREE.Vector3().subVectors(p2, p0);
            if (v1.cross(v2).lengthSq() < 1e-6) {
                this.ui.showMessage("3つの点が同一直線上になるため、選択できません。", "warning");
                return;
            }
        }
        if (this.selection.selected.length >= 3) return;

        this.selection.addPoint(this.snappedPointInfo);
        this.selection.toggleVertexLabels(this.ui.isVertexLabelsChecked());

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

    updateNetUnfoldScale() {
        if (!this.netUnfoldGroup) return;
        const originalScale = this.netUnfoldGroup.scale.clone();
        const originalRotations = this.netUnfoldFaces.map(face => face.pivot.rotation.clone());
        this.netUnfoldFaces.forEach(face => face.pivot.rotation.copy(face.endRot));
        this.netUnfoldGroup.scale.setScalar(1);
        this.netUnfoldGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.netUnfoldGroup);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        this.netUnfoldFaces.forEach((face, idx) => face.pivot.rotation.copy(originalRotations[idx]));
        this.netUnfoldGroup.scale.copy(originalScale);
        this.netUnfoldGroup.updateMatrixWorld(true);
        const viewWidth = this.camera.right - this.camera.left;
        const viewHeight = this.camera.top - this.camera.bottom;
        if (size.x <= 0 || size.y <= 0) return;
        const scale = Math.min(viewWidth / size.x, viewHeight / size.y) * 0.85;
        this.netUnfoldScaleTarget = Math.min(1, scale);
        this.netUnfoldTargetCenter = center;
        this.netUnfoldPositionTarget = new THREE.Vector3(-center.x, -center.y, 0);
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
        this.ui.showSettingsPanels(false);
        this.ui.showLearningPanels(false);

        if (mode === 'settings') {
            this.ui.showSettingsPanels(true);
            this.ui.showSettingsPanel('display');
        } else if (mode === 'learning') {
            this.ui.showLearningPanels(true);
        }
    }

    handlePresetCategoryChange(category) {
        if (category) this.ui.filterPresetButtons(category);
    }
    
    handleSettingsCategoryChange(category) {
        this.ui.showSettingsPanel(category);
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
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.cutter.setTransparency(this.ui.isTransparencyChecked());
        this.selection.toggleVertexLabels(this.ui.isVertexLabelsChecked());
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
            start: segment.start.clone(),
            end: segment.end.clone()
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
            const start = segment.start.clone();
            const end = segment.end.clone();
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
        this.ui.resetToFreeSelectMode();
    }


    handleConfigureClick() {
        const lx = parseFloat(prompt("辺ABの長さ(cm)", "10"));
        const ly = parseFloat(prompt("辺ADの長さ(cm)", "10"));
        const lz = parseFloat(prompt("辺AEの長さ(cm)", "10"));
        if (!isNaN(lx) && !isNaN(ly) && !isNaN(lz)) {
            this.resetScene();
            this.ui.resetToFreeSelectMode();
            this.cube.createCube([lx, ly, lz]);
            this.resolver.setSize(this.cube.getSize());
            if (this.currentLabelMap) {
                this.cube.setVertexLabelMap(this.currentLabelMap);
                this.resolver.setLabelMap(this.currentLabelMap);
            }
            const mode = this.ui.getEdgeLabelMode();
            this.cube.setEdgeLabelMode(mode);
            this.selection.setEdgeLabelMode(mode);
            const isTrans = this.ui.isTransparencyChecked();
            this.cube.toggleTransparency(isTrans);
            this.cutter.setTransparency(isTrans);
        }
    }

    configureCubeFromDimensions(lx: number, ly: number, lz: number) {
        this.resetScene();
        this.ui.resetToFreeSelectMode();
        this.cube.createCube([lx, ly, lz]);
        this.resolver.setSize(this.cube.getSize());
        if (this.currentLabelMap) {
            this.cube.setVertexLabelMap(this.currentLabelMap);
            this.resolver.setLabelMap(this.currentLabelMap);
        }
        const mode = this.ui.getEdgeLabelMode();
        this.cube.setEdgeLabelMode(mode);
        this.selection.setEdgeLabelMode(mode);
        const isTrans = this.ui.isTransparencyChecked();
        this.cube.toggleTransparency(isTrans);
        this.cutter.setTransparency(isTrans);
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
        this.selection.toggleVertexLabels(this.ui.isVertexLabelsChecked());
    }

    handleCancelUserPresetEdit() {
        this.editingUserPresetId = null;
        this.ui.setUserPresetForm({ name: '', category: '', description: '' });
        this.ui.setUserPresetEditMode(false);
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
        this.ui.setUserPresetEditMode(false);
        this.ui.setUserPresetForm({ name: '', category: '', description: '' });
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
        this.ui.setUserPresetForm({
            name: state.name || '',
            category: state.category || '',
            description: state.description || ''
        });
        this.ui.setUserPresetEditMode(true);
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
            this.ui.setUserPresetForm({ name: '', category: '', description: '' });
            this.ui.setUserPresetEditMode(false);
        }
        this.ui.showMessage('ユーザープリセットを削除しました。', 'success');
    }

    buildNetUnfoldGroup() {
        const { lx, ly, lz } = this.cube.getSize();
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
            pivot: THREE.Group,
            mesh: THREE.Mesh,
            startRot: THREE.Euler,
            endRot: THREE.Euler,
            delayIndex: number
        ) => {
            pivot.rotation.copy(startRot);
            group.add(pivot);
            faces.push({
                pivot,
                mesh,
                startRot,
                endRot,
                delayIndex
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
        addPivotFace(rightPivot, right, new THREE.Euler(0, -Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 0);

        const leftPivot = new THREE.Group();
        leftPivot.position.set(-lx / 2, 0, 0);
        const left = new THREE.Mesh(new THREE.PlaneGeometry(lz, ly), material);
        left.position.set(-lz / 2, 0, 0);
        leftPivot.add(left);
        addFaceLabels(left, lz, ly, 'Left', [4, 7, 3, 0]);
        addFaceOutline(left);
        addPivotFace(leftPivot, left, new THREE.Euler(0, Math.PI / 2, 0), new THREE.Euler(0, 0, 0), 3);

        const topPivot = new THREE.Group();
        topPivot.position.set(0, ly / 2, 0);
        const top = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), material);
        top.position.set(0, lz / 2, 0);
        top.rotation.set(Math.PI, 0, 0);
        topPivot.add(top);
        addFaceLabels(top, lx, lz, 'Top', [3, 2, 6, 7]);
        addFaceOutline(top);
        addPivotFace(topPivot, top, new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 1);

        const bottomPivot = new THREE.Group();
        bottomPivot.position.set(0, -ly / 2, 0);
        const bottom = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), material);
        bottom.position.set(0, -lz / 2, 0);
        bottom.rotation.set(Math.PI, 0, 0);
        bottomPivot.add(bottom);
        addFaceLabels(bottom, lx, lz, 'Bottom', [0, 1, 5, 4]);
        addFaceOutline(bottom);
        addPivotFace(bottomPivot, bottom, new THREE.Euler(-Math.PI / 2, 0, 0), new THREE.Euler(0, 0, 0), 2);

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
            startRot: new THREE.Euler(0, -Math.PI / 2, 0),
            endRot: new THREE.Euler(0, 0, 0),
            delayIndex: 4
        });

        this.netUnfoldGroup = group;
        this.netUnfoldFaces = faces;
        const maxDelay = Math.max(...faces.map(face => face.delayIndex));
        this.netUnfoldDuration = this.netUnfoldFaceDuration + maxDelay * this.netUnfoldStagger;
        this.scene.add(group);
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
        this.netUnfoldState = 'closed';
        this.netUnfoldProgress = 0;
        this.netCameraStartPos = null;
        this.netCameraStartTarget = null;
        this.netCameraEndPos = null;
        this.netCameraEndTarget = null;
        this.netUnfoldTargetCenter = null;
    }

    startNetUnfold() {
        if (this.netUnfoldState === 'opening' || this.netUnfoldState === 'open' || this.netUnfoldState === 'prescale') return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        this.clearNetUnfoldGroup();
        this.buildNetUnfoldGroup();
        this.netUnfoldFaces.forEach(face => face.pivot.rotation.copy(face.startRot));
        this.netUnfoldScale = 1;
        this.netUnfoldScaleTarget = 1;
        this.netUnfoldState = 'prescale';
        this.netUnfoldStart = performance.now();
        this.netUnfoldProgress = 0;
        this.cube.setVisible(false);
        this.cutter.setVisible(false);
        this.highlightMarker.visible = false;
        this.snappedPointInfo = null;
        const { lz } = this.cube.getSize();
        this.netCameraStartPos = this.camera.position.clone();
        this.netCameraStartTarget = this.controls.target.clone();
        this.netCameraEndPos = new THREE.Vector3(0, 0, this.cube.size * 3);
        this.netCameraEndTarget = new THREE.Vector3(0, 0, 0);
        this.netUnfoldScaleReadyAt = null;
        if (this.netUnfoldGroup) {
            this.netUnfoldGroup.position.set(0, 0, 0);
        }
        this.netUnfoldPositionTarget = null;
        this.updateNetUnfoldScale();
    }

    startNetFold() {
        if (this.netUnfoldState === 'closed' || this.netUnfoldState === 'closing' || this.netUnfoldState === 'prescale') return;
        this.isCameraAnimating = false;
        this.cameraTargetPosition = null;
        this.netUnfoldState = 'closing';
        this.netUnfoldStart = performance.now() - (1 - this.netUnfoldProgress) * this.netUnfoldDuration;
        this.netCameraStartPos = this.camera.position.clone();
        this.netCameraStartTarget = this.controls.target.clone();
        this.netCameraEndPos = this.defaultCameraPosition.clone();
        this.netCameraEndTarget = this.defaultCameraTarget.clone();
        this.netUnfoldScaleReadyAt = null;
    }

    updateNetUnfoldAnimation() {
        if (this.netUnfoldState === 'closed' || this.netUnfoldState === 'open' || this.netUnfoldState === 'prescale' || this.netUnfoldState === 'postscale') return;
        const elapsed = performance.now() - this.netUnfoldStart;
        if (elapsed < 0 && this.netUnfoldState === 'opening') {
            return;
        }
        const progress = Math.min(1, elapsed / this.netUnfoldDuration);
        const maxDelay = Math.max(...this.netUnfoldFaces.map(face => face.delayIndex));
        this.netUnfoldFaces.forEach(face => {
            const delayIndex = this.netUnfoldState === 'opening'
                ? face.delayIndex
                : (maxDelay - face.delayIndex);
            const delay = delayIndex * this.netUnfoldStagger;
            const localElapsed = elapsed - delay;
            const localProgress = Math.min(1, Math.max(0, localElapsed / this.netUnfoldFaceDuration));
            const eased = localProgress < 0.5
                ? 2 * localProgress * localProgress
                : 1 - Math.pow(-2 * localProgress + 2, 2) / 2;
            const t = this.netUnfoldState === 'opening'
                ? eased
                : 1 - eased;
            const effectiveT = localElapsed < 0
                ? (this.netUnfoldState === 'opening' ? 0 : 1)
                : t;

            face.pivot.rotation.set(
                face.startRot.x + (face.endRot.x - face.startRot.x) * effectiveT,
                face.startRot.y + (face.endRot.y - face.startRot.y) * effectiveT,
                face.startRot.z + (face.endRot.z - face.startRot.z) * effectiveT
            );
        });
        this.netUnfoldProgress = this.netUnfoldState === 'opening' ? progress : 1 - progress;

        if (this.netCameraStartPos && this.netCameraEndPos && this.netCameraStartTarget && this.netCameraEndTarget) {
            const cameraT = progress;
            const cameraEased = cameraT < 0.5
                ? 2 * cameraT * cameraT
                : 1 - Math.pow(-2 * cameraT + 2, 2) / 2;
            this.camera.position.lerpVectors(this.netCameraStartPos, this.netCameraEndPos, cameraEased);
            this.controls.target.lerpVectors(this.netCameraStartTarget, this.netCameraEndTarget, cameraEased);
            this.camera.up.set(0, 1, 0);
            this.camera.lookAt(this.controls.target);
        }

        if (progress >= 1) {
            if (this.netUnfoldState === 'opening') {
                this.netUnfoldState = 'open';
            } else {
                this.netUnfoldState = 'postscale';
                this.netUnfoldScaleTarget = 1;
                this.netUnfoldStart = performance.now() + this.netUnfoldPostScaleDelay;
            }
        }
    }

    handleFlipCutClick() {
        this.cutter.flipCut();
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver);
        this.selection.updateSplitLabels(this.cutter.getIntersections());
    }

    handleToggleNetClick() {
        const wasVisible = this.netManager.isVisible();
        this.netManager.toggle();
        const isVisible = this.netManager.isVisible();
        if (isVisible && !wasVisible) {
            this.startNetUnfold();
        } else if (!isVisible && wasVisible) {
            this.startNetFold();
        }
        this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver);
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
            const scaleReady = this.netUnfoldState !== 'postscale' || (performance.now() - this.netUnfoldStart) >= 0;
            if (Math.abs(this.netUnfoldScaleTarget - this.netUnfoldScale) > 0.001) {
                if (scaleReady) {
                    const speed = this.netUnfoldState === 'prescale' ? 0.08 : 0.15;
                    this.netUnfoldScale += (this.netUnfoldScaleTarget - this.netUnfoldScale) * speed;
                }
            } else {
                this.netUnfoldScale = this.netUnfoldScaleTarget;
            }
            this.netUnfoldGroup.scale.setScalar(this.netUnfoldScale);
            if (this.netUnfoldState === 'prescale') {
                this.netUnfoldFaces.forEach(face => face.pivot.rotation.copy(face.startRot));
            }
            if (this.netUnfoldPositionTarget) {
                const target = this.netUnfoldPositionTarget;
                const scale = this.netUnfoldScale;
                const scaledTarget = new THREE.Vector3(target.x * scale, target.y * scale, 0);
                if (this.netUnfoldState === 'postscale') {
                    this.netUnfoldGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.15);
                } else if (this.netUnfoldState === 'prescale') {
                    this.netUnfoldGroup.position.lerp(scaledTarget, 0.12);
                } else {
                    this.netUnfoldGroup.position.copy(scaledTarget);
                }
            }
            if (this.netUnfoldState === 'prescale') {
                if (Math.abs(this.netUnfoldScaleTarget - this.netUnfoldScale) <= 0.001) {
                    if (!this.netUnfoldScaleReadyAt) {
                        this.netUnfoldScaleReadyAt = performance.now();
                    }
                    if (performance.now() - this.netUnfoldScaleReadyAt >= this.netUnfoldPreScaleDelay) {
                        this.netUnfoldState = 'opening';
                        this.netUnfoldStart = performance.now();
                        this.netUnfoldScaleReadyAt = null;
                    }
                } else {
                    this.netUnfoldScaleReadyAt = null;
                }
            }
            if (this.netUnfoldState === 'postscale' && scaleReady && Math.abs(this.netUnfoldScaleTarget - this.netUnfoldScale) <= 0.001) {
                this.clearNetUnfoldGroup();
                this.cube.setVisible(true);
                this.cutter.setVisible(true);
                this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
                this.cutter.togglePyramid(this.ui.isPyramidChecked());
                this.controls.update();
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
