import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Cutter } from '../js/Cutter.ts';
import { GeometryResolver } from '../js/geometry/GeometryResolver.ts';
import { getDefaultIndexMap } from '../js/geometry/indexMap.ts';
import { buildCubeStructure } from '../js/structure/structureModel.ts';
import { GeometryValidator } from '../scripts/GeometryValidator.ts';
import { buildObjectModelData } from '../js/model/objectModelBuilder.ts';

describe('Geometry Validation', () => {
  let cutter;
  let resolver;
  let cube;
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    cutter = new Cutter(scene);
    
    const structure = buildCubeStructure({ indexMap: getDefaultIndexMap() });
    const built = buildObjectModelData({
        structure,
        size: { lx: 10, ly: 10, lz: 10 },
        display: {
            showVertexLabels: true,
            showFaceLabels: true,
            edgeLabelMode: 'visible',
            showCutSurface: true,
            showPyramid: false,
            cubeTransparent: true,
            showCutPoints: true,
            colorizeCutLines: false,
            showNormalHelper: false
        }
    });
    if (!built) throw new Error("Failed to build model data");
    const ssot = built.ssot;

    resolver = new GeometryResolver({
      size: ssot.meta.size,
      indexMap: getDefaultIndexMap()
    });
    
    // Use SSOT object directly
    cube = ssot;
  });

  it('should produce a manifold and oriented mesh after a standard corner cut (triangle)', () => {
    const snapIds = ['V:4', 'V:1', 'V:7']; // Corner A, B, D equivalent in some mapping
    const success = cutter.cut(cube, snapIds, resolver);
    expect(success).toBe(true);

    // Validate Structure (Topology & Geometry)
    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons, resolver);
    console.log('Structure Validation Result (Triangle):', structResult.details);

    expect(structResult.isManifold).toBe(true);
    expect(structResult.isOriented).toBe(true);
    expect(structResult.hasDegenerateFaces).toBe(false);
    expect(structResult.hasNonPlanarFaces).toBe(false);
    expect(structResult.eulerCharacteristic).toBe(2);
  });

  it.skip('should produce a manifold and oriented mesh after a midpoint cut (hexagon) - TODO: Fix SSOT topology inconsistency', () => {
    // 6 midpoints cut (passes through midpoints of edges forming a hexagon)
    const snapIds = ['E:4-5@1/2', 'E:5-1@1/2', 'E:1-2@1/2']; 
    
    const success = cutter.cut(cube, snapIds, resolver);
    expect(success).toBe(true);

    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons, resolver);
    console.log('Structure Validation Result (Hexagon):', structResult.details);
    
    expect(structResult.isManifold).toBe(true);
    expect(structResult.isOriented).toBe(true);
    expect(structResult.hasDegenerateFaces).toBe(false);
    expect(structResult.eulerCharacteristic).toBe(2);
  });

  it('should handle parallel cut correctly (Parallel to Face)', () => {
    // Cut parallel to top/bottom face, through midpoints of vertical edges
    // Vertical edges usually connect top and bottom vertices.
    // Assuming standard cube indexing: 0-4, 1-5, 2-6, 3-7 are vertical edges
    const snapIds = ['E:0-4@1/2', 'E:1-5@1/2', 'E:2-6@1/2'];
    const success = cutter.cut(cube, snapIds, resolver);
    expect(success).toBe(true);

    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons, resolver);
    console.log('Structure Validation Result (Parallel):', structResult.details);

    expect(structResult.isManifold).toBe(true);
    expect(structResult.isOriented).toBe(true);
    expect(structResult.hasDegenerateFaces).toBe(false);
    expect(structResult.eulerCharacteristic).toBe(2);
  });

  it('should handle tiny corner cut (Degeneracy Check)', () => {
    // Cut very close to corner V:4
    // E:4-5, E:4-0, E:4-7
    const snapIds = ['E:4-5@1/100', 'E:4-0@1/100', 'E:4-7@1/100'];
    const success = cutter.cut(cube, snapIds, resolver);
    expect(success).toBe(true);

    const polygons = cutter.getResultFacePolygons();
    const structResult = GeometryValidator.validateStructure(polygons, resolver);
    console.log('Structure Validation Result (Tiny):', structResult.details);

    expect(structResult.isManifold).toBe(true);
    expect(structResult.isOriented).toBe(true);
    expect(structResult.hasDegenerateFaces).toBe(false);
    expect(structResult.eulerCharacteristic).toBe(2);
  });

  it.skip('should handle coplanar cut (Existing Face) - TODO: Fix Coplanar handling', () => {
    // Cut defined by 3 corners of the top face: V:0, V:1, V:5
    // This defines the top face plane exactly.
    const snapIds = ['V:0', 'V:1', 'V:5'];
    const success = cutter.cut(cube, snapIds, resolver);
    
    // Coplanar cut might return false or handle it gracefully
    // If it returns true, the result should be valid (e.g., empty cut or same cube)
    if (success) {
        const polygons = cutter.getResultFacePolygons();
        const structResult = GeometryValidator.validateStructure(polygons, resolver);
        console.log('Structure Validation Result (Coplanar):', structResult.details);
        
        // Coplanar cut usually results in the same cube or empty, 
        // but it should be a valid manifold if returned.
        expect(structResult.isManifold).toBe(true);
    }
  });
});
