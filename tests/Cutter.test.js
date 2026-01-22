// tests/Cutter.test.js

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// Mock utils.js to prevent DOM-related errors in Node.js environment
// This mock creates plain objects with the same "shape" as the real ones,
// without referencing out-of-scope variables like THREE.
vi.mock('../dist/js/utils.js', () => ({
    createLabel: vi.fn(() => ({
        position: {
            copy: vi.fn(function() { return this; }),
            add: vi.fn(function() { return this; })
        },
        scale: {
            copy: vi.fn(function() { return this; }),
            add: vi.fn(function() { return this; })
        },
        visible: false,
    })),
    createMarker: vi.fn((position) => ({
        position: {
            x: position ? position.x : 0,
            y: position ? position.y : 0,
            z: position ? position.z : 0,
            clone: vi.fn(function() { return {...this}; })
        },
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
        userData: {}
    }))
}));

import { Cutter } from '../dist/js/Cutter.js';
import { Cube } from '../dist/js/Cube.js';
import { GeometryResolver } from '../dist/js/geometry/GeometryResolver.js';
import { buildUserPresetState } from '../dist/js/presets/userPresetState.js';

// Helper function to create a simple scene for testing and spy on its methods
const createTestScene = () => {
    const scene = new THREE.Scene();
    scene.add = vi.fn();
    scene.remove = vi.fn();
    return scene;
};

// Helper function to calculate approximate volume for simple convex geometries
const getVolumeOfMesh = (mesh) => {
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) return 0;
    
    const position = mesh.geometry.attributes.position;
    const index = mesh.geometry.index;
    let volume = 0;
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            p1.fromBufferAttribute(position, index.getX(i));
            p2.fromBufferAttribute(position, index.getX(i + 1));
            p3.fromBufferAttribute(position, index.getX(i + 2));
            volume += p1.dot(p2.cross(p3));
        }
    } else {
        for (let i = 0; i < position.count; i += 3) {
            p1.fromBufferAttribute(position, i);
            p2.fromBufferAttribute(position, i + 1);
            p3.fromBufferAttribute(position, i + 2);
            volume += p1.dot(p2.cross(p3));
        }
    }
    return Math.abs(volume / 6);
};


