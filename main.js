import * as THREE from 'three';
import { OrbitControls } from './lib/three/examples/jsm/controls/OrbitControls.js';
import { Cube } from './js/Cube.js';
import { SelectionManager } from './js/SelectionManager.js';
import { UIManager } from './js/UIManager.js';
import { Cutter } from './js/Cutter.js';
import { PresetManager } from './js/presets/PresetManager.js';
import { NetManager } from './js/net/NetManager.js';

class App {
    constructor() {
        // --- State Properties ---
        this.isCutExecuted = false;
        this.snappedPointInfo = null;
        this.cameraTargetPosition = null;
        this.isCameraAnimating = false;

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
        this.cutter = new Cutter(this.scene);
        this.netManager = new NetManager();
        this.selection = new SelectionManager(this.scene, this.cube, this.ui);
        this.presetManager = new PresetManager(this.selection, this.cube, this.cutter);
    }

    init() {
        this.ui.populatePresets(this.presetManager.getPresets());
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
        
        // Display Toggles
        this.ui.onVertexLabelChange(checked => { this.cube.toggleVertexLabels(checked); this.selection.toggleVertexLabels(checked); });
        this.ui.onFaceLabelChange(checked => this.cube.toggleFaceLabels(checked));
        this.ui.onToggleNetClick(() => { this.netManager.toggle(); this.netManager.update(this.cutter.getCutLines(), this.cube); });
        this.ui.onEdgeLabelModeChange(mode => { this.cube.setEdgeLabelMode(mode); this.selection.setEdgeLabelMode(mode); });
        this.ui.onCutSurfaceChange(checked => this.cutter.toggleSurface(checked));
        this.ui.onPyramidChange(checked => this.cutter.togglePyramid(checked));
        this.ui.onTransparencyChange(checked => { this.cube.toggleTransparency(checked); this.cutter.setTransparency(checked); });
    }

    // --- Core Logic Methods ---
    executeCut() {
        const points = this.selection.selected.map(s => s.point);
        if (points.length < 3) return;

        const success = this.cutter.cut(this.cube, points);
        if (!success) {
            console.warn("切断処理に失敗しました。点を選択し直してください。");
            this.isCutExecuted = false;
            this.selection.reset();
            return;
        }
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.netManager.update(this.cutter.getCutLines(), this.cube);
        this.selection.updateSplitLabels(this.cutter.getIntersections());
        this.isCutExecuted = true;
    }

    resetScene() {
        this.selection.reset();
        this.cutter.resetInversion();
        this.cutter.reset();
        this.netManager.update([], this.cube);
        this.isCutExecuted = false;
        this.snappedPointInfo = null;
        this.highlightMarker.visible = false;
        this.isCameraAnimating = true;
        this.cameraTargetPosition = new THREE.Vector3(10, 5, 3);
        this.controls.target.set(0, 0, 0);
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

            if (userData.type === 'vertex') {
                snappedPoint = this.cube.vertices[userData.index];
                this.highlightMarker.material.color.set(0x808080);
            } else {
                const edge = this.cube.edges[userData.index];
                const edgeDir = new THREE.Vector3().subVectors(edge.end, edge.start);
                const edgeLength = edgeDir.length();
                edgeDir.normalize();
                const intersectVec = new THREE.Vector3().subVectors(intersection.point, edge.start);
                let projectedLength = intersectVec.dot(edgeDir);
                let snappedLength = Math.round(projectedLength);
                snappedLength = Math.max(0, Math.min(edgeLength, snappedLength));
                snappedPoint = edge.start.clone().add(edgeDir.multiplyScalar(snappedLength));
                isMidpoint = Math.abs(snappedLength - edgeLength / 2) < 0.1;
                this.highlightMarker.material = isMidpoint ? this.midPointHighlightMaterial : this.highlightMarker.material;
                this.highlightMarker.material.color.set(isMidpoint ? 0x00ff00 : 0x808080);
                this.selection.previewSplit(edge, snappedPoint);
            }
            this.highlightMarker.position.copy(snappedPoint);
            this.highlightMarker.visible = true;
            this.snappedPointInfo = { point: snappedPoint, object: object, isMidpoint: isMidpoint };
            document.body.style.cursor = 'pointer';
        } else {
            this.highlightMarker.visible = false;
            this.snappedPointInfo = null;
            document.body.style.cursor = 'auto';
        }
    }

    handleResize() {
        this.cube.resize(this.camera);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    handleModeChange(mode) {
        this.resetScene();
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
            const mode = this.ui.getEdgeLabelMode();
            this.cube.setEdgeLabelMode(mode);
            this.selection.setEdgeLabelMode(mode);
            const isTrans = this.ui.isTransparencyChecked();
            this.cube.toggleTransparency(isTrans);
            this.cutter.setTransparency(isTrans);
        }
    }

    handleFlipCutClick() {
        this.cutter.flipCut();
        this.cutter.toggleSurface(this.ui.isCutSurfaceChecked());
        this.cutter.togglePyramid(this.ui.isPyramidChecked());
        this.netManager.update(this.cutter.getCutLines(), this.cube);
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