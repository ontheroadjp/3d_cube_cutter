import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Cutter } from '../js/Cutter.ts';
import { GeometryResolver } from '../js/geometry/GeometryResolver.ts';
import { getDefaultIndexMap } from '../js/geometry/indexMap.ts';
import { buildCubeStructure } from '../js/structure/structureModel.ts';
import { GeometryValidator } from '../scripts/GeometryValidator.ts';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

describe('Geometry Validation', () => {
  let cutter;
  let resolver;
  let cube;
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    cutter = new Cutter(scene);
    resolver = new GeometryResolver({
      size: { lx: 10, ly: 10, lz: 10 },
      indexMap: getDefaultIndexMap()
    });
    
    // Mock cube for Cutter
    const structure = buildCubeStructure({ indexMap: getDefaultIndexMap() });
    cube = {
      size: 10,
      cubeMesh: new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)),
      getStructure: () => structure,
      getSize: () => ({ lx: 10, ly: 10, lz: 10 }),
      getIndexMap: () => getDefaultIndexMap(),
      getEdgeMeshIndexById: (id) => id,
      edgeLabels: []
    };
  });

  it('should produce a manifold mesh after a standard corner cut (triangle)', () => {
    const snapIds = ['V:4', 'V:1', 'V:7']; // Corner A, B, D equivalent in some mapping
    const success = cutter.cut(cube, snapIds, resolver);
    console.log('Result Mesh Groups:', cutter.resultMesh.geometry.groups);
    expect(success).toBe(true);

    // Validate Structure (Topology) - SSOT Check
    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons);
    console.log('Structure Validation Result:', structResult.details);

    expect(structResult.isManifold).toBe(true);
    expect(structResult.eulerCharacteristic).toBe(2);

    /*
    // Old Coordinate-based check
    cutter.resultMesh.geometry.deleteAttribute('normal');
    const welded = BufferGeometryUtils.mergeVertices(cutter.resultMesh.geometry);
    const result = GeometryValidator.validate(welded);
    
    console.log('Validation Result (Triangle Cut):', result.details);
    
    expect(result.isManifold).toBe(true);
    expect(result.degenerateTriangles).toBe(0);
    expect(result.eulerCharacteristic).toBe(2);
    */
  });

  it('should produce a manifold mesh after a midpoint cut (hexagon)', () => {
    // 6 midpoints cut
    const snapIds = ['E:4-5@1/2', 'E:5-1@1/2', 'E:1-2@1/2']; 
    
    const success = cutter.cut(cube, snapIds, resolver);
    expect(success).toBe(true);

    // Validate Structure
    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons);
    
    expect(structResult.isManifold).toBe(true);
    expect(structResult.eulerCharacteristic).toBe(2);
  });
});
