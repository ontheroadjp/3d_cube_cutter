import * as THREE from 'three';
import { PRESETS } from './presetData.js';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';

export class PresetManager {
    constructor(selectionManager, cube, cutter, resolver = null) {
        this.selectionManager = selectionManager;
        this.cube = cube;
        this.cutter = cutter;
        this.resolver = resolver;
        this.presets = PRESETS;
    }

    applyPreset(name) {
        const preset = this.presets.find(p => p.name === name);
        if (!preset) return;

        console.log(`--- Applying Preset: ${name} ---`);
        if (preset.snapIds && this.resolver) {
            preset.snapIds.forEach(snapId => {
                const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
                if (!parsed) {
                    console.warn(`Invalid snapId in preset: ${name}`);
                    return;
                }
                const point = this.resolver.resolveSnapPointRef(parsed);
                if (!point) {
                    console.warn(`Failed to resolve snapId: ${snapId}`);
                    return;
                }
                let object = null;
                let isMidpoint = false;
                if (parsed.type === 'vertex') {
                    const vertexId = `V:${parsed.vertexIndex}`;
                    object = this.cube.getVertexObjectById(vertexId);
                    if (!object) {
                        const label = this.cube.getVertexLabelByIndex(parsed.vertexIndex);
                        if (label) object = this.cube.getVertexObjectByName(label);
                    }
                } else if (parsed.type === 'edge') {
                    const edgeId = `E:${parsed.edgeIndex}`;
                    object = this.cube.getEdgeObjectById(edgeId);
                    if (!object) {
                        const edgeName = this.cube.getEdgeNameByIndex(parsed.edgeIndex);
                        if (edgeName) object = this.cube.getEdgeObjectByName(edgeName);
                    }
                    if (parsed.ratio) {
                        isMidpoint = parsed.ratio.numerator * 2 === parsed.ratio.denominator;
                    }
                }
                this.selectionManager.addPoint({ point, object, isMidpoint, snapId });
            });
        } else {
            // getPointsで生成された{point, object}のリストを取得
            const pointsToSelect = preset.getPoints(this.cube);

            // リストをループして、各点をSelectionManagerに追加
            pointsToSelect.forEach(selectionInfo => {
                if (selectionInfo && selectionInfo.point && selectionInfo.object) {
                    this.selectionManager.addPoint(selectionInfo);
                } else {
                    console.warn(`Invalid point definition in preset: ${name}`);
                }
            });
        }
        console.log('---------------------------------');
    }
    
    getPresets() {
        return this.presets;
    }
    
    getNames() {
        return this.presets.map(p => p.name);
    }
}
