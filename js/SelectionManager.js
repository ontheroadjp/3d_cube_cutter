import * as THREE from 'three';
import { createLabel, createMarker } from './utils.js';

export class SelectionManager {
  constructor(scene, cube, ui){
    this.scene = scene;
    this.cube = cube;
    this.ui = ui;
    this.selected = []; // オブジェクトの配列 { point, object }
    this.markers = []; // 赤丸、点ラベル、辺ラベル(分割分) 全て含むが、管理しやすくする
    this.splitEdgeLabels = []; // 分割辺の長さラベルだけ別途保持
    this.hiddenEdgeLabels = []; // 隠した元の辺ラベルのインデックス
    this.previewLabels = []; // プレビュー用の分割ラベル
    this.hiddenOriginalLabel = null; // プレビューで隠した元のラベル
    this.currentEdgeLabelMode = 'visible';
    this.selectedObjects = new Set(); // 選択されたオブジェクトのuuidを管理
  }

  getLabel(index) {
      // 0->P, 1->Q, 2->R ...
      // ASCII code: P is 80
      return String.fromCharCode(80 + index);
  }

  // 外部(Cutter)から計算された交点を受け取り、その辺の長さを分割表示する
  updateSplitLabels(intersections) {
      if (!intersections || intersections.length === 0) return;
      
      // projectToEdge の簡易版をここに実装
      const project = (p) => {
          let best=null, min=Infinity, bestIdx = -1;
          this.cube.edges.forEach((line, i)=>{
              const a=line.start, b=line.end;
              const ab=b.clone().sub(a);
              const lenSq = ab.lengthSq();
              if(lenSq < 1e-10) return;
              let t=ab.dot(p.clone().sub(a))/lenSq;
              if(t < -0.01 || t > 1.01) return;
              t = Math.max(0, Math.min(1, t));
              const q=a.clone().add(ab.multiplyScalar(t));
              const d=q.distanceTo(p);
              if(d < min){ min=d; best=q; bestIdx=i; }
          });
          return min < 1.0 ? { point: best, index: bestIdx } : null;
      };

      intersections.forEach(p => {
          const result = project(p);
          if (!result) return;
          const { index: edgeIdx } = result;
          
          if (edgeIdx !== -1) {
              const isHidden = this.hiddenEdgeLabels && this.hiddenEdgeLabels.includes(edgeIdx);
              if (!isHidden) {
                  this._addSplitLabel(edgeIdx, p);
              }
          }
      });
  }

  addPoint(selectionInfo) {
    const { point, object, isMidpoint } = selectionInfo; // isMidpoint情報を追加で受け取る
    
    this.selected.push(selectionInfo);
    this.selectedObjects.add(object.uuid);
    
    const li = this.selected.length - 1;
    const label = this.getLabel(li);

    // 中点の場合は緑、それ以外は赤のマーカーを作成
    const markerColor = isMidpoint ? 0x00ff00 : 0xff0000;
    const m = createMarker(point, this.scene, markerColor);
    this.markers.push(m);

    // 選択点ラベル (I, J, K...)
    const sprite = createLabel(label, this.cube.size / 10);
    sprite.position.copy(point).add(new THREE.Vector3(0, 0.8, 0));
    this.scene.add(sprite);
    this.markers.push(sprite);

    // 頂点ラベルの表示状態を同期
    sprite.visible = true;

    // 選択が辺の場合、辺の長さを分割表示する
    if (object.userData.type === 'edge') {
        this._addSplitLabel(object.userData.index, point);
    }
   
    this.ui.updateSelectionCount(this.selected.length);
  }

  _addSplitLabel(edgeIdx, proj) {
      // 既に処理済みの辺なら何もしない
      if (this.hiddenEdgeLabels && this.hiddenEdgeLabels.includes(edgeIdx)) {
          return;
      }

      // 元の辺のラベルを非表示にする
      if (this.cube.edgeLabels[edgeIdx]) {
          this.cube.setEdgeLabelVisible(edgeIdx, false);
      }
      
      if(!this.hiddenEdgeLabels) this.hiddenEdgeLabels = [];
      this.hiddenEdgeLabels.push(edgeIdx);

      // 分割された辺の長さを表示
      const edge = this.cube.edges[edgeIdx];
      const d1 = edge.start.distanceTo(proj);
      const d2 = edge.end.distanceTo(proj);
      
      const l1 = d1.toFixed(1).replace(/\.0$/, '') + "cm";
      const l2 = d2.toFixed(1).replace(/\.0$/, '') + "cm";

      // 位置計算（中点）
      const center1 = new THREE.Vector3().addVectors(edge.start, proj).multiplyScalar(0.5);
      const center2 = new THREE.Vector3().addVectors(proj, edge.end).multiplyScalar(0.5);

      // 分割された辺のラベルを作成・表示（'visible'モード用）
      const s1 = createLabel(l1, this.cube.size/15);
      s1.position.copy(center1);
      this.scene.add(s1);
      this.markers.push(s1); // resetで消えるように
      this.splitEdgeLabels.push(s1);

      const s2 = createLabel(l2, this.cube.size/15);
      s2.position.copy(center2);
      this.scene.add(s2);
      this.markers.push(s2);
      this.splitEdgeLabels.push(s2);

      // 現在のモードに合わせて表示・非表示
      const showEdgeLabels = (this.currentEdgeLabelMode === 'visible');
      s1.visible = showEdgeLabels;
      s2.visible = showEdgeLabels;
  }

