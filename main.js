import * as THREE from 'three';
import { OrbitControls } from './lib/three/examples/jsm/controls/OrbitControls.js';
import { Cube } from './js/Cube.js';
import { SelectionManager } from './js/SelectionManager.js';
import { UIManager } from './js/UIManager.js';
import { Cutter } from './js/Cutter.js';
import { PresetManager } from './js/presets/PresetManager.js';
import { NetManager } from './js/net/NetManager.js';

/* ===== Scene, Camera, Renderer, Controls ===== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

let size = 10;
let aspect = innerWidth / innerHeight;
const camera = new THREE.OrthographicCamera(-size*aspect, size*aspect, size, -size, 0.1, 100);
camera.position.set(10, 5, 3);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0,0,0);
controls.update();

let cameraTargetPosition = null;
let isCameraAnimating = false;

controls.addEventListener('start', () => { isCameraAnimating = false; });

scene.add(new THREE.AmbientLight(0xffffff,0.8));
const light = new THREE.DirectionalLight(0xffffff,0.6);
light.position.set(5,5,5);
scene.add(light);

/* ===== Highlight Marker ===== */
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.7 });
const midPointHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
const highlightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), highlightMaterial);
highlightMarker.visible = false;
scene.add(highlightMarker);

/* ===== Instantiate Managers ===== */
const ui = new UIManager();
const cube = new Cube(scene);
const cutter = new Cutter(scene);
const netManager = new NetManager();
const selection = new SelectionManager(scene,cube,ui);
const presetManager = new PresetManager(selection, cube, cutter);

let isCutExecuted = false;
let snappedPointInfo = null;

ui.populatePresets(presetManager.getPresets());

function executeCut() {
    const points = selection.selected.map(s => s.point);
    if (points.length < 3) return;

    const success = cutter.cut(cube, points);
    if (!success) {
        console.warn("切断処理に失敗しました。点を選択し直してください。");
        isCutExecuted = false;
        selection.reset();
        return;
    }
    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    netManager.update(cutter.getCutLines(), cube);
    selection.updateSplitLabels(cutter.getIntersections());
    isCutExecuted = true;
}

function resetScene() {
    selection.reset();
    cutter.resetInversion();
    cutter.reset();
    netManager.update([], cube);
    isCutExecuted = false;
    snappedPointInfo = null;
    highlightMarker.visible = false;
    isCameraAnimating = true;
    cameraTargetPosition = new THREE.Vector3(10, 5, 3);
    controls.target.set(0, 0, 0);
}

/* ===== Mouse Click ===== */
addEventListener('click', e => {
    if (isCutExecuted) return;
    if (ui.modeSelector.value !== 'free') return;
    if (!snappedPointInfo) return;
    if (selection.isObjectSelected(snappedPointInfo.object)) return;
    
    if (selection.selected.length === 2) {
        const p0 = selection.selected[0].point;
        const p1 = selection.selected[1].point;
        const p2 = snappedPointInfo.point;
        const v1 = new THREE.Vector3().subVectors(p1, p0);
        const v2 = new THREE.Vector3().subVectors(p2, p0);
        if (v1.cross(v2).lengthSq() < 1e-6) {
            ui.showMessage("3つの点が同一直線上になるため、選択できません。", "warning");
            return;
        }
    }
    if (selection.selected.length >= 3) return;

    selection.addPoint(snappedPointInfo);
    selection.toggleVertexLabels(ui.isVertexLabelsChecked());

    if (selection.selected.length === 3) executeCut();
});


/* ===== Event Listeners via UIManager ===== */

ui.onModeChange(mode => {
    resetScene();
    ui.showPresetControls(false);
    ui.showSettingsControls(false);
    ui.showSettingsPanels(false);

    if (mode === 'preset') {
        ui.showPresetControls(true);
        ui.presetCategoryFilter.value = 'triangle';
        ui.filterPresetButtons('triangle');
    } else if (mode === 'settings') {
        ui.showSettingsControls(true);
        ui.showSettingsPanels(true);
        ui.settingsCategorySelector.value = 'display';
        ui.showSettingsPanel('display');
    }
});

ui.onPresetCategoryChange(category => {
    if (category) ui.filterPresetButtons(category);
});

ui.onSettingsCategoryChange(category => {
    ui.showSettingsPanel(category);
});

ui.onPresetChange(name => {
    resetScene();
    presetManager.applyPreset(name);
    executeCut();
    const normal = cutter.getCutPlaneNormal();
    if (normal) {
        const distance = cube.size * 1.5;
        const offset = new THREE.Vector3(0.5, 0.5, 0.5).normalize();
        cameraTargetPosition = normal.clone().multiplyScalar(distance).add(offset.multiplyScalar(distance * 0.3));
        isCameraAnimating = true;
    }
    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    cutter.setTransparency(ui.isTransparencyChecked());
    selection.toggleVertexLabels(ui.isVertexLabelsChecked());
});

ui.onResetClick(() => {
    resetScene();
    ui.resetToFreeSelectMode();
});