describe('Cutter', () => {
    let scene, cube, cutter, resolver;

    beforeEach(() => {
        scene = createTestScene();
        cube = new Cube(scene, 10);
        resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
        cutter = new Cutter(scene);
        scene.add.mockClear();
        scene.remove.mockClear();
    });

    afterEach(() => {
        cutter.reset();
    });

    it('should initialize correctly', () => {
        expect(cutter.scene).toBe(scene);
        expect(cutter.resultMesh).toBeNull();
        expect(cutter.removedMesh).toBeNull();
        expect(cutter.evaluator).toBeDefined();
    });

    it('reset should remove meshes and clear state', () => {
        cutter.resultMesh = new THREE.Mesh();
        cutter.removedMesh = new THREE.Mesh();
        cutter.outline = new THREE.Line();
        cutter.vertexMarkers.push(new THREE.Mesh());
        cutter.reset();

        expect(cutter.resultMesh).toBeNull();
        expect(cutter.removedMesh).toBeNull();
        expect(cutter.outline).toBeNull();
        expect(cutter.vertexMarkers).toEqual([]);
        expect(scene.remove).toHaveBeenCalled();
    });

    describe('cut method', () => {
        it('should perform a simple corner cut successfully and validate volume', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];

            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            expect(cutter.resultMesh).toBeDefined();
            expect(cutter.removedMesh).toBeDefined();
            expect(cutter.outline).toBeDefined();
            expect(cutter.getIntersectionRefs().length).toBeGreaterThanOrEqual(3);
            
            const expectedRemovedVolume = (5 * 5 * 5) / 6;
            const removedVolume = getVolumeOfMesh(cutter.removedMesh);
            expect(removedVolume).toBeCloseTo(expectedRemovedVolume, 1);
        });

        it('should expose cut result with outline refs and cut segments', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];

            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const cutResult = cutter.getCutResult();
            const outline = cutResult.outline.points;
            expect(Array.isArray(outline)).toBe(true);
            expect(outline.length).toBeGreaterThanOrEqual(3);
            outline.forEach(ref => {
                expect(ref.id).toBeDefined();
                expect(ref.position).toBeUndefined();
                expect(cutter.resolveIntersectionPosition(ref)).toBeInstanceOf(THREE.Vector3);
            });
            expect(cutter.getOutlineRefs().length).toBe(outline.length);
            expect(cutResult.cutSegments.length).toBe(outline.length);
            cutResult.cutSegments.forEach(segment => {
                expect(segment.startId).toBeDefined();
                expect(segment.endId).toBeDefined();
            });
        });

        it('should assign faceIds to intersection refs for snapId inputs', () => {
            const snapIds = ['V:1', 'V:3', 'E:47@3/10'];

            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const refs = cutter.getIntersectionRefs();
            expect(refs.length).toBeGreaterThan(0);
            refs.forEach(ref => {
                expect(Array.isArray(ref.faceIds)).toBe(true);
                expect(ref.faceIds.length).toBeGreaterThan(0);
            });
        });

        it('should return false for collinear points', () => {
            const snapIds = ['E:01@1/4', 'E:01@1/2', 'E:01@3/4'];

            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(false);
            expect(cutter.resultMesh).toBeNull();
            expect(cutter.removedMesh).toBeNull();
        });

        it('should find 4 intersection points for a square cut', () => {
            const snapIds = ['E:04@1/2', 'E:15@1/2', 'E:26@1/2'];
            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            expect(cutter.getOutlineRefs().length).toBe(4);
        });

        it('should assign faceIds for cut segments', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const segments = cutter.getCutSegments();
            expect(segments.length).toBeGreaterThanOrEqual(3);
            segments.forEach(segment => {
                expect(Array.isArray(segment.faceIds)).toBe(true);
                expect(segment.faceIds.length).toBeGreaterThan(0);
            });
        });

        it('should return face polygons with vertexIds after cut', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const polygons = cutter.getResultFacePolygons();
            expect(polygons.length).toBeGreaterThan(0);
            polygons.forEach(polygon => {
                expect(Array.isArray(polygon.vertexIds)).toBe(true);
                expect(polygon.vertexIds.length).toBeGreaterThan(2);
                expect(polygon.vertices).toBeUndefined();
            });
        });

        it('should resolve cut segments via resolver when positions are not stored', () => {
            const resolveSnapPoint = vi.fn((id) => {
                if (id === 'V:0') return new THREE.Vector3(0, 0, 0);
                if (id === 'V:1') return new THREE.Vector3(1, 0, 0);
                return null;
            });
            cutter.lastResolver = { resolveSnapPoint };
            cutter.cutSegments = [{ startId: 'V:0', endId: 'V:1' }];

            const segments = cutter.resolveCutSegments();

            expect(resolveSnapPoint).toHaveBeenCalledWith('V:0');
            expect(resolveSnapPoint).toHaveBeenCalledWith('V:1');
            expect(segments.length).toBe(1);
            expect(segments[0].start).toBeInstanceOf(THREE.Vector3);
            expect(segments[0].end).toBeInstanceOf(THREE.Vector3);
        });

        it('should form a closed outline loop from cut segments', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const segments = cutter.getCutSegments();
            const degrees = new Map();
            segments.forEach(seg => {
                degrees.set(seg.startId, (degrees.get(seg.startId) || 0) + 1);
                degrees.set(seg.endId, (degrees.get(seg.endId) || 0) + 1);
            });
            degrees.forEach(deg => {
                expect(deg).toBe(2);
            });
        });
    });

    describe('flipCut method', () => {
        it('should swap resultMesh and removedMesh volumes after flipping', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            cutter.cut(cube, snapIds, resolver);

            const initialResultVolume = getVolumeOfMesh(cutter.resultMesh);
            const initialRemovedVolume = getVolumeOfMesh(cutter.removedMesh);
            const totalCubeVolume = 10 * 10 * 10;

            cutter.flipCut();

            const flippedResultVolume = getVolumeOfMesh(cutter.resultMesh);
            const flippedRemovedVolume = getVolumeOfMesh(cutter.removedMesh);

            expect(flippedResultVolume).toBeCloseTo(initialRemovedVolume, 1);
            expect(flippedRemovedVolume).toBeCloseTo(initialResultVolume, 1);
            expect(flippedResultVolume + flippedRemovedVolume).toBeCloseTo(totalCubeVolume, 1);
        });

        it('should keep outline and cut segments consistent with intersection refs', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            const success = cutter.cut(cube, snapIds, resolver);

            expect(success).toBe(true);
            const outlineRefs = cutter.getOutlineRefs();
            const cutSegments = cutter.getCutSegments();

            expect(outlineRefs.length).toBeGreaterThanOrEqual(3);
            expect(cutSegments.length).toBe(outlineRefs.length);

            outlineRefs.forEach(ref => {
                expect(ref.id).toBeDefined();
                expect(ref.position).toBeUndefined();
                expect(cutter.resolveIntersectionPosition(ref)).toBeInstanceOf(THREE.Vector3);
            });

            const ids = new Set(outlineRefs.map(ref => ref.id));
            cutSegments.forEach(seg => {
                expect(ids.has(seg.startId)).toBe(true);
                expect(ids.has(seg.endId)).toBe(true);
            });
        });

        it('should restore cut result meta from user preset state', () => {
            const snapIds = ['E:01@1/2', 'E:12@1/2', 'E:15@1/2'];
            cutter.cut(cube, snapIds, resolver);

            const selection = { getSelectedSnapIds: () => snapIds };
            const ui = { getDisplayState: () => null };
            const state = buildUserPresetState({ cube, selection, cutter, ui });

            const cutter2 = new Cutter(scene);
            cutter2.cut(cube, snapIds, resolver);
            const applied = cutter2.applyCutResultMeta(state.cut.result, resolver);

            expect(applied).toBe(true);
            expect(cutter2.getOutlineRefs().length).toBe(state.cut.result.outline.length);
            expect(cutter2.getIntersectionRefs().length).toBe(state.cut.result.intersections.length);
            expect(cutter2.getCutSegments().length).toBe(state.cut.result.cutSegments.length);

            const expectedSegments = state.cut.result.cutSegments.filter(seg => seg.faceIds && seg.faceIds.length);
            if (expectedSegments.length > 0) {
                const hasFaceIds = cutter2.getCutSegments().some(seg => seg.faceIds && seg.faceIds.length);
                expect(hasFaceIds).toBe(true);
            }

            cutter2.reset();
        });
    });
});
