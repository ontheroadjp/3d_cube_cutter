import * as THREE from 'three';
import { PRESETS } from './presetData.js';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';
import type { Preset } from '../types.js';
import type { SelectionManager } from '../SelectionManager.js';
import type { Cube } from '../Cube.js';
import type { Cutter } from '../Cutter.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';

export class PresetManager {
    selectionManager: SelectionManager;
    cube: Cube;
    cutter: Cutter;
    resolver: GeometryResolver | null;
    presets: Preset[];

    constructor(selectionManager: SelectionManager, cube: Cube, cutter: Cutter, resolver: GeometryResolver | null = null) {
        this.selectionManager = selectionManager;
        this.cube = cube;
        this.cutter = cutter;
        this.resolver = resolver;
        this.presets = PRESETS;
    }

    applyPreset(name: string) {
        const preset = this.presets.find(p => p.name === name);
        if (!preset) return;

        console.log(`--- Applying Preset: ${name} ---`);
        if (!preset.snapIds || !preset.snapIds.length) {
            console.warn(`Preset is missing snapIds: ${name}`);
            return;
        }
        if (!this.resolver) {
            console.warn(`Preset resolver is not available: ${name}`);
            return;
        }

        preset.snapIds.forEach((snapId) => {
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
            let object: THREE.Object3D | undefined = undefined;
            let isMidpoint = false;
            if (parsed.type === 'vertex') {
                const vertexId = `V:${parsed.vertexIndex}`;
                object = this.cube.getVertexObjectById(vertexId);
            } else if (parsed.type === 'edge') {
                const edgeId = `E:${parsed.edgeIndex}`;
                object = this.cube.getEdgeObjectById(edgeId);
                if (parsed.ratio) {
                    isMidpoint = parsed.ratio.numerator * 2 === parsed.ratio.denominator;
                }
            }
            this.selectionManager.addPoint({ point, object, isMidpoint, snapId });
        });
        console.log('---------------------------------');
    }
    
    getPresets(): Preset[] {
        return this.presets;
    }
    
    getNames(): string[] {
        return this.presets.map(p => p.name);
    }
}
