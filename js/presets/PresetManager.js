import * as THREE from 'three';
import { PRESETS } from './presetData.js';

export class PresetManager {
    constructor(selectionManager, cube, cutter) {
        this.selectionManager = selectionManager;
        this.cube = cube;
        this.cutter = cutter;
        this.presets = PRESETS;
    }

    applyPreset(name) {
        const preset = this.presets.find(p => p.name === name);
        if (!preset) return;

        console.log(`--- Applying Preset: ${name} ---`);
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
        console.log('---------------------------------');
    }
    
    getPresets() {
        return this.presets;
    }
    
    getNames() {
        return this.presets.map(p => p.name);
    }
}
