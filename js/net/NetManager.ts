import * as THREE from 'three';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';
import type { SnapPointID } from '../types.js';

// 展開図 (Development / Net) を管理するクラス
// 立方体の展開図（十字型）を表示し、そこに切断線を描画する

export class NetManager {
    resolver: any;
    container: HTMLDivElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    layout: {
        scale: number;
        offsetX: number;
        offsetY: number;
        faces: Array<{
            name: string;
            faceId: string;
            grid: { x: number; y: number };
            connectTo?: string;
            uvVertices: string[];
        }>;
    };

    constructor() {
        this.resolver = null;
        // コンテナの作成（初回のみ）
        this.container = document.createElement('div');
        this.container.id = 'net-view';
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.width = '300px';
        this.container.style.height = '400px';
        this.container.style.background = 'rgba(255, 255, 255, 0.9)';
        this.container.style.border = '1px solid #ccc';
        this.container.style.borderRadius = '8px';
        this.container.style.display = 'none'; // 初期は非表示
        this.container.style.zIndex = '50';
        this.container.style.padding = '10px';
        
        // 閉じるボタン
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = () => this.hide();
        this.container.appendChild(closeBtn);
        
        // キャンバス
        this.canvas = document.createElement('canvas');
        this.canvas.width = 280;
        this.canvas.height = 350;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        document.body.appendChild(this.container);
        
        // 展開図のレイアウト定義 (単位: グリッド座標 1x1)
        // 十字型展開図
        //   T
        // L F R B
        //   D
        // F:Front, B:Back, L:Left, R:Right, T:Top, D:Down(Bottom)
        // インデックス対応 (Cube.jsと合わせる必要あり)
        // Cube vertices: 
        // 0:A(-,-,-), 1:B(+,-,-), 2:C(+,+,-), 3:D(-,+,-)  (Back Face? z negative) -> No, standard THREE BoxGeometry definition differs.
        // Let's verify Cube.js vertices logic.
        // vertices[0]: -x,-y,-z (Left,Bottom,Back) -> A
        // vertices[1]: +x,-y,-z (Right,Bottom,Back) -> B
        // vertices[2]: +x,+y,-z (Right,Top,Back) -> C
        // vertices[3]: -x,+y,-z (Left,Top,Back) -> D
        // vertices[4]: -x,-y,+z (Left,Bottom,Front) -> E
        // vertices[5]: +x,-y,+z (Right,Bottom,Front) -> F
        // vertices[6]: +x,+y,+z (Right,Top,Front) -> G
        // vertices[7]: -x,+y,+z (Left,Top,Front) -> H
        
        // Faces definition by vertex indices (CCW from outside)
        // Front (z+): E,F,G,H (4,5,6,7)
        // Back (z-): B,A,D,C (1,0,3,2)
        // Top (y+): D,C,G,H (3,2,6,7)
        // Bottom (y-): A,B,F,E (0,1,5,4)
        // Right (x+): B,C,G,F (1,2,6,5)
        // Left (x-): E,H,D,A (4,7,3,0)
        
        // Layout on Canvas (Grid 4x3)
        // Col: 0 1 2 3
        // Row0: . T . .
        // Row1: L F R B
        // Row2: . D . .
        
        this.layout = {
            scale: 50, // 1マスのピクセルサイズ
            offsetX: 20,
            offsetY: 20,
            faces: [
                { name: 'Front', faceId: 'F:0154', grid: {x:1, y:1}, uvVertices: ['V:4', 'V:5', 'V:1', 'V:0'] },
                { name: 'Back',  faceId: 'F:2376', grid: {x:3, y:1}, uvVertices: ['V:6', 'V:7', 'V:3', 'V:2'] },
                { name: 'Top',   faceId: 'F:4567', grid: {x:1, y:0}, connectTo: 'Front', uvVertices: ['V:7', 'V:6', 'V:5', 'V:4'] },
                { name: 'Bottom', faceId: 'F:0321', grid: {x:1, y:2}, uvVertices: ['V:0', 'V:1', 'V:2', 'V:3'] },
                { name: 'Left',   faceId: 'F:0473', grid: {x:0, y:1}, uvVertices: ['V:7', 'V:4', 'V:0', 'V:3'] },
                { name: 'Right',  faceId: 'F:1265', grid: {x:2, y:1}, uvVertices: ['V:5', 'V:6', 'V:2', 'V:1'] },
            ]
        };
    }

    show() {
        this.updatePosition();
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    toggle() {
        if (this.container.style.display === 'none') this.show();
        else this.hide();
    }

    isVisible() {
        return this.container.style.display !== 'none';
    }

    setResolver(resolver: any) {
        this.resolver = resolver;
    }

    updatePosition() {
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) return;
        const rect = uiContainer.getBoundingClientRect();
        const offset = Math.max(0, rect.height);
        this.container.style.top = `${offset + 10}px`;
    }

