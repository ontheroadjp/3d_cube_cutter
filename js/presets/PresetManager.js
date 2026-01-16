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
        preset.points.forEach(ptDef => {
            let point, object;

            if (ptDef.type === 'vertex') {
                object = this.cube.getVertexObjectByName(ptDef.name);
                if (!object) {
                    console.warn(`Vertex preset point ${ptDef.name} not found.`);
                    return;
                }
                point = this.cube.vertices[object.userData.index];
                console.log(`Type: vertex, Name: ${ptDef.name}, Point:`, point);
            } 
            else if (ptDef.type === 'edge') {
                object = this.cube.getEdgeObjectByName(ptDef.name);
                if (!object) {
                    console.warn(`Edge preset point ${ptDef.name} not found.`);
                    return;
                }
                const edge = this.cube.edges[object.userData.index];
                point = new THREE.Vector3().lerpVectors(edge.start, edge.end, ptDef.ratio);
                console.log(`Type: edge, Name: ${ptDef.name}, Ratio: ${ptDef.ratio}`);
                console.log('Edge start:', edge.start);
                console.log('Edge end:', edge.end);
                console.log('Calculated Point:', point);
            }

            if (point && object) {
                this.selectionManager.addPoint({ point, object });
            }
        });
        console.log('---------------------------------');
    }
    
    getNames() {
        return this.presets.map(p => p.name);
    }
}
