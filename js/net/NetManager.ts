import * as THREE from 'three';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';
import type { SnapPointID, CutFacePolygon } from '../types.js';
import type { SolidSSOT, NetPlan, NetHinge, NetDerived, VertexID, EdgeID, FaceID } from '../model/objectModel.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';

/**
 * NetManager
 * Manages both 2D net view (Canvas) and 3D net unfolding (NetPlan).
 */
export class NetManager {
    resolver: GeometryResolver | null;
    
    // 2D View properties
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
        
        // --- 2D View Initialization ---
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
        this.container.style.display = 'none';
        this.container.style.zIndex = '50';
        this.container.style.padding = '10px';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = () => this.hide();
        this.container.appendChild(closeBtn);
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 280;
        this.canvas.height = 350;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        document.body.appendChild(this.container);
        
        this.layout = {
            scale: 50,
            offsetX: 20,
            offsetY: 20,
            faces: [
                { name: 'Front', faceId: 'F:0-1-5-4', grid: {x:1, y:1}, uvVertices: ['V:4', 'V:5', 'V:1', 'V:0'] },
                { name: 'Back',  faceId: 'F:2-3-7-6', grid: {x:3, y:1}, uvVertices: ['V:6', 'V:7', 'V:3', 'V:2'] },
                { name: 'Top',   faceId: 'F:4-5-6-7', grid: {x:1, y:0}, connectTo: 'Front', uvVertices: ['V:7', 'V:6', 'V:5', 'V:4'] },
                { name: 'Bottom', faceId: 'F:0-3-2-1', grid: {x:1, y:2}, uvVertices: ['V:0', 'V:1', 'V:2', 'V:3'] },
                { name: 'Left',   faceId: 'F:0-4-7-3', grid: {x:0, y:1}, uvVertices: ['V:7', 'V:4', 'V:0', 'V:3'] },
                { name: 'Right',  faceId: 'F:1-2-6-5', grid: {x:2, y:1}, uvVertices: ['V:5', 'V:6', 'V:2', 'V:1'] },
            ]
        };
    }

    setResolver(resolver: GeometryResolver) {
        this.resolver = resolver;
    }

    show() {
        this.updatePosition();
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    isVisible() {
        return this.container.style.display !== 'none';
    }

    updatePosition() {
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) return;
        const rect = uiContainer.getBoundingClientRect();
        const offset = Math.max(0, rect.height);
        this.container.style.top = `${offset + 10}px`;
    }

    // --- 3D NetPlan Generation ---

    /**
     * Generates a structural NetPlan from a solid.
     * This logic determines which face unfolds through which edge.
     */
    generateNetPlan(solid: SolidSSOT, rootFaceId?: FaceID): NetPlan {
        const faceIds = Object.keys(solid.faces);
        // Default to 'Bottom' face as root if available, otherwise first face
        const root = rootFaceId && faceIds.includes(rootFaceId) ? rootFaceId : (faceIds.includes('F:0-3-2-1') ? 'F:0-3-2-1' : faceIds[0]);
        
        const hinges: NetHinge[] = [];
        const visited = new Set<FaceID>([root]);
        const queue: FaceID[] = [root];
        const faceOrder: FaceID[] = [];

        // Preferred connections for a cross layout (Bottom is root)
        // Bottom -> Front, Back, Right, Left
        // Front -> Top
        // This avoids overlap for a standard cube.
        const preferredChildren: Record<string, string[]> = {
            'F:0-3-2-1': ['F:0-1-5-4', 'F:2-3-7-6', 'F:1-2-6-5', 'F:0-4-7-3'], // Bottom -> Front, Back, Right, Left
            'F:0-1-5-4': ['F:4-5-6-7'], // Front -> Top
        };

        while (queue.length > 0) {
            const parentId = queue.shift()!;
            faceOrder.push(parentId);

            const parentEdges = this.getFaceEdges(parentId, solid);
            const children = preferredChildren[parentId] || faceIds;

            // Prioritize preferred children, then others
            const candidates = [...children, ...faceIds.filter(id => !children.includes(id))];
            const uniqueCandidates = [...new Set(candidates)];

            uniqueCandidates.forEach(childId => {
                if (visited.has(childId) || childId === parentId) return;
                // Check if child is actually adjacent
                const childEdges = this.getFaceEdges(childId, solid);
                const sharedEdgeId = parentEdges.find(eId => childEdges.includes(eId));

                if (sharedEdgeId) {
                    visited.add(childId);
                    hinges.push({
                        parentFaceId: parentId,
                        childFaceId: childId,
                        hingeEdgeId: sharedEdgeId
                    });
                    queue.push(childId);
                }
            });
        }

        // Add remaining disconnected faces (e.g. cut faces) using standard BFS
        if (visited.size < faceIds.length) {
             const remainingQueue = Array.from(visited);
             while(remainingQueue.length > 0){
                 const parentId = remainingQueue.shift()!;
                 const parentEdges = this.getFaceEdges(parentId, solid);
                 faceIds.forEach(childId => {
                    if (visited.has(childId)) return;
                    const childEdges = this.getFaceEdges(childId, solid);
                    const sharedEdgeId = parentEdges.find(eId => childEdges.includes(eId));
                    if (sharedEdgeId) {
                        visited.add(childId);
                        hinges.push({
                            parentFaceId: parentId,
                            childFaceId: childId,
                            hingeEdgeId: sharedEdgeId
                        });
                        remainingQueue.push(childId);
                        faceOrder.push(childId);
                    }
                 });
             }
        }

        return {
            id: `net-plan:${Date.now()}`,
            targetSolidId: solid.id,
            rootFaceId: root,
            hinges,
            faceOrder
        };
    }

    private getFaceEdges(faceId: FaceID, solid: SolidSSOT): EdgeID[] {
        const face = solid.faces[faceId];
        const edges: EdgeID[] = [];
        if (!face || !face.vertices) return edges;

        // Iterate over all edges in the solid to find those that match the face's vertex pairs
        // This is O(F * E) but safer than relying on ID naming conventions
        const faceVertexPairs = new Set<string>();
        for (let i = 0; i < face.vertices.length; i++) {
            const v0 = face.vertices[i];
            const v1 = face.vertices[(i + 1) % face.vertices.length];
            faceVertexPairs.add([v0, v1].sort().join('|'));
        }

        Object.values(solid.edges).forEach(edge => {
            const key = [edge.v0, edge.v1].sort().join('|');
            if (faceVertexPairs.has(key)) {
                edges.push(edge.id);
            }
        });
        
        return edges;
    }

    // --- 2D View Update (Legacy functionality) ---

    update(cutSegments: any[], solid: any, resolver: GeometryResolver | null = null) {
        if (!this.isVisible()) return;
        this.updatePosition();
        
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const L = this.layout;
        const s = L.scale;
        const activeResolver = resolver || this.resolver;
        if (!activeResolver) return;

        // Draw grid
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        L.faces.forEach(face => {
            // Check if face exists in solid
            const exists = solid.faces[face.faceId] !== undefined;
            if (!exists) return;

            const x = L.offsetX + face.grid.x * s;
            const y = L.offsetY + face.grid.y * s;
            ctx.strokeRect(x, y, s, s);
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(face.name, x+2, y+10);
        });

        if(!cutSegments || cutSegments.length === 0) return;

        // Draw cut segments on 2D net
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const faceIndex = new Map(L.faces.map(face => [face.faceId, face]));

        cutSegments.forEach(segment => {
            // Find which face this segment belongs to.
            // segment.faceIds contains faces that share this segment.
            // We need to find one that exists in our 2D layout.
            let targetFaceId: string | null = null;
            if (segment.faceIds && segment.faceIds.length > 0) {
                targetFaceId = segment.faceIds.find((id: string) => faceIndex.has(id)) || null;
            }
            
            // If explicit faceId not found, try to resolve from vertices (fallback)
            // But for now, rely on faceIds populated by Cutter.
            
            if (!targetFaceId) return;
            const face = faceIndex.get(targetFaceId);
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
    
    map3Dto2D(p: THREE.Vector3, face: any, resolver: GeometryResolver) {
        if (face.uvVertices && face.uvVertices.length === 4) {
            const corners = face.uvVertices.map((id: string) => resolver.resolveSnapPoint(id));
            if (corners.every((v: any) => v)) {
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
        return null;
    }
}
