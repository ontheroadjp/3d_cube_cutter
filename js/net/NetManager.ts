import * as THREE from 'three';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';
import { buildFaceNameMap } from '../structure/structureModel.js';
import { getCanonicalFaceBasis } from '../geometry/faceBasis.js';
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
            grid: { x: number; y: number };
            connectTo?: string;
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
                { name: 'Front', grid: {x:1, y:1} },
                { name: 'Back',  grid: {x:3, y:1} },
                { name: 'Top',   grid: {x:1, y:0}, connectTo: 'Front' },
                { name: 'Bottom', grid: {x:1, y:2} },
                { name: 'Left',   grid: {x:0, y:1} },
                { name: 'Right',  grid: {x:2, y:1} },
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
    // cutSegments: Array of {startId, endId, start?, end?} (座標は派生情報)
    // cube: Cube instance (to get vertices and transform to local/face coords)
    /**
     * @param {Array<{ startId: SnapPointID, endId: SnapPointID, start?: THREE.Vector3, end?: THREE.Vector3, faceIds?: string[], faceId?: string }>} cutSegments
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
        const indexMap = structure && structure.indexMap ? structure.indexMap : (cube && cube.getIndexMap ? cube.getIndexMap() : null);
        const faceNameMap = structure ? buildFaceNameMap(structure.faces || [], indexMap || {}) : new Map();
        const faceData = L.faces.map(face => {
            const faceId = faceNameMap.get(face.name);
            if (!faceId) return null;
            if (structure && structure.faceMap && !structure.faceMap.has(faceId)) return null;
            const resolved = activeResolver ? activeResolver.resolveFace(faceId) : null;
            if (!resolved) return null;
            const center = resolved.vertices
                .reduce((acc, v) => acc.add(v), new THREE.Vector3())
                .divideScalar(resolved.vertices.length);
            const basis = getCanonicalFaceBasis(face.name as any);
            const coords = resolved.vertices.map(v => {
                const offset = v.clone().sub(center);
                return {
                    u: offset.dot(basis.basisU),
                    v: offset.dot(basis.basisV)
                };
            });
            const uValues = coords.map(c => c.u);
            const vValues = coords.map(c => c.v);
            const width = Math.max(...uValues) - Math.min(...uValues);
            const height = Math.max(...vValues) - Math.min(...vValues);
            return {
                name: face.name,
                grid: face.grid,
                faceId,
                center,
                basisU: basis.basisU,
                basisV: basis.basisV,
                width,
                height
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
        if (!activeResolver) return;
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
            if (segment.faceIds && segment.faceIds.length) return segment.faceIds[0];
            const startFaces = getFacesForSnapId(segment.startId);
            const endFaces = getFacesForSnapId(segment.endId);
            const shared = startFaces.filter(faceId => endFaces.includes(faceId));
            if (shared.length === 0) return null;
            const unique = Array.from(new Set(shared));
            unique.sort();
            return unique[0];
        };

        cutSegments.forEach(segment => {
            const faceId = resolveFaceForSegment(segment);
            if (!faceId) return;
            const face = faceIndex.get(faceId);
            if (!face) return;
            const start = activeResolver.resolveSnapPoint(segment.startId);
            const end = activeResolver.resolveSnapPoint(segment.endId);
            if (!start || !end) return;
            const uv1 = this.map3Dto2D(start, face, activeResolver);
            const uv2 = this.map3Dto2D(end, face, activeResolver);
            if (!uv1 || !uv2) return;
            const ox = L.offsetX + face.grid.x * s;
            const oy = L.offsetY + face.grid.y * s;
            ctx.moveTo(ox + uv1.x * s, oy + uv1.y * s);
            ctx.lineTo(ox + uv2.x * s, oy + uv2.y * s);
        });
        
        ctx.stroke();
    }
    
    /**
     * @param {THREE.Vector3} p
     * @param {{ faceId: string, name: string, center?: THREE.Vector3, basisU?: THREE.Vector3, basisV?: THREE.Vector3, width?: number, height?: number }} face
     * @param {object | null} resolver
     */
    map3Dto2D(p, face, resolver = null) {
        if (!resolver) return null;
        if (face.center && face.basisU && face.basisV && face.width && face.height) {
            const vec = new THREE.Vector3().subVectors(p, face.center);
            const u = vec.dot(face.basisU) / face.width;
            const v = vec.dot(face.basisV) / face.height;
            return { x: u + 0.5, y: v + 0.5 };
        }
        return null;
    }
}
