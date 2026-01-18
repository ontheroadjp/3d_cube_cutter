import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import { createMarker } from './utils.js';
import { canonicalizeSnapPointId, normalizeSnapPointId, parseSnapPointId, stringifySnapPointId } from './geometry/snapPointId.js';
import type { CutResult, CutResultMeta, CutSegmentMeta, IntersectionPoint, Ratio, SnapPointID } from './types.js';

type IntersectionPointWithPosition = IntersectionPoint & { position: THREE.Vector3 };

export class Cutter {
  scene: THREE.Scene;
  resultMesh: THREE.Mesh | null;
  removedMesh: THREE.Mesh | null;
  cornerMarker: THREE.Mesh | null;
  originalCube: any;
  evaluator: Evaluator;
  isTransparent: boolean;
  vertexMarkers: THREE.Object3D[];
  cutInverted: boolean;
  lastSnapIds: SnapPointID[] | null;
  lastResolver: any;
  lastCube: any;
  intersections: THREE.Vector3[];
  intersectionRefs: IntersectionPoint[];
  outlineRefs: IntersectionPoint[];
  cutSegments: Array<{ startId: SnapPointID; endId: SnapPointID; start: THREE.Vector3; end: THREE.Vector3; faceIds?: string[] }>;
  edgeHighlights: THREE.Object3D[];
  cutPlane: THREE.Plane | null;
  outline: THREE.Line | null;
  debug: boolean;
  visible: boolean;

  constructor(scene: THREE.Scene) {
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
    this.lastSnapIds = null;
    this.lastResolver = null;
    this.lastCube = null;
    this.intersections = []; // 交点を保持
    this.intersectionRefs = []; // 交点の構造情報
    this.outlineRefs = []; // 断面ポリゴンの構造情報（順序付き）
    this.cutSegments = []; // 展開図用の切断線セグメント
    this.edgeHighlights = []; // 教育用の重要辺ハイライト
    this.cutPlane = null; // 切断面の平面情報
    this.outline = null;
    this.debug = false;
    this.visible = true;
  }

  setDebug(debug: boolean) {
    this.debug = !!debug;
  }

  getCutPlaneNormal() {
    return this.cutPlane ? this.cutPlane.normal : null;
  }

