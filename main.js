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
camera.position.set(5,5,5);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0,0,0);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff,0.8));
const light = new THREE.DirectionalLight(0xffffff,0.6);
light.position.set(5,5,5);
scene.add(light);

/* ===== Instantiate Managers ===== */
const ui = new UIManager();
const cube = new Cube(scene);
const cutter = new Cutter(scene);
const netManager = new NetManager();

ui.showCubeEdges(cube.vertices,cube.vertexLabels);
const selection = new SelectionManager(scene,cube,ui);
const presetManager = new PresetManager(selection, cube, cutter);

let isCutExecuted = false; // 切断済みフラグ
let highlightedObject = null; // ハイライト中のオブジェクト

// プリセット一覧をUIに反映
ui.populatePresets(presetManager.getNames());

function executeCut() {
    const points = selection.selected.map(s => s.point);
    if (points.length < 3) return;

    const success = cutter.cut(cube, points);
    if (!success) {
        // cutter.cut が false を返した場合（例：有効な平面が見つからない）
        console.warn("切断処理に失敗しました。点を選択し直してください。");
        isCutExecuted = false; // 切断が実行されなかったのでフラグをリセット
        selection.reset(); // 点をリセットして再選択を促す
        return; // 何もせず終了
    }

    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    netManager.update(cutter.getCutLines(), cube);
    selection.updateSplitLabels(cutter.getIntersections());
    isCutExecuted = true;
}

/* ===== Mouse Click ===== */
addEventListener('click', e => {
    if (isCutExecuted) return;

    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...cube.vertexMeshes, ...cube.edgeMeshes]);

    if (intersects.length === 0) return;

    const intersection = intersects[0];
    const object = intersection.object;
    const userData = object.userData;

    let point;
    if (userData.type === 'vertex') {
        point = cube.vertices[userData.index];
    } else { // edge
        point = intersection.point;
    }

    // --- Validation Checks ---
    if (selection.isObjectSelected(object)) {
        // 頂点または辺がすでに選択されている場合は何もしない
        return;
    }
    
    if (selection.selected.length === 2) {
        const p0 = selection.selected[0].point;
        const p1 = selection.selected[1].point;
        const p2 = point;
        const v1 = new THREE.Vector3().subVectors(p1, p0);
        const v2 = new THREE.Vector3().subVectors(p2, p0);

        if (v1.cross(v2).lengthSq() < 1e-6) {
            ui.showMessage("3つの点が同一直線上になるため、選択できません。", "warning");
            return;
        }
    }

    if (selection.selected.length >= 3) return;

    // --- Add Point ---
    selection.addPoint({ point, object });
    selection.toggleVertexLabels(ui.isVertexLabelsChecked());

    // 3点目が選択されたら自動で切断
    if (selection.selected.length === 3) {
        executeCut();
    }
});

/* ===== Event Listeners via UIManager ===== */
ui.onVertexLabelChange((checked) => {
  cube.toggleVertexLabels(checked);
  selection.toggleVertexLabels(checked);
});

ui.onPresetChange((name) => {
    // 常にリセットから始める
    selection.reset();
    cutter.resetInversion();
    cutter.reset();
    netManager.update([], cube);
    isCutExecuted = false;

    if (name !== 'free') {
        presetManager.applyPreset(name);
        // プリセット適用後、即座に切断を実行
        executeCut();
        // 適用後の状態同期
        // executeCut内で更新されない場合、または失敗した場合のためにここで再度設定
        cutter.toggleSurface(ui.isCutSurfaceChecked());
        cutter.togglePyramid(ui.isPyramidChecked());
        cutter.setTransparency(ui.isTransparencyChecked());
        selection.toggleVertexLabels(ui.isVertexLabelsChecked()); // Preset適用後の点ラベルも同期
    }
});

ui.onToggleNetClick(() => {
    netManager.toggle();
    // 表示時にも更新
    netManager.update(cutter.getCutLines(), cube);
});

ui.onEdgeLabelModeChange((mode) => {
  cube.setEdgeLabelMode(mode);
  selection.setEdgeLabelMode(mode);
  
  if(mode !== 'popup'){
      ui.hideTooltip();
  }
});

ui.onCutSurfaceChange((checked) => {
  cutter.toggleSurface(checked);
});

ui.onPyramidChange((checked) => {
  cutter.togglePyramid(checked);
});

ui.onTransparencyChange((checked) => {
  cube.toggleTransparency(checked);
  cutter.setTransparency(checked);
});

ui.onFlipCutClick(() => {
    cutter.flipCut();
    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    // 展開図更新
    netManager.update(cutter.getCutLines(), cube);
    // 辺の分割表示更新
    selection.updateSplitLabels(cutter.getIntersections());
});

ui.onResetClick(() => {
    selection.reset();
    cutter.resetInversion();
    cutter.reset();
    netManager.update([], cube); // 展開図クリア
    isCutExecuted = false;
});

ui.onConfigureClick(() => {
  const lx = parseFloat(prompt("辺ABの長さ(cm)","10"));
  const ly = parseFloat(prompt("辺ADの長さ(cm)","10"));
  const lz = parseFloat(prompt("辺AEの長さ(cm)","10"));
  if(!isNaN(lx)&&!isNaN(ly)&&!isNaN(lz)){
    cube.createCube([lx,ly,lz]);
    ui.showCubeEdges(cube.vertices,cube.vertexLabels);
    selection.reset();
    cutter.resetInversion();
    cutter.reset();
    netManager.update([], cube);
    isCutExecuted = false;
    
    // 設定変更後に表示モードを再適用
    const mode = ui.getEdgeLabelMode();
    cube.setEdgeLabelMode(mode);
    selection.setEdgeLabelMode(mode);
    
    // 透明度も再適用
    const isTrans = ui.isTransparencyChecked();
    cube.toggleTransparency(isTrans);
    cutter.setTransparency(isTrans);
  }
});

// 初期状態の反映
cube.toggleTransparency(ui.isTransparencyChecked());
cutter.setTransparency(ui.isTransparencyChecked());
cube.toggleVertexLabels(ui.isVertexLabelsChecked());
selection.toggleVertexLabels(ui.isVertexLabelsChecked());
const initialEdgeMode = ui.getEdgeLabelMode();
cube.setEdgeLabelMode(initialEdgeMode);
selection.setEdgeLabelMode(initialEdgeMode);

/* ===== Mouse Move (Highlighting) ===== */
const raycaster = new THREE.Raycaster();
function unhighlightVertex(obj) {
    if (!obj) return;
    obj.material.opacity = 0.0;
    obj.scale.set(1, 1, 1);
}
function highlightVertex(obj) {
    if (!obj) return;
    obj.material.opacity = 0.5;
    obj.scale.set(1.5, 1.5, 1.5);
}

addEventListener('mousemove', e => {
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cube.vertexMeshes);

    if (intersects.length > 0) {
        const foundObj = intersects[0].object;
        if (highlightedObject !== foundObj) {
            unhighlightVertex(highlightedObject);
            highlightVertex(foundObj);
            highlightedObject = foundObj;
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (highlightedObject) {
            unhighlightVertex(highlightedObject);
            highlightedObject = null;
            document.body.style.cursor = 'auto';
        }
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
  controls.update();
  renderer.render(scene,camera);
})();