import * as THREE from 'three';
import { createLabel } from './utils.js';
import { getDefaultIndexMap } from './geometry/indexMap.js';
import type { CubeSize } from './types.js';
import type { GeometryResolver } from './geometry/GeometryResolver.js';
import type { ObjectModel, VertexID, EdgeID, FaceID } from './model/objectModel.js';

export class Cube {
  scene: THREE.Scene;
  resolver: GeometryResolver | null;
  
  // Storage for Three.js objects mapped by structural IDs
  faceMeshes: Map<FaceID, THREE.Mesh>;
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

  getVertexObjectById(vertexId: VertexID) {
      return this.vertexHitboxes.get(vertexId);
  }

  getEdgeObjectById(edgeId: EdgeID) {
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

  getVertexObjectByName(name: string) {
      // Mapping name back to ID would require presentation model
      return undefined; 
  }

  getEdgeObjectByName(name: string) {
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

  /**
   * Main entry point for updating the 3D scene from the ObjectModel.
   * This implements the structure-first rendering pipeline.
   */
  syncWithModel(model: ObjectModel | null) {
    if (!model || !this.resolver) return;

    const { ssot, presentation, derived } = model;
    this.size = Math.max(ssot.meta.size.lx, ssot.meta.size.ly, ssot.meta.size.lz);
    this.edgeLengths = { ...ssot.meta.size };

    this.syncFaces(model);
    this.syncEdges(model);
    this.syncVertices(model);
    
    // Apply net unfolding if active
    if (derived.net && derived.net.visible) {
        // (WIP: applyNetPlan will be called here or from main.ts)
    }

    // Update raycast arrays
    this.vertexMeshes = Array.from(this.vertexHitboxes.values());
    this.edgeMeshes = Array.from(this.edgeHitboxes.values());
  }

  /**
   * Applies unfolding/folding transformation to faces based on a NetPlan.
   * Moves faces relative to the root face.
   */
  applyNetPlan(plan: any, progress: number) {
    if (!plan || !this.resolver) return;

    const { rootFaceId, hinges } = plan;
    // Map to store world poses of each face during unfolding
    const worldPoses = new Map<string, { position: THREE.Vector3, quaternion: THREE.Quaternion }>();

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

      if (parentFaceInfo && childFaceInfo) {
          const np = parentFaceInfo.normal;
          const nc = childFaceInfo.normal;
          // Dihedral angle alpha
          // cos(alpha) = np . nc
          // However, for unfolding, we want to rotate child so nc aligns with np (coplanar)
          // The rotation required is (PI - alpha)
          // Direction depends on the hinge axis direction vs cross product
          
          const dot = THREE.MathUtils.clamp(np.dot(nc), -1, 1);
          const alpha = Math.acos(dot);
          const unfoldAngle = Math.PI - alpha;
          
          // Determine sign
          // cross(np, nc) should align with axis for positive rotation?
          const cross = new THREE.Vector3().crossVectors(np, nc);
          const sign = cross.dot(axis) >= 0 ? 1 : -1;
          
          angle = sign * unfoldAngle * progress;
      } else {
          angle = (Math.PI / 2) * progress;
      }
      
      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      
      const childQuat = parentPose.quaternion.clone().multiply(rotation);
      // Position needs to be offset based on rotation around pivot (hinge edge start)
      // P_child_new = P_pivot + Q_rot * (P_child_old - P_pivot)
      // But P_child_old is relative to parent pose? No, we need to chain transforms properly.
      
      // Correct approach:
      // The child face is logically attached to the parent face at the hinge.
      // 1. Start at parent position/rotation.
      // 2. Move to hinge position (relative to parent).
      // 3. Apply rotation.
      // 4. Child's origin is maintained relative to the hinge.
      
      // Since our faces are defined in global coordinates initially (mesh.position=0,0,0),
      // we need to rotate the child mesh around the hinge axis in the parent's frame.
      
      // Let's rely on the accumulated quaternion for rotation.
      // For position, we simply need to ensure the hinge stays connected.
      // Since "worldPoses" tracks the transform of the face frame (initially identity),
      // and we rotate around the hinge axis (which is constant in the initial frame if we assume
      // the hinge definition edge.start/end are from the initial static geometry),
      // we need to rotate the "center of the child face" around the hinge axis.
      
      // Actually, simply applying the rotation to the mesh quaternion rotates it around the mesh origin (0,0,0).
      // This is WRONG if the mesh origin is at the center of the cube.
      // We need to rotate around the hinge.
      
      // Correction:
      // The hinge axis 'axis' and point 'edge.start' are in the LOCAL frame of the initial cube (model space).
      // The child face mesh is also in model space.
      // We want to rotate the child face around 'edge.start'/'axis' by 'angle'.
      // AND we want to apply the parent's accumulated transform.
      
      // Transform chain:
      // T_child = T_parent * T_hinge_rotation
      // Where T_hinge_rotation rotates around the hinge line.
      
      // T_hinge_rotation:
      // Translate(-pivot) -> Rotate(angle, axis) -> Translate(pivot)
      
      const pivot = edge.start;
      const qRot = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      
      // Apply parent transform to the pivot-rotated frame
      // Final Pos = ParentPos + ParentQuat * (Pivot + qRot * (-Pivot))
      // Final Quat = ParentQuat * qRot
      
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

  private syncFaces(model: ObjectModel) {
    const { ssot, presentation } = model;
    const currentIds = new Set(Object.keys(ssot.faces));

    // Remove old faces
    for (const [id, mesh] of this.faceMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.faceMeshes.delete(id);
        
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
      const vertices = face.vertices.map(vId => this.resolver!.resolveSnapPoint(vId)).filter(Boolean) as THREE.Vector3[];
      
      if (vertices.length < 3) return;

      const geometry = this.createFaceGeometry(vertices);
      const facePres = presentation.faces[face.id];
      const material = this.createFaceMaterial(facePres);

      if (!mesh) {
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { type: 'face', faceId: face.id };
        this.scene.add(mesh);
        this.faceMeshes.set(face.id, mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.material = material;
      }

      // Sync labels
      this.syncFaceLabel(face.id, vertices, presentation.display.showFaceLabels);
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
      const label = pres?.label || vertex.id.replace('V:', '');
      this.syncVertexLabel(vertex.id, pos, label, presentation.display.showVertexLabels);
    });
  }

  // --- Helper Methods ---

  private createFaceGeometry(vertices: THREE.Vector3[]) {
    const geometry = new THREE.BufferGeometry();
    const center = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(vertices.length);
    
    // Simplistic triangulation for convex polygons (common in cube cutting)
    const positions: number[] = [];
    for (let i = 1; i < vertices.length - 1; i++) {
      positions.push(vertices[0].x, vertices[0].y, vertices[0].z);
      positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
      positions.push(vertices[i + 1].x, vertices[i + 1].y, vertices[i + 1].z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private createFaceMaterial(pres?: any) {
    const isCutFace = pres?.isCutFace;
    return new THREE.MeshPhongMaterial({
      color: isCutFace ? 0xffcccc : 0x66ccff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
      name: isCutFace ? 'cutFace' : 'originalFace'
    });
  }

  private syncFaceLabel(id: FaceID, vertices: THREE.Vector3[], visible: boolean) {
      let label = this.faceLabels.get(id);
      const center = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(vertices.length);
      
      if (!label) {
          // Use a placeholder or derive name from FaceID
          label = createLabel(id.replace('F:', 'Face '), this.size / 8, 'rgba(0,0,0,0.5)');
          this.scene.add(label);
          this.faceLabels.set(id, label);
      }
      label.position.copy(center);
      label.visible = visible;
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

      if (!label) {
          label = createLabel(`${length.toFixed(0)}cm`, this.size / 15);
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
    this.faceLabels.forEach(l => l.visible = visible);
  }

  setEdgeLabelMode(mode: 'visible' | 'popup' | 'hidden') {
    const visible = (mode === 'visible');
    this.edgeLabels.forEach(s => s.visible = visible);
  }

  setEdgeLabelVisible(id: EdgeID, visible: boolean) {
      const label = this.edgeLabels.get(id);
      if (label) label.visible = visible;
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
  getDisplayLabelByIndex(index: number) { 
      return this.displayLabelMap ? this.displayLabelMap[`V:${index}`] : `V:${index}`; 
  }
  getIndexMap() { return this.indexMap; }
  getStructure() { return null; }
  getSize() { return this.edgeLengths; }
}