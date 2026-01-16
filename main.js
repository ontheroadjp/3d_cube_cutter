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

// プリセット一覧をUIに反映
ui.populatePresets(presetManager.getPresetNames());

/* ===== Mouse Click ===== */
addEventListener('click', e=>{
  if (isCutExecuted) return; // 切断後は点を追加できない

  // 制限撤廃: if(selection.selected.length>=3) return;
  const mouse = new THREE.Vector2(
    e.clientX/innerWidth*2-1,
    -e.clientY/innerHeight*2+1
  );
  const p = cube.raycast(mouse,camera);
  if(!p) return;
  selection.addPoint(p);
  // 新規追加されたラベルの表示状態を同期
  selection.toggleVertexLabels(ui.isVertexLabelsChecked());

  // 3点以上選択されたら切断実行（常に最初の3点、またはロジック次第で最適化）
  // Cutter側で「最初の3点」を使うようにする
  if(selection.selected.length >= 3){
    cutter.cut(cube, selection.selected);
    cutter.toggleSurface(ui.isCutSurfaceChecked());
    cutter.togglePyramid(ui.isPyramidChecked());
    // 展開図更新
    netManager.update(cutter.getCutLines(), cube);
    // 辺の分割表示更新 (全ての交点について)
    selection.updateSplitLabels(cutter.getIntersections());
    
    isCutExecuted = true;
  }
});

/* ===== Event Listeners via UIManager ===== */
ui.onVertexLabelChange((checked) => {
  cube.toggleVertexLabels(checked);
  selection.toggleVertexLabels(checked);
});

ui.onPresetChange((name) => {
    if (name === 'free') {
        // 自由選択モード：リセットのみ
        selection.reset();
        cutter.resetInversion();
        cutter.reset();
        netManager.update([], cube);
        isCutExecuted = false;
    } else {
        presetManager.applyPreset(name);
        // 適用後の状態同期
        selection.toggleVertexLabels(ui.isVertexLabelsChecked());
        cutter.toggleSurface(ui.isCutSurfaceChecked());
        cutter.togglePyramid(ui.isPyramidChecked());
        cutter.setTransparency(ui.isTransparencyChecked());
        // 展開図更新
        netManager.update(cutter.getCutLines(), cube);
        // 辺の分割表示更新
        selection.updateSplitLabels(cutter.getIntersections());
        
        isCutExecuted = true;
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

/* ===== Mouse Move (Tooltip) ===== */
addEventListener('mousemove', e => {
  if (ui.getEdgeLabelMode() !== 'popup') return;

  const mouse = new THREE.Vector3(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1,
    0
  );
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
  
  const text = selection.getTooltipInfo(raycaster);

  if (text) {
      ui.showTooltip(text, e.clientX, e.clientY);
  } else {
      ui.hideTooltip();
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