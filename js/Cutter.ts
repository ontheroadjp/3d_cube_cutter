import * as THREE from 'three';
import { buildFaceAdjacency } from './cutter/cutFaceGraph.js';
import { canonicalizeSnapPointId, normalizeSnapPointId, parseSnapPointId, stringifySnapPointId } from './geometry/snapPointId.js';
import type { CutFacePolygon, CutResult, CutResultMeta, CutSegmentMeta, IntersectionPoint, Ratio, SnapPointID } from './types.js';
import type { ObjectCutAdjacency, SolidSSOT, TopologyIndex } from './model/objectModel.js';
import { CutCSG } from './cutter/CutCSG.js';
import { CutVisualization } from './cutter/CutVisualization.js';
import { computeCutState } from './cutter/CutComputation.js';

export class Cutter {
  scene: THREE.Scene;
  resultMesh: THREE.Mesh | null;
  removedMesh: THREE.Mesh | null;
  cornerMarker: THREE.Mesh | null;
  originalCube: any;
  csg: CutCSG;
  visualization: CutVisualization;
  isTransparent: boolean;
  cutInverted: boolean;
  lastSnapIds: SnapPointID[] | null;
  lastResolver: any;
  lastTopologyIndex: TopologyIndex | null;
  lastCube: any;
  intersectionRefs: IntersectionPoint[];
  outlineRefs: IntersectionPoint[];
  cutSegments: CutSegmentMeta[];
  cutPlane: THREE.Plane | null;
  keepPositiveSide: boolean | null;
  debug: boolean;
  visible: boolean;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.resultMesh = null;
    this.removedMesh = null;
    this.cornerMarker = null;
    this.originalCube = null;
    this.csg = new CutCSG();
    this.visualization = new CutVisualization(scene);
    this.isTransparent = true;
    this.cutInverted = false;
    this.lastSnapIds = null;
    this.lastResolver = null;
    this.lastTopologyIndex = null;
    this.lastCube = null;
    this.intersectionRefs = [];
    this.outlineRefs = [];
    this.cutSegments = [];
    this.cutPlane = null;
    this.keepPositiveSide = null;
    this.debug = false;
    this.visible = true;
  }

  get evaluator() {
    return this.csg.evaluator;
  }

  get outline() {
    return this.visualization.outline;
  }

  set outline(value: THREE.Line | null) {
    this.visualization.outline = value;
  }

  get vertexMarkers() {
    return this.visualization.vertexMarkers;
  }

  set vertexMarkers(value: THREE.Object3D[]) {
    this.visualization.vertexMarkers = value;
  }

  setDebug(debug: boolean) {
    this.debug = !!debug;
  }

  setTopologyIndex(topologyIndex: TopologyIndex | null) {
    this.lastTopologyIndex = topologyIndex;
  }

  setShowNormalHelper(visible: boolean) {
    this.visualization.setShowNormalHelper(visible, this.resultMesh);
  }

  private isSolidSSOT(solid: any): solid is SolidSSOT {
    return !!(solid && solid.meta && solid.vertices && typeof solid.getStructure !== 'function');
  }

  private resolveEdgeIdFromVertices(
    solid: SolidSSOT,
    v0: string,
    v1: string,
    topologyIndex: TopologyIndex | null
  ): string | null {
    if (topologyIndex) {
      const edgeIds = topologyIndex.vertexToEdges[v0] || [];
      for (let i = 0; i < edgeIds.length; i++) {
        const edge = solid.edges[edgeIds[i]];
        if (!edge) continue;
        if ((edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)) {
          return edge.id;
        }
      }
      return null;
    }
    const edges = Object.values(solid.edges);
    const match = edges.find((edge: any) =>
      (edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)
    );
    return match ? match.id : null;
  }

  resolveIntersectionPosition(ref: IntersectionPoint, resolverOverride: any = null): THREE.Vector3 | null {
    if (!ref) return null;
    const resolver = resolverOverride || this.lastResolver;
    if (!resolver || !ref.id) return null;
    return resolver.resolveSnapPoint(ref.id) || null;
  }

  ensureCutOverlayGroup() {
    this.visualization.ensureCutOverlayGroup();
  }

  getCutPlaneNormal() {
    return this.cutPlane ? this.cutPlane.normal : null;
  }

  setTransparency(transparent: boolean) {
      this.isTransparent = transparent;
      const updateMat = (mesh: THREE.Mesh | null) => {
          if (!mesh) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: THREE.Material) => {
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

  getLastSnapIds() {
      return this.lastSnapIds ? this.lastSnapIds.slice() : null;
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
      options: {
        previewOnly?: boolean;
        suppressOutline?: boolean;
        suppressMarkers?: boolean;
      } = {}
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
        .filter((p: THREE.Vector3 | null): p is THREE.Vector3 => p !== null);
    if (resolvedPoints.length < 3) return false;
    const points = resolvedPoints;
    this.lastSnapIds = snapIds.slice();

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
    const positiveVertices: THREE.Vector3[] = [];
    const negativeVertices: THREE.Vector3[] = [];
    if (!resolver) return false;

    let vertices: THREE.Vector3[] = [];
    let edgesData: any[] = []; // Raw edge objects
    let solidSize = 10;
    let isSSOT = this.isSolidSSOT(cube);
    let structure: any = null;
    const topologyIndex = this.lastTopologyIndex;

    if (isSSOT) {
        // SSOT Mode
        vertices = Object.values((cube as SolidSSOT).vertices)
            .map((v: any) => resolver.resolveVertex(v.id))
            .filter((v: THREE.Vector3 | null): v is THREE.Vector3 => v !== null);
        edgesData = Object.values((cube as SolidSSOT).edges);
        const { lx, ly, lz } = (cube as SolidSSOT).meta.size;
        solidSize = Math.max(lx, ly, lz);
    } else {
        // Legacy Mode
        structure = cube.getStructure ? cube.getStructure() : null;
        if (!structure || !structure.vertices || !structure.edges) return false;
        vertices = structure.vertices
            .map((v: { id: string }) => resolver.resolveVertex(v.id))
            .filter((v: THREE.Vector3 | null): v is THREE.Vector3 => v !== null);
        edgesData = structure.edges;
        solidSize = typeof cube.size === 'number' ? cube.size : 10;
    }

    if (vertices.length === 0) return false;
    
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
        let targetVertices: THREE.Vector3[] = [];

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
                this.visualization.addMarker(v, 0xff0000, false);
            });
        }

        const csgResult = this.csg.applyCut({
            cube,
            plane,
            planePoint: p0,
            cutNegative,
            isTransparent: this.isTransparent,
            scene: this.scene
        });
        if (csgResult) {
            this.resultMesh = csgResult.resultMesh;
            this.removedMesh = csgResult.removedMesh;
            this.visualization.refreshNormalHelper(this.resultMesh);
        }
    }

    const intersections: THREE.Vector3[] = points.slice();
    const intersectionRefs: IntersectionPoint[] = [];
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

    const edgeLines = edgesData.map((edge: { id: string }) => {
        const resolved = resolver.resolveEdge(edge.id);
        return resolved ? new THREE.Line3(resolved.start, resolved.end) : null;
    }).filter((l: THREE.Line3 | null): l is THREE.Line3 => l !== null);
    if (edgeLines.length !== edgesData.length) return false;

    const edgeEntries = edgesData.map((edge: { id: string }, index: number) => ({ edgeId: edge.id, line: edgeLines[index] })).filter((e: any) => e.line);
    edgeEntries.forEach(({ edgeId, line }: { edgeId: string, line: THREE.Line3 }) => {
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

    const resolveFaceIdsForRef = (ref: IntersectionPoint) => {
        if (!ref) return null;
        
        if (isSSOT && cube.faces) {
            const foundFaces: string[] = [];
            if (topologyIndex) {
                if (ref.edgeId) {
                    const edgeFaces = topologyIndex.edgeToFaces[ref.edgeId];
                    if (edgeFaces && edgeFaces.length) return edgeFaces.slice();
                } else if (ref.id) {
                    const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
                    if (parsed && parsed.type === 'vertex') {
                        const vId = `V:${parsed.vertexIndex}`;
                        const vertexFaces = topologyIndex.vertexToFaces[vId];
                        if (vertexFaces && vertexFaces.length) return vertexFaces.slice();
                    } else if (parsed && parsed.type === 'face') {
                        return [`F:${parsed.faceIndex}`];
                    }
                }
                return null;
            }
            if (ref.edgeId && cube.edges) {
                const edge = cube.edges[ref.edgeId];
                if (edge) {
                    Object.values(cube.faces).forEach((face: any) => {
                        const vertices = face.vertices || [];
                        for (let i = 0; i < vertices.length; i++) {
                            const v0 = vertices[i];
                            const v1 = vertices[(i + 1) % vertices.length];
                            if ((edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)) {
                                foundFaces.push(face.id);
                                break;
                            }
                        }
                    });
                }
            } else if (ref.id) {
                const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
                if (parsed && parsed.type === 'vertex') {
                    const vId = `V:${parsed.vertexIndex}`;
                    Object.values(cube.faces).forEach((face: any) => {
                        if (face.vertices && face.vertices.includes(vId)) {
                            foundFaces.push(face.id);
                        }
                    });
                } else if (parsed && parsed.type === 'face') {
                    return [`F:${parsed.faceIndex}`];
                }
            }
            return foundFaces.length ? foundFaces : null;
        }

        if (!structure) return null;
        if (ref.edgeId && structure.edgeMap) {
            const edge = (structure.edgeMap as Map<string, any>).get(ref.edgeId);
            return edge ? edge.faces : null;
        }
        if (!ref.id) return null;
        const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
        if (!parsed) return null;
        if (parsed.type === 'vertex' && structure.vertexMap) {
            const vertex = (structure.vertexMap as Map<string, any>).get(`V:${parsed.vertexIndex}`);
            return vertex ? vertex.faces : null;
        }
        if (parsed.type === 'edge' && structure.edgeMap) {
            const edge = (structure.edgeMap as Map<string, any>).get(`E:${parsed.edgeIndex}`);
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

    if (resolver && (structure || isSSOT)) {
        const edgeIds = new Map<string, { hasMidpoint: boolean }>();
        intersectionRefs.forEach(ref => {
            let edgeIdFromRef = ref.edgeId || null;
            if (!ref.id) return;
            const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
            if (!parsed) return;
            const isNearMidpoint = (ratio: Ratio | undefined) => {
                if (!ratio || !ratio.denominator) return false;
                return Math.abs(ratio.numerator * 2 - ratio.denominator) <= 1;
            };

            if (parsed.type === 'edge') {
                edgeIdFromRef = `E:${parsed.edgeIndex}`;
                if (!edgeIds.has(edgeIdFromRef)) edgeIds.set(edgeIdFromRef, { hasMidpoint: false });
                if (isNearMidpoint(parsed.ratio)) {
                    const entry = edgeIds.get(edgeIdFromRef);
                    if (entry) entry.hasMidpoint = true;
                }
                return;
            }
            if (parsed.type === 'vertex') {
                const vId = `V:${parsed.vertexIndex}`;
                if (isSSOT) {
                    const connectedEdges = topologyIndex ? topologyIndex.vertexToEdges[vId] : null;
                    if (connectedEdges && connectedEdges.length) {
                        connectedEdges.forEach(edgeId => {
                            if (!edgeIds.has(edgeId)) edgeIds.set(edgeId, { hasMidpoint: false });
                        });
                    } else if (cube.edges) {
                        Object.values(cube.edges).forEach((edge: any) => {
                            if (edge.v0 === vId || edge.v1 === vId) {
                                if (!edgeIds.has(edge.id)) edgeIds.set(edge.id, { hasMidpoint: false });
                            }
                        });
                    }
                } else if (structure && (structure.vertexMap as Map<string, any>)) {
                    const vertex = (structure.vertexMap as Map<string, any>).get(vId);
                    if (vertex && vertex.edges) {
                        (vertex.edges as string[]).forEach(edgeId => {
                            if (!edgeIds.has(edgeId)) edgeIds.set(edgeId, { hasMidpoint: false });
                        });
                    }
                }
                return;
            }
            if (edgeIdFromRef) {
                if (!edgeIds.has(edgeIdFromRef)) edgeIds.set(edgeIdFromRef, { hasMidpoint: false });
                if (ref.ratio && isNearMidpoint(ref.ratio)) {
                    const entry = edgeIds.get(edgeIdFromRef);
                    if (entry) entry.hasMidpoint = true;
                }
            }
        });
        const edgeMetaList = Array.from(edgeIds.entries()).map(([edgeId, meta]) => ({
            edgeId,
            hasMidpoint: !!(meta && meta.hasMidpoint)
        }));
        this.visualization.updateEdgeHighlights(edgeMetaList, resolver);
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
        const refPositions = new Map<string, THREE.Vector3 | null>(
            refs.map(ref => [ref.id, this.resolveIntersectionPosition(ref, resolver)])
        );

        const buildSegmentsFromFaces = (): CutSegmentMeta[] => {
            const faceBuckets = new Map<string, IntersectionPoint[]>();
            refs.forEach(ref => {
                if (!ref.faceIds || !ref.faceIds.length) return;
                ref.faceIds.forEach(faceId => {
                    if (!faceBuckets.has(faceId)) faceBuckets.set(faceId, []);
                    faceBuckets.get(faceId)?.push(ref);
                });
            });
            const segments: CutSegmentMeta[] = [];
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

        const buildOrderedIdsFromSegments = (segments: CutSegmentMeta[]): string[] | null => {
            if (!segments.length) return null;
            const adjacency = new Map<string, Set<string>>();
            segments.forEach(seg => {
                if (!adjacency.has(seg.startId)) adjacency.set(seg.startId, new Set());
                if (!adjacency.has(seg.endId)) adjacency.set(seg.endId, new Set());
                adjacency.get(seg.startId)!.add(seg.endId);
                adjacency.get(seg.endId)!.add(seg.startId);
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
            orderedRefs = orderedIds.map(id => refById.get(id)).filter((r: IntersectionPoint | undefined): r is IntersectionPoint => r !== undefined);
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
            const segmentFaceIndex = new Map<string, string[]>();
            faceSegments.forEach(seg => {
                const key = [seg.startId, seg.endId].sort().join('|');
                if (!segmentFaceIndex.has(key)) segmentFaceIndex.set(key, []);
                segmentFaceIndex.get(key)!.push(...(seg.faceIds || []));
            });
            outlinePoints = orderedRefs
                .map(ref => refPositions.get(ref.id))
                .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
            this.outlineRefs = orderedRefs.slice();
            this.cutSegments = orderedRefs.map((ref, i) => {
                const next = orderedRefs[(i + 1) % orderedRefs.length];
                let sharedFaces: string[] = [];
                const key = [ref.id, next.id].sort().join('|');
                if (segmentFaceIndex.has(key)) {
                    sharedFaces = Array.from(new Set(segmentFaceIndex.get(key)));
                } else if (ref.faceIds && next.faceIds) {
                    sharedFaces = ref.faceIds.filter(faceId => next.faceIds!.includes(faceId));
                }
                return {
                    startId: ref.id,
                    endId: next.id,
                    faceIds: sharedFaces
                };
            });
        }

        if (!suppressOutline) {
            this.visualization.updateOutline(outlinePoints);
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
                    this.visualization.addMarker(point, markerColor, isMidpoint);
                    created.add(ref.id);
                });
        }
    }

    if (!previewOnly && cube.cubeMesh) {
        cube.cubeMesh.visible = false;
    }
    return true; 
  }
  
  toggleSurface(visible: boolean) {
    if (this.resultMesh && Array.isArray(this.resultMesh.material)) {
        const mat = this.resultMesh.material[1] as THREE.Material;
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
          .filter((s: any): s is NonNullable<any> => s !== null);
  }

  getResultFacePolygons(): CutFacePolygon[] {
      const resolver = this.lastResolver;
      const cube = this.lastCube;
      const plane = this.cutPlane;
      if (!resolver || !cube || !plane) return [];

      let facesData: any[] = [];
      let solidSize = 10;
      let isSSOT = this.isSolidSSOT(cube);
      const topologyIndex = this.lastTopologyIndex;

      if (isSSOT) {
          facesData = Object.values((cube as SolidSSOT).faces);
          const { lx, ly, lz } = (cube as SolidSSOT).meta.size;
          solidSize = Math.max(lx, ly, lz);
      } else {
          const structure = cube.getStructure ? cube.getStructure() : null;
          if (!structure || !Array.isArray(structure.faces)) return [];
          facesData = structure.faces;
          solidSize = typeof cube.size === 'number' ? cube.size : 10;
      }

      const cubeSize = typeof cube.getSize === 'function' ? cube.getSize() : null;
      const sizeScalar = (() => {
          if (typeof cubeSize === 'number') return cubeSize;
          if (cubeSize && typeof cubeSize === 'object') {
              const lx = typeof cubeSize.lx === 'number' ? cubeSize.lx : 1;
              const ly = typeof cubeSize.ly === 'number' ? cubeSize.ly : 1;
              const lz = typeof cubeSize.lz === 'number' ? cubeSize.lz : 1;
              return Math.max(lx, ly, lz);
          }
          return solidSize;
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
          const normalizeVertexId = (id: string) => (id.startsWith('V:') ? id : `V:${id}`);
          const edge = isSSOT ? (cube as SolidSSOT).edges[edgeId] : null;
          let edgeV0 = edge ? edge.v0 : '';
          let edgeV1 = edge ? edge.v1 : '';
          if (!edgeV0 || !edgeV1) {
              const content = edgeId.replace(/^E:/, '');
              const parts = content.split('-');
              if (parts.length === 2) {
                  edgeV0 = normalizeVertexId(parts[0]);
                  edgeV1 = normalizeVertexId(parts[1]);
              }
          }
          let tEdge = t;
          const startVertex = normalizeVertexId(startId);
          if (edgeV0 && edgeV1 && startVertex === edgeV1) {
              tEdge = 1 - t;
          }
          if (tEdge <= tEpsilon && edgeV0) return edgeV0;
          if (tEdge >= 1 - tEpsilon && edgeV1) return edgeV1;
          const known = edgeIntersectionById.get(edgeId);
          if (known) return known;
          const numerator = Math.max(0, Math.min(denominator, Math.round(tEdge * denominator)));
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

      const clipFace = (face: any) => {
          const faceVertices = (face.vertices as any[])
              .map((v) => {
                  const vertexId = (typeof v === 'string') ? v : v.id;
                  const position = resolver.resolveVertex(vertexId);
                  if (!position) return null;
                  return { id: vertexId, position };
              })
              .filter((v): v is { id: string, position: THREE.Vector3 } => v !== null);
          if (faceVertices.length < 3) return null;
          
          let edgeIds: string[] = [];
          if (isSSOT) {
              const vIds = face.vertices;
              for(let i=0; i<vIds.length; i++) {
                  const v0 = vIds[i];
                  const v1 = vIds[(i+1)%vIds.length];
                  const edgeId = this.resolveEdgeIdFromVertices(cube as SolidSSOT, v0, v1, topologyIndex);
                  if (edgeId) edgeIds.push(edgeId);
              }
          } else {
              edgeIds = Array.isArray(face.edges) 
                ? face.edges.map((e: any) => (typeof e === 'string') ? e : e.id) 
                : [];
          }
          
          if (edgeIds.length !== faceVertices.length) return null;

          const output: { id: string, position: THREE.Vector3 }[] = [];
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
          const compact: { id: string, position: THREE.Vector3 }[] = [];
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

      const polygons: CutFacePolygon[] = [];
      facesData.forEach(face => {
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
          .filter((id): id is string => id !== null);
      if (cutIds.length >= 3) {
          let vertexIds = canonicalizeVertexIds(cutIds);
          const cutNormal = keepPositive ? plane.normal.clone().negate() : plane.normal.clone();
          vertexIds = orientVertexIds(vertexIds, cutNormal);
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

      const facePlanes = new Map<string, { plane: THREE.Plane, points: THREE.Vector3[] }>();
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
          if (dot < 0.999) return { ...entry, hingeType: 'edge' as const };
          const isCoplanar = faceB.points.every((point: THREE.Vector3) =>
              Math.abs(faceA.plane.distanceToPoint(point)) <= planeEpsilon
          );
          return { ...entry, hingeType: (isCoplanar ? 'coplanar' : 'edge') as 'edge' | 'coplanar' };
      });
  }

  applyCutResultMeta(meta: CutResultMeta, resolver: any) {
      if (!meta || !resolver) return false;
      const intersectionRefs: IntersectionPoint[] = (Array.isArray(meta.intersections)
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
                  type: (ref.type || 'intersection') as 'snap' | 'intersection',
                  edgeId: ref.edgeId,
                  ratio: ref.ratio ? { ...ref.ratio } : undefined,
                  faceIds: Array.isArray(ref.faceIds) ? [...ref.faceIds] : undefined
              };
          })
          : []).filter(r => r !== null) as IntersectionPoint[];
      const byId = new Map(intersectionRefs.map(ref => [ref.id, ref]));
      const outlineRefs: IntersectionPoint[] = (Array.isArray(meta.outline)
          ? meta.outline.map(id => {
              if (!id) return null;
              if (byId.has(id)) return byId.get(id);
              const position = resolver.resolveSnapPoint(id);
              if (!position) return null;
              return { id, type: 'intersection' } as IntersectionPoint;
          })
          : []).filter(r => r !== null) as IntersectionPoint[];
      const cutSegments: CutSegmentMeta[] = (Array.isArray(meta.cutSegments)
          ? meta.cutSegments.map(seg => {
              if (!seg || !seg.startId || !seg.endId) return null;
              return {
                  startId: seg.startId,
                  endId: seg.endId,
                  faceIds: Array.isArray(seg.faceIds) ? [...seg.faceIds] : undefined
              };
          })
          : []).filter(s => s !== null) as CutSegmentMeta[];

      this.intersectionRefs = intersectionRefs;
      this.outlineRefs = outlineRefs;
      this.cutSegments = cutSegments;

      if (outlineRefs.length >= 3) {
          const points = outlineRefs
              .map(ref => this.resolveIntersectionPosition(ref, resolver))
              .filter((pos): pos is THREE.Vector3 => pos instanceof THREE.Vector3);
          if (points.length >= 3) {
              this.visualization.updateOutline(points);
          }
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

  togglePyramid(visible: boolean) {
    if (this.removedMesh) {
        this.removedMesh.visible = visible;
    }
  }

  setCutPointsVisible(visible: boolean) {
    this.visualization.setCutPointsVisible(visible);
  }

  clearCutPointMarkers() {
    this.visualization.clearCutPointMarkers();
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
        this.visualization.addMarker(position.clone(), markerColor, isMidpoint);
      });
    this.visualization.setCutPointsVisible(this.visualization.getCutPointsVisible());
  }

  setCutLineColorize(enabled: boolean) {
    this.visualization.setCutLineColorize(enabled);
  }

  setEdgeHighlightColorResolver(resolver: ((edgeId: string) => number) | null) {
    this.visualization.setEdgeHighlightColorResolver(resolver);
  }

  refreshEdgeHighlightColors() {
    this.visualization.refreshEdgeHighlightColors();
  }

  updateOverlayVisibility() {
    this.visualization.setVisible(this.visible);
  }

  setVisible(visible: boolean) {
    this.visible = !!visible;
    if (this.resultMesh) this.resultMesh.visible = visible;
    if (this.removedMesh) this.removedMesh.visible = visible;
    this.visualization.setVisible(this.visible);
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
    this.visualization.reset();
    
    if (this.originalCube && this.originalCube.cubeMesh) {
        this.originalCube.cubeMesh.visible = true;
    }
    this.originalCube = null;
    this.lastCube = null;
    this.lastResolver = null;
    this.lastSnapIds = null;
    this.lastTopologyIndex = null;
    this.outlineRefs = [];
    this.cutSegments = [];
    this.cutPlane = null;
    this.keepPositiveSide = null;
  }
  
  resetInversion() {
      this.cutInverted = false;
  }

  computeCutState(
    solid: SolidSSOT | any,
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
    return computeCutState(solid, snapIds, resolver, this.lastTopologyIndex, this.keepPositiveSide);
  }
}
