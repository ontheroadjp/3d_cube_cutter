import type * as THREE from 'three';
import type { CutFacePolygon, DisplayState, IntersectionPoint, SnapPointID } from '../types.js';

// --- SSOT Layer (Topology & Structure) ---

export type VertexID = string;
export type EdgeID = string;
export type FaceID = string;

export type VertexSSOT = {
  id: VertexID;
};

export type EdgeSSOT = {
  id: EdgeID;
  v0: VertexID;
  v1: VertexID;
};

export type FaceSSOT = {
  id: FaceID;
  vertices: VertexID[]; // CCW ordered vertex IDs
};

export type SolidSSOT = {
  id: string;
  vertices: Record<VertexID, VertexSSOT>;
  edges: Record<EdgeID, EdgeSSOT>;
  faces: Record<FaceID, FaceSSOT>;
  meta: { size: { lx: number; ly: number; lz: number } };
};

// --- Presentation Metadata Layer ---

export type VertexPresentation = {
  label: string | null;
  selected: boolean;
  hovered: boolean;
  isCutPoint: boolean;
  isSnapPoint: boolean;
};

export type EdgePresentation = {
  selected: boolean;
  hovered: boolean;
  isCutEdge: boolean;
  hasCutPoint: boolean;
  isMidpointCut: boolean;
};

export type FacePresentation = {
  selected: boolean;
  hovered: boolean;
  isCutFace: boolean;
  isOriginalFace: boolean;
};

export type PresentationModel = {
  display: DisplayState;
  vertices: Record<VertexID, VertexPresentation>;
  edges: Record<EdgeID, EdgePresentation>;
  faces: Record<FaceID, FacePresentation>;
};

// --- Derived Layer (Calculated Results) ---

export type ObjectCutSegment = {
  startId: SnapPointID;
  endId: SnapPointID;
  faceIds?: string[];
};

export type ObjectCutAdjacency = {
  a: string;
  b: string;
  sharedEdgeIds?: [SnapPointID, SnapPointID];
  hingeType?: 'edge' | 'coplanar';
};

export type CutDerived = {
  showCutSurface: boolean; // Note: This might belong to Presentation, but kept here for now as it toggles derived visibility
  intersections: IntersectionPoint[];
  cutSegments: ObjectCutSegment[];
  facePolygons: CutFacePolygon[];
  faceAdjacency: ObjectCutAdjacency[];
};

export type ObjectNetFace = {
  faceId?: string;
  delayIndex: number;
};

export type ObjectNetState = {
  state: 'closed' | 'opening' | 'open' | 'closing' | 'prescale' | 'postscale';
  progress: number;
  duration: number;
  faceDuration: number;
  stagger: number;
  scale: number;
  scaleTarget: number;
  startAt: number;
  preScaleDelay: number;
  postScaleDelay: number;
  camera?: {
    startPos: THREE.Vector3 | null;
    startTarget: THREE.Vector3 | null;
    endPos: THREE.Vector3 | null;
    endTarget: THREE.Vector3 | null;
  };
};

export type NetDerived = {
  faces: ObjectNetFace[];
  animation: ObjectNetState;
  visible: boolean;
};

// --- Root Model ---

export type ObjectModel = {
  ssot: SolidSSOT;
  presentation: PresentationModel;
  derived: {
    cut?: CutDerived;
    net?: NetDerived;
  };
};

// --- Default Generators ---

export const createDefaultVertexPresentation = (): VertexPresentation => ({
  label: null,
  selected: false,
  hovered: false,
  isCutPoint: false,
  isSnapPoint: false
});

export const createDefaultEdgePresentation = (): EdgePresentation => ({
  selected: false,
  hovered: false,
  isCutEdge: false,
  hasCutPoint: false,
  isMidpointCut: false
});

export const createDefaultFacePresentation = (): FacePresentation => ({
  selected: false,
  hovered: false,
  isCutFace: false,
  isOriginalFace: true
});