import * as THREE from 'three';
import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';
import type { SnapPointID, CutFacePolygon } from '../types.js';
import type {
    SolidSSOT,
    NetPlan,
    NetHinge,
    NetDerived,
    VertexID,
    EdgeID,
    FaceID,
    TopologyIndex,
    ObjectCutAdjacency,
} from '../model/objectModel.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';
import { buildNetUnfoldSpec, type NetUnfoldSpecOptions } from '../animation/netUnfoldSpec.js';
import type { AnimationSpec } from '../animation/AnimationSpec.js';

/**
 * NetManager
 * Manages both 2D net view (Canvas) and 3D net unfolding (NetPlan).
 */
export class NetManager {
    resolver: GeometryResolver | null;
    enable2dView: boolean;
    
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
        this.enable2dView = true;
        
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
        if (!this.enable2dView) return;
        this.updatePosition();
        this.container.style.display = 'block';
    }

    hide() {
        if (!this.enable2dView) return;
        this.container.style.display = 'none';
    }

    isVisible() {
        if (!this.enable2dView) return false;
        return this.container.style.display !== 'none';
    }

    updatePosition() {
        if (!this.enable2dView) return;
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
    generateNetPlan(
        solid: SolidSSOT,
        options?: {
            rootFaceId?: FaceID;
            topologyIndex?: TopologyIndex;
            faceAdjacency?: ObjectCutAdjacency[];
            vertexSnapMap?: Record<VertexID, SnapPointID>;
        }
    ): NetPlan {
        const faceIds = Object.keys(solid.faces);
        const hasCutAdjacency = Array.isArray(options?.faceAdjacency) && options!.faceAdjacency!.length > 0;
        const hasVertexSnapMap = !!options?.vertexSnapMap && Object.keys(options.vertexSnapMap).length > 0;
        const topologyAdjacency = this.buildFaceAdjacencyFromFaces(solid.faces);
        const cutAdjacency = hasCutAdjacency && hasVertexSnapMap
            ? this.buildAdjacencyFromCutAdjacency(options!.faceAdjacency!, options!.vertexSnapMap!)
            : null;
        const adjacency = cutAdjacency
            ? this.mergeAdjacency(topologyAdjacency, cutAdjacency)
            : topologyAdjacency;
        const root = options?.rootFaceId && faceIds.includes(options.rootFaceId)
            ? options.rootFaceId
            : this.pickRootFace(faceIds, adjacency);

        const hinges: NetHinge[] = [];
        const visited = new Set<FaceID>();
        const queue: FaceID[] = [];
        const faceOrder: FaceID[] = [];

        if (root) {
            visited.add(root);
            queue.push(root);
            faceOrder.push(root);
        }

        while (queue.length > 0) {
            const parentId = queue.shift()!;
            const neighbors = adjacency.get(parentId);
            if (!neighbors) continue;
            neighbors.forEach((hingeEdgeId, childId) => {
                if (visited.has(childId) || childId === parentId) return;
                visited.add(childId);
                hinges.push({
                    parentFaceId: parentId,
                    childFaceId: childId,
                    hingeEdgeId
                });
                queue.push(childId);
                faceOrder.push(childId);
            });
        }

        if (visited.size < faceIds.length) {
            const disconnected = faceIds.filter(faceId => !visited.has(faceId));
            if (disconnected.length > 0) {
                console.warn('[net] disconnected faces detected', { faces: disconnected });
                disconnected.forEach(faceId => faceOrder.push(faceId));
            }
        }

        return {
            id: `net-plan:${Date.now()}`,
            targetSolidId: solid.id,
            rootFaceId: root || '',
            hinges,
            faceOrder
        };
    }

    buildUnfoldAnimationSpec(plan: NetPlan, options: NetUnfoldSpecOptions): AnimationSpec {
        return buildNetUnfoldSpec(plan, options);
    }

    private buildFaceAdjacency(edgeToFaces: Record<EdgeID, FaceID[]>): Map<FaceID, Map<FaceID, EdgeID>> {
        const adjacency = new Map<FaceID, Map<FaceID, EdgeID>>();
        Object.entries(edgeToFaces).forEach(([edgeId, faces]) => {
            const uniqueFaces = Array.from(new Set(faces));
            for (let i = 0; i < uniqueFaces.length; i++) {
                for (let j = i + 1; j < uniqueFaces.length; j++) {
                    const a = uniqueFaces[i];
                    const b = uniqueFaces[j];
                    if (!adjacency.has(a)) adjacency.set(a, new Map());
                    if (!adjacency.has(b)) adjacency.set(b, new Map());
                    if (!adjacency.get(a)!.has(b)) adjacency.get(a)!.set(b, edgeId as EdgeID);
                    if (!adjacency.get(b)!.has(a)) adjacency.get(b)!.set(a, edgeId as EdgeID);
                }
            }
        });
        return adjacency;
    }

    private buildFaceAdjacencyFromFaces(
        faces: Record<FaceID, { id: FaceID; vertices: VertexID[] }>
    ): Map<FaceID, Map<FaceID, EdgeID>> {
        const edgeMap = new Map<string, { faceIds: FaceID[]; edgeId: EdgeID }>();
        Object.values(faces).forEach(face => {
            const verts = face.vertices || [];
            for (let i = 0; i < verts.length; i++) {
                const v0 = verts[i];
                const v1 = verts[(i + 1) % verts.length];
                if (!v0 || !v1) continue;
                const v0Raw = v0.startsWith('V:') ? v0.slice(2) : v0;
                const v1Raw = v1.startsWith('V:') ? v1.slice(2) : v1;
                const sorted = [v0Raw, v1Raw].sort((a, b) => {
                    const na = parseInt(a), nb = parseInt(b);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return a.localeCompare(b);
                });
                const edgeKey = `${sorted[0]}|${sorted[1]}`;
                const edgeId = `E:${sorted[0]}-${sorted[1]}` as EdgeID;
                const existing = edgeMap.get(edgeKey);
                if (!existing) {
                    edgeMap.set(edgeKey, { faceIds: [face.id], edgeId });
                } else {
                    existing.faceIds.push(face.id);
                }
            }
        });
        const adjacency = new Map<FaceID, Map<FaceID, EdgeID>>();
        edgeMap.forEach(({ faceIds, edgeId }) => {
            const uniqueFaces = Array.from(new Set(faceIds));
            for (let i = 0; i < uniqueFaces.length; i++) {
                for (let j = i + 1; j < uniqueFaces.length; j++) {
                    const a = uniqueFaces[i];
                    const b = uniqueFaces[j];
                    if (!adjacency.has(a)) adjacency.set(a, new Map());
                    if (!adjacency.has(b)) adjacency.set(b, new Map());
                    if (!adjacency.get(a)!.has(b)) adjacency.get(a)!.set(b, edgeId);
                    if (!adjacency.get(b)!.has(a)) adjacency.get(b)!.set(a, edgeId);
                }
            }
        });
        return adjacency;
    }

    private mergeAdjacency(
        baseAdjacency: Map<FaceID, Map<FaceID, EdgeID>>,
        extraAdjacency: Map<FaceID, Map<FaceID, EdgeID>>
    ): Map<FaceID, Map<FaceID, EdgeID>> {
        const merged = new Map<FaceID, Map<FaceID, EdgeID>>();
        baseAdjacency.forEach((neighbors, faceId) => {
            merged.set(faceId, new Map(neighbors));
        });
        extraAdjacency.forEach((neighbors, faceId) => {
            if (!merged.has(faceId)) merged.set(faceId, new Map());
            const target = merged.get(faceId)!;
            neighbors.forEach((edgeId, neighborId) => {
                if (!target.has(neighborId)) {
                    target.set(neighborId, edgeId);
                }
            });
        });
        return merged;
    }

    private pickRootFace(faceIds: FaceID[], adjacency: Map<FaceID, Map<FaceID, EdgeID>>): FaceID {
        if (faceIds.length === 0) return '';
        let best = faceIds[0];
        let bestDegree = -1;
        faceIds.forEach(faceId => {
            const degree = adjacency.get(faceId)?.size ?? 0;
            if (degree > bestDegree) {
                bestDegree = degree;
                best = faceId;
            }
        });
        return best;
    }

    private buildAdjacencyFromCutAdjacency(
        faceAdjacency: ObjectCutAdjacency[],
        vertexSnapMap: Record<VertexID, SnapPointID>
    ): Map<FaceID, Map<FaceID, EdgeID>> {
        const reverseSnap = new Map<SnapPointID, VertexID>();
        Object.entries(vertexSnapMap).forEach(([vertexId, snapId]) => {
            reverseSnap.set(snapId, vertexId as VertexID);
        });
        const resolveVertexId = (snapId: SnapPointID): VertexID | null => {
            const mapped = reverseSnap.get(snapId);
            if (mapped) return mapped;
            const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
            if (!parsed) return null;
            if (parsed.type === 'vertex') {
                return `V:${parsed.vertexIndex}` as VertexID;
            }
            return null;
        };
        const adjacency = new Map<FaceID, Map<FaceID, EdgeID>>();
        faceAdjacency.forEach(entry => {
            const shared = entry.sharedEdgeIds;
            if (!shared || shared.length !== 2) return;
            const v0 = resolveVertexId(shared[0]);
            const v1 = resolveVertexId(shared[1]);
            if (!v0 || !v1) return;
            const v0Raw = v0.startsWith('V:') ? v0.slice(2) : v0;
            const v1Raw = v1.startsWith('V:') ? v1.slice(2) : v1;
            const sorted = [v0Raw, v1Raw].sort((a, b) => {
                const na = parseInt(a), nb = parseInt(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.localeCompare(b);
            });
            const edgeId = `E:${sorted[0]}-${sorted[1]}` as EdgeID;
            if (!adjacency.has(entry.a as FaceID)) adjacency.set(entry.a as FaceID, new Map());
            if (!adjacency.has(entry.b as FaceID)) adjacency.set(entry.b as FaceID, new Map());
            if (!adjacency.get(entry.a as FaceID)!.has(entry.b as FaceID)) {
                adjacency.get(entry.a as FaceID)!.set(entry.b as FaceID, edgeId);
            }
            if (!adjacency.get(entry.b as FaceID)!.has(entry.a as FaceID)) {
                adjacency.get(entry.b as FaceID)!.set(entry.a as FaceID, edgeId);
            }
        });
        return adjacency;
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