  toggleVertexLabels(visible){
    this.markers.forEach(obj => {
      if(obj instanceof THREE.Sprite && !this.splitEdgeLabels.includes(obj)){
        obj.visible = visible;
      }
    });
  }

  setEdgeLabelMode(mode){
    this.currentEdgeLabelMode = mode;
    const visible = (mode === 'visible');
    this.splitEdgeLabels.forEach(s => s.visible = visible);
  }

  previewSplit(edge, point) {
    this.clearPreview(); // 既存のプレビューをクリア

    const edgeIdx = this.cube.edges.indexOf(edge);
    if (edgeIdx === -1) return;

    // バグ修正: 既に確定選択で分割されている辺にはプレビューを表示しない
    if (this.hiddenEdgeLabels.includes(edgeIdx)) {
        return;
    }

    // 元の辺ラベルを非表示に
    if (this.cube.edgeLabels[edgeIdx] && this.cube.edgeLabels[edgeIdx].visible) {
        this.cube.setEdgeLabelVisible(edgeIdx, false);
        this.hiddenOriginalLabel = edgeIdx;
    }

    // 分割された辺の長さを計算・表示
    const d1 = edge.start.distanceTo(point);
    const d2 = edge.end.distanceTo(point);
    const l1 = d1.toFixed(1).replace(/\.0$/, '') + "cm";
    const l2 = d2.toFixed(1).replace(/\.0$/, '') + "cm";

    const center1 = new THREE.Vector3().addVectors(edge.start, point).multiplyScalar(0.5);
    const center2 = new THREE.Vector3().addVectors(point, edge.end).multiplyScalar(0.5);

    const s1 = createLabel(l1, this.cube.size/15);
    s1.position.copy(center1);
    this.scene.add(s1);
    this.previewLabels.push(s1);

    const s2 = createLabel(l2, this.cube.size/15);
    s2.position.copy(center2);
    this.scene.add(s2);
    this.previewLabels.push(s2);

    const showEdgeLabels = (this.currentEdgeLabelMode === 'visible');
    s1.visible = showEdgeLabels;
    s2.visible = showEdgeLabels;
  }

  clearPreview() {
    this.previewLabels.forEach(l => this.scene.remove(l));
    this.previewLabels = [];

    // 隠した元のラベルを復元
    if (this.hiddenOriginalLabel !== null) {
        // ただし、その辺がすでに本選択されて分割ラベルが表示されている場合は、復元しない
        if (!this.hiddenEdgeLabels.includes(this.hiddenOriginalLabel)) {
            if (this.currentEdgeLabelMode === 'visible') {
                this.cube.setEdgeLabelVisible(this.hiddenOriginalLabel, true);
            }
        }
        this.hiddenOriginalLabel = null;
    }
  }

  isObjectSelected(object) {
      return this.selectedObjects.has(object.uuid);
  }

  reset(){
    this.selected=[];
    this.markers.forEach(m=>this.scene.remove(m));
    this.markers=[];
    this.splitEdgeLabels=[];
    this.selectedObjects.clear();
    this.clearPreview(); // プレビューもクリア
    
    // 隠した辺ラベルを復元
    // 元々はここで currentEdgeLabelMode をチェックしていたが、
    // Cube側のラベルは Cube.setEdgeLabelMode で一括制御されるべき。
    // ここでは「隠した状態」を解除するだけで、実際の表示/非表示は Cube のモード設定に任せる。
    // つまり、visible = true に戻して良い。もしモードが hidden なら、その後 setEdgeLabelMode(hidden) が呼ばれるか、
    // あるいは Cube 側で常に管理されているべき。
    // reset時の順序として、selection.reset() -> cube.setEdgeLabelMode() とすれば整合する。
    
    if(this.hiddenEdgeLabels){
        this.hiddenEdgeLabels.forEach(idx => {
            this.cube.setEdgeLabelVisible(idx, true);
        });
        this.hiddenEdgeLabels = [];
    }
    
    this.ui.updateSelectionCount(0);
    // this.ui.clearSelectionEdges(); // 削除: この関数はUIから削除されたため
  }
}
