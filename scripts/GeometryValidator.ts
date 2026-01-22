import * as THREE from 'three';
import type { CutFacePolygon } from '../js/types.js';

export interface ValidationResult {
  isManifold: boolean;
  isOriented?: boolean;
  hasDegenerateFaces?: boolean;
  hasNonPlanarFaces?: boolean;
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
   * resolverが提供された場合は、幾何学的な妥当性(面積、平面性)も検証する。
   */
  static validateStructure(polygons: CutFacePolygon[], resolver?: any): ValidationResult {
    const details: string[] = [];
    
    // 1. 頂点の収集
    const uniqueVertices = new Set<string>();
    polygons.forEach(poly => {
        if (poly.vertexIds) {
            poly.vertexIds.forEach(id => uniqueVertices.add(id));
        }
    });

    // 2. 辺の解析 (無向 & 有向)
    const undirectedEdges = new Map<string, number>();
    const directedEdges = new Map<string, number>();
    
    polygons.forEach(poly => {
        if (!poly.vertexIds || poly.vertexIds.length < 3) return;
        
        for (let i = 0; i < poly.vertexIds.length; i++) {
            const v1 = poly.vertexIds[i];
            const v2 = poly.vertexIds[(i + 1) % poly.vertexIds.length];
            
            if (v1 === v2) continue;

            // Undirected
            const uKey = [v1, v2].sort().join('|');
            undirectedEdges.set(uKey, (undirectedEdges.get(uKey) || 0) + 1);

            // Directed
            const dKey = `${v1}->${v2}`;
            directedEdges.set(dKey, (directedEdges.get(dKey) || 0) + 1);
        }
    });

    // 3. 多様体チェック (無向グラフ)
    let isManifold = true;
    let openEdges = 0;
    undirectedEdges.forEach((count) => {
        if (count !== 2) {
            isManifold = false;
            if (count === 1) openEdges++;
        }
    });

    // 4. 向きの整合性チェック (有向グラフ)
    let isOriented = true;
    let orientationErrors = 0;
    directedEdges.forEach((count, key) => {
        // 同じ向きのエッジは1回しか出現してはならない（2回以上は非多様体 or 重複面）
        if (count > 1) {
            isOriented = false;
        }
        // 逆向きのエッジが存在しなければならない
        const [v1, v2] = key.split('->');
        const reverseKey = `${v2}->${v1}`;
        if (!directedEdges.has(reverseKey)) {
            isOriented = false;
            orientationErrors++;
        }
    });
    
    // 5. 幾何学的妥当性チェック
    let hasDegenerateFaces = false;
    let hasNonPlanarFaces = false;
    let degenerateCount = 0;
    
    if (resolver && typeof resolver.resolveSnapPoint === 'function') {
        polygons.forEach((poly, index) => {
            if (!poly.vertexIds || poly.vertexIds.length < 3) return;
            // any キャストしてThree.jsの型推論エラーを回避
            const points = poly.vertexIds.map(id => resolver.resolveSnapPoint(id)).filter((p: any) => p) as THREE.Vector3[];
            if (points.length < 3) return;

            // 面積ゼロ判定 (縮退) - 多角形の場合は外積の合計を見るのが確実だが、ここでは簡易的に隣接3点
            // より正確には、多角形の法線ベクトルを求めて長さを見る
            const normalSum = new THREE.Vector3();
            for(let i=0; i<points.length; i++){
                const current = points[i];
                const next = points[(i+1)%points.length];
                normalSum.add(new THREE.Vector3().crossVectors(current, next)); // 原点周りの面積和(法線方向)
            }
            // 任意点周りの外積和の方が安全だが、凸多角形ならこれで概ね非ゼロ判定可能
            // 厳密には (p1-p0)x(p2-p0) ...
            
            const v0 = points[0];
            const v1 = points[1];
            const v2 = points[2];
            const triNormal = new THREE.Vector3().crossVectors(
                new THREE.Vector3().subVectors(v1, v0),
                new THREE.Vector3().subVectors(v2, v0)
            );
            
            if (triNormal.length() < 1e-6) {
                 // 最初の3点が一直線上にある場合、他の点も確認する必要があるが、
                 // 今回は「単純化されたポリゴン」を前提とするなら、これでも検出可能
                 // ただし厳密には全三角形分割面積の総和が0かで判定すべき
                 hasDegenerateFaces = true;
                 degenerateCount++;
            }
            
            // 平面性判定 (4頂点以上の場合)
            if (points.length > 3) {
                 const plane = new THREE.Plane().setFromCoplanarPoints(v0, v1, v2);
                 for (let i = 3; i < points.length; i++) {
                     if (Math.abs(plane.distanceToPoint(points[i])) > 1e-4) {
                         hasNonPlanarFaces = true;
                     }
                 }
            }
        });
    }

    // 6. オイラー標数
    const V = uniqueVertices.size;
    const E = undirectedEdges.size;
    const F = polygons.length;
    const euler = V - E + F;

    const detailsResult = [
        `Structure Vertices: ${V}, Edges: ${E}, Faces: ${F}`,
        `Euler Characteristic: ${euler} (Expected: 2)`,
        `Open Edges (Boundaries): ${openEdges}`,
        `Orientation Consistent: ${isOriented}`,
    ];
    
    if (resolver) {
        detailsResult.push(`Degenerate Faces: ${degenerateCount}`);
        detailsResult.push(`Has Non-Planar Faces: ${hasNonPlanarFaces}`);
    }

    return {
      isManifold,
      isOriented,
      hasDegenerateFaces,
      hasNonPlanarFaces,
      eulerCharacteristic: euler,
      degenerateTriangles: degenerateCount,
      duplicateVertices: 0,
      isolatedVertices: 0,
      details: detailsResult
    };
  }
}
