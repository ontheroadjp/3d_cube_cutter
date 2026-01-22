import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
import { createMarker } from '../utils.js';
import type { IntersectionPoint } from '../types.js';

export type EdgeHighlightMeta = {
  edgeId: string;
  hasMidpoint: boolean;
};

export class CutVisualization {
  scene: THREE.Scene;
  cutOverlayGroup: THREE.Group | null;
  outline: THREE.Line | null;
  cutLineMaterial: THREE.LineBasicMaterial | null;
  vertexMarkers: THREE.Object3D[];
  edgeHighlights: THREE.Object3D[];
  normalHelper: VertexNormalsHelper | null;
  showNormalHelper: boolean;
  showCutPoints: boolean;
  colorizeCutLines: boolean;
  cutLineDefaultColor: number;
  cutLineHighlightColor: number;
  edgeHighlightColorResolver: ((edgeId: string) => number) | null;
  visible: boolean;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cutOverlayGroup = null;
    this.outline = null;
    this.cutLineMaterial = null;
    this.vertexMarkers = [];
    this.edgeHighlights = [];
    this.normalHelper = null;
    this.showNormalHelper = false;
    this.showCutPoints = true;
    this.colorizeCutLines = false;
    this.cutLineDefaultColor = 0x444444;
    this.cutLineHighlightColor = 0xff0000;
    this.edgeHighlightColorResolver = null;
    this.visible = true;
  }

  setVisible(visible: boolean) {
    this.visible = !!visible;
    if (this.outline) this.outline.visible = this.visible;
    if (this.normalHelper) this.normalHelper.visible = this.visible;
    this.edgeHighlights.forEach(edge => { edge.visible = this.visible; });
    this.setCutPointsVisible(this.showCutPoints);
  }

  ensureCutOverlayGroup() {
    if (this.cutOverlayGroup) return;
    this.cutOverlayGroup = new THREE.Group();
    this.scene.add(this.cutOverlayGroup);
  }

  clearNormalHelper() {
    if (!this.normalHelper) return;
    this.scene.remove(this.normalHelper);
    const helper = this.normalHelper as any;
    if (helper.geometry) helper.geometry.dispose();
    if (helper.material) helper.material.dispose();
    this.normalHelper = null;
  }

  refreshNormalHelper(mesh: THREE.Mesh) {
    if (!this.showNormalHelper) return;
    this.clearNormalHelper();
    const helper = new VertexNormalsHelper(mesh, 0.6, 0x990000);
    helper.visible = this.visible;
    this.scene.add(helper);
    this.normalHelper = helper;
    helper.update();
  }

  setShowNormalHelper(visible: boolean, mesh: THREE.Mesh | null) {
    this.showNormalHelper = !!visible;
    if (!this.showNormalHelper) {
      this.clearNormalHelper();
      return;
    }
    if (mesh) {
      this.refreshNormalHelper(mesh);
    }
  }

  setCutPointsVisible(visible: boolean) {
    this.showCutPoints = !!visible;
    const next = this.visible && this.showCutPoints;
    this.vertexMarkers.forEach(marker => { marker.visible = next; });
  }

  getCutPointsVisible() {
    return this.showCutPoints;
  }

  clearCutPointMarkers() {
    if (!this.vertexMarkers) return;
    this.vertexMarkers.forEach(marker => {
      if (this.cutOverlayGroup) {
        this.cutOverlayGroup.remove(marker);
      } else {
        this.scene.remove(marker);
      }
      const m = marker as any;
      if (m.geometry) m.geometry.dispose();
    });
    this.vertexMarkers = [];
  }

  addMarker(position: THREE.Vector3, color: number, isMidpoint: boolean) {
    this.ensureCutOverlayGroup();
    const marker = createMarker(position, this.scene, color, isMidpoint, this.cutOverlayGroup || undefined);
    this.vertexMarkers.push(marker);
    marker.visible = this.visible && this.showCutPoints;
  }

  updateCutPointMarkers(intersections: IntersectionPoint[], resolver: any) {
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
        const position = resolver.resolveSnapPoint(ref.id);
        if (!(position instanceof THREE.Vector3)) return;
        const markerColor = 0xffff00;
        this.addMarker(position.clone(), markerColor, false);
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

  updateOutline(points: THREE.Vector3[]) {
    if (!points.length) return;
    const linePoints = [...points, points[0]];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    if (this.outline) {
      this.outline.geometry.dispose();
      this.outline.geometry = lineGeo;
      return;
    }
    this.ensureCutOverlayGroup();
    this.cutLineMaterial = new THREE.LineBasicMaterial({
      color: this.colorizeCutLines ? this.cutLineHighlightColor : this.cutLineDefaultColor,
      linewidth: 2
    });
    this.outline = new THREE.Line(lineGeo, this.cutLineMaterial);
    this.outline.visible = this.visible;
    if (this.cutOverlayGroup) {
      this.cutOverlayGroup.add(this.outline);
    }
  }

  clearOutline() {
    if (!this.outline) return;
    if (this.cutOverlayGroup) {
      this.cutOverlayGroup.remove(this.outline);
    } else {
      this.scene.remove(this.outline);
    }
    this.outline.geometry.dispose();
    const mat = this.outline.material;
    if (Array.isArray(mat)) {
      mat.forEach(m => m.dispose());
    } else {
      mat.dispose();
    }
    this.outline = null;
    this.cutLineMaterial = null;
  }

  clearEdgeHighlights() {
    this.edgeHighlights.forEach(edge => {
      this.scene.remove(edge);
      const e = edge as any;
      if (e.geometry) e.geometry.dispose();
      if (e.material) {
        if (Array.isArray(e.material)) {
          e.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          e.material.dispose();
        }
      }
    });
    this.edgeHighlights = [];
  }

  updateEdgeHighlights(edgeIds: EdgeHighlightMeta[], resolver: any) {
    this.clearEdgeHighlights();
    edgeIds.forEach(meta => {
      const resolved = resolver.resolveEdge(meta.edgeId);
      if (!resolved) return;
      const geometry = new THREE.BufferGeometry().setFromPoints([resolved.start, resolved.end]);
      const material = new THREE.LineBasicMaterial({ color: this.cutLineDefaultColor });
      const line = new THREE.Line(geometry, material);
      line.userData = { type: 'education-edge', edgeId: meta.edgeId, hasMidpoint: !!meta.hasMidpoint };
      line.visible = this.visible;
      this.scene.add(line);
      this.edgeHighlights.push(line);
    });
    this.refreshEdgeHighlightColors();
  }

  reset() {
    this.clearNormalHelper();
    this.clearCutPointMarkers();
    this.clearOutline();
    if (this.cutOverlayGroup) {
      this.scene.remove(this.cutOverlayGroup);
      this.cutOverlayGroup = null;
    }
    this.clearEdgeHighlights();
  }
}
