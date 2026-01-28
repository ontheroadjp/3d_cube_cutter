import * as THREE from 'three';
import { createLabel } from './utils.js';
import { getDefaultIndexMap } from './geometry/indexMap.js';
import type { CubeSize } from './types.js';
import type { GeometryResolver } from './geometry/GeometryResolver.js';
import type { ObjectModel, VertexID, EdgeID, FaceID } from './model/objectModel.js';
import type { buildCubeStructure } from './structure/structureModel.js';

type StructureSnapshot = ReturnType<typeof buildCubeStructure>;

export class Cube {
  scene: THREE.Scene;
  resolver: GeometryResolver | null;
  
  // Storage for Three.js objects mapped by structural IDs
  faceMeshes: Map<FaceID, THREE.Mesh>;
  faceOutlines: Map<FaceID, THREE.LineSegments>;
  faceHiddenOutlines: Map<FaceID, THREE.LineSegments>;
  faceOutlineVisible: boolean;
  cutFaceVisible: boolean;
  faceColorCache: Map<string, number>;
  faceColorTheme: 'blue' | 'red' | 'green' | 'colorful';
  faceColorPalettes: Record<string, number[]>;
  edgeLines: Map<EdgeID, THREE.Line>;
  vertexHitboxes: Map<VertexID, THREE.Mesh>;
  edgeHitboxes: Map<EdgeID, THREE.Mesh>;
  vertexSprites: Map<VertexID, THREE.Sprite>;
  edgeLabels: Map<EdgeID, THREE.Sprite>;
  faceLabels: Map<FaceID, THREE.Sprite>;

  // Legacy properties for compatibility (to be removed gradually)
  size: number;
  edgeLengths: CubeSize;
  physicalIndexToIndex: Record<number, number> = {
      0: 3, 1: 2, 2: 6, 3: 7, 4: 0, 5: 1, 6: 5, 7: 4
  };
  indexMap: Record<string, { x: number; y: number; z: number }>;
  displayLabelMap: Record<string, string> | null;
  
  // hitboxes for raycasting
  vertexMeshes: THREE.Mesh[]; 
  edgeMeshes: THREE.Mesh[];

  getVertexObjectById(vertexId: VertexID): THREE.Mesh | undefined {
      return this.vertexHitboxes.get(vertexId);
  }

  getEdgeObjectById(edgeId: EdgeID): THREE.Mesh | undefined {
      if (!edgeId) return undefined;
      const normalized = edgeId.startsWith('E:') ? edgeId : `E:${edgeId}`;
      return this.edgeHitboxes.get(normalized);
  }

  getVertexLabelByIndex(index: string | number) {
      return `V:${index}`; // Temporary mapping
  }

  getEdgeNameByIndex(index: string | number) {
      return `E:${index}`; // Temporary mapping
  }

  getVertexObjectByName(name: string): THREE.Mesh | undefined {
      // Mapping name back to ID would require presentation model
      return undefined; 
  }

  getEdgeObjectByName(name: string): THREE.Mesh | undefined {
      return undefined;
  }

  constructor(scene: THREE.Scene, size = 10) {
    this.scene = scene;
    this.resolver = null;
    this.size = size;
    this.edgeLengths = { lx: size, ly: size, lz: size };
    this.indexMap = getDefaultIndexMap();
    this.displayLabelMap = null;

    this.faceMeshes = new Map();
    this.faceOutlines = new Map();
    this.faceHiddenOutlines = new Map();
    this.faceOutlineVisible = false;
    this.cutFaceVisible = true;
    this.faceColorCache = new Map();
    this.faceColorTheme = 'blue';
    this.faceColorPalettes = {
        blue: [0xc6dbef, 0x9ecae1, 0x6baed6, 0x3182bd, 0x9ecae1, 0x6baed6],
        red: [0xfcbba1, 0xfc9272, 0xfb6a4a, 0xde2d26, 0xfc9272, 0xfb6a4a],
        green: [0xc7e9c0, 0xa1d99b, 0x74c476, 0x238b45, 0xa1d99b, 0x74c476],
        colorful: [
          0xa6cee3,
          0xb2df8a,
          0xfdbf6f,
          0xcab2d6,
          0xffffb3,
          0xb3de69,
          0xfccde5,
          0x8dd3c7,
          0xbebada,
          0xfb8072,
          0x80b1d3,
          0xfed9a6
        ]
    };
    this.edgeLines = new Map();
    this.vertexHitboxes = new Map();
    this.edgeHitboxes = new Map();
    this.vertexSprites = new Map();
    this.edgeLabels = new Map();
    this.faceLabels = new Map();

    this.vertexMeshes = [];
    this.edgeMeshes = [];
  }

