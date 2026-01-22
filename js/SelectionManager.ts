import * as THREE from 'three';
import { createLabel, createMarker } from './utils.js';
import { parseSnapPointId, normalizeSnapPointId } from './geometry/snapPointId.js';
import type { IntersectionPoint, SnapPointID } from './types.js';

export class SelectionManager {
  scene: THREE.Scene;
  cube: any;
  ui: any;
  resolver: any;
  selected: Array<{ snapId: SnapPointID }>;
  markers: THREE.Object3D[];
  splitEdgeLabels: THREE.Object3D[];
  hiddenEdgeLabels: number[];
  previewLabels: THREE.Object3D[];
  hiddenOriginalLabel: number | null;
  currentEdgeLabelMode: string;
  selectedObjects: Set<string>;

  constructor(scene: THREE.Scene, cube: any, ui: any, resolver: any = null){
    this.scene = scene;
    this.cube = cube;
    this.ui = ui;
    this.resolver = resolver;
    this.selected = []; // オブジェクトの配列 { snapId }
    this.markers = []; // 赤丸、点ラベル、辺ラベル(分割分) 全て含むが、管理しやすくする
    this.splitEdgeLabels = []; // 分割辺の長さラベルだけ別途保持
    this.hiddenEdgeLabels = []; // 隠した元の辺ラベルのインデックス
    this.previewLabels = []; // プレビュー用の分割ラベル
    this.hiddenOriginalLabel = null; // プレビューで隠した元のラベル
    this.currentEdgeLabelMode = 'visible';
    this.selectedObjects = new Set(); // 選択されたオブジェクトのuuidを管理
  }

  getLabel(index: number) {
      // 0->P, 1->Q, 2->R ...
      // ASCII code: P is 80
      return String.fromCharCode(80 + index);
  }

  // 外部(Cutter)から計算された交点を受け取り、その辺の長さを分割表示する
  updateSplitLabels(intersections: IntersectionPoint[]) {
      if (!intersections || intersections.length === 0) return;
      if (!this.resolver || !this.cube.getStructure) return;
      const structure = this.cube.getStructure();
      if (!structure || !structure.edges) return;

      intersections
          .filter(ref => ref && ref.id && ref.type === 'intersection')
          .forEach(ref => {
              const edgeId = ref.edgeId || null;
              if (!edgeId) return;
              const point = this.resolver ? this.resolver.resolveSnapPoint(ref.id) : null;
              if (!point) return;
              const edgeIdx = this.cube.getEdgeMeshIndexById(edgeId);
              if (edgeIdx !== -1 && edgeIdx !== null) {
                  const isHidden = this.hiddenEdgeLabels && this.hiddenEdgeLabels.includes(edgeIdx);
                  if (!isHidden) {
                      this._addSplitLabel(edgeId, point);
                  }
              }
          });
  }

  addPoint(selectionInfo: { point?: THREE.Vector3; object?: THREE.Object3D; isMidpoint?: boolean; snapId?: SnapPointID }) {
    const { point, object, isMidpoint, snapId } = selectionInfo; // isMidpoint情報を追加で受け取る
    
    if (!snapId) {
      console.warn('SnapPointID が指定されていません。');
      return;
    }
    let resolvedPoint = point || null;
    if (!resolvedPoint && this.resolver) {
        resolvedPoint = this.resolver.resolveSnapPoint(snapId);
    }
    if (!resolvedPoint) {
        console.warn('SnapPointID から座標を解決できません。');
        return;
    }

    const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
    let resolvedIsMidpoint = !!isMidpoint;
    let edgeRef: string | null = null;
    if (parsed && parsed.type === 'edge') {
        edgeRef = `E:${parsed.edgeIndex}`;
        if (parsed.ratio && isMidpoint === undefined) {
            resolvedIsMidpoint = parsed.ratio.numerator * 2 === parsed.ratio.denominator;
        }
    }

    this.selected.push({ snapId });
    if (object) this.selectedObjects.add(object.uuid);
    
    const li = this.selected.length - 1;
    const label = this.getLabel(li);

    // 中点の場合は緑、それ以外は赤のマーカーを作成
    const markerColor = resolvedIsMidpoint ? 0x00ff00 : 0xff0000;
    const m = createMarker(resolvedPoint, this.scene, markerColor);
    this.markers.push(m);

    // 選択点ラベル (I, J, K...)
    const sprite = createLabel(label, this.cube.size / 10);
    sprite.position.copy(resolvedPoint).add(new THREE.Vector3(0, 0.8, 0));
    this.scene.add(sprite);
    this.markers.push(sprite);

    // 頂点ラベルの表示状態を同期
    sprite.visible = true;

    // 選択が辺の場合、辺の長さを分割表示する
    if (edgeRef) {
        this._addSplitLabel(edgeRef, resolvedPoint);
    } else if (object && object.userData.type === 'edge') {
        this._addSplitLabel(object.userData.edgeId || object.userData.index, resolvedPoint);
    }
   
    this.ui.updateSelectionCount(this.selected.length);
  }

