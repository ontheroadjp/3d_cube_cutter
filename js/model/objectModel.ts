import type * as THREE from 'three';
import type { CutFacePolygon, DisplayState, IntersectionPoint, SnapPointID } from '../types.js';

export type ObjectVertexFlags = {
  selected: boolean;
  hovered: boolean;
  isCutPoint: boolean;
  isSnapPoint: boolean;
};

export type ObjectEdgeFlags = {
  selected: boolean;
  hovered: boolean;
  isCutEdge: boolean;
  hasCutPoint: boolean;
  isMidpointCut: boolean;
};

export type ObjectFaceFlags = {
  selected: boolean;
  hovered: boolean;
  isCutFace: boolean;
  isOriginalFace: boolean;
};

export type ObjectVertex = {
  id: string;
  index: number;
  label: string | null;
  flags: ObjectVertexFlags;
};

export type ObjectEdge = {
  id: string;
  vertices: [ObjectVertex, ObjectVertex];
  faces: string[];
  flags: ObjectEdgeFlags;
};

export type ObjectFace = {
  id: string;
  vertices: ObjectVertex[];
  edges: ObjectEdge[];
  flags: ObjectFaceFlags;
  polygons: unknown[];
};

export type ObjectSolid = {
  id: string;
  vertices: ObjectVertex[];
  edges: ObjectEdge[];
  faces: ObjectFace[];
  meta: { size: { lx: number; ly: number; lz: number } };
};

export type ObjectCutSegment = {
  startId: SnapPointID;
  endId: SnapPointID;
  faceIds?: string[];
};

export type ObjectCutAdjacency = {
  a: string;
  b: string;
};

export type ObjectCut = {
  showCutSurface: boolean;
  intersections: IntersectionPoint[];
  cutSegments: ObjectCutSegment[];
  facePolygons: CutFacePolygon[];
  faceAdjacency: ObjectCutAdjacency[];
};

export type ObjectModel = {
  solid: ObjectSolid;
  display: DisplayState;
  cut?: ObjectCut;
  net?: ObjectNet;
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

export type ObjectNet = {
  faces: ObjectNetFace[];
  animation: ObjectNetState;
  visible: boolean;
};

export const createDefaultVertexFlags = (): ObjectVertexFlags => ({
  selected: false,
  hovered: false,
  isCutPoint: false,
  isSnapPoint: false
});

export const createDefaultEdgeFlags = (): ObjectEdgeFlags => ({
  selected: false,
  hovered: false,
  isCutEdge: false,
  hasCutPoint: false,
  isMidpointCut: false
});

export const createDefaultFaceFlags = (): ObjectFaceFlags => ({
  selected: false,
  hovered: false,
  isCutFace: false,
  isOriginalFace: true
});