    // 切断線を描画
    // cutSegments: Array of {startId, endId, start, end} (World座標系)
    // cube: Cube instance (to get vertices and transform to local/face coords)
    /**
     * @param {Array<{ startId: SnapPointID, endId: SnapPointID, start: THREE.Vector3, end: THREE.Vector3, faceIds?: string[], faceId?: string }>} cutSegments
     * @param {object} cube
     * @param {object | null} resolver
     */
    update(cutSegments, cube, resolver = null) {
        if (this.container.style.display === 'none') return;
        this.updatePosition();
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const L = this.layout;
        const s = L.scale;
        const activeResolver = resolver || this.resolver;
        const structure = cube && cube.getStructure ? cube.getStructure() : null;
        const faceData = L.faces.map(face => {
            if (structure && structure.faceMap && !structure.faceMap.has(face.faceId)) return null;
            return {
                name: face.name,
                grid: face.grid,
                faceId: face.faceId,
                uvVertices: face.uvVertices || null,
            };
        }).filter(Boolean);
        
        // グリッド描画
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        faceData.forEach(face => {
            const x = L.offsetX + face.grid.x * s;
            const y = L.offsetY + face.grid.y * s;
            ctx.strokeRect(x, y, s, s);
            // 面の名前
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(face.name, x+2, y+10);
        });

        if(!cutSegments || cutSegments.length === 0) return;

        // 切断線の描画
        // 各線分について、どの面の上にあるか判定し、その面の2D座標に変換して描画
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // 面の法線と中心点（判定用）
        // Cubeのサイズは可変なので、現在の頂点座標を使う
        if (!activeResolver) return;
        const vertices = Array.from({ length: 8 }, (_, i) => activeResolver.resolveVertex(`V:${i}`));
        if (vertices.some(v => !v)) return;
        if (!structure) return;
        const faceIndex = new Map(faceData.map(face => [face.faceId, face]));

        /** @param {SnapPointID} snapId */
        const getFacesForSnapId = (snapId) => {
            const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
            if (!parsed) return [];
            if (parsed.type === 'vertex') {
                const vertex = structure.vertexMap.get(`V:${parsed.vertexIndex}`);
                return vertex ? vertex.faces : [];
            }
            if (parsed.type === 'edge') {
                const edge = structure.edgeMap.get(`E:${parsed.edgeIndex}`);
                return edge ? edge.faces : [];
            }
            if (parsed.type === 'face') {
                return [`F:${parsed.faceIndex}`];
            }
            return [];
        };

        /**
         * @param {{ startId: SnapPointID, endId: SnapPointID, start: THREE.Vector3, end: THREE.Vector3, faceIds?: string[], faceId?: string }} segment
         */
        const resolveFaceForSegment = (segment) => {
            if (!segment || !segment.startId || !segment.endId) return null;
            if (segment.faceId) return segment.faceId;
            if (segment.faceIds && segment.faceIds.length === 1) return segment.faceIds[0];
            if (segment.faceIds && segment.faceIds.length > 1) {
                const mid = segment.start.clone().add(segment.end).multiplyScalar(0.5);
                let best = null;
                let bestDist = Infinity;
                segment.faceIds.forEach(faceId => {
                    const resolved = activeResolver.resolveFace(faceId);
                    if (!resolved) return;
                    const origin = resolved.vertices[0];
                    const dist = Math.abs(resolved.normal.dot(new THREE.Vector3().subVectors(mid, origin)));
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = faceId;
                    }
                });
                return best;
            }
            const startFaces = getFacesForSnapId(segment.startId);
            const endFaces = getFacesForSnapId(segment.endId);
            const shared = startFaces.filter(faceId => endFaces.includes(faceId));
            if (shared.length === 0) return null;
            if (shared.length === 1) return shared[0];
            const mid = segment.start.clone().add(segment.end).multiplyScalar(0.5);
            let best = null;
            let bestDist = Infinity;
            shared.forEach(faceId => {
                const resolved = activeResolver.resolveFace(faceId);
                if (!resolved) return;
                const origin = resolved.vertices[0];
                const dist = Math.abs(resolved.normal.dot(new THREE.Vector3().subVectors(mid, origin)));
                if (dist < bestDist) {
                    bestDist = dist;
                    best = faceId;
                }
            });
            return best;
        };

        cutSegments.forEach(segment => {
            const faceId = resolveFaceForSegment(segment);
            if (!faceId) return;
            const face = faceIndex.get(faceId);
            if (!face) return;
            const uv1 = this.map3Dto2D(segment.start, face, vertices, activeResolver);
            const uv2 = this.map3Dto2D(segment.end, face, vertices, activeResolver);
            const ox = L.offsetX + face.grid.x * s;
            const oy = L.offsetY + face.grid.y * s;
            ctx.moveTo(ox + uv1.x * s, oy + uv1.y * s);
            ctx.lineTo(ox + uv2.x * s, oy + uv2.y * s);
        });
        