  setResolver(resolver: GeometryResolver) {
    this.resolver = resolver;
  }

  // Cache for the last synced model state to avoid redundant updates
  private lastModelHash: string | null = null;

  private computeSolidCenter(ssot: ObjectModel['ssot']) {
    if (!this.resolver) return new THREE.Vector3();
    const center = new THREE.Vector3();
    let count = 0;
    Object.keys(ssot.vertices).forEach((vertexId) => {
      const pos = this.resolver!.resolveVertex(vertexId);
      if (!pos) return;
      center.add(pos);
      count += 1;
    });
    if (count === 0) return new THREE.Vector3();
    return center.divideScalar(count);
  }

  /**
   * Main entry point for updating the 3D scene from the ObjectModel.
   * This implements the structure-first rendering pipeline.
   */
  syncWithModel(model: ObjectModel | null) {
    if (!model || !this.resolver) return;

    // Check if we actually need to sync
    const modelHash = this.computeModelHash(model);
    if (modelHash === this.lastModelHash) return;
    this.lastModelHash = modelHash;

    const { ssot, presentation, derived } = model;
    this.size = Math.max(ssot.meta.size.lx, ssot.meta.size.ly, ssot.meta.size.lz);
    this.edgeLengths = { ...ssot.meta.size };

    this.syncFaces(model);
    this.syncEdges(model);
    this.syncVertices(model);
    
    // Apply net unfolding if active
    if (derived.net && derived.net.visible) {
        // (applyNetPlan is called from main.ts animation loop)
    }

    // Update raycast arrays
    this.vertexMeshes = Array.from(this.vertexHitboxes.values());
    this.edgeMeshes = Array.from(this.edgeHitboxes.values());
  }

  /**
   * Applies unfolding/folding transformation to faces based on a NetPlan.
   * Moves faces relative to the root face.
   */
  applyNetPlan(
    plan: any,
    progress: number,
    faceProgress?: Map<FaceID, number> | Record<string, number>
  ) {
    if (!plan || !this.resolver) return;

    const { rootFaceId, hinges } = plan;
    this.faceMeshes.forEach(mesh => {
      mesh.position.set(0, 0, 0);
      mesh.quaternion.set(0, 0, 0, 1);
    });
    // Map to store world poses of each face during unfolding
    const worldPoses = new Map<string, { position: THREE.Vector3, quaternion: THREE.Quaternion }>();
    const progressForFace = (faceId: FaceID) => {
      if (!faceProgress) return progress;
      if (faceProgress instanceof Map) {
        return faceProgress.get(faceId) ?? 0;
      }
      const value = faceProgress[faceId];
      return typeof value === 'number' ? value : 0;
    };

    // Root face stays at origin (local frame)
    worldPoses.set(rootFaceId, {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion()
    });

    // Sort hinges or use a queue to ensure parents are processed before children
    const queue = [...hinges];
    let attempts = 0;
    while (queue.length > 0 && attempts < 100) {
      attempts++;
      const hinge = queue.shift();
      if (!hinge) break;

      const parentPose = worldPoses.get(hinge.parentFaceId);
      if (!parentPose) {
        queue.push(hinge);
        continue;
      }

      // Resolve hinge edge coordinates in world space (relative to cube origin)
      const edge = this.resolver.resolveEdge(hinge.hingeEdgeId);
      if (!edge) continue;

      // Calculate dihedral angle-based rotation
      const parentFaceInfo = this.resolver.resolveFace(hinge.parentFaceId);
      const childFaceInfo = this.resolver.resolveFace(hinge.childFaceId);
      
      let angle = Math.PI / 2; // Default fallback
      let axis = edge.end.clone().sub(edge.start).normalize();

      const faceProgressValue = progressForFace(hinge.childFaceId);

      if (parentFaceInfo && childFaceInfo) {
          const np = parentFaceInfo.normal;
          const nc = childFaceInfo.normal;
          
          const dot = THREE.MathUtils.clamp(np.dot(nc), -1, 1);
          const alpha = Math.acos(dot);
          const unfoldAngle = Math.PI - alpha;
          
          // Determine sign by testing a small rotation
          // We want to rotate nc towards np (so dot product increases)
          const testRot = new THREE.Quaternion().setFromAxisAngle(axis, 0.1);
          const testNc = nc.clone().applyQuaternion(testRot);
          const sign = np.dot(testNc) > dot ? 1 : -1;
          
          angle = sign * unfoldAngle * faceProgressValue;
      } else {
          angle = (Math.PI / 2) * faceProgressValue;
      }
      
      const qRot = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      const childQuat = parentPose.quaternion.clone().multiply(qRot);
      
      const pivot = edge.start;
      const localOffset = pivot.clone().add(
          pivot.clone().negate().applyQuaternion(qRot)
      );
      
      const worldOffset = localOffset.applyQuaternion(parentPose.quaternion);
      const childPos = parentPose.position.clone().add(worldOffset);
      
      worldPoses.set(hinge.childFaceId, { position: childPos, quaternion: childQuat });
    }

    // Apply computed poses to meshes
    worldPoses.forEach((pose, faceId) => {
      const mesh = this.faceMeshes.get(faceId);
      if (mesh) {
        mesh.quaternion.copy(pose.quaternion);
        mesh.position.copy(pose.position);
      }
    });
  }

