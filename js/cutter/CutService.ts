import type { ObjectModelManager } from '../model/objectModelManager.js';
import type { CutResultMeta, SnapPointID } from '../types.js';
import type { Cutter } from '../Cutter.js';
import type { SelectionManager } from '../SelectionManager.js';
import type { UIManager } from '../UIManager.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';
import type { SolidSSOT } from '../model/objectModel.js';
import { generateExplanation } from '../education/explanationGenerator.js';

export class CutService {
  cutter: Cutter;
  objectModelManager: ObjectModelManager;
  selection: SelectionManager;
  resolver: GeometryResolver;
  ui: UIManager;

  constructor({
    cutter,
    objectModelManager,
    selection,
    resolver,
    ui
  }: {
    cutter: Cutter;
    objectModelManager: ObjectModelManager;
    selection: SelectionManager;
    resolver: GeometryResolver;
    ui: UIManager;
  }) {
    this.cutter = cutter;
    this.objectModelManager = objectModelManager;
    this.selection = selection;
    this.resolver = resolver;
    this.ui = ui;
  }

  executeCut({ snapIds, structure }: { snapIds?: SnapPointID[]; structure?: any } = {}) {
    const ids = snapIds && snapIds.length ? snapIds : this.selection.getSelectedSnapIds();
    if (ids.length < 3) return false;

    const solid = this.objectModelManager.getModel()?.ssot;
    if (!solid) return false;
    const topologyIndex = this.objectModelManager.getModel()?.derived.topologyIndex || null;

    const success = this.cutter.cut(solid, ids, this.resolver, { topologyIndex });
    if (!success) {
      console.warn("切断処理に失敗しました。点を選択し直してください。");
      this.selection.reset();
      return false;
    }

    this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
    const modelDisplay = this.objectModelManager.getDisplayState();
    this.cutter.setTransparency(modelDisplay.cubeTransparent);

    const cutState = this.cutter.computeCutState(solid, ids, this.resolver, topologyIndex);

    if (cutState) {
      this.objectModelManager.syncCutState({
        intersections: cutState.intersections,
        cutSegments: cutState.cutSegments,
        facePolygons: cutState.facePolygons,
        faceAdjacency: cutState.faceAdjacency
      });
    } else {
      console.warn("Structure-first cut failed, falling back to legacy CSG result.");
      this.objectModelManager.syncCutState({
        intersections: this.cutter.getIntersectionRefs(),
        cutSegments: this.cutter.getCutSegments(),
        facePolygons: this.cutter.getResultFacePolygons(),
        faceAdjacency: this.cutter.getResultFaceAdjacency()
      });
    }

    const explanation = generateExplanation({
      snapIds: ids,
      outlineRefs: this.cutter.getOutlineRefs(),
      structure: structure || solid
    });
    this.ui.setExplanation(explanation);

    return true;
  }

  syncFromCutterResult(solid: SolidSSOT | null = null) {
    this.objectModelManager.applyCutDisplayToView({ cutter: this.cutter });
    const display = this.objectModelManager.getDisplayState();
    this.cutter.setTransparency(display.cubeTransparent);
    this.objectModelManager.syncCutState({
      intersections: this.cutter.getIntersectionRefs(),
      cutSegments: this.cutter.getCutSegments(),
      facePolygons: this.cutter.getResultFacePolygons() as any,
      faceAdjacency: this.cutter.getResultFaceAdjacency()
    });
    if (!solid) return;
    const explanation = generateExplanation({
      snapIds: this.selection.getSelectedSnapIds(),
      outlineRefs: this.cutter.getOutlineRefs(),
      structure: solid
    });
    this.ui.setExplanation(explanation);
  }

  applyCutResultMeta(meta: CutResultMeta, snapIds: SnapPointID[], structure: any) {
    this.cutter.applyCutResultMeta(meta, this.resolver);
    this.objectModelManager.syncCutState({
      intersections: this.cutter.getIntersectionRefs(),
      cutSegments: this.cutter.getCutSegments(),
      facePolygons: this.cutter.getResultFacePolygons() as any,
      faceAdjacency: this.cutter.getResultFaceAdjacency()
    });
    const explanation = generateExplanation({
      snapIds,
      outlineRefs: this.cutter.getOutlineRefs(),
      structure
    });
    this.ui.setExplanation(explanation);
  }
}