  addPointFromSnapId(snapId: SnapPointID, selectionInfo: Record<string, unknown> = {}) {
    if (!this.resolver) return;
    this.addPoint({ ...selectionInfo, snapId });
  }

  getSelectedPoint(index: number) {
    if (!this.resolver) return null;
    const target = this.selected[index];
    if (!target) return null;
    return this.resolver.resolveSnapPoint(target.snapId) || null;
  }

  getSelectedSnapIds() {
      return this.selected.map(s => s.snapId).filter((id): id is string => id !== null);
  }

  _addSplitLabel(edgeRef: string | number, proj: THREE.Vector3) {
      const edgeId = typeof edgeRef === 'string' ? edgeRef : null;
      const edgeIdx = edgeId ? this.cube.getEdgeMeshIndexById(edgeId) : edgeRef;
      // 既に処理済みの辺なら何もしない
      if (edgeIdx !== null && this.hiddenEdgeLabels && this.hiddenEdgeLabels.includes(edgeIdx)) {
          return;
      }

      // 元の辺のラベルを非表示にする
      if (edgeIdx !== null && this.cube.edgeLabels[edgeIdx]) {
          this.cube.setEdgeLabelVisible(edgeIdx, false);
      }
      
      if(!this.hiddenEdgeLabels) this.hiddenEdgeLabels = [];
      if (edgeIdx !== null) this.hiddenEdgeLabels.push(edgeIdx);

      // 分割された辺の長さを表示
      let start: THREE.Vector3 | null = null;
      let end: THREE.Vector3 | null = null;
      if (this.resolver && edgeId) {
          const resolved = this.resolver.resolveEdge(edgeId);
          if (resolved) {
              start = resolved.start;
              end = resolved.end;
          }
      }
      if (!start || !end) return;
      const d1 = start.distanceTo(proj);
      const d2 = end.distanceTo(proj);
      
      const l1 = d1.toFixed(1).replace(/\.0$/, '') + "cm";
      const l2 = d2.toFixed(1).replace(/\.0$/, '') + "cm";

      // 位置計算（中点）
      const center1 = new THREE.Vector3().addVectors(start, proj).multiplyScalar(0.5);
      const center2 = new THREE.Vector3().addVectors(proj, end).multiplyScalar(0.5);

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

  toggleVertexLabels(visible: boolean){
    this.markers.forEach(obj => {
      if(obj instanceof THREE.Sprite && !this.splitEdgeLabels.includes(obj)){
        obj.visible = visible;
      }
    });
  }

  setEdgeLabelMode(mode: string){
    this.currentEdgeLabelMode = mode;
    const visible = (mode === 'visible');
    this.splitEdgeLabels.forEach(s => s.visible = visible);
  }

  previewSplit(edgeRef: string | number, point: THREE.Vector3) {
    this.clearPreview(); // 既存のプレビューをクリア

    const edgeId = typeof edgeRef === 'string' ? edgeRef : null;
    const edgeIdx = edgeId ? this.cube.getEdgeMeshIndexById(edgeId) : edgeRef;
    if (edgeIdx === -1 || edgeIdx === null) return;

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
    let start: THREE.Vector3 | null = null;
    let end: THREE.Vector3 | null = null;
    if (this.resolver && edgeId) {
        const resolved = this.resolver.resolveEdge(edgeId);
        if (resolved) {
            start = resolved.start;
            end = resolved.end;
        }
    }
    if (!start || !end) return;
    const d1 = start.distanceTo(point);
    const d2 = end.distanceTo(point);
    const l1 = d1.toFixed(1).replace(/\.0$/, '') + "cm";
    const l2 = d2.toFixed(1).replace(/\.0$/, '') + "cm";

    const center1 = new THREE.Vector3().addVectors(start, point).multiplyScalar(0.5);
    const center2 = new THREE.Vector3().addVectors(point, end).multiplyScalar(0.5);

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

  isObjectSelected(object: THREE.Object3D) {
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