        ctx.stroke();
    }
    
    /**
     * @param {THREE.Vector3} p
     * @param {{ faceId: string, name: string, uvVertices?: string[] }} face
     * @param {THREE.Vector3[]} vertices
     * @param {object | null} resolver
     */
    map3Dto2D(p, face, vertices, resolver = null) {
        if (resolver && face.uvVertices && face.uvVertices.length === 4) {
            const corners = face.uvVertices.map(id => resolver.resolveVertex(id));
            if (corners.every(v => v)) {
                const [tl, tr, br, bl] = corners;
                const uVec = new THREE.Vector3().subVectors(tr, tl);
                const vVec = new THREE.Vector3().subVectors(bl, tl);
                const uLen = uVec.length();
                const vLen = vVec.length();
                if (uLen > 0 && vLen > 0) {
                    const vec = new THREE.Vector3().subVectors(p, tl);
                    const u = vec.dot(uVec.clone().normalize()) / uLen;
                    const v = vec.dot(vVec.clone().normalize()) / vLen;
                    return { x: u, y: v };
                }
            }
        }
        if (resolver && face.faceId) {
            const resolvedFace = resolver.resolveFace(face.faceId);
            if (resolvedFace) {
                const origin = resolvedFace.vertices[0];
                const uLen = origin.distanceTo(resolvedFace.vertices[1]);
                const vLen = origin.distanceTo(resolvedFace.vertices[3]);
                const vec = new THREE.Vector3().subVectors(p, origin);
                const u = vec.dot(resolvedFace.basisU) / uLen;
                const v = vec.dot(resolvedFace.basisV) / vLen;
                return { x: u, y: v };
            }
        }
        // 面ごとの基準点（Canvasの左上になる点）と方向
        // indices順序に依存
        // Front[4,5,6,7] = E,F,G,H.
        // Canvas上は 左上H, 右上G, 左下E, 右下F という向きにしたい。
        // indicesはCCW: E->F->G->H.
        // 左上は H(index 7) = indices[3].
        // 右方向は H->G = indices[3]->indices[2].
        // 下方向は H->E = indices[3]->indices[0].
        
        // Face定義ごとに「左上インデックス」「右インデックス」「下インデックス」を手動マッピングする。
        // Front(E,F,G,H): TopLeft:H(7), Right:G(6), Down:E(4)
        // Back(B,A,D,C): 展開図でBackはRightの右。
        // ...これは複雑。
        
        // 簡易マッピング:
        // 全ての面で「ローカルUV」を計算する。
        // UVは [0,0]が左上, [1,1]が右下。
        
        // Front (z+): x(- to +), y(+ to -)  -> u=(x+w/2)/w, v=1-(y+h/2)/h
        // Back (z-): ...
        
        // 3D座標から比率(0~1)を取り出す
        // Cubeサイズが必要。verticesから計算。
        const min = new THREE.Vector3(Infinity,Infinity,Infinity);
        const max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
        vertices.forEach(v => {
            min.min(v); max.max(v);
        });
        const size = max.clone().sub(min); // w, h, d
        
        // 相対座標 (0~1)
        const rel = p.clone().sub(min).divide(size); 
        // rel.x, rel.y, rel.z は 0~1
        
        let u=0, v=0;
        
        switch(face.name) {
            case 'Front': // z=max. x:0->1(Left->Right), y:1->0(Top->Bottom)
                u = rel.x; v = 1 - rel.y; 
                break;
            case 'Back': // z=min. BackはRightの右にあるので、裏から見た図ではなく「展開して表」。
                // Right(x+)の右 -> Back(z-).
                // 展開図の並び: L-F-R-B.
                // Front(z+) -> Right(x+) -> Back(z-).
                // ぐるっと回る。
                // Front: x増加方向。Right: z減少方向。Back: x減少方向。
                u = 1 - rel.x; v = 1 - rel.y;
                break;
            case 'Left': // x=min. z:0->1(Back->Front)? No, L is left of Front.
                // Frontの左はLeft. Frontの左辺はE-H(x=min, z=max).
                // Leftの右辺はE-H.
                // Leftは奥(z-)から手前(z+)へ展開？
                // L-F-R-B の並びなら、円柱状に開いている。
                // Left: z:0->1(Back->Front) が u:0->1. y:1->0.
                u = rel.z; v = 1 - rel.y;
                break;
            case 'Right': // x=max. z:1->0(Front->Back).
                u = 1 - rel.z; v = 1 - rel.y;
                break;
            case 'Top': // y=max. Frontの上。
                // Frontの上辺はH-G(x:0->1, z=max).
                // Topの下辺はH-G.
                // Top: x:0->1, z:0->1(Back->Front) -> v:0->1 ??
                // Front(z=max)が下。Back(z=0)が上。
                u = rel.x; v = rel.z; // z=0(Back)がTop(v=0), z=1(Front)がBottom(v=1)
                break;
            case 'Bottom': // y=min. Frontの下。
                // Frontの下辺はE-F(x:0->1, z=max).
                // Bottomの上辺はE-F.
                // Bottom: x:0->1. z:1->0(Front->Back).
                // Front(z=max)が上(v=0).
                u = rel.x; v = 1 - rel.z;
                break;
        }
        return {x:u, y:v};
    }
}