  private computeModelHash(model: ObjectModel): string {
      const { ssot, presentation } = model;
      // Simple hash based on geometry structure and visibility settings
      const faceIds = Object.keys(ssot.faces).sort().join(',');
      const edgeIds = Object.keys(ssot.edges).sort().join(',');
      const vertexIds = Object.keys(ssot.vertices).sort().join(',');
      const display = presentation.display;
      const displayHash = `${display.showVertexLabels},${display.showFaceLabels},${display.edgeLabelMode},${display.cubeTransparent}`;
      return `${faceIds}|${edgeIds}|${vertexIds}|${ssot.meta.size.lx},${ssot.meta.size.ly},${ssot.meta.size.lz}|${displayHash}`;
  }

  private syncFaces(model: ObjectModel) {
    const { ssot, presentation } = model;
    const currentIds = new Set(Object.keys(ssot.faces));
    const solidCenter = this.computeSolidCenter(ssot);

    // Remove old faces
    for (const [id, mesh] of this.faceMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.faceMeshes.delete(id);

        const outline = this.faceOutlines.get(id);
        if (outline) {
            mesh.remove(outline);
            outline.geometry.dispose();
            this.faceOutlines.delete(id);
        }
        const hiddenOutline = this.faceHiddenOutlines.get(id);
        if (hiddenOutline) {
            mesh.remove(hiddenOutline);
            hiddenOutline.geometry.dispose();
            this.faceHiddenOutlines.delete(id);
        }
        
        const label = this.faceLabels.get(id);
        if (label) {
            this.scene.remove(label);
            this.faceLabels.delete(id);
        }
      }
    }

