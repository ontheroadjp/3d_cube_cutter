// tests/Cutter.test.js

import { jest } from '@jest/globals';
import * as THREE from 'three';

// Mock utils.js to prevent DOM-related errors in Node.js environment
// This mock creates plain objects with the same "shape" as the real ones,
// without referencing out-of-scope variables like THREE.
jest.mock('../js/utils.js', () => ({
    createLabel: jest.fn(() => ({
        position: {
            copy: jest.fn(function() { return this; }),
            add: jest.fn(function() { return this; })
        },
        scale: {
            copy: jest.fn(function() { return this; }),
            add: jest.fn(function() { return this; })
        },
        visible: false,
    })),
    createMarker: jest.fn((position) => ({
        position: {
            x: position ? position.x : 0,
            y: position ? position.y : 0,
            z: position ? position.z : 0,
            clone: jest.fn(function() { return {...this}; })
        },
        geometry: { dispose: jest.fn() },
        material: { dispose: jest.fn() },
        userData: {}
    }))
}));

import { Cutter } from '../js/Cutter.js';
import { Cube } from '../js/Cube.js';

// Helper function to create a simple scene for testing and spy on its methods
const createTestScene = () => {
    const scene = new THREE.Scene();
    scene.add = jest.fn(scene.add);
    scene.remove = jest.fn(scene.remove);
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
    let scene, cube, cutter;

    beforeEach(() => {
        scene = createTestScene();
        cube = new Cube(scene, 10);
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
            const p1 = new THREE.Vector3(0, -5, 5);
            const p2 = new THREE.Vector3(5, -5, 0);
            const p3 = new THREE.Vector3(5, 0, 5);
            const points = [p1, p2, p3];

            const success = cutter.cut(cube, points);

            expect(success).toBe(true);
            expect(cutter.resultMesh).toBeDefined();
            expect(cutter.removedMesh).toBeDefined();
            expect(cutter.outline).toBeDefined();
            expect(cutter.intersections.length).toBe(3);
            
            const expectedRemovedVolume = (5 * 5 * 5) / 6;
            const removedVolume = getVolumeOfMesh(cutter.removedMesh);
            expect(removedVolume).toBeCloseTo(expectedRemovedVolume, 1);
        });

        it('should return false for collinear points', () => {
            const edgeAB = cube.getEdgeLine('AB');
            const p1 = edgeAB.start.clone().lerp(edgeAB.end, 0.1);
            const p2 = edgeAB.start.clone().lerp(edgeAB.end, 0.5);
            const p3 = edgeAB.start.clone().lerp(edgeAB.end, 0.9);
            const points = [p1, p2, p3];

            const success = cutter.cut(cube, points);

            expect(success).toBe(false);
            expect(cutter.resultMesh).toBeNull();
            expect(cutter.removedMesh).toBeNull();
        });

        it('should find 4 intersection points for a square cut', () => {
            const p1 = cube.getEdgeLine('DH').start.clone().lerp(cube.getEdgeLine('DH').end, 0.5);
            const p2 = cube.getEdgeLine('CG').start.clone().lerp(cube.getEdgeLine('CG').end, 0.5);
            const p3 = cube.getEdgeLine('BF').start.clone().lerp(cube.getEdgeLine('BF').end, 0.5);

            const points = [p1, p2, p3];
            const success = cutter.cut(cube, points);

            expect(success).toBe(true);
            expect(cutter.intersections.length).toBe(4);
        });
    });

    describe('flipCut method', () => {
        it('should swap resultMesh and removedMesh volumes after flipping', () => {
            const p1 = new THREE.Vector3(0, -5, 5);
            const p2 = new THREE.Vector3(5, -5, 0);
            const p3 = new THREE.Vector3(5, 0, 5);
            const points = [p1, p2, p3];
            cutter.cut(cube, points);

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
    });
});