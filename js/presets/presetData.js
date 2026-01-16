import * as THREE from 'three';

export const PRESETS = [
    {
        name: "正三角形 (角切り)",
        category: "triangle",
        description: "頂点Bに集まる3つの辺の同じ比率の点を結ぶ",
        getPoints: (cube) => {
            const ratio = 0.3;
            const edgeAB = cube.getEdgeLine('AB');
            const edgeBC = cube.getEdgeLine('BC');
            const edgeBF = cube.getEdgeLine('BF');

            return [
                { point: new THREE.Vector3().lerpVectors(edgeAB.start, edgeAB.end, ratio), object: cube.getEdgeObjectByName('AB') },
                { point: new THREE.Vector3().lerpVectors(edgeBC.start, edgeBC.end, ratio), object: cube.getEdgeObjectByName('BC') },
                { point: new THREE.Vector3().lerpVectors(edgeBF.start, edgeBF.end, ratio), object: cube.getEdgeObjectByName('BF') }
            ];
        }
    },
    {
        name: "台形",
        category: "quad",
        description: "底面の対角線BDと、辺EH上の点を結ぶ",
        getPoints: (cube) => {
            const vertexB = cube.getVertexPosition('B');
            const vertexD = cube.getVertexPosition('D');
            const edgeEH = cube.getEdgeLine('EH');

            return [
                { point: vertexB, object: cube.getVertexObjectByName('B') },
                { point: vertexD, object: cube.getVertexObjectByName('D') },
                { point: new THREE.Vector3().lerpVectors(edgeEH.start, edgeEH.end, 0.3), object: cube.getEdgeObjectByName('EH') }
            ];
        }
    },
    {
        name: "長方形（垂直）",
        category: "quad",
        description: "y軸に垂直な平面で水平に切る",
        getPoints: (cube) => {
            const ratio = 0.7;
            const edgeAE = cube.getEdgeLine('AE');
            const edgeBF = cube.getEdgeLine('BF');
            const edgeCG = cube.getEdgeLine('CG');

            return [
                { point: new THREE.Vector3().lerpVectors(edgeAE.start, edgeAE.end, ratio), object: cube.getEdgeObjectByName('AE') },
                { point: new THREE.Vector3().lerpVectors(edgeBF.start, edgeBF.end, ratio), object: cube.getEdgeObjectByName('BF') },
                { point: new THREE.Vector3().lerpVectors(edgeCG.start, edgeCG.end, ratio), object: cube.getEdgeObjectByName('CG') }
            ];
        }
    },
    {
        name: "長方形",
        category: "quad",
        description: "対角線AGを含む平面で切る",
        getPoints: (cube) => {
            const vertexA = cube.getVertexPosition('A');
            const vertexG = cube.getVertexPosition('G');
            const vertexE = cube.getVertexPosition('E');

            return [
                { point: vertexA, object: cube.getVertexObjectByName('A') },
                { point: vertexG, object: cube.getVertexObjectByName('G') },
                { point: vertexE, object: cube.getVertexObjectByName('E') }
            ];
        }
    },
    {
        name: "正方形",
        category: "quad",
        description: "y-z平面に平行な平面で切る",
        getPoints: (cube) => {
            const ratio = 0.25;
            const edgeAD = cube.getEdgeLine('AD');
            const edgeBC = cube.getEdgeLine('BC');
            const edgeFG = cube.getEdgeLine('FG');

            return [
                { point: new THREE.Vector3().lerpVectors(edgeAD.start, edgeAD.end, ratio), object: cube.getEdgeObjectByName('AD') },
                { point: new THREE.Vector3().lerpVectors(edgeBC.start, edgeBC.end, ratio), object: cube.getEdgeObjectByName('BC') },
                { point: new THREE.Vector3().lerpVectors(edgeFG.start, edgeFG.end, ratio), object: cube.getEdgeObjectByName('FG') }
            ];
        }
    },
    {
        name: "五角形",
        category: "poly",
        description: "5つの辺を通る切断",
        getPoints: (cube) => {
            const edgeAE = cube.getEdgeLine('AE');
            const edgeAB = cube.getEdgeLine('AB');
            const edgeBC = cube.getEdgeLine('BC');

            return [
                { point: new THREE.Vector3().lerpVectors(edgeAE.start, edgeAE.end, 0.3), object: cube.getEdgeObjectByName('AE') },
                { point: new THREE.Vector3().lerpVectors(edgeAB.start, edgeAB.end, 0.5), object: cube.getEdgeObjectByName('AB') },
                { point: new THREE.Vector3().lerpVectors(edgeBC.start, edgeBC.end, 0.5), object: cube.getEdgeObjectByName('BC') }
            ];
        }
    },
    {
        name: "ひし形",
        category: "quad",
        description: "辺AE,CGの中点と頂点Bを通る",
        getPoints: (cube) => {
            const edgeAE = cube.getEdgeLine('AE');
            const edgeCG = cube.getEdgeLine('CG');
            const vertexB = cube.getVertexPosition('B');

            return [
                { point: new THREE.Vector3().lerpVectors(edgeAE.start, edgeAE.end, 0.5), object: cube.getEdgeObjectByName('AE') },
                { point: new THREE.Vector3().lerpVectors(edgeCG.start, edgeCG.end, 0.5), object: cube.getEdgeObjectByName('CG') },
                { point: vertexB, object: cube.getVertexObjectByName('B') }
            ];
        }
    },
    {
        name: "正三角形",
        category: "triangle",
        description: "頂点A, C, F を結ぶ正三角形",
        getPoints: (cube) => {
            const vertexA = cube.getVertexPosition('A');
            const vertexC = cube.getVertexPosition('C');
            const vertexF = cube.getVertexPosition('F');

            return [
                { point: vertexA, object: cube.getVertexObjectByName('A') },
                { point: vertexC, object: cube.getVertexObjectByName('C') },
                { point: vertexF, object: cube.getVertexObjectByName('F') }
            ];
        }
    },
    {
        name: "正六角形",
        category: "poly",
        description: "立方体の中心を通り、6つの中点を結ぶ",
        getPoints: (cube) => {
            // 1. 基準となる辺を一つ選択 (例: AB)
            const edgeAB = cube.getEdgeLine('AB');
            // 2. 立方体の中心を挟んで対角に位置する辺を選択 (GH)
            const edgeGH = cube.getEdgeLine('GH');
            // 3. 上記2辺のグループに直交する辺を一つ選択 (例: DH)
            const edgeDH = cube.getEdgeLine('DH');

            // 'DE'という辺は存在しないため、エラーとなっていました。
            // 'DH' に修正することで、3つの中点が正六角形を定義する平面を正しく形成します。
            return [
                { point: new THREE.Vector3().lerpVectors(edgeAB.start, edgeAB.end, 0.5), object: cube.getEdgeObjectByName('AB') },
                { point: new THREE.Vector3().lerpVectors(edgeGH.start, edgeGH.end, 0.5), object: cube.getEdgeObjectByName('GH') },
                { point: new THREE.Vector3().lerpVectors(edgeDH.start, edgeDH.end, 0.5), object: cube.getEdgeObjectByName('DH') }
            ];
        }
    }
];