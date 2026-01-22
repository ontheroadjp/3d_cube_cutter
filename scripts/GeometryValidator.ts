import * as THREE from 'three';
import type { CutFacePolygon } from '../js/types.js';

export interface ValidationResult {
  isManifold: boolean;
  eulerCharacteristic: number;
  degenerateTriangles: number;
  duplicateVertices: number;
  isolatedVertices: number;
  details: string[];
}

export class GeometryValidator {
  /**
   * BufferGeometry の整合性を包括的にチェックする
   */
  static validate(geometry: THREE.BufferGeometry): ValidationResult {
    const details: string[] = [];
    const position = geometry.attributes.position;
    const index = geometry.index;

    if (!position) throw new Error("Position attribute is missing.");

    // 1. 重複頂点のチェック
    const uniqueVertices = new Set();
    let duplicateCount = 0;
    for (let i = 0; i < position.count; i++) {
      const key = `${position.getX(i).toFixed(6)},${position.getY(i).toFixed(6)},${position.getZ(i).toFixed(6)}`;
      if (uniqueVertices.has(key)) duplicateCount++;
      else uniqueVertices.add(key);
    }

    // 2. 面と辺の解析
    const edges = new Map<string, number>();
    let degenerateTriangles = 0;
    const faceCount = index ? index.count / 3 : position.count / 3;

    const getVertexKey = (i: number) => {
      return `${position.getX(i).toFixed(6)},${position.getY(i).toFixed(6)},${position.getZ(i).toFixed(6)}`;
    };

    for (let i = 0; i < faceCount; i++) {
      const a = index ? index.getX(i * 3) : i * 3;
      const b = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const c = index ? index.getX(i * 3 + 2) : i * 3 + 2;

      // 退化三角形チェック
      if (a === b || b === c || c === a) {
        degenerateTriangles++;
        continue;
      }

      const keyA = getVertexKey(a);
      const keyB = getVertexKey(b);
      const keyC = getVertexKey(c);

      if (keyA === keyB || keyB === keyC || keyC === keyA) {
        degenerateTriangles++;
        continue;
      }

      // 辺を記録 (向きを無視してソート)
      const addEdge = (k1: string, k2: string) => {
        const key = [k1, k2].sort().join('|');
        edges.set(key, (edges.get(key) || 0) + 1);
      };
      addEdge(keyA, keyB);
      addEdge(keyB, keyC);
      addEdge(keyC, keyA);
    }

    // 3. 多様体チェック (すべての辺が2つの面に共有されているか)
    let isManifold = true;
    let openEdges = 0;
    edges.forEach((count, edge) => {
      if (count !== 2) {
        isManifold = false;
        if (count === 1) openEdges++;
      }
    });

    // 4. オイラー標数 (V - E + F)
    const V = uniqueVertices.size;
    const E = edges.size;
    const F = faceCount - degenerateTriangles;
    const euler = V - E + F;

    return {
      isManifold,
      eulerCharacteristic: euler,
      degenerateTriangles,
      duplicateVertices: duplicateCount,
      isolatedVertices: 0, // 簡易化のため
      details: [
        `Vertices: ${V}, Edges: ${E}, Faces: ${F}`,
        `Euler Characteristic: ${euler} (Expected: 2 for simple closed mesh)`,
        `Open Edges (Boundaries): ${openEdges}`,
        `Degenerate Triangles: ${degenerateTriangles}`,
        `Duplicate Vertices: ${duplicateCount}`
      ]
    };
  }

  /**
   * 構造データ(Polygons)の整合性をIDベースでチェックする
   * 座標誤差に依存せず、論理的な接続関係(Topology)のみを検証する。
   */
  static validateStructure(polygons: CutFacePolygon[]): ValidationResult {
    const details: string[] = [];
    
    // 1. 頂点の収集
    const uniqueVertices = new Set<string>();
    polygons.forEach(poly => {
        if (poly.vertexIds) {
            poly.vertexIds.forEach(id => uniqueVertices.add(id));
        }
    });

    // 2. 辺の解析
    const edges = new Map<string, number>();
    
    polygons.forEach(poly => {
        if (!poly.vertexIds || poly.vertexIds.length < 3) return;
        
        for (let i = 0; i < poly.vertexIds.length; i++) {
            const v1 = poly.vertexIds[i];
            const v2 = poly.vertexIds[(i + 1) % poly.vertexIds.length];
            
            // 自己ループチェック
            if (v1 === v2) continue;

            const key = [v1, v2].sort().join('|');
            edges.set(key, (edges.get(key) || 0) + 1);
        }
    });

    // 3. 多様体チェック
    let isManifold = true;
    let openEdges = 0;
    edges.forEach((count, edgeKey) => {
        if (count !== 2) {
            isManifold = false;
            if (count === 1) openEdges++;
            // 3回以上共有されている場合も非多様体だが、単純化のためここではOpenEdgeのみカウント
        }
    });

    // 4. オイラー標数 (V - E + F)
    const V = uniqueVertices.size;
    const E = edges.size;
    const F = polygons.length;
    
    // 多面体(閉局面)のオイラー標数は、面が多角形であっても V - E + F = 2 (球と同相なら)
    const euler = V - E + F;

    return {
      isManifold,
      eulerCharacteristic: euler,
      degenerateTriangles: 0,
      duplicateVertices: 0,
      isolatedVertices: 0,
      details: [
        `Structure Vertices: ${V}, Edges: ${E}, Faces: ${F}`,
        `Euler Characteristic: ${euler} (Expected: 2)`,
        `Open Edges (Boundaries): ${openEdges}`
      ]
    };
  }
}