    // Update or add faces
    Object.values(ssot.faces).forEach(face => {
      let mesh = this.faceMeshes.get(face.id);
      const vertices = face.vertices.map(vId => this.resolver!.resolveSnapPoint(vId)).filter((v): v is THREE.Vector3 => v !== null);
      
      if (vertices.length < 3) return;

      const geometry = this.createFaceGeometry(vertices, solidCenter);
      const facePres = presentation.faces[face.id];
      const sourceFaceId = facePres?.sourceFaceId || null;
      const material = this.createFaceMaterial(face.id, facePres, sourceFaceId);
      const isCutFace = !!facePres?.isCutFace;
      const isOriginalFace = !!facePres?.isOriginalFace;
      const labelSourceFaceId = (isOriginalFace && sourceFaceId) ? sourceFaceId : face.id;

      if (!mesh) {
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { type: 'face', faceId: face.id, isCutFace, sourceFaceId: labelSourceFaceId };
        this.scene.add(mesh);
        this.faceMeshes.set(face.id, mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.material = material;
        mesh.userData = { type: 'face', faceId: face.id, isCutFace, sourceFaceId: labelSourceFaceId };
        // Reset transform since geometry is world-space
        mesh.position.set(0, 0, 0);
        mesh.quaternion.set(0, 0, 0, 1);
      }
      mesh.visible = !isCutFace || this.cutFaceVisible;

      // Sync labels
      this.syncFaceLabel(
        face.id,
        vertices,
        presentation.display.showFaceLabels,
        isCutFace,
        mesh.visible,
        labelSourceFaceId
      );

      // Sync outline
      let outline = this.faceOutlines.get(face.id);
      let hiddenOutline = this.faceHiddenOutlines.get(face.id);
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      if (!outline) {
          outline = new THREE.LineSegments(
              edgesGeometry,
              new THREE.LineBasicMaterial({
                  color: 0xcccccc,
                  transparent: true,
                  opacity: 0.6,
                  depthWrite: false
              })
          );
          outline.renderOrder = 2;
          outline.visible = this.faceOutlineVisible;
          mesh.add(outline);
          this.faceOutlines.set(face.id, outline);
      } else {
          outline.geometry.dispose();
          outline.geometry = edgesGeometry;
          outline.visible = this.faceOutlineVisible;
      }
      if (!hiddenOutline) {
          const hiddenGeometry = edgesGeometry.clone();
          const hiddenMaterial = new THREE.LineDashedMaterial({
              color: 0xaaaaaa,
              transparent: true,
              opacity: 0.4,
              dashSize: 0.8,
              gapSize: 0.6,
              depthWrite: false,
              depthTest: false
          });
          hiddenOutline = new THREE.LineSegments(hiddenGeometry, hiddenMaterial);
          hiddenOutline.computeLineDistances();
          hiddenOutline.renderOrder = 1;
          hiddenOutline.visible = this.faceOutlineVisible;
          mesh.add(hiddenOutline);
          this.faceHiddenOutlines.set(face.id, hiddenOutline);
      } else {
          hiddenOutline.geometry.dispose();
          const hiddenGeometry = edgesGeometry.clone();
          hiddenOutline.geometry = hiddenGeometry;
          hiddenOutline.computeLineDistances();
          hiddenOutline.visible = this.faceOutlineVisible;
      }
    });
  }

  setFaceOutlineVisible(visible: boolean) {
      this.faceOutlineVisible = !!visible;
      this.faceOutlines.forEach(outline => {
          outline.visible = this.faceOutlineVisible;
      });
      this.faceHiddenOutlines.forEach(outline => {
          outline.visible = this.faceOutlineVisible;
      });
  }

  private syncEdges(model: ObjectModel) {
    const { ssot, presentation } = model;
    const currentIds = new Set(Object.keys(ssot.edges));

    // Remove old edges
    for (const [id, line] of this.edgeLines) {
      if (!currentIds.has(id)) {
        this.scene.remove(line);
        line.geometry.dispose();
        this.edgeLines.delete(id);

        const hitbox = this.edgeHitboxes.get(id);
        if (hitbox) {
            this.scene.remove(hitbox);
            hitbox.geometry.dispose();
            this.edgeHitboxes.delete(id);
        }

        const label = this.edgeLabels.get(id);
        if (label) {
            this.scene.remove(label);
            this.edgeLabels.delete(id);
        }
      }
    }

    // Update or add edges
    Object.values(ssot.edges).forEach(edge => {
      const v0 = this.resolver!.resolveSnapPoint(edge.v0);
      const v1 = this.resolver!.resolveSnapPoint(edge.v1);
      if (!v0 || !v1) return;

      // Line
      let line = this.edgeLines.get(edge.id);
      const geometry = new THREE.BufferGeometry().setFromPoints([v0, v1]);
      if (!line) {
        line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
        this.scene.add(line);
        this.edgeLines.set(edge.id, line);
      } else {
        line.geometry.dispose();
        line.geometry = geometry;
      }

      // Hitbox
      this.syncEdgeHitbox(edge.id, v0, v1);

      // Label
      this.syncEdgeLabel(edge.id, v0, v1, presentation.display.edgeLabelMode === 'visible');
    });
  }