ui.onConfigureClick(() => {
  const lx = parseFloat(prompt("辺ABの長さ(cm)","10"));
  const ly = parseFloat(prompt("辺ADの長さ(cm)","10"));
  const lz = parseFloat(prompt("辺AEの長さ(cm)","10"));
  if(!isNaN(lx)&&!isNaN(ly)&&!isNaN(lz)){
    resetScene();
    ui.resetToFreeSelectMode();
    cube.createCube([lx,ly,lz]);
    const mode = ui.getEdgeLabelMode();
    cube.setEdgeLabelMode(mode);
    selection.setEdgeLabelMode(mode);
    const isTrans = ui.isTransparencyChecked();
    cube.toggleTransparency(isTrans);
    cutter.setTransparency(isTrans);
  }
});

// Other display toggles
ui.onVertexLabelChange((checked) => { cube.toggleVertexLabels(checked); selection.toggleVertexLabels(checked); });
ui.onFaceLabelChange((checked) => { cube.toggleFaceLabels(checked); });
ui.onToggleNetClick(() => { netManager.toggle(); netManager.update(cutter.getCutLines(), cube); });
ui.onEdgeLabelModeChange((mode) => { cube.setEdgeLabelMode(mode); selection.setEdgeLabelMode(mode); });
ui.onCutSurfaceChange((checked) => { cutter.toggleSurface(checked); });
ui.onPyramidChange((checked) => { cutter.togglePyramid(checked); });
ui.onTransparencyChange((checked) => { cube.toggleTransparency(checked); cutter.setTransparency(checked); });
ui.onFlipCutClick(() => {
    cutter.flipCut();
    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    netManager.update(cutter.getCutLines(), cube);
    selection.updateSplitLabels(cutter.getIntersections());
});

// Initial state reflects default UI toggles
cube.toggleTransparency(ui.isTransparencyChecked());
cutter.setTransparency(ui.isTransparencyChecked());
cube.toggleVertexLabels(ui.isVertexLabelsChecked());
selection.toggleVertexLabels(ui.isVertexLabelsChecked());
cube.toggleFaceLabels(ui.isFaceLabelsChecked());
const initialEdgeMode = ui.getEdgeLabelMode();
cube.setEdgeLabelMode(initialEdgeMode);
selection.setEdgeLabelMode(initialEdgeMode);

const raycaster = new THREE.Raycaster();

/* ===== Mouse Move (Highlighting) ===== */
addEventListener('mousemove', e => {
    if (isCutExecuted || ui.modeSelector.value !== 'free') {
        highlightMarker.visible = false;
        snappedPointInfo = null;
        document.body.style.cursor = 'auto';
        return;
    }
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...cube.vertexMeshes, ...cube.edgeMeshes]);
    selection.clearPreview();
    if (intersects.length > 0) {
        const intersection = intersects[0];
        const object = intersection.object;
        const userData = object.userData;
        if (selection.isObjectSelected(object)) {
            highlightMarker.visible = false;
            snappedPointInfo = null;
            document.body.style.cursor = 'auto';
            return;
        }
        let snappedPoint;
        let isMidpoint = false;
        if (userData.type === 'vertex') {
            snappedPoint = cube.vertices[userData.index];
            highlightMarker.material = highlightMaterial;
        } else {
            const edge = cube.edges[userData.index];
            const edgeDir = new THREE.Vector3().subVectors(edge.end, edge.start);
            const edgeLength = edgeDir.length();
            edgeDir.normalize();
            const intersectVec = new THREE.Vector3().subVectors(intersection.point, edge.start);
            let projectedLength = intersectVec.dot(edgeDir);
            let snappedLength = Math.round(projectedLength);
            snappedLength = Math.max(0, Math.min(edgeLength, snappedLength));
            snappedPoint = edge.start.clone().add(edgeDir.multiplyScalar(snappedLength));
            isMidpoint = Math.abs(snappedLength - edgeLength / 2) < 0.1;
            highlightMarker.material = isMidpoint ? midPointHighlightMaterial : highlightMaterial;
            selection.previewSplit(edge, snappedPoint);
        }
        highlightMarker.position.copy(snappedPoint);
        highlightMarker.visible = true;
        snappedPointInfo = { point: snappedPoint, object: object, isMidpoint: isMidpoint };
        document.body.style.cursor = 'pointer';
    } else {
        highlightMarker.visible = false;
        snappedPointInfo = null;
        document.body.style.cursor = 'auto';
    }
});

/* ===== Resize ===== */
addEventListener('resize',()=>{
  cube.resize(camera);
  renderer.setSize(innerWidth,innerHeight);
});

/* ===== Animate ===== */
(function animate(){
  requestAnimationFrame(animate);
  if (isCameraAnimating && cameraTargetPosition) {
      camera.position.lerp(cameraTargetPosition, 0.05);
      if (camera.position.distanceTo(cameraTargetPosition) < 0.1) {
          isCameraAnimating = false;
          camera.position.copy(cameraTargetPosition);
      }
  }
  controls.update();
  renderer.render(scene,camera);
})();