  setTransparency(transparent: boolean) {
      this.isTransparent = transparent;
      const updateMat = (mesh: THREE.Mesh | null) => {
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

  isCutInverted() {
      return this.cutInverted;
  }

  setCutInverted(inverted: boolean, rerun = true) {
      const next = !!inverted;
      if (this.cutInverted === next) return;
      this.cutInverted = next;
      if (!rerun) return;
      if (this.lastCube && this.lastSnapIds && this.lastResolver) {
          this.cut(this.lastCube, this.lastSnapIds, this.lastResolver);
      }
  }
  
  flipCut() {
      this.cutInverted = !this.cutInverted;
      if (this.lastCube && this.lastSnapIds && this.lastResolver) {
          this.cut(this.lastCube, this.lastSnapIds, this.lastResolver);
      }
  }

  cut(
      cube: any,
      snapIds: SnapPointID[],
      resolver: any = null,
      options: { previewOnly?: boolean; suppressOutline?: boolean; suppressMarkers?: boolean } = {}
  ) {
    this.reset();
    this.originalCube = cube;
    this.lastCube = cube;
    this.lastSnapIds = null;
    this.lastResolver = resolver || null;
    const previewOnly = !!options.previewOnly;
    const suppressOutline = !!options.suppressOutline;
    const suppressMarkers = !!options.suppressMarkers;

    if (!snapIds || snapIds.length < 3) return false;
    if (!resolver) return false;
    if (typeof snapIds[0] !== 'string') return false;

    const resolvedPoints = snapIds
        .map(id => resolver.resolveSnapPoint(id))
        .filter((p: THREE.Vector3 | null) => p);
    if (resolvedPoints.length < 3) return false;
    const points = resolvedPoints;
    this.lastSnapIds = snapIds.slice();

    if (points.length < 3) return false;

    // 1. 平面の定義（同一直線上にない3点を探す）
    const plane = new THREE.Plane();
    this.cutPlane = plane; // クラスプロパティに保存
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
    if (!resolver) return false;
    const structure = cube.getStructure ? cube.getStructure() : null;
    if (!structure || !structure.vertices || !structure.edges) return false;
    const vertices = structure.vertices.map((v: { id: string }) => resolver.resolveVertex(v.id)).filter(Boolean);
    if (vertices.length !== structure.vertices.length) return false;
    
    vertices.forEach((v: THREE.Vector3) => {
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

    if (!previewOnly) {
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
        if (!suppressMarkers) {
            targetVertices.forEach(v => {
                const m = createMarker(v, this.scene);
                this.vertexMarkers.push(m);
            });
        }

        // 3. 切断用ブラシ（巨大Box）を作成
        const size = cube.size * 5; // 十分大きく
        const geom = new THREE.BoxGeometry(size, size, size);

        // Boxの中心を、平面から法線方向に size/2 だけずらした位置に置く
        /** @type {any} */
        const cutBrush = new (Brush as any)(geom) as any;

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
        /** @type {any} */
        const cubeBrush = new (Brush as any)(cube.cubeMesh.geometry.clone()) as any;
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
        this.resultMesh = /** @type {any} */ (this.evaluator.evaluate(cubeBrush, cutBrush, SUBTRACTION));
        this.resultMesh.material = [cubeMat, cutMat];
        this.scene.add(this.resultMesh);

        // A & B (直方体 & 半空間) = 切り取られた部分
        this.removedMesh = /** @type {any} */ (this.evaluator.evaluate(cubeBrush, cutBrush, INTERSECTION));
        this.removedMesh.material = [cubeMat, cutMat];
        this.scene.add(this.removedMesh);
    }

    // 5. 輪郭線の描画
    // ユーザーが選択した点 (points) を最優先で交点リストに含める
    /** @type {THREE.Vector3[]} */
    const intersections = points.slice(); // points のコピーで初期化
    /** @type {IntersectionPoint[]} */
    const intersectionRefs = [];
    if (this.lastSnapIds && this.lastSnapIds.length && this.lastResolver) {
        this.lastSnapIds.forEach(snapId => {
            const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
            if (!parsed) return;
            const normalizedId = stringifySnapPointId(parsed);
            if (!normalizedId) return;
            intersectionRefs.push({
                id: canonicalizeSnapPointId(normalizedId) || normalizedId,
                type: 'snap',
                position: this.lastResolver.resolveSnapPoint(normalizedId)
            });
        });
    }
    if (this.debug) {
        console.log("--- DEBUG: Initial intersections (from points) ---");
        intersections.forEach((p, i) => console.log(`  [${i}] Point: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`));
    }

    const edgeLines = structure.edges.map(edge => {
        const resolved = resolver.resolveEdge(edge.id);
        return resolved ? new THREE.Line3(resolved.start, resolved.end) : null;
    }).filter(Boolean);
    if (edgeLines.length !== structure.edges.length) return false;

    const edgeEntries = structure.edges.map((edge, index) => ({ edgeId: edge.id, line: edgeLines[index] })).filter(e => e.line);
    edgeEntries.forEach(({ edgeId, line }, lineIndex) => {
        const target = new THREE.Vector3();
        const lineStart = line.start;
        const lineEnd = line.end;
        // edgeNameの取得はcube.idxにアクセスしないと難しいため、デバッグ目的ではlineIndexと座標で識別
        // const edgeV1Name = cube.vertexLabels[cube.idx[lineIndex][0]]; // エラー原因
        // const edgeV2Name = cube.vertexLabels[cube.idx[lineIndex][1]]; // エラー原因
        // const edgeName = `${edgeV1Name}${edgeV2Name}`;

        const doesIntersect = plane.intersectLine(line, target);
        if (this.debug) {
            console.log(`--- Checking Edge (Line ${lineIndex}) ---`);
            console.log(`  Start: (${lineStart.x.toFixed(2)}, ${lineStart.y.toFixed(2)}, ${lineStart.z.toFixed(2)})`);
            console.log(`  End:   (${lineEnd.x.toFixed(2)}, ${lineEnd.y.toFixed(2)}, ${lineEnd.z.toFixed(2)})`);
            console.log(`  Does intersect plane: ${doesIntersect}`);
        }

        if (doesIntersect) {
            if (this.debug) {
                console.log(`  Plane intersection point (target): (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
            }
            // 交点が線分の範囲内にあるか厳密にチェック（THREE.Plane.intersectLineは線分を考慮するはずだが念のため）
            // targetがstartとendの間にあるかを確認
            // 距離ベースのチェックの方が安定する可能性もある
            const distToStart = target.distanceTo(lineStart);
            const distToEnd = target.distanceTo(lineEnd);
            const edgeLength = line.distance(); // THREE.Line3の長さ

            // 交点が線分上にあると判断するための閾値
            const segmentThreshold = 1e-3; 
                        const isWithinSegment = Math.abs((distToStart + distToEnd) - edgeLength) < segmentThreshold;

            if (this.debug) {
                console.log(`  Distance to Start: ${distToStart.toExponential(2)}, Distance to End: ${distToEnd.toExponential(2)}, Edge Length: ${edgeLength.toExponential(2)}`);
                console.log(`  Is within segment (distance check): ${isWithinSegment}`);
            }

            if (isWithinSegment) {
                if (!intersections.some(v => v.distanceTo(target) < 1e-2)) {
                    intersections.push(target.clone());
                    if (this.debug) {
                        console.log(`  Added new intersection point to list: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
                    }
                    const ratioRaw = lineStart.distanceTo(target) / lineStart.distanceTo(lineEnd);
                    const denominator = 1000;
                    const numerator = Math.max(0, Math.min(denominator, Math.round(ratioRaw * denominator)));
                    const parsed = normalizeSnapPointId({
                        type: 'edge',
                        edgeIndex: edgeId.slice(2),
                        ratio: { numerator, denominator }
                    });
                    const snapId = parsed ? stringifySnapPointId(parsed) : null;
                    if (snapId) {
                        const id = canonicalizeSnapPointId(snapId) || snapId;
                        if (!intersectionRefs.some(ref => ref.id === id)) {
                            const parsedEdge = parsed && parsed.type === 'edge' ? parsed : null;
                            intersectionRefs.push({
                                id,
                                type: 'intersection',
                                edgeId,
                                ratio: parsedEdge ? parsedEdge.ratio : undefined,
                                position: target.clone()
                            });
                        }
                    }
                }
                else if (this.debug) {
                    console.log(`  Skipped edge intersection (duplicate with existing intersection): (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
                }
            }
            else if (this.debug) {
                console.log(`  Intersection point is outside edge segment, skipping.`);
            }
        }
    });
    this.intersections = intersections; // 交点をクラスプロパティに保存
    const resolveFaceIdsForRef = (ref) => {
        if (!ref || !structure) return null;
        if (ref.edgeId && structure.edgeMap) {
            const edge = structure.edgeMap.get(ref.edgeId);
            return edge ? edge.faces : null;
        }
        if (!ref.id) return null;
        const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
        if (!parsed) return null;
        if (parsed.type === 'vertex' && structure.vertexMap) {
            const vertex = structure.vertexMap.get(`V:${parsed.vertexIndex}`);
            return vertex ? vertex.faces : null;
        }
        if (parsed.type === 'edge' && structure.edgeMap) {
            const edge = structure.edgeMap.get(`E:${parsed.edgeIndex}`);
            return edge ? edge.faces : null;
        }
        if (parsed.type === 'face') {
            return [`F:${parsed.faceIndex}`];
        }
        return null;
    };
    intersectionRefs.forEach(ref => {
        if (ref.faceIds && ref.faceIds.length) return;
        const faceIds = resolveFaceIdsForRef(ref);
        if (faceIds && faceIds.length) {
            ref.faceIds = Array.from(new Set(faceIds));
        }
    });
    this.intersectionRefs = intersectionRefs;

    this.edgeHighlights.forEach(edge => {
        this.scene.remove(edge);
    });
    this.edgeHighlights = [];
    if (resolver && structure) {
        const edgeIds = new Map();
        intersectionRefs.forEach(ref => {
            let edgeIdFromRef = ref.edgeId || null;
            if (!ref.id) return;
            const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
            if (!parsed) return;
            const isNearMidpoint = (ratio) => {
                if (!ratio || !ratio.denominator) return false;
                return Math.abs(ratio.numerator * 2 - ratio.denominator) <= 1;
            };

            if (parsed.type === 'edge') {
                edgeIdFromRef = `E:${parsed.edgeIndex}`;
                if (!edgeIds.has(edgeIdFromRef)) edgeIds.set(edgeIdFromRef, { hasMidpoint: false });
                if (isNearMidpoint(parsed.ratio)) {
                    edgeIds.get(edgeIdFromRef).hasMidpoint = true;
                }
                return;
            }
            if (parsed.type === 'vertex' && structure.vertexMap) {
                const vertex = structure.vertexMap.get(`V:${parsed.vertexIndex}`);
                if (vertex && vertex.edges) {
                    vertex.edges.forEach(edgeId => {
                        if (!edgeIds.has(edgeId)) edgeIds.set(edgeId, { hasMidpoint: false });
                    });
                }
                return;
            }
            if (edgeIdFromRef) {
                if (!edgeIds.has(edgeIdFromRef)) edgeIds.set(edgeIdFromRef, { hasMidpoint: false });
                if (ref.ratio && isNearMidpoint(ref.ratio)) {
                    edgeIds.get(edgeIdFromRef).hasMidpoint = true;
                }
            }
        });
        edgeIds.forEach((meta, edgeId) => {
            const resolved = resolver.resolveEdge(edgeId);
            if (!resolved) return;
            const geometry = new THREE.BufferGeometry().setFromPoints([resolved.start, resolved.end]);
            const color = meta && meta.hasMidpoint ? 0x00cc66 : 0xff8800;
            const material = new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(geometry, material);
            line.userData = { type: 'education-edge', edgeId };
            this.scene.add(line);
            this.edgeHighlights.push(line);
        });
    }
    if (this.debug) {
        console.log("--- DEBUG: Final intersections (after edge intersections) ---");
        this.intersections.forEach((p, i) => console.log(`  [${i}] Point: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`));
    }

    if(intersections.length >= 3){
        let outlinePoints = intersections.slice();
        this.cutSegments = [];
        this.outlineRefs = [];
        const uniqueRefs = new Map<SnapPointID, IntersectionPointWithPosition>();
        intersectionRefs.forEach(ref => {
            if (!ref || !ref.id || !ref.position) return;
            if (!(ref.position instanceof THREE.Vector3)) return;
            if (!uniqueRefs.has(ref.id)) uniqueRefs.set(ref.id, ref as IntersectionPointWithPosition);
        });
        const refs = Array.from(uniqueRefs.values());
        const refById = new Map(refs.map(ref => [ref.id, ref]));

        const buildSegmentsFromFaces = () => {
            const faceBuckets = new Map<string, IntersectionPointWithPosition[]>();
            refs.forEach(ref => {
                if (!ref.faceIds || !ref.faceIds.length) return;
                ref.faceIds.forEach(faceId => {
                    if (!faceBuckets.has(faceId)) faceBuckets.set(faceId, []);
                    faceBuckets.get(faceId)?.push(ref);
                });
            });
            /** @type {Array<{ startId: SnapPointID, endId: SnapPointID, start: THREE.Vector3, end: THREE.Vector3, faceIds: string[] }>} */
            const segments = [];
            faceBuckets.forEach((faceRefs, faceId) => {
                const unique = Array.from(new Map(faceRefs.map(r => [r.id, r])).values());
                if (unique.length < 2) return;
                let start = unique[0];
                let end = unique[1];
                if (unique.length > 2) {
                    let maxDist = -Infinity;
                    for (let i = 0; i < unique.length; i++) {
                        for (let j = i + 1; j < unique.length; j++) {
                            const posA = unique[i].position;
                            const posB = unique[j].position;
                            if (!(posA instanceof THREE.Vector3) || !(posB instanceof THREE.Vector3)) continue;
                            const dist = posA.distanceTo(posB);
                            if (dist > maxDist) {
                                maxDist = dist;
                                start = unique[i];
                                end = unique[j];
                            }
                        }
                    }
                }
                if (!(start.position instanceof THREE.Vector3) || !(end.position instanceof THREE.Vector3)) return;
                segments.push({
                    startId: start.id,
                    endId: end.id,
                    start: start.position.clone(),
                    end: end.position.clone(),
                    faceIds: [faceId],
                });
            });
            return segments;
        };

        /**
         * @param {Array<{ startId: SnapPointID, endId: SnapPointID }>} segments
         */
        const buildOrderedIdsFromSegments = (segments) => {
            if (!segments.length) return null;
            const adjacency = new Map();
            segments.forEach(seg => {
                if (!adjacency.has(seg.startId)) adjacency.set(seg.startId, new Set());
                if (!adjacency.has(seg.endId)) adjacency.set(seg.endId, new Set());
                adjacency.get(seg.startId).add(seg.endId);
                adjacency.get(seg.endId).add(seg.startId);
            });
            const nodes = Array.from(adjacency.keys());
            if (nodes.length < 3) return null;
            const start = nodes[0];
            const ordered = [start];
            let prev = null;
            let current = start;
            const maxSteps = segments.length + 2;
            for (let step = 0; step < maxSteps; step++) {
                const neighbors = Array.from(adjacency.get(current) || []);
                if (!neighbors.length) break;
                let next = neighbors[0];
                if (neighbors.length > 1 && next === prev) {
                    next = neighbors[1];
                }
                if (!next) break;
                if (next === start) return ordered;
                ordered.push(next);
                prev = current;
                current = next;
            }
            return null;
        };

        let orderedRefs = refs.slice();
        const faceSegments = buildSegmentsFromFaces();
        const orderedIds = buildOrderedIdsFromSegments(faceSegments);
        if (orderedIds && orderedIds.length >= 3) {
            orderedRefs = orderedIds.map(id => refById.get(id)).filter(Boolean);
        } else if (orderedRefs.length >= 3) {
            const center = new THREE.Vector3();
            orderedRefs.forEach(ref => center.add(ref.position));
            center.divideScalar(orderedRefs.length);
            const planeNormal = plane.normal;
            const base = new THREE.Vector3().subVectors(orderedRefs[0].position, center).normalize();
            const up = new THREE.Vector3().crossVectors(planeNormal, base).normalize();
            orderedRefs.sort((a, b) => {
                const va = new THREE.Vector3().subVectors(a.position, center);
                const vb = new THREE.Vector3().subVectors(b.position, center);
                return Math.atan2(va.dot(up), va.dot(base)) - Math.atan2(vb.dot(up), vb.dot(base));
            });
        }

        if (orderedRefs.length >= 3) {
            const segmentFaceIndex = new Map();
            faceSegments.forEach(seg => {
                const key = [seg.startId, seg.endId].sort().join('|');
                if (!segmentFaceIndex.has(key)) segmentFaceIndex.set(key, []);
                segmentFaceIndex.get(key).push(...(seg.faceIds || []));
            });
            outlinePoints = orderedRefs.map(ref => ref.position);
            this.outlineRefs = orderedRefs.slice();
            this.cutSegments = orderedRefs.map((ref, i) => {
                const next = orderedRefs[(i + 1) % orderedRefs.length];
                let sharedFaces = [];
                const key = [ref.id, next.id].sort().join('|');
                if (segmentFaceIndex.has(key)) {
                    sharedFaces = Array.from(new Set(segmentFaceIndex.get(key)));
                } else if (ref.faceIds && next.faceIds) {
                    sharedFaces = ref.faceIds.filter(faceId => next.faceIds.includes(faceId));
                }
                return {
                    startId: ref.id,
                    endId: next.id,
                    start: ref.position.clone(),
                    end: next.position.clone(),
                    faceIds: sharedFaces
                };
            });
        }

        const linePoints = [...outlinePoints, outlinePoints[0]];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        if (!suppressOutline) {
            this.outline = new THREE.Line(
                lineGeo,
                new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
            );
            this.scene.add(this.outline);
        }

        // 切断面の頂点（交点）にマーカーを表示（構造情報に依存）
        const selectionIds = new Set(
            (this.intersectionRefs || [])
                .filter(ref => ref.type === 'snap' && ref.id)
                .map(ref => ref.id)
        );
        const created = new Set();
        if (this.debug) {
            console.log("--- DEBUG: Yellow marker generation loop ---");
        }
        if (!suppressMarkers) {
            (this.intersectionRefs || [])
                .filter(ref => ref.type === 'intersection' && ref.id)
                .forEach(ref => {
                    if (selectionIds.has(ref.id)) return;
                    if (created.has(ref.id)) return;
                    const position = ref.position as THREE.Vector3 | undefined;
                    const point = position instanceof THREE.Vector3
                        ? position.clone()
                        : (resolver ? resolver.resolveSnapPoint(ref.id) : null);
                    if (!point) return;
                    if (this.debug) {
                        console.log(`  Creating yellow marker for intersection point (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
                    }
                    const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
                    const ratio = parsed && parsed.type === 'edge' ? parsed.ratio : null;
                    const isMidpoint = ratio ? ratio.numerator * 2 === ratio.denominator : false;
                    const markerColor = isMidpoint ? 0x00ff00 : 0xffff00;
                    const m = createMarker(point, this.scene, markerColor, isMidpoint);
                    this.vertexMarkers.push(m);
                    created.add(ref.id);
                });
        }
    }

    if (!previewOnly) {
        // 元のCubeを非表示
        cube.cubeMesh.visible = false;
    }
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

  /** @returns {THREE.Vector3[]} */
  getIntersections() {
      return this.intersections;
  }

  /** @returns {IntersectionPoint[]} */
  getIntersectionRefs() {
      return this.intersectionRefs;
  }

  /** @returns {IntersectionPoint[]} */
  getOutlineRefs() {
      return this.outlineRefs;
  }

  /** @returns {Array<{ startId: SnapPointID, endId: SnapPointID, start: THREE.Vector3, end: THREE.Vector3, faceIds?: string[] }>} */
  getCutSegments() {
      return this.cutSegments;
  }

  /**
   * @param {CutResultMeta} meta
   * @param {object} resolver
   */
  applyCutResultMeta(meta, resolver) {
      if (!meta || !resolver) return false;
      /** @type {IntersectionPoint[]} */
      const intersectionRefs = Array.isArray(meta.intersections)
          ? meta.intersections.map(ref => {
              if (!ref || !ref.id) return null;
              let position = resolver.resolveSnapPoint(ref.id);
              if (!position && ref.edgeId && ref.ratio) {
                  const edge = resolver.resolveEdge(ref.edgeId);
                  if (edge) {
                      const t = ref.ratio.numerator / ref.ratio.denominator;
                      position = new THREE.Vector3().lerpVectors(edge.start, edge.end, t);
                  }
              }
              if (!position) return null;
              return {
                  id: ref.id,
                  type: /** @type {'snap' | 'intersection'} */ (ref.type || 'intersection'),
                  edgeId: ref.edgeId,
                  ratio: ref.ratio ? { ...ref.ratio } : undefined,
                  faceIds: Array.isArray(ref.faceIds) ? [...ref.faceIds] : undefined,
                  position
              };
          }).filter(Boolean)
          : [];
      const byId = new Map(intersectionRefs.map(ref => [ref.id, ref]));
      /** @type {IntersectionPoint[]} */
      const outlineRefs = Array.isArray(meta.outline)
          ? meta.outline.map(id => {
              if (!id) return null;
              if (byId.has(id)) return byId.get(id);
              const position = resolver.resolveSnapPoint(id);
              if (!position) return null;
              return /** @type {IntersectionPoint} */ ({ id, type: 'intersection', position });
          }).filter(Boolean)
          : [];
      /** @type {Array<{ startId: SnapPointID, endId: SnapPointID, start: THREE.Vector3, end: THREE.Vector3, faceIds?: string[] }>} */
      const cutSegments = Array.isArray(meta.cutSegments)
          ? meta.cutSegments.map(seg => {
              if (!seg || !seg.startId || !seg.endId) return null;
              const start = resolver.resolveSnapPoint(seg.startId);
              const end = resolver.resolveSnapPoint(seg.endId);
              if (!start || !end) return null;
              return {
                  startId: seg.startId,
                  endId: seg.endId,
                  start,
                  end,
                  faceIds: Array.isArray(seg.faceIds) ? [...seg.faceIds] : undefined
              };
          }).filter(Boolean)
          : [];

      this.intersectionRefs = intersectionRefs;
      this.outlineRefs = outlineRefs;
      this.cutSegments = cutSegments;
      this.intersections = intersectionRefs.map(ref => ref.position);

      if (this.outline && this.outline.geometry && outlineRefs.length >= 3) {
          const points = outlineRefs.map(ref => ref.position);
          const linePoints = [...points, points[0]];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
          this.outline.geometry.dispose();
          this.outline.geometry = lineGeo;
      }
      return true;
  }

  /** @returns {CutResult} */
  getCutResult() {
      return {
          outline: { points: this.outlineRefs.slice() },
          intersections: this.intersectionRefs.slice(),
          cutSegments: this.cutSegments.slice(),
      };
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

  setVisible(visible: boolean) {
    this.visible = !!visible;
    if (this.resultMesh) this.resultMesh.visible = visible;
    if (this.removedMesh) this.removedMesh.visible = visible;
    if (this.cornerMarker) this.cornerMarker.visible = visible;
    if (this.outline) this.outline.visible = visible;
    this.vertexMarkers.forEach(marker => { marker.visible = visible; });
    this.edgeHighlights.forEach(edge => { edge.visible = visible; });
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
    if (this.edgeHighlights) {
        this.edgeHighlights.forEach(edge => {
            this.scene.remove(edge);
            if (edge.geometry) edge.geometry.dispose();
            if (edge.material) edge.material.dispose();
        });
        this.edgeHighlights = [];
    }
    
    // 元のCubeを表示に戻す
    if (this.originalCube && this.originalCube.cubeMesh) {
        this.originalCube.cubeMesh.visible = true;
    }
    this.originalCube = null;
    this.lastCube = null;
    this.lastResolver = null;
    this.lastSnapIds = null;
    this.outlineRefs = [];
    this.cutSegments = [];
    this.cutPlane = null;
  }
  
  resetInversion() {
      this.cutInverted = false;
  }
}