  private syncVertices(model: ObjectModel) {
    const { ssot, presentation } = model;
    const currentIds = new Set(Object.keys(ssot.vertices));

    // Remove old vertices
    for (const [id, hitbox] of this.vertexHitboxes) {
      if (!currentIds.has(id)) {
        this.scene.remove(hitbox);
        hitbox.geometry.dispose();
        this.vertexHitboxes.delete(id);

        const sprite = this.vertexSprites.get(id);
        if (sprite) {
            this.scene.remove(sprite);
            this.vertexSprites.delete(id);
        }
      }
    }

    // Update or add vertices
    Object.values(ssot.vertices).forEach(vertex => {
      const pos = this.resolver!.resolveSnapPoint(vertex.id);
      if (!pos) return;

      // Hitbox
      let hitbox = this.vertexHitboxes.get(vertex.id);
      if (!hitbox) {
        hitbox = new THREE.Mesh(
            new THREE.SphereGeometry(0.3), 
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0 })
        );
        hitbox.userData = { type: 'vertex', vertexId: vertex.id };
        this.scene.add(hitbox);
        this.vertexHitboxes.set(vertex.id, hitbox);
      }
      hitbox.position.copy(pos);

      // Sprite
      const pres = presentation.vertices[vertex.id];
      const isCutPoint = !!pres?.isCutPoint;
      const hasLabel = typeof pres?.label === 'string' && pres.label.length > 0;
      const label = hasLabel ? pres!.label! : (isCutPoint ? '' : vertex.id.replace('V:', ''));
      const visible = presentation.display.showVertexLabels && (hasLabel || !isCutPoint);
      this.syncVertexLabel(vertex.id, pos, label, visible);
    });
  }

  // --- Helper Methods ---

  private createFaceGeometry(vertices: THREE.Vector3[], solidCenter: THREE.Vector3) {
    const geometry = new THREE.BufferGeometry();
    const center = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(vertices.length);
    const outward = center.clone().sub(solidCenter).normalize();
    const oriented = vertices.slice();
    if (oriented.length >= 3) {
      const normal = new THREE.Vector3()
        .subVectors(oriented[1], oriented[0])
        .cross(new THREE.Vector3().subVectors(oriented[2], oriented[0]))
        .normalize();
      if (normal.dot(outward) < 0) {
        oriented.reverse();
      }
    }

    // Simplistic triangulation for convex polygons (common in cube cutting)
    const positions: number[] = [];
    for (let i = 1; i < oriented.length - 1; i++) {
      positions.push(oriented[0].x, oriented[0].y, oriented[0].z);
      positions.push(oriented[i].x, oriented[i].y, oriented[i].z);
      positions.push(oriented[i + 1].x, oriented[i + 1].y, oriented[i + 1].z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private getFaceBaseColor(faceId: FaceID, pres?: any, sourceFaceId?: FaceID | null) {
    if (pres?.isCutFace) return 0xffcccc;
    const baseId = sourceFaceId || faceId;
    const theme = this.faceColorTheme || 'colorful';
    const cacheKey = `${theme}:${baseId}`;
    const cached = this.faceColorCache.get(cacheKey);
    if (typeof cached === 'number') return cached;
    const palette = this.getFaceThemePalette(theme);
    const groupIndex = this.getFaceGroupIndex(baseId);
    let color = 0xffffff;
    if (groupIndex !== null) {
      color = palette[groupIndex % palette.length];
    } else {
      let hash = 0;
      for (let i = 0; i < baseId.length; i++) {
        hash = ((hash << 5) - hash) + baseId.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % palette.length;
      color = palette[index];
    }
    this.faceColorCache.set(cacheKey, color);
    return color;
  }

  private getFaceThemePalette(theme: string) {
    return this.faceColorPalettes[theme] || this.faceColorPalettes.colorful;
  }

  private getFaceGroupIndex(faceId: FaceID): number | null {
    const groups: Record<string, number> = {
      'F:0-1-5-4': 2,
      'F:2-3-7-6': 2,
      'F:4-5-6-7': 1,
      'F:0-3-2-1': 1,
      'F:0-4-7-3': 0,
      'F:1-2-6-5': 0
    };
    if (Object.prototype.hasOwnProperty.call(groups, faceId)) {
      return groups[faceId];
    }
    return null;
  }

  setFaceColorTheme(theme: 'blue' | 'red' | 'green' | 'colorful') {
    const next = theme || 'colorful';
    if (this.faceColorTheme === next) return;
    this.faceColorTheme = next;
    this.faceColorCache.clear();
    this.faceMeshes.forEach((mesh, faceId) => {
      const material = mesh.material;
      if (!(material instanceof THREE.MeshPhongMaterial)) return;
      const isCutFace = !!mesh.userData?.isCutFace;
      const sourceFaceId = mesh.userData?.sourceFaceId || null;
      const color = this.getFaceBaseColor(faceId, { isCutFace }, sourceFaceId);
      material.color.setHex(color);
      material.needsUpdate = true;
    });
  }

  private createFaceMaterial(faceId: FaceID, pres?: any, sourceFaceId?: FaceID | null) {
    const isCutFace = pres?.isCutFace;
    return new THREE.MeshPhongMaterial({
      color: this.getFaceBaseColor(faceId, pres, sourceFaceId),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
      name: isCutFace ? 'cutFace' : 'originalFace'
    });
  }

  private getFaceLabelText(id: FaceID, isCutFace: boolean, sourceFaceId?: FaceID | null) {
      if (isCutFace) return '切断面';
      const baseId = sourceFaceId || id;
      const labels: Record<string, string> = {
          'F:0-1-5-4': '前',
          'F:2-3-7-6': '後',
          'F:4-5-6-7': '上',
          'F:0-3-2-1': '下',
          'F:0-4-7-3': '左',
          'F:1-2-6-5': '右'
      };
      return labels[baseId] || baseId.replace('F:', '');
  }

  private syncFaceLabel(
    id: FaceID,
    vertices: THREE.Vector3[],
    visible: boolean,
    isCutFace: boolean,
    meshVisible: boolean,
    sourceFaceId: FaceID | null
  ) {
      let label = this.faceLabels.get(id);
      const center = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(vertices.length);
      const text = this.getFaceLabelText(id, isCutFace, sourceFaceId);

      if (!label || label.userData?.labelText !== text) {
          if (label) {
              this.scene.remove(label);
          }
          label = createLabel(text, this.size / 8, 'rgba(0,0,0,0.5)');
          label.userData = { labelText: text, baseVisible: visible, isCutFace };
          this.scene.add(label);
          this.faceLabels.set(id, label);
      }
      if (label.userData) {
          label.userData.baseVisible = visible;
          label.userData.isCutFace = isCutFace;
      }
      label.position.copy(center);
      label.visible = visible && meshVisible && (!isCutFace || this.cutFaceVisible);
  }

  private syncEdgeHitbox(id: EdgeID, v0: THREE.Vector3, v1: THREE.Vector3) {
      let hitbox = this.edgeHitboxes.get(id);
      const edgeVector = v1.clone().sub(v0);
      const length = edgeVector.length();
      const center = v0.clone().add(v1).multiplyScalar(0.5);

      if (!hitbox) {
          hitbox = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.1, length),
              new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 })
          );
          hitbox.userData = { type: 'edge', edgeId: id };
          this.scene.add(hitbox);
          this.edgeHitboxes.set(id, hitbox);
      } else {
          // Re-scale if needed
          hitbox.scale.set(1, length / (hitbox.geometry as THREE.CylinderGeometry).parameters.height, 1);
      }
      hitbox.position.copy(center);
      hitbox.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), edgeVector.normalize());
  }

  private syncEdgeLabel(id: EdgeID, v0: THREE.Vector3, v1: THREE.Vector3, visible: boolean) {
      let label = this.edgeLabels.get(id);
      const center = v0.clone().add(v1).multiplyScalar(0.5);
      const length = v0.distanceTo(v1);
      const text = `${length.toFixed(0)}cm`;

      if (!label || label.userData?.labelText !== text) {
          if (label) {
              this.scene.remove(label);
          }
          label = createLabel(text, this.size / 15);
          label.userData = { labelText: text };
          this.scene.add(label);
          this.edgeLabels.set(id, label);
      }
      label.position.copy(center);
      label.visible = visible;
  }

  private syncVertexLabel(id: VertexID, pos: THREE.Vector3, text: string, visible: boolean) {
      let sprite = this.vertexSprites.get(id);
      if (!sprite) {
          sprite = createLabel(text, this.size / 10);
          this.scene.add(sprite);
          this.vertexSprites.set(id, sprite);
      }
      sprite.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
      sprite.visible = visible;
  }

  // --- Public Interface ---

  toggleVertexLabels(visible: boolean) {
    this.vertexSprites.forEach(s => s.visible = visible);
  }

  toggleFaceLabels(visible: boolean) {
    this.faceLabels.forEach((label, faceId) => {
      const mesh = this.faceMeshes.get(faceId);
      const isCutFace = !!mesh?.userData?.isCutFace;
      if (label.userData) {
        label.userData.baseVisible = visible;
      }
      label.visible = visible && (mesh ? mesh.visible : true) && (!isCutFace || this.cutFaceVisible);
    });
  }

  setEdgeLabelMode(mode: 'visible' | 'popup' | 'hidden') {
    const visible = (mode === 'visible');
    this.edgeLabels.forEach(s => s.visible = visible);
  }

  setEdgeLabelVisible(id: EdgeID, visible: boolean) {
      const label = this.edgeLabels.get(id);
      if (label) label.visible = visible;
  }

  setCutFaceVisible(visible: boolean) {
      this.cutFaceVisible = !!visible;
      this.faceMeshes.forEach(mesh => {
          const isCutFace = !!mesh.userData?.isCutFace;
          if (isCutFace) {
              mesh.visible = this.cutFaceVisible;
          }
      });
      this.faceLabels.forEach((label, faceId) => {
          const mesh = this.faceMeshes.get(faceId);
          const isCutFace = !!mesh?.userData?.isCutFace;
          if (isCutFace) {
              const baseVisible = !!label.userData?.baseVisible;
              const meshVisible = mesh ? mesh.visible : this.cutFaceVisible;
              label.visible = this.cutFaceVisible && baseVisible && meshVisible;
          }
      });
  }

  toggleTransparency(transparent: boolean) {
    this.faceMeshes.forEach(mesh => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.transparent = transparent;
      mat.opacity = transparent ? 0.4 : 1.0;
      mat.depthWrite = !transparent;
      mat.needsUpdate = true;
    });
  }

  resize(camera: THREE.OrthographicCamera, width: number, height: number) {
    const aspect = width / height;
    const padding = 5;
    const baseSize = this.size / 2 + padding;
    const verticalSize = aspect < 1 ? baseSize / aspect : baseSize;
    camera.left = -verticalSize * aspect;
    camera.right = verticalSize * aspect;
    camera.top = verticalSize;
    camera.bottom = -verticalSize;
    camera.updateProjectionMatrix();
  }

  // Legacy helper mapping EdgeID to internal mesh index (for SelectionManager)
  getEdgeMeshIndexById(edgeId: EdgeID): any {
      return edgeId; // SelectionManager now handles ID directly
  }

  // Legacy helper for SnapPointID generation
  getSnapPointIdForEdgeId(edgeId: string, numerator: number, denominator: number) {
      if (!edgeId || !denominator) return null;
      const cleanEdgeId = edgeId.startsWith('E:') ? edgeId.slice(2) : edgeId;
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const common = gcd(numerator, denominator);
      return `E:${cleanEdgeId}@${numerator / common}/${denominator / common}`;
  }

  getSnapPointIdForVertexLabel(label: string) {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const index = labels.indexOf(label);
      return index !== -1 ? `V:${index}` : null;
  }

  getSnapPointIdForEdgeName(name: string, numerator: number, denominator: number) {
      if (name.length !== 2) return null;
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const i1 = labels.indexOf(name[0]);
      const i2 = labels.indexOf(name[1]);
      if (i1 !== -1 && i2 !== -1) {
          const min = Math.min(i1, i2);
          const max = Math.max(i1, i2);
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const common = gcd(numerator, denominator);
          return `E:${min}-${max}@${numerator/common}/${denominator/common}`;
      }
      return null;
  }

  // Temporary visibility control
  setVisible(visible: boolean) {
      this.faceMeshes.forEach(m => m.visible = visible);
      this.edgeLines.forEach(m => m.visible = visible);
      this.vertexSprites.forEach(m => m.visible = visible);
      this.edgeLabels.forEach(m => m.visible = visible);
      this.faceLabels.forEach(m => m.visible = visible);
      this.vertexHitboxes.forEach(m => m.visible = visible);
      this.edgeHitboxes.forEach(m => m.visible = visible);
  }

  // --- Stub legacy methods to avoid immediate crashes in main.ts ---
  createCube(edgeLengths: number[] | number) {
      // No-op or initial build? 
      // In new pipeline, this should trigger ObjectModel update which then calls syncWithModel.
  }
  setVertexLabelMap(labelMap: any) {
      this.displayLabelMap = labelMap;
  }
  getVertexLabelMap() {
      return this.displayLabelMap || null;
  }
  getDisplayLabelByIndex(index: number) { 
      return this.displayLabelMap ? this.displayLabelMap[`V:${index}`] : `V:${index}`; 
  }
  getIndexMap() { return this.indexMap; }
  getStructure(): StructureSnapshot | null { return null; }
  getSize() { return this.edgeLengths; }
}
