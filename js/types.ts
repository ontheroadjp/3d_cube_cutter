export type SnapPointID = string;

export type Ratio = {
  numerator: number;
  denominator: number;
};

export type CubeSize = {
  lx: number;
  ly: number;
  lz: number;
};

export type DisplayState = {
  showVertexLabels: boolean;
  showFaceLabels: boolean;
  edgeLabelMode: 'visible' | 'popup' | 'hidden';
  showCutSurface: boolean;
  showPyramid: boolean;
  cubeTransparent: boolean;
};

export type IntersectionPoint = {
  id: SnapPointID;
  type: 'snap' | 'intersection';
  edgeId?: string;
  ratio?: Ratio;
  faceIds?: string[];
  position?: unknown;
};

export type CutSegmentMeta = {
  startId: SnapPointID;
  endId: SnapPointID;
  faceIds?: string[];
};

export type CutResultMeta = {
  outline: SnapPointID[];
  intersections: Array<{
    id: SnapPointID;
    type: 'snap' | 'intersection';
    edgeId?: string;
    ratio?: Ratio;
    faceIds?: string[];
  }>;
  cutSegments: CutSegmentMeta[];
};

export type CutResult = {
  outline: { points: IntersectionPoint[] };
  intersections: IntersectionPoint[];
  cutSegments: Array<{
    startId: SnapPointID;
    endId: SnapPointID;
    start: unknown;
    end: unknown;
    faceIds?: string[];
  }>;
};

export type UserPresetState = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  cube: { size: CubeSize | null; labelMap?: Record<string, string> };
  cut: { snapPoints: SnapPointID[]; inverted: boolean; result?: CutResultMeta };
  display: DisplayState | null;
  createdAt: string;
  updatedAt: string;
};

export type Preset = {
  name: string;
  category: 'triangle' | 'quad' | 'poly';
  description?: string;
  snapIds?: SnapPointID[];
  getPoints?: (cube: unknown) => Array<{
    point: unknown;
    object: unknown;
    isMidpoint?: boolean;
    snapId?: string;
  }>;
};
