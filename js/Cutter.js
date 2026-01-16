import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import { createMarker } from './utils.js';

export class Cutter {
  constructor(scene) {
    this.scene = scene;
    this.resultMesh = null; // 切断後の直方体
    this.removedMesh = null; // 切り取られた部分（三角錐など）
    this.cornerMarker = null; // 切り取られる角の頂点マーカー
    this.originalCube = null; // 参照用
    
    // CSG Evaluator
    this.evaluator = new Evaluator();
    this.evaluator.attributes = ['position', 'normal'];
    this.evaluator.useGroups = true; // マテリアルグループを使用
    this.isTransparent = true; // デフォルト半透明
    this.vertexMarkers = []; // 切り取られる頂点のマーカー
    this.cutInverted = false; // 切り取り反転フラグ
    this.lastPoints = null; // 再計算用に保持
    this.lastCube = null;
    this.intersections = []; // 交点を保持
  }

  setTransparency(transparent) {
      this.isTransparent = transparent;
      const updateMat = (mesh) => {
          if (!mesh) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
              if (mat.name !== 'cutFace') { // 断面以外
                  mat.transparent = transparent;
                  mat.opacity = transparent ? 0.4 : 1.0;
                  mat.depthWrite = !transparent;
                  mat.needsUpdate = true;
              }
          });
      };
      updateMat(this.resultMesh);
      updateMat(this.removedMesh);
  }
  
  flipCut() {
      this.cutInverted = !this.cutInverted;
      if (this.lastCube && this.lastPoints) {
          this.cut(this.lastCube, this.lastPoints);
      }
  }

  cut(cube, points) {
    this.reset();
    this.originalCube = cube;
    this.lastCube = cube;
    this.lastPoints = points;

    if (points.length < 3) return false;

    // 1. 平面の定義（同一直線上にない3点を探す）
    const plane = new THREE.Plane();
    let validPlane = false;
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            for (let k = j + 1; k < points.length; k++) {
                const p0 = points[i], p1 = points[j], p2 = points[k];
                try {
                    plane.setFromCoplanarPoints(p0, p1, p2);
                    // 3点が同一直線上にあると normal が (0,0,0) になる場合がある
                    if (plane.normal.lengthSq() > 0.0001) {
                        validPlane = true;
                        break;
                    }
                } catch (e) {
                    // setFromCoplanarPoints がエラーを投げる場合もある
                    continue;
                }
            }
            if (validPlane) break;
        }
        if (validPlane) break;
    }

    if (!validPlane) {
        console.warn("有効な切断面を定義できませんでした。選択したすべての点が同一直線上にある可能性があります。");
        return false;
    }

    // p0, p1, p2は古い参照なので、平面の基点として最初の点を使う
    const p0 = points[0];

    // 2. 切り取る側の判定
    // 直方体の8頂点が平面のどちら側にあるか数える
    let positiveCount = 0;
    let negativeCount = 0;
    const positiveVertices = [];
    const negativeVertices = [];
    const vertices = cube.vertices;
    
    vertices.forEach(v => {
        const dist = plane.distanceToPoint(v);
        if (dist > 1e-5) {
            positiveCount++;
            positiveVertices.push(v);
        }
        else if (dist < -1e-5) {
            negativeCount++;
            negativeVertices.push(v);
        }
    });

    // 「頂点数が少ない方」を切り取る側とする
    let normal = plane.normal.clone();
    let targetVertices = [];
    
    // 切り取るターゲット判定
    let cutNegative = false;
    
    if (positiveCount > negativeCount) {
        // 法線側(positive)が多い -> 法線の反対側(negative)を切り取りたい
        cutNegative = true;
    } else {
        // 法線側(positive)が少ない、または同じ -> 法線側を切り取る
        cutNegative = false;
    }
    
    // 反転フラグがあれば逆にする
    if (this.cutInverted) {
        cutNegative = !cutNegative;
    }
    
    if (cutNegative) {
        normal.negate();
        targetVertices = negativeVertices;
    } else {
        targetVertices = positiveVertices;
    }

    // 切り取られる頂点に赤丸を表示
    targetVertices.forEach(v => {
        const m = createMarker(v, this.scene);
        this.vertexMarkers.push(m);
    });
    
    // 3. 切断用ブラシ（巨大Box）を作成
    const size = cube.size * 5; // 十分大きく
    const geom = new THREE.BoxGeometry(size, size, size);
    
    // Boxの中心を、平面から法線方向に size/2 だけずらした位置に置く
    const cutBrush = new Brush(geom);
    
    // 位置: 平面上の一点 p0 から法線方向に size/2
    const centerOffset = normal.clone().multiplyScalar(size / 2);
    const brushPos = p0.clone().add(centerOffset);
    cutBrush.position.copy(brushPos);
    
    // 回転: BoxのY軸(0,1,0)をnormalに向ける
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, normal);
    cutBrush.setRotationFromQuaternion(quaternion);
    
    cutBrush.updateMatrixWorld();

    // 元のCubeのBrush作成
    const cubeBrush = new Brush(cube.cubeMesh.geometry.clone());
    cubeBrush.position.copy(cube.cubeMesh.position);
    cubeBrush.rotation.copy(cube.cubeMesh.rotation);
    cubeBrush.scale.copy(cube.cubeMesh.scale);
    cubeBrush.updateMatrixWorld();
    
    // マテリアルの設定
    const cubeMat = cube.cubeMesh.material.clone();
    cubeMat.side = THREE.DoubleSide; 
    cubeMat.transparent = this.isTransparent;
    cubeMat.opacity = this.isTransparent ? 0.4 : 1.0;
    cubeMat.depthWrite = !this.isTransparent;

    const cutMat = new THREE.MeshBasicMaterial({
        color: 0xffcccc,
        side: THREE.DoubleSide,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        name: 'cutFace'
    });

    cubeBrush.material = cubeMat;
    cutBrush.material = cutMat;

    // 4. 演算実行
    
    // A - B (直方体 - 半空間) = 切り取られた後の直方体
    this.resultMesh = this.evaluator.evaluate(cubeBrush, cutBrush, SUBTRACTION);
    this.resultMesh.material = [cubeMat, cutMat];
    this.scene.add(this.resultMesh);

    // A & B (直方体 & 半空間) = 切り取られた部分
    this.removedMesh = this.evaluator.evaluate(cubeBrush, cutBrush, INTERSECTION);
    this.removedMesh.material = [cubeMat, cutMat];
    this.scene.add(this.removedMesh);

    // 5. 輪郭線の描画
    const intersections = [];
    cube.edges.forEach(line => {
        const target = new THREE.Vector3();
        if (plane.intersectLine(line, target)) {
            if (!intersections.some(v => v.distanceTo(target) < 0.001)) {
                intersections.push(target.clone());
            }
        }
    });
    this.intersections = intersections; // 交点をクラスプロパティに保存
    
    if(intersections.length >= 3){
        const center = new THREE.Vector3();
        intersections.forEach(p => center.add(p));
        center.divideScalar(intersections.length);
        const planeNormal = plane.normal;
        const base = new THREE.Vector3().subVectors(intersections[0], center).normalize();
        const up = new THREE.Vector3().crossVectors(planeNormal, base).normalize();
        intersections.sort((a, b) => {
            const va = new THREE.Vector3().subVectors(a, center);
            const vb = new THREE.Vector3().subVectors(b, center);
            return Math.atan2(va.dot(up), va.dot(base)) - Math.atan2(vb.dot(up), vb.dot(base));
        });
        
        const linePoints = [...intersections, intersections[0]];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        this.outline = new THREE.Line(
            lineGeo, 
            new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
        );
        this.scene.add(this.outline);

        // 切断面の頂点（交点）にマーカーを表示
        // 既に選択点(points)としてマーカーがある場所には重複して表示しない
        intersections.forEach(p => {
            // 重複チェック
            let isDuplicate = false;
            for (let sp of points) {
                if (p.distanceTo(sp) < 0.1) {
                    isDuplicate = true;
                    break;
                }
            }
            if (isDuplicate) return;

            // 切断の結果できた交点は基本黄色
            let markerColor = 0xffff00;
            let isOutline = false;

            // pが任意の辺の中点に近いか判定
            for(let edge of cube.edges) {
                const center = new THREE.Vector3();
                edge.getCenter(center);
                if (p.distanceTo(center) < 0.1) {
                    markerColor = 0x00ff00; // 緑色
                    isOutline = true; // 塗りつぶしなし
                    break;
                }
            }

            const m = createMarker(p, this.scene, markerColor, isOutline);
            this.vertexMarkers.push(m);
        });
    }

    // 元のCubeを非表示
    cube.cubeMesh.visible = false;
    return true; // 成功したことを示す
  }
  
  toggleSurface(visible) {
    if (this.resultMesh && Array.isArray(this.resultMesh.material)) {
        const mat = this.resultMesh.material[1];
        if(mat) mat.visible = visible;
    }
    if (this.outline) {
        this.outline.visible = visible;
    }
  }

  getIntersections() {
      return this.intersections;
  }

  // 展開図描画用に切断線のリスト（Line3配列）を返す
  getCutLines() {
      if (!this.outline || !this.outline.geometry) return [];
      
      const points = [];
      const position = this.outline.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
          points.push(new THREE.Vector3().fromBufferAttribute(position, i));
      }
      
      // outlineは LINE_STRIP 形式（Lineコンストラクタで作った場合）
      // ただし points は [p0, p1, ..., pn, p0] のようにループしているはず（コード上の生成ロジック確認）
      // this.outline = new THREE.Line(..., setFromPoints(linePoints))
      // linePoints = [...intersections, intersections[0]]
      // なので、i と i+1 を結べばよい。
      
      const lines = [];
      for (let i = 0; i < points.length - 1; i++) {
          lines.push(new THREE.Line3(points[i], points[i+1]));
      }
      return lines;
  }

  togglePyramid(visible) {
    if (this.removedMesh) {
        this.removedMesh.visible = visible;
    }
  }

  reset() {
    if (this.resultMesh) {
        this.scene.remove(this.resultMesh);
        this.resultMesh.geometry.dispose();
        this.resultMesh = null;
    }
    if (this.removedMesh) {
        this.scene.remove(this.removedMesh);
        this.removedMesh.geometry.dispose();
        this.removedMesh = null;
    }
    if (this.outline) {
        this.scene.remove(this.outline);
        this.outline.geometry.dispose();
        this.outline.material.dispose();
        this.outline = null;
    }
    
    if (this.vertexMarkers) {
        this.vertexMarkers.forEach(m => {
            this.scene.remove(m);
            m.geometry.dispose();
        });
        this.vertexMarkers = [];
    }
    
    // 元のCubeを表示に戻す
    if (this.originalCube && this.originalCube.cubeMesh) {
        this.originalCube.cubeMesh.visible = true;
    }
    this.originalCube = null;
    this.lastCube = null;
    this.lastPoints = null;
  }
  
  resetInversion() {
      this.cutInverted = false;
  }
}