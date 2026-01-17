import * as THREE from 'three';
import { OrbitControls } from './lib/three/examples/jsm/controls/OrbitControls.js';
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

const DEBUG = false;

class App {
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

        // --- Core Three.js Components ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        const size = 10;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, 100);
        this.camera.position.set(10, 5, 3);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

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
        this.cube = new Cube(this.scene);
        this.resolver = new GeometryResolver({ size: this.cube.getSize(), indexMap: this.cube.getIndexMap() });
        this.cutter = new Cutter(this.scene);
        this.cutter.setDebug(DEBUG);
        this.netManager = new NetManager();
        this.netManager.setResolver(this.resolver);
        this.selection = new SelectionManager(this.scene, this.cube, this.ui, this.resolver);
        this.presetManager = new PresetManager(this.selection, this.cube, this.cutter, this.resolver);
    }

    init() {
        this.ui.populatePresets(this.presetManager.getPresets());
        this.ui.setUserPresetStorageEnabled(this.userPresetStorage.isEnabled());
        this.loadUserPresets();
        this.bindEventListeners();
        this.setInitialState();
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
            this.ui.setUserPresetList(this.userPresets);
        } catch (e) {
            console.warn('Failed to load user presets.', e);
            this.userPresets = [];
            this.ui.setUserPresetList(this.userPresets);
        }
    }
    
    bindEventListeners() {
        // Browser Events
        window.addEventListener('click', this.handleClick.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        this.controls.addEventListener('start', () => { this.isCameraAnimating = false; });

        // UI Manager Events
        this.ui.onModeChange(this.handleModeChange.bind(this));
        this.ui.onPresetCategoryChange(this.handlePresetCategoryChange.bind(this));
        this.ui.onSettingsCategoryChange(this.handleSettingsCategoryChange.bind(this));
        this.ui.onPresetChange(this.handlePresetChange.bind(this));
        this.ui.onResetClick(this.handleResetClick.bind(this));
        this.ui.onConfigureClick(this.handleConfigureClick.bind(this));
        this.ui.onFlipCutClick(this.handleFlipCutClick.bind(this));
        this.ui.onConfigureVertexLabelsClick(this.handleConfigureVertexLabelsClick.bind(this));
        this.ui.onSaveUserPresetClick(this.handleSaveUserPreset.bind(this));
        this.ui.onCancelUserPresetEdit(this.handleCancelUserPresetEdit.bind(this));
        this.ui.onUserPresetApply(this.handleUserPresetApply.bind(this));
        this.ui.onUserPresetDelete(this.handleUserPresetDelete.bind(this));
        this.ui.onUserPresetEdit(this.handleUserPresetEdit.bind(this));
        
        // Display Toggles
        this.ui.onVertexLabelChange(checked => { this.cube.toggleVertexLabels(checked); this.selection.toggleVertexLabels(checked); });
        this.ui.onFaceLabelChange(checked => this.cube.toggleFaceLabels(checked));
        this.ui.onToggleNetClick(() => { this.netManager.toggle(); this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver); });
        this.ui.onEdgeLabelModeChange(mode => { this.cube.setEdgeLabelMode(mode); this.selection.setEdgeLabelMode(mode); });
        this.ui.onCutSurfaceChange(checked => this.cutter.toggleSurface(checked));
        this.ui.onPyramidChange(checked => this.cutter.togglePyramid(checked));
        this.ui.onTransparencyChange(checked => { this.cube.toggleTransparency(checked); this.cutter.setTransparency(checked); });
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
        this.selection.reset();
        this.cutter.resetInversion();
        this.cutter.reset();
        this.netManager.update([], this.cube, this.resolver);
        this.isCutExecuted = false;
        this.snappedPointInfo = null;
        this.highlightMarker.visible = false;
        this.ui.setExplanation('');
        this.isCameraAnimating = true;
        this.cameraTargetPosition = new THREE.Vector3(10, 5, 3);
        this.controls.target.set(0, 0, 0);
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
        if (this.ui.modeSelector.value !== 'free') return;
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
        if (this.isCutExecuted || this.ui.modeSelector.value !== 'free') {
            this.highlightMarker.visible = false;
            this.snappedPointInfo = null;
            document.body.style.cursor = 'auto';
            return;
        }
        const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
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
        this.cube.resize(this.camera);
        this.resolver.setSize(this.cube.getSize());
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    handleModeChange(mode) {
        if (mode !== 'settings') {
            this.resetScene();
        }
        this.ui.showPresetControls(false);
        this.ui.showSettingsControls(false);
        this.ui.showSettingsPanels(false);

        if (mode === 'preset') {
            this.ui.showPresetControls(true);
            this.ui.presetCategoryFilter.value = 'triangle';
            this.ui.filterPresetButtons('triangle');
        } else if (mode === 'settings') {
            this.ui.showSettingsControls(true);
            this.ui.showSettingsPanels(true);
            this.ui.settingsCategorySelector.value = 'display';
            this.ui.showSettingsPanel('display');
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

    handleResetClick() {
        this.resetScene();
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

    handleConfigureVertexLabelsClick() {
        const defaultLabels = ['A','B','C','D','E','F','G','H'];
        const input = prompt("頂点ラベルを8個入力（例: A,B,C,D,E,F,G,H）", defaultLabels.join(','));
        if (!input) return;
        const parts = input.includes(',')
            ? input.split(',').map(p => p.trim()).filter(Boolean)
            : input.split(/\s+/).map(p => p.trim()).filter(Boolean);
        const labels = parts.length === 1 && parts[0].length === 8
            ? parts[0].split('')
            : parts;
        if (labels.length !== 8) {
            this.ui.showMessage("頂点ラベルは8個必要です。", "warning");
            return;
        }
        const unique = new Set(labels);
        if (unique.size !== labels.length) {
            this.ui.showMessage("頂点ラベルは重複できません。", "warning");
            return;
        }
        const labelMap = {};
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

    async handleSaveUserPreset() {
        if (!this.userPresetStorage.isEnabled()) {
            this.ui.showMessage('保存機能は利用できません。', 'warning');
            return;
        }
        const form = this.ui.getUserPresetForm();
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

    handleFlipCutClick() {
        this.cutter.flipCut();
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.netManager.update(this.cutter.getCutSegments(), this.cube, this.resolver);
        this.selection.updateSplitLabels(this.cutter.getIntersections());
    }

    // --- Animation Loop ---
    animate() {
        requestAnimationFrame(this.animate.bind(this));
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
