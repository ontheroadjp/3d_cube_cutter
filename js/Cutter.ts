import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import { createMarker } from './utils.js';
import { buildFaceAdjacency } from './cutter/cutFaceGraph.js';
import { canonicalizeSnapPointId, normalizeSnapPointId, parseSnapPointId, stringifySnapPointId } from './geometry/snapPointId.js';
import type { CutFacePolygon, CutResult, CutResultMeta, CutSegmentMeta, IntersectionPoint, Ratio, SnapPointID } from './types.js';
import type { ObjectCutAdjacency } from './model/objectModel.js';

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
  intersectionRefs: IntersectionPoint[];
  outlineRefs: IntersectionPoint[];
  cutSegments: CutSegmentMeta[];
  edgeHighlights: THREE.Object3D[];
  cutPlane: THREE.Plane | null;
  keepPositiveSide: boolean | null;
  outline: THREE.Line | null;
  cutOverlayGroup: THREE.Group | null;
  cutLineMaterial: THREE.LineBasicMaterial | null;
  showCutPoints: boolean;
  colorizeCutLines: boolean;
  cutLineDefaultColor: number;
  cutLineHighlightColor: number;
  edgeHighlightColorResolver: ((edgeId: string) => number) | null;
  debug: boolean;
  visible: boolean;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.resultMesh = null;
    this.removedMesh = null;
    this.cornerMarker = null;
    this.originalCube = null;
    
    this.evaluator = new Evaluator();
    this.evaluator.attributes = ['position', 'normal'];
    this.evaluator.useGroups = true;
    this.isTransparent = true;
    this.vertexMarkers = [];
    this.cutInverted = false;
    this.lastSnapIds = null;
    this.lastResolver = null;
    this.lastCube = null;
    this.intersectionRefs = [];
    this.outlineRefs = [];
    this.cutSegments = [];
    this.edgeHighlights = [];
    this.cutPlane = null;
    this.keepPositiveSide = null;
    this.outline = null;
    this.cutOverlayGroup = null;
    this.cutLineMaterial = null;
    this.showCutPoints = true;
    this.colorizeCutLines = false;
    this.cutLineDefaultColor = 0x444444;
    this.cutLineHighlightColor = 0xff0000;
    this.edgeHighlightColorResolver = null;
    this.debug = false;
    this.visible = true;
  }

  setDebug(debug: boolean) {
    this.debug = !!debug;
  }

  resolveIntersectionPosition(ref: IntersectionPoint, resolverOverride: any = null) {
    if (!ref) return null;
    const resolver = resolverOverride || this.lastResolver;
    if (!resolver || !ref.id) return null;
    return resolver.resolveSnapPoint(ref.id) || null;
  }

  ensureCutOverlayGroup() {
    if (this.cutOverlayGroup) return;
    this.cutOverlayGroup = new THREE.Group();
    this.scene.add(this.cutOverlayGroup);
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
              if (mat.name !== 'cutFace') {
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

    const plane = new THREE.Plane();
    this.cutPlane = plane;
    let validPlane = false;
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            for (let k = j + 1; k < points.length; k++) {
                const p0 = points[i], p1 = points[j], p2 = points[k];
                try {
                    plane.setFromCoplanarPoints(p0, p1, p2);
                    if (plane.normal.lengthSq() > 0.0001) {
                        validPlane = true;
                        break;
                    }
                } catch (e) {
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

    const p0 = points[0];

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
        let normal = plane.normal.clone();
        let targetVertices = [];

        let cutNegative = false;

        if (positiveCount > negativeCount) {
            cutNegative = true;
        } else {
            cutNegative = false;
        }

        if (this.cutInverted) {
            cutNegative = !cutNegative;
        }
        this.keepPositiveSide = cutNegative;

        if (cutNegative) {
            normal.negate();
            targetVertices = negativeVertices;
        } else {
            targetVertices = positiveVertices;
        }

        if (!suppressMarkers && this.debug) {
            targetVertices.forEach(v => {
                this.ensureCutOverlayGroup();
                const m = createMarker(v, this.scene, 0xff0000, false, this.cutOverlayGroup);
                this.vertexMarkers.push(m);
            });
        }

        const size = cube.size * 5;
        const geom = new THREE.BoxGeometry(size, size, size);

        /** @type {any} */
        const cutBrush = new (Brush as any)(geom) as any;

        const centerOffset = normal.clone().multiplyScalar(size / 2);
        const brushPos = p0.clone().add(centerOffset);
        cutBrush.position.copy(brushPos);

        const defaultUp = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, normal);
        cutBrush.setRotationFromQuaternion(quaternion);

        cutBrush.updateMatrixWorld();

        /** @type {any} */
        const cubeBrush = new (Brush as any)(cube.cubeMesh.geometry.clone()) as any;
        cubeBrush.position.copy(cube.cubeMesh.position);
        cubeBrush.rotation.copy(cube.cubeMesh.rotation);
        cubeBrush.scale.copy(cube.cubeMesh.scale);
        cubeBrush.updateMatrixWorld();

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

        this.resultMesh = /** @type {any} */ (this.evaluator.evaluate(cubeBrush, cutBrush, SUBTRACTION));
        this.resultMesh.material = [cubeMat, cutMat];
        this.scene.add(this.resultMesh);

        this.removedMesh = /** @type {any} */ (this.evaluator.evaluate(cubeBrush, cutBrush, INTERSECTION));
        this.removedMesh.material = [cubeMat, cutMat];
        this.scene.add(this.removedMesh);
    }

    /** @type {THREE.Vector3[]} */
    const intersections = points.slice();
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
                type: 'snap'
            });
        });
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

        const doesIntersect = plane.intersectLine(line, target);

        if (doesIntersect) {
            const distToStart = target.distanceTo(lineStart);
            const distToEnd = target.distanceTo(lineEnd);
            const edgeLength = line.distance();
            const segmentThreshold = 1e-3; 
            const isWithinSegment = Math.abs((distToStart + distToEnd) - edgeLength) < segmentThreshold;

            if (isWithinSegment) {
                if (!intersections.some(v => v.distanceTo(target) < 1e-2)) {
                    intersections.push(target.clone());
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
                                ratio: parsedEdge ? parsedEdge.ratio : undefined
                            });
                        }
                    }
                }
            }
        }
    });

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
            const material = new THREE.LineBasicMaterial({ color: this.cutLineDefaultColor });
            const line = new THREE.Line(geometry, material);
            line.userData = { type: 'education-edge', edgeId, hasMidpoint: !!(meta && meta.hasMidpoint) };
            line.visible = this.visible;
            this.scene.add(line);
            this.edgeHighlights.push(line);
        });
    }

    if(intersections.length >= 3){
        let outlinePoints = intersections.slice();
        this.cutSegments = [];
        this.outlineRefs = [];
        const uniqueRefs = new Map<SnapPointID, IntersectionPoint>();
        intersectionRefs.forEach(ref => {
            if (!ref || !ref.id) return;
            if (!uniqueRefs.has(ref.id)) uniqueRefs.set(ref.id, ref);
        });
        const refs = Array.from(uniqueRefs.values());
        const refById = new Map(refs.map(ref => [ref.id, ref]));
        const refPositions = new Map(
            refs.map(ref => [ref.id, this.resolveIntersectionPosition(ref, resolver)])
        );

        const buildSegmentsFromFaces = () => {
            const faceBuckets = new Map<string, IntersectionPoint[]>();
            refs.forEach(ref => {
                if (!ref.faceIds || !ref.faceIds.length) return;
                ref.faceIds.forEach(faceId => {
                    if (!faceBuckets.has(faceId)) faceBuckets.set(faceId, []);
                    faceBuckets.get(faceId)?.push(ref);
                });
            });
            /** @type {CutSegmentMeta[]} */
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
                            const posA = refPositions.get(unique[i].id);
                            const posB = refPositions.get(unique[j].id);
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
                const startPos = refPositions.get(start.id);
                const endPos = refPositions.get(end.id);
                if (!(startPos instanceof THREE.Vector3) || !(endPos instanceof THREE.Vector3)) return;
                segments.push({
                    startId: start.id,
                    endId: end.id,
                    faceIds: [faceId],
                });
            });
            return segments;
        };

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
            orderedRefs.forEach(ref => {
                const position = refPositions.get(ref.id);
                if (position instanceof THREE.Vector3) center.add(position);
            });
            center.divideScalar(orderedRefs.length);
            const planeNormal = plane.normal;
            const basePosition = refPositions.get(orderedRefs[0].id);
            if (basePosition instanceof THREE.Vector3) {
                const base = new THREE.Vector3().subVectors(basePosition, center).normalize();
                const up = new THREE.Vector3().crossVectors(planeNormal, base).normalize();
                orderedRefs.sort((a, b) => {
                    const posA = refPositions.get(a.id);
                    const posB = refPositions.get(b.id);
                    if (!(posA instanceof THREE.Vector3) || !(posB instanceof THREE.Vector3)) return 0;
                    const va = new THREE.Vector3().subVectors(posA, center);
                    const vb = new THREE.Vector3().subVectors(posB, center);
                    return Math.atan2(va.dot(up), va.dot(base)) - Math.atan2(vb.dot(up), vb.dot(base));
                });
            }
        }

        if (orderedRefs.length >= 3) {
            const segmentFaceIndex = new Map();
            faceSegments.forEach(seg => {
                const key = [seg.startId, seg.endId].sort().join('|');
                if (!segmentFaceIndex.has(key)) segmentFaceIndex.set(key, []);
                segmentFaceIndex.get(key).push(...(seg.faceIds || []));
            });
            outlinePoints = orderedRefs
                .map(ref => refPositions.get(ref.id))
                .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
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
                    faceIds: sharedFaces
                };
            });
        }

        const linePoints = [...outlinePoints, outlinePoints[0]];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        if (!suppressOutline) {
            this.ensureCutOverlayGroup();
            this.cutLineMaterial = new THREE.LineBasicMaterial({
                color: this.colorizeCutLines ? this.cutLineHighlightColor : this.cutLineDefaultColor,
                linewidth: 2
            });
            this.outline = new THREE.Line(lineGeo, this.cutLineMaterial);
            this.cutOverlayGroup.add(this.outline);
        }

        const selectionIds = new Set(
            (this.intersectionRefs || [])
                .filter(ref => ref.type === 'snap' && ref.id)
                .map(ref => ref.id)
        );
        const created = new Set();
        if (!suppressMarkers) {
            (this.intersectionRefs || [])
                .filter(ref => ref.type === 'intersection' && ref.id)
                .forEach(ref => {
                    if (selectionIds.has(ref.id)) return;
                    if (created.has(ref.id)) return;
                    const position = this.resolveIntersectionPosition(ref, resolver);
                    const point = position instanceof THREE.Vector3 ? position.clone() : null;
                    if (!point) return;
                    const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
                    const ratio = parsed && parsed.type === 'edge' ? parsed.ratio : null;
                    const isMidpoint = ratio ? ratio.numerator * 2 === ratio.denominator : false;
                    const markerColor = isMidpoint ? 0x00ff00 : 0xffff00;
                    this.ensureCutOverlayGroup();
                    const m = createMarker(point, this.scene, markerColor, isMidpoint, this.cutOverlayGroup);
                    this.vertexMarkers.push(m);
                    created.add(ref.id);
                });
        }
    }

    if (!previewOnly) {
        cube.cubeMesh.visible = false;
    }
    return true; 
  }
  
  toggleSurface(visible) {
    if (this.resultMesh && Array.isArray(this.resultMesh.material)) {
        const mat = this.resultMesh.material[1];
        if(mat) mat.visible = visible;
    }
  }

  getIntersectionRefs() {
      return this.intersectionRefs;
  }

  getOutlineRefs() {
      return this.outlineRefs;
  }

  getCutSegments() {
      return this.cutSegments.slice();
  }

  resolveCutSegments(resolverOverride: any = null) {
      const resolver = this.lastResolver;
      const activeResolver = resolverOverride || resolver;
      if (!activeResolver) return [];
      return this.cutSegments
          .map(seg => {
              const start = activeResolver.resolveSnapPoint(seg.startId);
              const end = activeResolver.resolveSnapPoint(seg.endId);
              if (!start || !end) return null;
              return {
                  startId: seg.startId,
                  endId: seg.endId,
                  start,
                  end,
                  faceIds: seg.faceIds
              };
          })
          .filter(Boolean);
  }

  getResultFacePolygons() {
      const resolver = this.lastResolver;
      const cube = this.lastCube;
      const plane = this.cutPlane;
      if (!resolver || !cube || !plane) return [];
      const structure = cube.getStructure ? cube.getStructure() : null;
      if (!structure || !Array.isArray(structure.faces)) return [];
      const cubeSize = typeof cube.getSize === 'function' ? cube.getSize() : null;
      const sizeScalar = (() => {
          if (typeof cubeSize === 'number') return cubeSize;
          if (cubeSize && typeof cubeSize === 'object') {
              const lx = typeof cubeSize.lx === 'number' ? cubeSize.lx : 1;
              const ly = typeof cubeSize.ly === 'number' ? cubeSize.ly : 1;
              const lz = typeof cubeSize.lz === 'number' ? cubeSize.lz : 1;
              return Math.max(lx, ly, lz);
          }
          if (typeof cube.size === 'number') return cube.size;
          return 1;
      })();
      const planeEpsilon = Math.max(1e-6, sizeScalar * 1e-5);
      const tEpsilon = 1e-6;
      const denominator = 1000;
      const keepPositive = this.keepPositiveSide !== null ? this.keepPositiveSide : true;
      const isInside = (dist: number) => keepPositive ? dist >= -planeEpsilon : dist <= planeEpsilon;
      const edgeIntersectionById = new Map<string, SnapPointID>();
      (this.intersectionRefs || []).forEach(ref => {
          if (!ref || !ref.id || !ref.edgeId) return;
          if (!edgeIntersectionById.has(ref.edgeId)) {
              edgeIntersectionById.set(ref.edgeId, ref.id);
          }
      });

      const buildEdgeSnapId = (edgeId: string, t: number, startId: SnapPointID, endId: SnapPointID) => {
          if (t <= tEpsilon) return startId;
          if (t >= 1 - tEpsilon) return endId;
          const known = edgeIntersectionById.get(edgeId);
          if (known) return known;
          const numerator = Math.max(0, Math.min(denominator, Math.round(t * denominator)));
          const parsed = normalizeSnapPointId({
              type: 'edge',
              edgeIndex: edgeId.slice(2),
              ratio: { numerator, denominator }
          });
          const snapId = parsed ? stringifySnapPointId(parsed) : null;
          if (!snapId) return null;
          return canonicalizeSnapPointId(snapId) || snapId;
      };

      const canonicalizeVertexIds = (ids: SnapPointID[]) => ids
          .map(id => {
              const parsed = normalizeSnapPointId(parseSnapPointId(id));
              const normalized = parsed ? stringifySnapPointId(parsed) : null;
              if (!normalized) return id;
              return canonicalizeSnapPointId(normalized) || normalized;
          });

      const orientVertexIds = (ids: SnapPointID[], targetNormal: THREE.Vector3 | null) => {
          if (!targetNormal || ids.length < 3) return ids;
          const points = ids
              .map(id => resolver.resolveSnapPoint(id))
              .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
          if (points.length !== ids.length) return ids;
          const v0 = points[0];
          const v1 = points[1];
          const v2 = points[2];
          const normal = new THREE.Vector3().crossVectors(
              new THREE.Vector3().subVectors(v1, v0),
              new THREE.Vector3().subVectors(v2, v0)
          ).normalize();
          if (normal.dot(targetNormal) < 0) {
              return ids.slice().reverse();
          }
          return ids;
      };

      const clipFace = (face) => {
          const faceVertices = face.vertices
              .map((v) => {
                  const vertexId = (typeof v === 'string') ? v : v.id;
                  const position = resolver.resolveVertex(vertexId);
                  if (!position) return null;
                  return { id: vertexId, position };
              })
              .filter(Boolean);
          if (faceVertices.length < 3) return null;
          const edgeIds = Array.isArray(face.edges) 
            ? face.edges.map(e => (typeof e === 'string') ? e : e.id) 
            : [];
          if (edgeIds.length !== faceVertices.length) return null;

          const output = [];
          for (let i = 0; i < faceVertices.length; i++) {
              const current = faceVertices[i];
              const next = faceVertices[(i + 1) % faceVertices.length];
              const edgeId = edgeIds[i];
              if (!current || !next || !edgeId) continue;
              const d1 = plane.distanceToPoint(current.position);
              const d2 = plane.distanceToPoint(next.position);
              const inside1 = isInside(d1);
              const inside2 = isInside(d2);
              if (inside1 && inside2) {
                  output.push({ id: next.id, position: next.position });
                  continue;
              }
              const t = d1 / (d1 - d2);
              if (inside1 && !inside2) {
                  const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
                  if (snapId) {
                      const position = current.position.clone().lerp(next.position, t);
                      output.push({ id: snapId, position });
                  }
                  continue;
              }
              if (!inside1 && inside2) {
                  const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
                  if (snapId) {
                      const position = current.position.clone().lerp(next.position, t);
                      output.push({ id: snapId, position });
                  }
                  output.push({ id: next.id, position: next.position });
              }
          }
          if (output.length < 3) return null;
          const compact = [];
          output.forEach(entry => {
              const last = compact[compact.length - 1];
              if (!last || last.id !== entry.id) {
                  compact.push(entry);
              }
          });
          if (compact.length >= 2 && compact[0].id === compact[compact.length - 1].id) {
              compact.pop();
          }
          if (compact.length < 3) return null;
          return compact.map(entry => entry.id);
      };

      const polygons = [];
      structure.faces.forEach(face => {
          if (!face || !Array.isArray(face.vertices)) return;
          let vertexIds = clipFace(face);
          if (!vertexIds || vertexIds.length < 3) return;
          vertexIds = canonicalizeVertexIds(vertexIds);
          const faceInfo = resolver.resolveFace(face.id);
          const targetNormal = faceInfo ? faceInfo.normal : null;
          vertexIds = orientVertexIds(vertexIds, targetNormal);
          polygons.push({
              faceId: face.id,
              type: 'original',
              vertexIds
          });
      });

      const cutIds = (this.outlineRefs || [])
          .map(ref => (ref && ref.id ? ref.id : null))
          .filter(Boolean);
      if (cutIds.length >= 3) {
          let vertexIds = canonicalizeVertexIds(cutIds);
          vertexIds = orientVertexIds(vertexIds, plane.normal);
          polygons.push({
              faceId: 'F:cut',
              type: 'cut',
              vertexIds
          });
      }

      return polygons;
  }

  getResultFaceAdjacency() {
      const polygons = this.getResultFacePolygons();
      const adjacency = buildFaceAdjacency(polygons);
      const resolver = this.lastResolver;
      const cube = this.lastCube;
      if (!resolver || !cube) return adjacency;
      const cubeSize = typeof cube.getSize === 'function' ? cube.getSize() : null;
      const sizeScalar = (() => {
          if (typeof cubeSize === 'number') return cubeSize;
          if (cubeSize && typeof cubeSize === 'object') {
              const lx = typeof cubeSize.lx === 'number' ? cubeSize.lx : 1;
              const ly = typeof cubeSize.ly === 'number' ? cubeSize.ly : 1;
              const lz = typeof cubeSize.lz === 'number' ? cubeSize.lz : 1;
              return Math.max(lx, ly, lz);
          }
          if (typeof cube.size === 'number') return cube.size;
          return 1;
      })();
      const planeEpsilon = Math.max(1e-6, sizeScalar * 1e-5);

      const facePlanes = new Map();
      polygons.forEach(face => {
          if (!face || !face.faceId || !Array.isArray(face.vertexIds) || face.vertexIds.length < 3) return;
          const points = face.vertexIds
              .map(id => resolver.resolveSnapPoint(id))
              .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
          if (points.length < 3) return;
          const plane = new THREE.Plane().setFromCoplanarPoints(points[0], points[1], points[2]);
          if (plane.normal.lengthSq() <= 0) return;
          facePlanes.set(face.faceId, { plane, points });
      });

      return adjacency.map(entry => {
          const faceA = facePlanes.get(entry.a);
          const faceB = facePlanes.get(entry.b);
          if (!faceA || !faceB) return entry;
          const dot = Math.abs(faceA.plane.normal.dot(faceB.plane.normal));
          if (dot < 0.999) return { ...entry, hingeType: 'edge' };
          const isCoplanar = faceB.points.every((point: THREE.Vector3) =>
              Math.abs(faceA.plane.distanceToPoint(point)) <= planeEpsilon
          );
          return { ...entry, hingeType: isCoplanar ? 'coplanar' : 'edge' };
      });
  }

  applyCutResultMeta(meta, resolver) {
      if (!meta || !resolver) return false;
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
                  faceIds: Array.isArray(ref.faceIds) ? [...ref.faceIds] : undefined
              };
          }).filter(Boolean)
          : [];
      const byId = new Map(intersectionRefs.map(ref => [ref.id, ref]));
      const outlineRefs = Array.isArray(meta.outline)
          ? meta.outline.map(id => {
              if (!id) return null;
              if (byId.has(id)) return byId.get(id);
              const position = resolver.resolveSnapPoint(id);
              if (!position) return null;
              return /** @type {IntersectionPoint} */ ({ id, type: 'intersection' });
          }).filter(Boolean)
          : [];
      const cutSegments = Array.isArray(meta.cutSegments)
          ? meta.cutSegments.map(seg => {
              if (!seg || !seg.startId || !seg.endId) return null;
              return {
                  startId: seg.startId,
                  endId: seg.endId,
                  faceIds: Array.isArray(seg.faceIds) ? [...seg.faceIds] : undefined
              };
          }).filter(Boolean)
          : [];

      this.intersectionRefs = intersectionRefs;
      this.outlineRefs = outlineRefs;
      this.cutSegments = cutSegments;

      if (this.outline && this.outline.geometry && outlineRefs.length >= 3) {
          const points = outlineRefs
              .map(ref => this.resolveIntersectionPosition(ref, resolver))
              .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
          const linePoints = [...points, points[0]];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
          this.outline.geometry.dispose();
          this.outline.geometry = lineGeo;
      }
      return true;
  }

  getCutResult() {
      return {
          outline: { points: this.outlineRefs.slice() },
          intersections: this.intersectionRefs.slice(),
          cutSegments: this.getCutSegments(),
      };
  }

  togglePyramid(visible) {
    if (this.removedMesh) {
        this.removedMesh.visible = visible;
    }
  }

  setCutPointsVisible(visible: boolean) {
    this.showCutPoints = !!visible;
    const next = this.visible && this.showCutPoints;
    if (this.cornerMarker) this.cornerMarker.visible = next;
    this.vertexMarkers.forEach(marker => { marker.visible = next; });
  }

  clearCutPointMarkers() {
    if (!this.vertexMarkers) return;
    this.vertexMarkers.forEach(marker => {
      if (this.cutOverlayGroup) {
        this.cutOverlayGroup.remove(marker);
      } else {
        this.scene.remove(marker);
      }
      if (marker.geometry) marker.geometry.dispose();
    });
    this.vertexMarkers = [];
  }

  updateCutPointMarkers(intersections: IntersectionPoint[]) {
    this.clearCutPointMarkers();
    if (!intersections || !intersections.length) return;
    const selectionIds = new Set(
      intersections
        .filter(ref => ref.type === 'snap' && ref.id)
        .map(ref => ref.id)
    );
    intersections
      .filter(ref => ref.type === 'intersection' && ref.id)
      .forEach(ref => {
        if (selectionIds.has(ref.id)) return;
        const position = this.resolveIntersectionPosition(ref);
        if (!(position instanceof THREE.Vector3)) return;
        const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
        const ratio = parsed && parsed.type === 'edge' ? parsed.ratio : null;
        const isMidpoint = ratio ? ratio.numerator * 2 === ratio.denominator : false;
        const markerColor = isMidpoint ? 0x00ff00 : 0xffff00;
        this.ensureCutOverlayGroup();
        const marker = createMarker(position.clone(), this.scene, markerColor, isMidpoint, this.cutOverlayGroup);
        this.vertexMarkers.push(marker);
      });
    this.setCutPointsVisible(this.showCutPoints);
  }

  setCutLineColorize(enabled: boolean) {
    this.colorizeCutLines = !!enabled;
    this.refreshEdgeHighlightColors();
    if (this.cutLineMaterial) {
        this.cutLineMaterial.color.setHex(
            this.colorizeCutLines ? this.cutLineHighlightColor : this.cutLineDefaultColor
        );
        this.cutLineMaterial.needsUpdate = true;
    }
  }

  setEdgeHighlightColorResolver(resolver: ((edgeId: string) => number) | null) {
    this.edgeHighlightColorResolver = resolver || null;
    this.refreshEdgeHighlightColors();
  }

  refreshEdgeHighlightColors() {
    this.edgeHighlights.forEach(edge => {
      edge.visible = this.visible;
      const edgeId = edge.userData ? edge.userData.edgeId : null;
      const material = (edge as THREE.Line).material;
      if (!(material instanceof THREE.LineBasicMaterial)) return;
      let color = this.cutLineDefaultColor;
      if (this.colorizeCutLines && this.edgeHighlightColorResolver && typeof edgeId === 'string') {
        color = this.edgeHighlightColorResolver(edgeId);
      }
      material.color.setHex(color);
      material.needsUpdate = true;
    });
  }

  updateOverlayVisibility() {
    const overlayVisible = this.visible;
    if (this.outline) this.outline.visible = overlayVisible;
    this.setCutPointsVisible(this.showCutPoints);
  }

  setVisible(visible: boolean) {
    this.visible = !!visible;
    if (this.resultMesh) this.resultMesh.visible = visible;
    if (this.removedMesh) this.removedMesh.visible = visible;
    this.updateOverlayVisibility();
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
        if (this.cutOverlayGroup) {
            this.cutOverlayGroup.remove(this.outline);
        } else {
            this.scene.remove(this.outline);
        }
        this.outline.geometry.dispose();
        this.outline.material.dispose();
        this.outline = null;
    }
    this.cutLineMaterial = null;
    
    this.clearCutPointMarkers();
    if (this.cutOverlayGroup) {
        this.scene.remove(this.cutOverlayGroup);
        this.cutOverlayGroup = null;
    }
    if (this.edgeHighlights) {
        this.edgeHighlights.forEach(edge => {
            this.scene.remove(edge);
            if (edge.geometry) edge.geometry.dispose();
            if (edge.material) edge.material.dispose();
        });
        this.edgeHighlights = [];
    }
    
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
    this.keepPositiveSide = null;
  }
  
  resetInversion() {
      this.cutInverted = false;
  }

  computeCutState(
    solid: any,
    snapIds: SnapPointID[],
    resolver: any
  ): {
    intersections: IntersectionPoint[];
    facePolygons: CutFacePolygon[];
    faceAdjacency: ObjectCutAdjacency[];
    cutSegments: CutSegmentMeta[];
    outlineRefs: IntersectionPoint[];
    cutPlane: THREE.Plane;
  } | null {
    if (!solid || !snapIds || snapIds.length < 3 || !resolver) return null;

    const resolvedPoints = snapIds
      .map(id => resolver.resolveSnapPoint(id))
      .filter((p: THREE.Vector3 | null) => p);
    if (resolvedPoints.length < 3) return null;

    const plane = new THREE.Plane();
    let validPlane = false;
    for (let i = 0; i < resolvedPoints.length; i++) {
      for (let j = i + 1; j < resolvedPoints.length; j++) {
        for (let k = j + 1; k < resolvedPoints.length; k++) {
          try {
            plane.setFromCoplanarPoints(resolvedPoints[i], resolvedPoints[j], resolvedPoints[k]);
            if (plane.normal.lengthSq() > 0.0001) {
              validPlane = true;
              break;
            }
          } catch (e) { continue; }
        }
        if (validPlane) break;
      }
      if (validPlane) break;
    }
    if (!validPlane) return null;

    const intersections: THREE.Vector3[] = resolvedPoints.slice();
    const intersectionRefs: IntersectionPoint[] = [];
    
    snapIds.forEach(snapId => {
      const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
      if (!parsed) return;
      const normalizedId = stringifySnapPointId(parsed);
      if (!normalizedId) return;
      intersectionRefs.push({
        id: canonicalizeSnapPointId(normalizedId) || normalizedId,
        type: 'snap'
      });
    });

    const edgesArray = Array.isArray(solid.edges) ? solid.edges : Object.values(solid.edges);

    const edgeLines = edgesArray.map((edge: any) => {
        const edgeId = typeof edge === 'string' ? edge : edge.id;
        const resolved = resolver.resolveEdge(edgeId);
        return resolved ? new THREE.Line3(resolved.start, resolved.end) : null;
    });

    edgesArray.forEach((edge: any, index: number) => {
        const line = edgeLines[index];
        if (!line) return;
        const target = new THREE.Vector3();
        if (plane.intersectLine(line, target)) {
             const distToStart = target.distanceTo(line.start);
             const distToEnd = target.distanceTo(line.end);
             const edgeLength = line.distance();
             if (Math.abs((distToStart + distToEnd) - edgeLength) < 1e-3) {
                 if (!intersections.some(v => v.distanceTo(target) < 1e-2)) {
                     intersections.push(target.clone());
                     const ratioRaw = distToStart / edgeLength;
                     const denominator = 1000;
                     const numerator = Math.max(0, Math.min(denominator, Math.round(ratioRaw * denominator)));
                     const edgeId = typeof edge === 'string' ? edge : edge.id;
                     const parsed = normalizeSnapPointId({
                         type: 'edge',
                         edgeIndex: edgeId.replace(/^E:/, ''),
                         ratio: { numerator, denominator }
                     });
                     const snapId = parsed ? stringifySnapPointId(parsed) : null;
                     if (snapId) {
                         const id = canonicalizeSnapPointId(snapId) || snapId;
                         if (!intersectionRefs.some(ref => ref.id === id)) {
                             intersectionRefs.push({
                                 id,
                                 type: 'intersection',
                                 edgeId,
                                 ratio: parsed && parsed.type === 'edge' ? parsed.ratio : undefined
                             });
                         }
                     }
                 }
             }
        }
    });

    const resolveFaceIds = (ref: IntersectionPoint) => {
        if (ref.faceIds && ref.faceIds.length) return ref.faceIds;
        const foundFaces: string[] = [];
        if (ref.edgeId) {
            Object.values(solid.faces).forEach((face: any) => {
                 const vertexIds = face.vertices || [];
                 for (let i = 0; i < vertexIds.length; i++) {
                     const v0 = vertexIds[i];
                     const v1 = vertexIds[(i + 1) % vertexIds.length];
                     const sorted = [v0, v1].sort();
                     const edgeId = `E:${sorted[0].replace('V:', '')}-${sorted[1].replace('V:', '')}`;
                     if (edgeId === ref.edgeId) {
                         foundFaces.push(face.id);
                         break;
                     }
                 }
            });
        }
        return foundFaces.length ? foundFaces : undefined;
    };
    intersectionRefs.forEach(ref => {
        if (!ref.faceIds) ref.faceIds = resolveFaceIds(ref);
    });
    
    // --- Duplicate clipping logic for structure-first calculation ---
    const keepPositive = true; // Default behavior
    const isInside = (dist: number) => keepPositive ? dist >= -1e-5 : dist <= 1e-5;
    
    const buildEdgeSnapId = (edgeId: string, t: number, startId: string, endId: string) => {
        if (t <= 1e-6) return startId;
        if (t >= 1 - 1e-6) return endId;
        const found = intersectionRefs.find(r => r.edgeId === edgeId && r.ratio && Math.abs(r.ratio.numerator/r.ratio.denominator - t) < 0.01);
        if (found) return found.id;
        const numerator = Math.round(t * 1000);
        const parsed = normalizeSnapPointId({ type: 'edge', edgeIndex: edgeId.replace(/^E:/, ''), ratio: { numerator, denominator: 1000 } });
        return parsed ? stringifySnapPointId(parsed) : null;
    };

    const polygons: CutFacePolygon[] = [];
    Object.values(solid.faces).forEach((face: any) => {
        // Assume face.vertices is list of Vertex objects or IDs
        const vertexIds = face.vertices || [];
        const vertices = vertexIds.map((v: any) => {
            const id = typeof v === 'string' ? v : v.id;
            return { id, position: resolver.resolveVertex(id) };
        }).filter((v:any) => v.position);
        
        if (vertices.length < 3) return;

        // Resolve edge IDs for each vertex pair in the face
        const faceEdgeIds: string[] = [];
        for (let i = 0; i < vertexIds.length; i++) {
            const v0 = vertexIds[i];
            const v1 = vertexIds[(i + 1) % vertexIds.length];
            const sorted = [v0, v1].sort();
            faceEdgeIds.push(`E:${sorted[0].replace('V:', '')}-${sorted[1].replace('V:', '')}`);
        }

        const output: any[] = [];
        for (let i = 0; i < vertices.length; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            const edgeId = faceEdgeIds[i];
            const d1 = plane.distanceToPoint(current.position);
            const d2 = plane.distanceToPoint(next.position);
            const inside1 = isInside(d1);
            const inside2 = isInside(d2);

            if (inside1 && inside2) {
                output.push(next);
            } else if (inside1 && !inside2) {
                const t = d1 / (d1 - d2);
                const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
                if (snapId) {
                     const pos = current.position.clone().lerp(next.position, t);
                     output.push({ id: snapId, position: pos });
                }
            } else if (!inside1 && inside2) {
                const t = d1 / (d1 - d2);
                const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
                if (snapId) {
                     const pos = current.position.clone().lerp(next.position, t);
                     output.push({ id: snapId, position: pos });
                }
                output.push(next);
            }
        }
        
        if (output.length >= 3) {
            const unique = output.filter((v, i, a) => i === 0 || v.id !== a[i-1].id);
            if (unique.length > 0 && unique[0].id === unique[unique.length-1].id) unique.pop();
            
            if (unique.length >= 3) {
                 polygons.push({
                     faceId: face.id,
                     type: 'original',
                     vertexIds: unique.map(v => v.id)
                 });
            }
        }
    });

    const cutPoints = intersectionRefs.map(ref => ({ ref, pos: resolver.resolveSnapPoint(ref.id) })).filter(p => p.pos);
    if (cutPoints.length >= 3) {
        const center = new THREE.Vector3();
        cutPoints.forEach(p => center.add(p.pos));
        center.divideScalar(cutPoints.length);
        const normal = plane.normal;
        const base = new THREE.Vector3().subVectors(cutPoints[0].pos, center).normalize();
        const up = new THREE.Vector3().crossVectors(normal, base).normalize();
        
        cutPoints.sort((a, b) => {
             const va = new THREE.Vector3().subVectors(a.pos, center);
             const vb = new THREE.Vector3().subVectors(b.pos, center);
             return Math.atan2(va.dot(up), va.dot(base)) - Math.atan2(vb.dot(up), vb.dot(base));
        });
        
        const cutVertexIds = cutPoints.map(p => p.ref.id);
        const cutFaceId = `F:${cutVertexIds.map(id => id.startsWith('V:') ? id.slice(2) : id).join('-')}`;
        
        polygons.push({
            faceId: cutFaceId,
            type: 'cut',
            vertexIds: cutVertexIds
        });
    }

    const cutSegments: CutSegmentMeta[] = cutPoints.map((p, i) => ({
        startId: p.ref.id,
        endId: cutPoints[(i+1)%cutPoints.length].ref.id,
        faceIds: [] 
    }));
    
    const faceAdjacency = buildFaceAdjacency(polygons); 

    return {
        intersections: intersectionRefs,
        facePolygons: polygons,
        faceAdjacency,
        cutSegments,
        outlineRefs: cutPoints.map(p => p.ref),
        cutPlane: plane
    };
  }
}