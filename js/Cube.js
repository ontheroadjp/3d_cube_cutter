import * as THREE from 'three';
import { createLabel } from './utils.js';

export class Cube {
  constructor(scene, size=10){
    this.scene = scene;
    this.size = size;
    this.vertices = [];
    this.vertexLabels = [];
    this.edges = [];
    this.cubeMesh = null;
    this.edgeLines = null;
    this.vertexSprites = [];
    this.edgeLabels = []; // 辺の長さラベル用
    this.vertexMeshes = []; // 頂点の当たり判定用メッシュ
    this.edgeMeshes = []; // 辺の当たり判定用メッシュ
    this.createCube([size,size,size]);
  }

  createCube(edgeLengths){
    // 既存削除
    if(this.cubeMesh) this.scene.remove(this.cubeMesh);
    if(this.edgeLines) this.scene.remove(this.edgeLines);
    this.vertexSprites.forEach(s => this.scene.remove(s));
    this.vertexSprites = [];
    this.edgeLabels.forEach(s => this.scene.remove(s));
    this.edgeLabels = [];
    this.vertexMeshes.forEach(m => this.scene.remove(m));
    this.vertexMeshes = [];
    this.edgeMeshes.forEach(m => this.scene.remove(m));
    this.edgeMeshes = [];

    const [lx,ly,lz] = Array.isArray(edgeLengths)? edgeLengths : [edgeLengths,edgeLengths,edgeLengths];
    this.size = Math.max(lx,ly,lz);

    // 頂点
    this.vertices = [
      new THREE.Vector3(-lx/2,-ly/2,-lz/2),
      new THREE.Vector3( lx/2,-ly/2,-lz/2),
      new THREE.Vector3( lx/2, ly/2,-lz/2),
      new THREE.Vector3(-lx/2, ly/2,-lz/2),
      new THREE.Vector3(-lx/2,-ly/2, lz/2),
      new THREE.Vector3( lx/2,-ly/2, lz/2),
      new THREE.Vector3( lx/2, ly/2, lz/2),
      new THREE.Vector3(-lx/2, ly/2, lz/2)
    ];
    this.vertexLabels = ['A','B','C','D','E','F','G','H'];

    // メッシュ
    const geo = new THREE.BoxGeometry(lx,ly,lz);
    this.cubeMesh = new THREE.Mesh(geo,new THREE.MeshPhongMaterial({
        color:0x66ccff,
        transparent:true,
        opacity:0.4,
        depthWrite: false, // 内部が見えるように深度書き込みを無効化
        side: THREE.DoubleSide
    }));
    this.scene.add(this.cubeMesh);

    // 辺ライン
    const edgeGeo = new THREE.EdgesGeometry(geo);
    this.edgeLines = new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x000000}));
    this.scene.add(this.edgeLines);

    // 頂点ラベル
    this.vertices.forEach((v,i)=>{
      const sprite = createLabel(this.vertexLabels[i], this.size/10);
      sprite.position.copy(v).add(new THREE.Vector3(0, 0.5, 0));
      this.scene.add(sprite);
      this.vertexSprites.push(sprite);
    });

    // 頂点の当たり判定用メッシュ
    const vertexMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0 });
    this.vertices.forEach((v, i) => {
        const vertexHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.3), vertexMaterial);
        vertexHitbox.position.copy(v);
        vertexHitbox.userData = { type: 'vertex', index: i, name: this.vertexLabels[i] };
        this.scene.add(vertexHitbox);
        this.vertexMeshes.push(vertexHitbox);
    });

    // 辺オブジェクト
    const idx = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];
    this.edges = idx.map(([i,j])=>new THREE.Line3(this.vertices[i],this.vertices[j]));

    // 辺の長さラベル
    this.edges.forEach(edge => {
      const center = new THREE.Vector3();
      edge.getCenter(center);
      const len = edge.distance().toFixed(0); // 整数表示
      const sprite = createLabel(`${len}cm`, this.size/15); // 少し小さめ
      sprite.position.copy(center);
      this.scene.add(sprite);
      this.edgeLabels.push(sprite);
    });

    // 辺の当たり判定用メッシュ
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 });
    this.edges.forEach((edge, i) => {
        const edgeVector = new THREE.Vector3().subVectors(edge.end, edge.start);
        const edgeLength = edgeVector.length();
        const edgeCenter = new THREE.Vector3().addVectors(edge.start, edge.end).multiplyScalar(0.5);

        const edgeHitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, edgeLength), edgeMaterial);
        edgeHitbox.position.copy(edgeCenter);
        
        // 辺の向きに合わせる
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), edgeVector.normalize());
        edgeHitbox.setRotationFromQuaternion(quat);
        
        const v1_name = this.vertexLabels[idx[i][0]];
        const v2_name = this.vertexLabels[idx[i][1]];
        edgeHitbox.userData = { type: 'edge', index: i, name: `${v1_name}${v2_name}` };

        this.scene.add(edgeHitbox);
        this.edgeMeshes.push(edgeHitbox);
    });
  }

  toggleVertexLabels(visible){
    this.vertexSprites.forEach(s => s.visible = visible);
  }

  setEdgeLabelMode(mode){
    // mode: 'visible', 'popup', 'hidden'
    // Cubeが持つ静的な辺ラベルの表示制御
    // popupモードの時は静的ラベルは非表示（マウスオーバーで別途表示するため）
    const visible = (mode === 'visible');
    this.edgeLabels.forEach(s => s.visible = visible);
  }

  // 特定の辺ラベルの表示/非表示を設定（SelectionManagerからの利用など）
  setEdgeLabelVisible(index, visible) {
      if (this.edgeLabels[index]) {
          this.edgeLabels[index].visible = visible;
      }
  }

  getClosestEdge(point, threshold = 0.5) {
    let best = null, min = threshold;
    let bestIdx = -1;
    this.edges.forEach((line, i) => {
        // SelectionManagerで隠されているラベルに対応する辺は対象外にする？
        // いや、隠されていてもポップアップは出てもいいはず。
        // ただし、分割されている場合は「元の長い辺」ではなく「分割された辺」が出るべきだが、
        // Cubeクラスは「元の辺」しか知らない。
        // 分割時の挙動はSelectionManager側で制御するか、あるいは
        // SelectionManagerが分割した辺の情報を管理し、ポップアップ判定もそちらに委譲するか。
        // ここでは単純に幾何的な距離だけで返す。
        const lineObj = new THREE.Line3(line.start, line.end);
        const closest = lineObj.closestPointToPoint(point, true, new THREE.Vector3());
        const d = closest.distanceTo(point);
        if (d < min) {
            min = d;
            best = line;
            bestIdx = i;
        }
    });
    return best ? { edge: best, index: bestIdx, distance: min } : null;
  }

  toggleTransparency(transparent) {
    if (this.cubeMesh) {
      this.cubeMesh.material.transparent = transparent;
      this.cubeMesh.material.opacity = transparent ? 0.4 : 1.0;
      this.cubeMesh.material.depthWrite = !transparent; // 半透明時は深度書き込みを無効（内部が見えるように）
      this.cubeMesh.material.needsUpdate = true;
    }
  }

  resize(camera){
    const aspect = innerWidth/innerHeight;
    const padding = 5;
    const newSize = this.size/2 + padding;
    camera.left = -newSize*aspect;
    camera.right = newSize*aspect;
    camera.top = newSize;
    camera.bottom = -newSize;
    camera.updateProjectionMatrix();
  }

  getVertexObjectByName(name) {
      return this.vertexMeshes.find(m => m.userData.name === name);
  }

  getEdgeObjectByName(name) {
      // "AB" と "BA" を同一視する
      return this.edgeMeshes.find(m => m.userData.name === name || m.userData.name === `${name[1]}${name[0]}`);
  }
}
